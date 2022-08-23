//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(string memory symbol_) ERC20(symbol_, symbol_) {
        _mint(msg.sender, 10000000000 ether);
    }
}
