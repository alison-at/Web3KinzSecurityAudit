const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Web3KinzFurniture", function () {
  let owner, addr1, addr2;
  let furniture;

  const IMAGE_0 =
    "ipfs://bafkreib62nibyvfegj2omkxmytg632fhxz473yxfcij7k7hvzynlf5jseu";
  const IMAGE_1 =
    "bafkreibzets4aisvn75hanrdr2usjqu5okyktbyjliv4wphgtn5t2nvgoq";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Web3KinzFurniture = await ethers.getContractFactory("Web3KinzFurniture");
    furniture = await Web3KinzFurniture.deploy(owner.address);
    await furniture.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully with the correct owner", async function () {
      expect(await furniture.owner()).to.equal(owner.address);
    });

    it("should have the correct name and symbol", async function () {
      expect(await furniture.name()).to.equal("Web3KinzFurniture");
      expect(await furniture.symbol()).to.equal("Furniture");
    });
  });

  describe("safeMint", function () {
    it("should allow the owner to mint furniture NFT with kind 0", async function () {
      await expect(furniture.safeMint(addr1.address, 0)).to.not.be.reverted;

      expect(await furniture.ownerOf(0)).to.equal(addr1.address);
      expect(await furniture.tokenURI(0)).to.equal(IMAGE_0);
    });

    it("should allow the owner to mint furniture NFT with kind 1", async function () {
      await expect(furniture.safeMint(addr1.address, 1)).to.not.be.reverted;

      expect(await furniture.ownerOf(0)).to.equal(addr1.address);
      expect(await furniture.tokenURI(0)).to.equal(IMAGE_1);
    });

    it("should assign token IDs incrementally", async function () {
      await furniture.safeMint(addr1.address, 0);
      await furniture.safeMint(addr2.address, 1);

      expect(await furniture.ownerOf(0)).to.equal(addr1.address);
      expect(await furniture.ownerOf(1)).to.equal(addr2.address);

      expect(await furniture.tokenURI(0)).to.equal(IMAGE_0);
      expect(await furniture.tokenURI(1)).to.equal(IMAGE_1);
    });

    it("should revert if a non-owner tries to mint", async function () {
      await expect(
        furniture.connect(addr1).safeMint(addr1.address, 0)
      ).to.be.revertedWithCustomError(furniture, "OwnableUnauthorizedAccount");
    });

    it("should revert when kind is out of bounds", async function () {
      await expect(furniture.safeMint(addr1.address, 2)).to.be.reverted;
    });

    it("should revert for large out-of-range kind values", async function () {
      await expect(furniture.safeMint(addr1.address, 255)).to.be.reverted;
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await furniture.safeMint(addr1.address, 0);
    });

    it("should allow the token owner to burn their NFT", async function () {
      await expect(furniture.connect(addr1).burn(0)).to.not.be.reverted;

      await expect(furniture.ownerOf(0)).to.be.reverted;
    });

    it("should revert tokenURI lookup after burn", async function () {
      await furniture.connect(addr1).burn(0);

      await expect(furniture.tokenURI(0)).to.be.reverted;
    });

    it("should revert if a non-owner/non-approved account tries to burn", async function () {
      await expect(furniture.connect(addr2).burn(0)).to.be.reverted;
    });
  });

  describe("supportsInterface", function () {
    it("should support the ERC721 interface", async function () {
      expect(await furniture.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("should support the ERC721Metadata interface", async function () {
      expect(await furniture.supportsInterface("0x5b5e139f")).to.equal(true);
    });
  });
});