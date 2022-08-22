//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMinterLoans {
    // events
    event NewLoan(address indexed lender, address indexed borrower, uint256 id, uint256 tokenAmount, uint256 collateralAmount);
    event NewLend(address indexed lender, uint256 id, uint256 tokenAmount);
    event Repay(uint256 indexed loanId);
    event Liquidation(uint256 indexed loanId);
    event NewPrice(uint256 price);

    // borrower
    function borrow(uint256 _collateralAmount) external;
    function repay(uint256 _loanId) external;

    // lender
    function lend(uint256 _loanableAmount) external;
    function withdraw(uint256 _lendId) external;
    function liquidate(uint256 _loanId) external;

    // system
    function updatePrice(uint256 _price) external;

    // getters
    function getLoan(uint256 id) external view returns(address borrower, address lender, address collateralAmount, address borrowedAmount, uint256 borrowingTime, bool closed);
    function getLend(uint256 id) external view returns(address lender, uint256 initialAmount, uint256 leftAmount);
    function getPrice() external view returns(uint256);
}

struct Loan {
    address borrower;
    address lender;

    address collateralAmount;
    address borrowedAmount;

    uint256 borrowingTime;

    bool closed;
}

struct Lend {
    address lender;
    uint256 initialAmount;
    uint256 leftAmount;

    // double-linked list
    uint256 prev;
    uint256 next;
}

contract MinterLoans is IMinterLoans {
    using SafeERC20 for IERC20;

    IERC20 hub = IERC20(0xF5b0ed82a0b3e11567081694cC66c3df133f7C8F);
    IERC20 usdt = IERC20(0xF5b0ed82a0b3e11567081694cC66c3df133f7C8F);

    Loan[] loans;

    uint256 lendsHead;
    uint256 lendsTail;
    Lend[] lends;

    uint256 price;
    uint256 lastPriceUpdateHeight;

    function borrow(uint256 _collateralAmount) override external {
        // todo: check for min amount
        // todo: transfer collateral ERC-20 to this address
        // todo: go for current list of lends and create new loans
        // todo: send borrowed token back to user
    }

    function repay(uint256 _loanId) override external {
        // todo: get loan
        // todo: calculate amount
        // todo: transfer ERC-20 to lender
        // todo: send collateral back to used
    }

    function lend(uint256 _loanableAmount) override external {
        // todo: check for min amount

        usdt.safeTransferFrom(msg.sender, address(this), _loanableAmount);

        // todo: check logic
        lends[lendsTail].next = lendsTail + 1;
        lends.push(Lend(msg.sender, _loanableAmount, _loanableAmount, lendsTail, 0));
        lendsTail++;
    }

    function withdraw(uint256 _lendId) override external {
        require(lends[_lendId].lender == msg.sender, "Sender is not an owner of lend");

        usdt.transfer(lends[_lendId].lender, lends[_lendId].leftAmount);
        lends[_lendId].leftAmount = 0;

        // todo: check logic
        lends[lends[_lendId].next].prev = lends[_lendId].prev;
        lends[lends[_lendId].prev].next = lends[_lendId].next;
    }

    function liquidate(uint256 _loanId) override external {
        // todo: find loan and check for owner
        // todo: check liquidation rules
        // todo: send collateral to lender
        // todo: destroy lend
    }

    function updatePrice(uint256 _price) override external {
        // todo: check source

        price = _price;
        lastPriceUpdateHeight = block.number;

        emit NewPrice(price);
    }

    function getLoan(uint256 id) override external view returns(address borrower, address lender, address collateralAmount, address borrowedAmount, uint256 borrowingTime, bool closed) {
        return (loans[id].borrower, loans[id].lender, loans[id].collateralAmount, loans[id].borrowedAmount, loans[id].borrowingTime, loans[id].closed);
    }

    function getLend(uint256 id) override external view returns(address lender, uint256 initialAmount, uint256 leftAmount) {
        return (lends[id].lender, lends[id].initialAmount, lends[id].leftAmount);
    }

    function getPrice() override external view returns(uint256) {
        return price;
    }
}
