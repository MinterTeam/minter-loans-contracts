// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");

async function main() {
    const HUB = await ethers.getContractFactory("TestERC20");
    const hub = await HUB.deploy("HUB");
    await hub.deployed();

    console.log("HUB ERC-20 deployed to:", hub.address);

    const USDT = await ethers.getContractFactory("TestERC20");
    const usdt = await USDT.deploy("USDT");
    await usdt.deployed();

    console.log("USDT ERC-20 deployed to:", usdt.address);

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    console.log("Pancake Router deployed to:", pancake.address);

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address);
    await minterLoans.deployed();

    await (await minterLoans.updatePrice(100000)).wait();

    console.log("MinterLoans deployed to:", minterLoans.address);

    if (process.env.BSC_SCAN_API_KEY) {
        await minterLoans.deployTransaction.wait(10);

        await hre.run("verify:verify", {
            address: minterLoans.address,
            constructorArguments: [hub.address, usdt.address, pancake.address],
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
