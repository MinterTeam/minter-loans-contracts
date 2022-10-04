require("@nomiclabs/hardhat-waffle");
require('hardhat-abi-exporter');
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

let bscAccounts = [];
if(process.env.BSC_PRIVATE_KEY) {
  bscAccounts.push(`${process.env.BSC_PRIVATE_KEY}`)
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  abiExporter: {
    path: './abi',
    runOnCompile: true
  },
  networks: {
    bscTestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: bscAccounts,
    },
    bsc: {
      url: `https://bscrpc.com`,
      accounts: bscAccounts,
      gasPrice: 5000000000,
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_SCAN_API_KEY,
      bsc: process.env.BSC_SCAN_API_KEY,
    }
  }
};
