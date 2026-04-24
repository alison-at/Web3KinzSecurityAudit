const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Web3KinzPet", function () {
  let owner, addr1, addr2;
  let pet;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Web3KinzPet = await ethers.getContractFactory("Web3KinzPet");
    pet = await Web3KinzPet.deploy(owner.address);
    await pet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully with the correct owner", async function () {
      expect(await pet.owner()).to.equal(owner.address);
    });

    it("should have the correct name and symbol", async function () {
      expect(await pet.name()).to.equal("Web3KinzPet");
      expect(await pet.symbol()).to.equal("MTK");
    });
  });

  describe("safeMint", function () {
    it("should allow the owner to mint a pet NFT", async function () {
      await expect(pet.safeMint(addr1.address)).to.not.be.reverted;

      expect(await pet.ownerOf(0)).to.equal(addr1.address);
    });

    it("should assign token IDs incrementally", async function () {
      await pet.safeMint(addr1.address);
      await pet.safeMint(addr2.address);

      expect(await pet.ownerOf(0)).to.equal(addr1.address);
      expect(await pet.ownerOf(1)).to.equal(addr2.address);
    });

    it("should revert if a non-owner tries to mint", async function () {
      await expect(
        pet.connect(addr1).safeMint(addr1.address)
      ).to.be.revertedWithCustomError(pet, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await pet.safeMint(addr1.address);
    });

    it("should allow the token owner to burn their NFT", async function () {
      await expect(pet.connect(addr1).burn(0)).to.not.be.reverted;

      await expect(pet.ownerOf(0)).to.be.reverted;
    });

    it("should revert if a non-owner/non-approved account tries to burn", async function () {
      await expect(pet.connect(addr2).burn(0)).to.be.reverted;
    });
  });

  describe("supportsInterface", function () {
    it("should support the ERC721 interface", async function () {
      expect(await pet.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("should support the ERC721Metadata interface", async function () {
      expect(await pet.supportsInterface("0x5b5e139f")).to.equal(true);
    });
  });
});