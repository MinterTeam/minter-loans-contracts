// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");

async function main() {
    console.log("Deploy from address", (await ethers.getSigners())[0].address);

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy("0x84B748b6a51548f3C1a59DAF4f36dF47Ca7fB4B5", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x10ED43C718714eb63d5aA57B78B54704E256024E");
    await minterLoans.deployed();

    console.log("MinterLoans deployed to:", minterLoans.address);

    if (process.env.BSC_SCAN_API_KEY) {
        await minterLoans.deployTransaction.wait(10);

        await hre.run("verify:verify", {
            address: minterLoans.address,
            constructorArguments: ["0x84B748b6a51548f3C1a59DAF4f36dF47Ca7fB4B5", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x10ED43C718714eb63d5aA57B78B54704E256024E"],
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
