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

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address, priceBroadcaster.address);
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

  it("Should buy with leverage and repay", async function () {
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
    await (await usdt.transfer(borrower.address, toWei("1000000"))).wait();

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    await (await hub.transfer(pancake.address, toWei("1000000"))).wait();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address, priceBroadcaster.address);
    await minterLoans.deployed();

    await (await minterLoans.connect(priceBroadcaster).updatePrice(1000000)).wait();

    await (await usdt.connect(borrower).approve(minterLoans.address, toWei("1000000"))).wait();
    await (await usdt.connect(lender).approve(minterLoans.address, toWei("1000000"))).wait();

    // lend
    {
      await (await minterLoans.connect(lender).lend(toWei("50"))).wait();
      await (await minterLoans.connect(lender).lend(toWei("100"))).wait();
    }

    // borrow
    {
      let beforeUSDT = await usdt.balanceOf(borrower.address);
      let receipt = await (await minterLoans.connect(borrower).buyWithLeverage(toWei("100"), toWei("10"))).wait();
      let {totalLoaned, totalCollateral} = getBorrowReceiptData(receipt);
      let afterUSDT = await usdt.balanceOf(borrower.address);

      console.log("Balance diff", fromWei(afterUSDT.sub(beforeUSDT).toString()), "USDT");

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

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address, priceBroadcaster.address);
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

  it("Should fail borrowing from empty pool", async function () {
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

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address, priceBroadcaster.address);
    await minterLoans.deployed();

    await (await minterLoans.connect(priceBroadcaster).updatePrice(100 * 1e4)).wait();

    await (await hub.connect(borrower).approve(minterLoans.address, toWei("1000000"))).wait();
    await (await usdt.connect(lender).approve(minterLoans.address, toWei("1000000"))).wait();

    // borrow
    await expect(minterLoans.connect(borrower).borrow(toWei("250")))
        .to.be.revertedWith('No available lends');
  });

  it("Should handle doubly-linked list properly", async function () {
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

    const Pancake = await ethers.getContractFactory("TestPancakeRouter");
    const pancake = await Pancake.deploy();
    await pancake.deployed();

    const MinterLoans = await ethers.getContractFactory("MinterLoans");
    const minterLoans = await MinterLoans.deploy(hub.address, usdt.address, pancake.address, priceBroadcaster.address);
    await minterLoans.deployed();

    await (await minterLoans.connect(priceBroadcaster).updatePrice(100 * 1e4)).wait();

    await (await usdt.connect(lender).approve(minterLoans.address, toWei("1000000"))).wait();

    // lend
    await (await minterLoans.connect(lender).lend(toWei("100"))).wait();
    await (await minterLoans.connect(lender).lend(toWei("200"))).wait();
    await (await minterLoans.connect(lender).lend(toWei("300"))).wait();
    await (await minterLoans.connect(lender).lend(toWei("400"))).wait();

    async function getLendsList() {
      let head = Number(await minterLoans.lendsHead());
      let tail = Number(await minterLoans.lendsTail());

      let list = [];
      let current = head;
      for (; ;) {
        let lend = await minterLoans.lends(current);

        if (lend.dropped) {
          return list;
        }

        list.push(fromWei(String(lend.initialAmount)))

        if (current === tail) {
          break;
        }

        current = Number(lend.next);
      }
      return list;
    }

    let list = await getLendsList();
    expect(list).to.eql([ '100', '200', '300', '400' ])

    await (await minterLoans.connect(lender).withdraw(0)).wait();
    list = await getLendsList();
    expect(list).to.eql([ '200', '300', '400' ])

    await (await minterLoans.connect(lender).withdraw(3)).wait();
    list = await getLendsList();
    expect(list).to.eql([ '200', '300' ])

    await (await minterLoans.connect(lender).withdraw(1)).wait();
    list = await getLendsList();
    expect(list).to.eql(['300'])

    await (await minterLoans.connect(lender).withdraw(2)).wait();
    list = await getLendsList();
    expect(list).to.eql([])

    await (await minterLoans.connect(lender).lend(toWei("500"))).wait();
    list = await getLendsList();
    expect(list).to.eql(['500'])

    await (await minterLoans.connect(lender).lend(toWei("600"))).wait();
    list = await getLendsList();
    expect(list).to.eql(['500', '600'])

    await (await minterLoans.connect(lender).withdraw(5)).wait();
    list = await getLendsList();
    expect(list).to.eql(['500'])

    await (await minterLoans.connect(lender).withdraw(4)).wait();
    list = await getLendsList();
    expect(list).to.eql([])
  });
});
