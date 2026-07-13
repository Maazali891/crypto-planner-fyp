import { expect } from "chai";
import { ethers } from "hardhat";
import { InterestVault } from "../typechain-types";

describe("InterestVault", function () {
  let vault: InterestVault;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const InterestVault = await ethers.getContractFactory("InterestVault");
    vault = await InterestVault.deploy();
    await vault.waitForDeployment();
  });

  describe("Deposit", function () {
    it("Should allow users to deposit", async function () {
      const amount = ethers.parseEther("1");
      await vault.connect(addr1).deposit(amount, 0); // 0 = BTC

      const deposit = await vault.getDeposit(addr1.address, 0);
      expect(deposit.principal).to.equal(amount);
      expect(deposit.balance).to.equal(amount);
      expect(deposit.assetType).to.equal(0);
      expect(deposit.active).to.be.true;
    });

    it("Should reject zero amount deposits", async function () {
      await expect(vault.deposit(0, 0)).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate interest correctly", async function () {
      const principal = ethers.parseEther("1000");
      const rateBPS = 700; // 7%
      const oneYear = 365 * 24 * 60 * 60;

      const newBalance = await vault.calculateInterest(principal, rateBPS, oneYear);

      // Should be approximately 1070 (1000 + 7%)
      const expected = ethers.parseEther("1070");
      const tolerance = ethers.parseEther("1"); // 1 ETH tolerance

      expect(newBalance).to.be.closeTo(expected, tolerance);
    });

    it("Should accrue interest on deposit", async function () {
      const amount = ethers.parseEther("1000");
      await vault.connect(addr1).deposit(amount, 1); // 1 = ETH

      // Fast forward time by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await vault.accrueInterest(addr1.address, 0);

      const deposit = await vault.getDeposit(addr1.address, 0);
      expect(deposit.balance).to.be.gt(amount);
    });
  });

  describe("Projection", function () {
    it("Should return projected balance for 1 year", async function () {
      const principal = ethers.parseEther("1000");
      const projected = await vault.calculateProjection(principal, 1);

      expect(projected).to.be.gt(principal);
    });
  });
});
