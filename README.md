## Description

Algorithm for the borrower:
- Borrower sends HUB and receives 50% of its value in USDT.
- Rate - 12% per annum. Current interest is recalculated every 30 days of using the loan, but cannot be less than 1%.
- If the collateral of the loan (loan + accrued interest) falls below 150%, the pledged amount of HUB is transferred to the lender (10% of amount goes to Fund).
- The borrower can return USDT + % for the term of use at any time in order to receive HUB back.
- The maximum loan period is 365 days. If after this time the borrower has not returned the USDT, then his HUB is transferred to the lender (10% of amount goes to Fund).
- The minimum loan amount is $100.

Algorithm for the lender:
- The lender sends USDT and waits for someone to borrow it.
- If there is more than 1 lender in the queue, then the funds are used according to the FIFO algorithm.
- Unused USDT can be withdrawn at any time.
- If the collateral for the used USDT drops below 150%, then in the personal account there is an opportunity to take the collateral in order to sell it and get your USDT back (10% of amount goes to Fund).
- The minimum amount is $100. The maximum is $10,000.

## Info
 
- Interface and events of contract are available at `contracts/Interfaces.sol`.
- ABI of contract is available at `abi/contracts/MinterLoans.sol/MinterLoans.json`.
- Price of HUB token is set to 100 USDT, but you can change it by sending `updatePrice(uint256 _price)` from first hardhat account.

## Run local testnet

```shell
hh node
```

```shell
hh run --network localhost scripts/deploy.js
```

Script will deploy 2 ERC-20 tokens (HUB and USDT) and send supply to first hardhat account:

```
Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
