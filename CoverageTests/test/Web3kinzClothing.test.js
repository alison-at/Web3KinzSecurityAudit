const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Web3KinzClothing", function () {
  let owner, addr1, addr2;
  let clothing;

  const IMAGE_0 =
    "ipfs://bafkreib62nibyvfegj2omkxmytg632fhxz473yxfcij7k7hvzynlf5jseu";
  const IMAGE_1 =
    "bafkreibzets4aisvn75hanrdr2usjqu5okyktbyjliv4wphgtn5t2nvgoq";
  const IMAGE_2 =
    "bafkreigz2qq3wtwnywusd22rtzkkpihjl3ok7hcixixez4vklzeoahi32y";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Web3KinzClothing = await ethers.getContractFactory("Web3KinzClothing");
    clothing = await Web3KinzClothing.deploy(owner.address);
    await clothing.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully with the correct owner", async function () {
      expect(await clothing.owner()).to.equal(owner.address);
    });

    it("should have the correct name and symbol", async function () {
      expect(await clothing.name()).to.equal("Web3KinzClothing");
      expect(await clothing.symbol()).to.equal("Clothes");
    });
  });

  describe("safeMint", function () {
    it("should allow the owner to mint clothing NFT", async function () {
      await expect(clothing.safeMint(addr1.address, 0)).to.not.be.reverted;

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
      expect(await clothing.tokenURI(0)).to.equal(IMAGE_0);
    });

    it("should assign token IDs incrementally", async function () {
      await clothing.safeMint(addr1.address, 0);
      await clothing.safeMint(addr2.address, 1);

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
      expect(await clothing.ownerOf(1)).to.equal(addr2.address);

      expect(await clothing.tokenURI(0)).to.equal(IMAGE_0);
      expect(await clothing.tokenURI(1)).to.equal(IMAGE_1);
    });

    it("should set the correct URI for kind 2", async function () {
      await clothing.safeMint(addr1.address, 2);

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
      expect(await clothing.tokenURI(0)).to.equal(IMAGE_2);
    });

    it("should revert if a non-owner tries to mint", async function () {
      await expect(
        clothing.connect(addr1).safeMint(addr1.address, 0)
      ).to.be.revertedWithCustomError(clothing, "OwnableUnauthorizedAccount");
    });

    it("should wrap kind values using modulo 3", async function () {
      // 5 % 3 = 2, so it should mint the third clothing image
      await clothing.safeMint(addr1.address, 5);

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
      expect(await clothing.tokenURI(0)).to.equal(IMAGE_2);
    });

    it("should wrap large kind values instead of reverting", async function () {
      // 255 % 3 = 0
      await clothing.safeMint(addr1.address, 255);

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
      expect(await clothing.tokenURI(0)).to.equal(IMAGE_0);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await clothing.safeMint(addr1.address, 1);
    });

    it("should allow the token owner to burn their NFT", async function () {
      await expect(clothing.connect(addr1).burn(0)).to.not.be.reverted;

      await expect(clothing.ownerOf(0)).to.be.reverted;
    });

    it("should revert tokenURI lookup after burn", async function () {
      await clothing.connect(addr1).burn(0);

      await expect(clothing.tokenURI(0)).to.be.reverted;
    });

    it("should revert if a non-owner/non-approved account tries to burn", async function () {
      await expect(clothing.connect(addr2).burn(0)).to.be.reverted;
    });
  });

  describe("supportsInterface", function () {
    it("should support the ERC721 interface", async function () {
      // ERC721 interface ID
      expect(await clothing.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("should support the ERC721Metadata interface", async function () {
      // ERC721Metadata interface ID
      expect(await clothing.supportsInterface("0x5b5e139f")).to.equal(true);
    });
  });
});