//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMinterLoans {
    // events
    event NewLoan(address indexed lender, address indexed borrower, uint256 id, uint256 tokenAmount, uint256 collateralAmount);
    event NewLend(address indexed lender, uint256 id, uint256 tokenAmount);
    event Repay(uint256 indexed loanId);
    event Liquidation(uint256 indexed loanId);
    event NewPrice(uint256 price);

    // borrower actions
    function borrow(uint256 _collateralAmount) external;
    function repay(uint256 _loanId) external;

    // lender actions
    function lend(uint256 _loanableAmount) external;
    function withdraw(uint256 _lendId) external;
    function liquidate(uint256 _loanId) external;

    // system actions
    function updatePrice(uint256 _price) external;

    // getters
    function getLoan(uint256 id) external view returns(address borrower, address lender, uint256 collateralAmount, uint256 borrowedAmount, uint256 borrowingTime, bool closed);
    function getLend(uint256 id) external view returns(address lender, uint256 initialAmount, uint256 leftAmount);
}