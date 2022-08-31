const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toWei, toBN, fromWei} = require("web3-utils");

function getBorrowReceiptData(receipt) {
  let totalLoaned = toBN(0);
  let totalCollateral = toBN(0);

  for (const event of receipt.events) {
    if (event.event === "NewLoan") {
      let loaned = toBN(event.args[3].toString());
      let collateral = toBN(event.args[4].toString());

      totalLoaned = totalLoaned.add(loaned);
      totalCollateral = totalCollateral.add(collateral);
    }
  }

  return {totalLoaned, totalCollateral};
}

describe("MinterLoans", function () {
  it("Should lend and repay", async function () {
    const signers = await ethers.getSigners();
    const priceBroadcaster = signers[0];
    const borrower = signers[1];
    const lender = signers[2];

    const HUB = await ethers.getContractFactory("TestERC20");
    const hub = await HUB.deploy("HUB");
    await hub.deployed();

    await (await hub.transfer(borrower.address, toWei("1000000"))).wait();

    const USDT = await ethers.getContractFactory("TestERC20");
    const usdt = await USDT.deploy("USDT");
    await usdt.deployed();

    await (await usdt.transfer(lender.address, toWei("1000000"))).wait();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, priceBroadcaster.address);
    await minterLoans.deployed();

    await (await minterLoans.connect(priceBroadcaster).updatePrice(1000000)).wait();

    await (await hub.connect(borrower).approve(minterLoans.address, toWei("1000000"))).wait();
    await (await usdt.connect(lender).approve(minterLoans.address, toWei("1000000"))).wait();

    // lend
    {
      await (await minterLoans.connect(lender).lend(toWei("100.5"))).wait();
      await (await minterLoans.connect(lender).lend(toWei("100"))).wait();
      await (await minterLoans.connect(lender).lend(toWei("500"))).wait();
    }

    // borrow
    {
      let receipt = await (await minterLoans.connect(borrower).borrow(toWei("10"))).wait();
      let {totalLoaned, totalCollateral} = getBorrowReceiptData(receipt);

      console.log("Loaned", fromWei(totalLoaned), "USDT");
      console.log("Collateral", fromWei(totalCollateral), "HUB");
    }

    // repay
    {
      await (await usdt.transfer(borrower.address, toWei("100"))).wait();
      await (await usdt.connect(borrower).approve(minterLoans.address, toWei("1000000"))).wait();

      let beforeUSDT = await usdt.balanceOf(borrower.address);
      let beforeHUB = await hub.balanceOf(borrower.address);
      await (await minterLoans.connect(borrower).repay(0)).wait();
      await (await minterLoans.connect(borrower).repay(1)).wait();
      let afterHUB = await hub.balanceOf(borrower.address);
      let afterUSDT = await usdt.balanceOf(borrower.address);

      console.log("Repaid", fromWei(beforeUSDT.sub(afterUSDT).toString()), "USDT");
      console.log("Got", fromWei(afterHUB.sub(beforeHUB).toString()), "HUB");
    }

    // liquidate
    {
      await (await minterLoans.connect(priceBroadcaster).updatePrice(750000)).wait();

      let beforeHUB = await hub.balanceOf(lender.address);
      await (await minterLoans.connect(lender).liquidate(2)).wait();
      let afterHUB = await hub.balanceOf(lender.address);

      console.log("Liquidated", fromWei(afterHUB.sub(beforeHUB).toString()), "HUB");
    }

    // todo: remove first lend
    // todo: remove last lend
  });

  it("Should return correct amount of HUB if there is not enough USDT", async function () {
    const signers = await ethers.getSigners();
    const priceBroadcaster = signers[0];
    const borrower = signers[1];
    const lender = signers[2];

    const HUB = await ethers.getContractFactory("TestERC20");
    const hub = await HUB.deploy("HUB");
    await hub.deployed();

    await (await hub.transfer(borrower.address, toWei("1000000"))).wait();

    const USDT = await ethers.getContractFactory("TestERC20");
    const usdt = await USDT.deploy("USDT");
    await usdt.deployed();

    await (await usdt.transfer(lender.address, toWei("1000000"))).wait();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, priceBroadcaster.address);
    await minterLoans.deployed();

    await (await minterLoans.connect(priceBroadcaster).updatePrice(100 * 1e4)).wait();

    await (await hub.connect(borrower).approve(minterLoans.address, toWei("1000000"))).wait();
    await (await usdt.connect(lender).approve(minterLoans.address, toWei("1000000"))).wait();

    // lend
    await (await minterLoans.connect(lender).lend(toWei("1000"))).wait();

    // borrow
    let beforeHUB = await hub.balanceOf(borrower.address);
    await (await minterLoans.connect(borrower).borrow(toWei("250"))).wait();
    let diff = beforeHUB.sub(await hub.balanceOf(borrower.address));

    expect(diff).to.equal(toWei("20"));
  });
});
