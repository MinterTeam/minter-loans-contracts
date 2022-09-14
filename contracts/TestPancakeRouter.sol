//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Interfaces.sol";

contract TestPancakeRouter is IPancakeRouter {
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] memory path, address to, uint256 deadline) external override returns (uint[] memory amounts) {
        amounts = new uint[](path.length);

        amounts[path.length - 1] = amountIn / 20;

        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amounts[path.length - 1]);
    }
}
