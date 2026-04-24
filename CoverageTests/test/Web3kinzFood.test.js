const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Web3kinzFood", function () {
  let owner, addr1, addr2;
  let food;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Web3kinzFood = await ethers.getContractFactory("Web3kinzFood");
    food = await Web3kinzFood.deploy(owner.address);
    await food.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully with the correct owner", async function () {
      expect(await food.owner()).to.equal(owner.address);
    });

    it("should have the correct name and symbol", async function () {
      expect(await food.name()).to.equal("MyToken");
      expect(await food.symbol()).to.equal("MTK");
    });

    it("should use 18 decimals by default", async function () {
      expect(await food.decimals()).to.equal(18);
    });

    it("should start with zero total supply", async function () {
      expect(await food.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("should allow the owner to mint tokens", async function () {
      await expect(food.mint(addr1.address, 100)).to.not.be.reverted;

      expect(await food.balanceOf(addr1.address)).to.equal(100);
      expect(await food.totalSupply()).to.equal(100);
    });

    it("should revert if a non-owner tries to mint", async function () {
      await expect(
        food.connect(addr1).mint(addr1.address, 100)
      ).to.be.revertedWithCustomError(food, "OwnableUnauthorizedAccount");
    });

    it("should support minting zero tokens", async function () {
      await expect(food.mint(addr1.address, 0)).to.not.be.reverted;

      expect(await food.balanceOf(addr1.address)).to.equal(0);
      expect(await food.totalSupply()).to.equal(0);
    });

    it("should correctly accumulate balances across multiple mints", async function () {
      await food.mint(addr1.address, 100);
      await food.mint(addr1.address, 50);
      await food.mint(addr2.address, 25);

      expect(await food.balanceOf(addr1.address)).to.equal(150);
      expect(await food.balanceOf(addr2.address)).to.equal(25);
      expect(await food.totalSupply()).to.equal(175);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await food.mint(addr1.address, 200);
      await food.mint(addr2.address, 100);
    });

    it("should allow a token holder to burn their own tokens", async function () {
      await expect(food.connect(addr1).burn(50)).to.not.be.reverted;

      expect(await food.balanceOf(addr1.address)).to.equal(150);
      expect(await food.totalSupply()).to.equal(250);
    });

    it("should revert when burning more than the holder balance", async function () {
      await expect(food.connect(addr2).burn(101)).to.be.reverted;
    });

    it("should allow the owner to burn tokens from any address via burnFromAddress", async function () {
      await expect(food.burnFromAddress(addr1.address, 75)).to.not.be.reverted;

      expect(await food.balanceOf(addr1.address)).to.equal(125);
      expect(await food.totalSupply()).to.equal(225);
    });

    it("should revert if a non-owner tries to call burnFromAddress", async function () {
      await expect(
        food.connect(addr1).burnFromAddress(addr2.address, 10)
      ).to.be.revertedWithCustomError(food, "OwnableUnauthorizedAccount");
    });

    it("should revert if burnFromAddress exceeds the target account balance", async function () {
      await expect(food.burnFromAddress(addr2.address, 101)).to.be.reverted;
    });

    it("should allow the owner to burn an entire account balance", async function () {
      await food.burnFromAddress(addr2.address, 100);

      expect(await food.balanceOf(addr2.address)).to.equal(0);
      expect(await food.totalSupply()).to.equal(200);
    });
  });

  describe("Transfers and approvals", function () {
    beforeEach(async function () {
      await food.mint(addr1.address, 100);
    });

    it("should allow normal ERC20 transfers", async function () {
      await expect(food.connect(addr1).transfer(addr2.address, 40)).to.not.be
        .reverted;

      expect(await food.balanceOf(addr1.address)).to.equal(60);
      expect(await food.balanceOf(addr2.address)).to.equal(40);
    });

    it("should allow approve and transferFrom", async function () {
      await food.connect(addr1).approve(addr2.address, 30);
      await food.connect(addr2).transferFrom(addr1.address, addr2.address, 30);

      expect(await food.balanceOf(addr1.address)).to.equal(70);
      expect(await food.balanceOf(addr2.address)).to.equal(30);
    });

    it("should correctly update allowance after transferFrom", async function () {
      await food.connect(addr1).approve(addr2.address, 50);
      await food.connect(addr2).transferFrom(addr1.address, addr2.address, 20);

      expect(await food.allowance(addr1.address, addr2.address)).to.equal(30);
    });
  });
});