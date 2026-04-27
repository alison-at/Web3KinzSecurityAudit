const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// TO-DO: rename
describe("checkGemAmount and sellGem functionality", function () {
  async function deployFixture() {
    const [owner, user1] = await ethers.getSigners();

    const Main = await ethers.getContractFactory("Web3Kinz");

    const web3kinz = await Main.deploy({ gasLimit: 80_000_000 });
    await web3kinz.waitForDeployment();

    return {owner, user1, web3kinz};
  }

  describe("checkGemAmount", function () {
    // BUG: issue with require check not being correctly aligned with valid gem indices
    it("Should allow user to check all valid gem types quantities", async function () {
      const {owner, user1, web3kinz} = await loadFixture(deployFixture);

      // 29th index gem
      const checkCaratEclipse = await web3kinz.connect(user1).checkGemAmount("carat eclipse");
      expect(checkCaratEclipse).to.not.be.reverted;

      const receipt2 = await checkCaratEclipse.wait();
      expect(checkCaratEclipse).to.emit(web3kinz, "GemAmount");
      const gemAmountEvent2 = receipt2.logs.find(log => log.fragment?.name === "GemAmount");
      const gemType = gemAmountEvent2.args.gem;

      expect(gemType).to.equal("carat eclipse")
    });

    // BUG: likely intended for checking the quantity of an invalid gem to revert, but not handled
    it("Should revert when user attempts to check an invalid gem's quantity", async function () {
      const {owner, user1, web3kinz} = await loadFixture(deployFixture);

      // invalid gem
      await expect(web3kinz.connect(user1).checkGemAmount("fake")).to.be.revertedWith("Invalid index");
    });
  });
  

  describe("sellGem", function () {
    // BUG: issue with require check not being correctly aligned with valid gem indices
    it("Should not revert when user attempts to sell valid gem types", async function () {
      const {owner, user1, web3kinz} = await loadFixture(deployFixture);

      // 29th index gem
      await expect(web3kinz.connect(user1).sellGem("carat eclipse")).to.not.be.reverted;
    });

    it("Should revert when user checks an invalid gem's quantity", async function () {
      const {owner, user1, web3kinz} = await loadFixture(deployFixture);

      // invalid gem
      await expect(web3kinz.connect(user1).sellGem("fake")).to.be.revertedWith("You don't have that gem");
    });

  });
});