// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");

async function main() {
    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy("0x8aC0A467f878f3561D309cF9B0994b0530b0a9d2", "0x55d398326f99059fF775485246999027B3197955", "0x10ED43C718714eb63d5aA57B78B54704E256024E", (await ethers.getSigners())[0].address);
    await minterLoans.deployed();

    console.log("MinterLoans deployed to:", minterLoans.address);

    if (process.env.BSC_SCAN_API_KEY) {
        await minterLoans.deployTransaction.wait(10);

        await hre.run("verify:verify", {
            address: minterLoans.address,
            constructorArguments: ["0x8aC0A467f878f3561D309cF9B0994b0530b0a9d2", "0x55d398326f99059fF775485246999027B3197955", "0x10ED43C718714eb63d5aA57B78B54704E256024E", (await ethers.getSigners())[0].address],
            contract: "contracts/MinterLoans.sol:MinterLoans"
        });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
