//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces.sol";

import "hardhat/console.sol";

struct Loan {
    address borrower;
    address lender;

    uint256 collateralAmount;
    uint256 borrowedAmount;
    uint256 borrowingTime;

    bool closed;
}

struct Lend {
    address lender;

    uint256 initialAmount;
    uint256 leftAmount;

    uint256 prev;
    uint256 next;
}

contract MinterLoans is IMinterLoans, Ownable {
    using SafeERC20 for IERC20;

    IERC20 hub;
    IERC20 usdt;

    Loan[] loans;

    uint256 lendsHead;
    uint256 lendsTail;
    Lend[] lends;

    uint256 public price;
    uint256 public priceDenom = 10000;

    uint256 public priceTrustWindowBlocks = 1000;

    uint256 public lastPriceUpdateHeight;
    uint256 public minimalLoanableAmount = 100 ether;
    uint256 public minCollateralRate = 75;
    uint256 public baseCollateralRate = 200;
    uint256 public rateDenom = 100;
    uint256 public interestPerMonth = 1;
    uint256 public interestDenom = 100;
    uint256 public maxBorrowingPeriod = 365 days;

    address priceBroadcaster;

    constructor(address _hubAddress, address _usdtAddress, address _priceBroadcaster) {
        hub = IERC20(_hubAddress);
        usdt = IERC20(_usdtAddress);
        priceBroadcaster = _priceBroadcaster;
    }

    function borrow(uint256 _collateralAmount) checkActualPrice override external {
        uint256 maxLoanAmount = calculateLoanAmount(_collateralAmount);
        require(maxLoanAmount >= minimalLoanableAmount, "Loanable amount is too small");

        hub.safeTransferFrom(msg.sender, address(this), _collateralAmount);

        uint256 currentLendId = lendsHead;
        uint256 loanedAmount = 0;
        uint256 collateralLeft = _collateralAmount;

        for(;;) {
            Lend memory currentLend = lends[currentLendId];

            uint256 currentLoanAmount = maxLoanAmount - loanedAmount;
            uint256 currentCollateralAmount = collateralLeft;
            if (currentLend.leftAmount < currentLoanAmount) {
                currentCollateralAmount = calculateCollateralAmount(currentLend.leftAmount);
                currentLoanAmount = currentLend.leftAmount;
            }

            loans.push(Loan(msg.sender, currentLend.lender, currentCollateralAmount, currentLoanAmount, block.timestamp, false));
            lends[currentLendId].leftAmount -= currentLoanAmount;
            emit NewLoan(currentLend.lender, msg.sender, loans.length - 1, currentLoanAmount, currentCollateralAmount);

            if (lends[currentLendId].leftAmount == 0) {
                removeLend(currentLendId);
            }

            loanedAmount += currentLoanAmount;
            collateralLeft -= currentCollateralAmount;

            if (maxLoanAmount == loanedAmount) {
                break;
            }

            if (currentLendId == lendsTail) {
                hub.safeTransfer(msg.sender, currentCollateralAmount);
                break;
            }

            currentLendId = currentLend.next;
        }

        usdt.safeTransfer(msg.sender, loanedAmount);
    }

    function repay(uint256 _loanId) override external {
        Loan memory loan = loans[_loanId];
        require(!loan.closed, "Loan has been already closed");

        uint256 amountToRepay = calculateRepayAmount(loan);

        usdt.safeTransferFrom(msg.sender, loan.lender, amountToRepay);
        hub.safeTransfer(msg.sender, loan.collateralAmount);

        loans[_loanId].closed = true;
        emit Repay(_loanId);
    }

    function lend(uint256 _loanableAmount) override external {
        require(_loanableAmount >= minimalLoanableAmount, "Amount is too small");

        usdt.safeTransferFrom(msg.sender, address(this), _loanableAmount);

        if (lends.length != 0) {
            lends[lendsTail].next = lends.length;
        }

        lends.push(Lend(msg.sender, _loanableAmount, _loanableAmount, lendsTail, 0));
        lendsTail = lends.length - 1;
    }

    function withdraw(uint256 _lendId) override external {
        require(lends[_lendId].lender == msg.sender, "Sender is not an owner of lend");

        usdt.transfer(lends[_lendId].lender, lends[_lendId].leftAmount);
        lends[_lendId].leftAmount = 0;

        removeLend(_lendId);
    }

    function liquidate(uint256 _loanId) checkActualPrice override external {
        Loan memory loan = loans[_loanId];
        require(msg.sender == loan.lender, "Sender is not an owner of the debt");
        require(!loan.closed, "Loan has been already closed");

        require(canBeLiquidated(loan), "Loan cannot be liquidated yet");

        hub.safeTransfer(loan.lender, loan.collateralAmount);

        loans[_loanId].closed = true;
        emit Liquidation(_loanId);
    }

    function updatePrice(uint256 _price) override external {
        require(msg.sender == priceBroadcaster, "Sender is not the price broadcaster");

        price = _price;
        lastPriceUpdateHeight = block.number;

        emit NewPrice(price);
    }

    function removeLend(uint256 _id) private {
        if (_id == lendsHead) {
            lendsHead = lends[_id].next;
            lends[lends[_id].next].prev = 0;
        } else if (_id == lendsTail) {
            lendsTail = lends[_id].prev;
            lends[lends[_id].prev].next = 0;
        } else {
            lends[lends[_id].next].prev = lends[_id].prev;
            lends[lends[_id].prev].next = lends[_id].next;
        }
    }

    function setPriceBroadcaster(address _broadcaster) public onlyOwner {
        priceBroadcaster = _broadcaster;
    }

    function calculateLoanAmount(uint256 hubAmount) public view returns(uint256) {
        return hubAmount * price * rateDenom / baseCollateralRate / priceDenom;
    }

    function calculateCollateralAmount(uint256 usdtAmount) public view returns(uint256) {
        return usdtAmount * priceDenom * baseCollateralRate / price / rateDenom;
    }

    function calculateRepayAmount(Loan memory loan) public view returns(uint256) {
        uint256 monthCount = (block.timestamp - loan.borrowingTime) / 30 days;
        if (monthCount < 1) {
            monthCount = 1;
        }

        return loan.borrowedAmount + (loan.borrowedAmount * monthCount * interestPerMonth / interestDenom);
    }

    function canBeLiquidated(Loan memory loan) public view returns(bool) {
        if ((block.timestamp - loan.borrowingTime) / maxBorrowingPeriod > 0) {
            return true;
        }

        uint256 neededCollateral = calculateCollateralAmount(calculateRepayAmount(loan));

        return loan.collateralAmount * rateDenom / neededCollateral < minCollateralRate;
    }

    function getLoan(uint256 _id) override external view returns(address borrower, address lender, uint256 collateralAmount, uint256 borrowedAmount, uint256 borrowingTime, bool closed) {
        return (loans[_id].borrower, loans[_id].lender, loans[_id].collateralAmount, loans[_id].borrowedAmount, loans[_id].borrowingTime, loans[_id].closed);
    }

    function getLend(uint256 _id) override external view returns(address lender, uint256 initialAmount, uint256 leftAmount) {
        return (lends[_id].lender, lends[_id].initialAmount, lends[_id].leftAmount);
    }

    modifier checkActualPrice() {
        require(block.number - lastPriceUpdateHeight < priceTrustWindowBlocks, "Price was not updated for too long");
        _;
    }
}
