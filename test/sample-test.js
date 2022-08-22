const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MinterLoans", function () {
  it("Should deploy", async function () {
    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy();
    await minterLoans.deployed();
  });
});
