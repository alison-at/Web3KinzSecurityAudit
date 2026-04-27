const { expect } = require("chai");
const { ethers } = require("hardhat");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");

describe("Web3Kinz", function () {
  let owner, addr1, addr2, addr3;
  let web3kinz;
  let food, pet, clothing;

  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
    const Web3Kinz = await ethers.getContractFactory("Web3Kinz");
    web3kinz = await Web3Kinz.deploy({ gasLimit: 80_000_000 });
    await web3kinz.waitForDeployment();
  
    const foodAddress = await web3kinz.food();
    const petAddress = await web3kinz.nftPet();
    const clothingAddress = await web3kinz.clothing();
  
    food = await ethers.getContractAt("Web3kinzFood", foodAddress);
    pet = await ethers.getContractAt("Web3KinzPet", petAddress);
    clothing = await ethers.getContractAt("Web3KinzClothing", clothingAddress);
  });

  /**
   * 
   * DEPLOYMENT TESTS
   * 
   */
  describe("Deployment", function () {
    it("should deploy child food contract", async function () {
      expect(await web3kinz.food()).to.not.equal(ethers.ZeroAddress);
    });

    it("should deploy child pet contract", async function () {
      expect(await web3kinz.nftPet()).to.not.equal(ethers.ZeroAddress);
    });

    it("should deploy child clothing contract", async function () {
      expect(await web3kinz.clothing()).to.not.equal(ethers.ZeroAddress);
    });

    // BUG: main contract does not deploy the child furniture contract in the constructor
    it("should deploy child furniture contract", async function () {
      expect(await web3kinz.furniture()).to.not.equal(ethers.ZeroAddress);
    });

    it("should initialize gem index mapping including webkinz diamond", async function () {
      const index = await web3kinz.gemToIndex(
        ethers.keccak256(ethers.toUtf8Bytes("webkinz diamond"))
      );
      expect(index).to.equal(0);
    });

      it("should initialize gem index mapping including jaded envy", async function () {
      const index = await web3kinz.gemToIndex(
        ethers.keccak256(ethers.toUtf8Bytes("jaded envy"))
      );
      expect(index).to.equal(15);
    });

    it("should initialize gem index mapping including carat eclipse", async function () {
      const index = await web3kinz.gemToIndex(
        ethers.keccak256(ethers.toUtf8Bytes("carat eclipse"))
      );
      expect(index).to.equal(29);
    });

    // BUG: unmapped gemToIndex keys return index 0 due to returning the default value of the mapping's value type
    it("should not allow users to use invalid gemToIndex keys", async function () {
      await expect(web3kinz.connect(addr1).checkGemAmount("fake gem")).to.be.reverted;
    });
  });

  /**
   * 
   * PET ADOPTION TESTS
   * 
   */
  describe("Pet adoption", function () {
    it("should revert if adoption payment is below 0.01 ether", async function () {
      await expect(
        web3kinz.connect(addr1).adoptPet(
          ethers.encodeBytes32String("cat"),
          ethers.encodeBytes32String("milo"),
          { value: ethers.parseEther("0.009") }
        )
      ).to.be.revertedWith("Adopting a pet costs 0.01 eth");
    });

    it("should allow a user to adopt a pet if they pay 0.01 ether", async function () {
      await expect(
        web3kinz.connect(addr1).adoptPet(
          ethers.encodeBytes32String("cat"),
          ethers.encodeBytes32String("milo"),
          { value: ethers.parseEther("0.01") }
        )
      ).to.emit(web3kinz, "PetAdopted");

      expect(await web3kinz.petToOwner(0)).to.equal(addr1.address);

      const petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(100);
      expect(petInfo.happiness).to.equal(100);
      expect(petInfo.sleeplevel).to.equal(100);
      expect(petInfo.asleep).to.equal(false);
      expect(petInfo.comatose).to.equal(false);

      expect(await pet.ownerOf(0)).to.equal(addr1.address);
    });

    it("should store correct petType and petName when user adopts a new pet", async function () {
      const adoptPet = await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("bird"),
        ethers.encodeBytes32String("carpool"),
        { value: ethers.parseEther("0.01") }
      );

      const receipt = await adoptPet.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "PetAdopted");
      const petId = event.args.petId;

      const thePet = await web3kinz.pets(petId);

      const nameOfPet = thePet.petName;
      const typeOfPet = thePet.petType;

      expect(nameOfPet).to.equal(ethers.encodeBytes32String("carpool"));
      expect(typeOfPet).to.equal(ethers.encodeBytes32String("bird"));
    });

    it("should allow a user to adopt a pet with the same type and name as an already owned pet", async function () {
      const adoptPet1 = await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("dodo"),
        { value: ethers.parseEther("0.01") }
      );

      const receipt = await adoptPet1.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "PetAdopted");
      const petId1 = event.args.petId;

      const adoptPet2 = await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("dodo"),
        { value: ethers.parseEther("0.01") }
      );

      const receipt2 = await adoptPet2.wait();
      const event2 = receipt2.logs.find(log => log.fragment?.name === "PetAdopted");
      const petId2 = event2.args.petId;

      expect(petId1).to.not.equal(petId2);
      
    });

    it("should allow a different user to adopt a pet if they pay 0.01 ether", async function () {
      await expect(
        web3kinz.connect(addr2).adoptPet(
          ethers.encodeBytes32String("dog"),
          ethers.encodeBytes32String("eevee"),
          { value: ethers.parseEther("0.01") }
        )
      ).to.emit(web3kinz, "PetAdopted");

      expect(await web3kinz.petToOwner(0)).to.equal(addr2.address);

      const petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(100);
      expect(petInfo.happiness).to.equal(100);
      expect(petInfo.sleeplevel).to.equal(100);
      expect(petInfo.asleep).to.equal(false);
      expect(petInfo.comatose).to.equal(false);

      expect(await pet.ownerOf(0)).to.equal(addr2.address);
    });

    // BUG: unexpected free KinzCash balance granted upon adopting a pet
    it("user should not have any KinzCash upon adopting their first pet", async function () {
      await expect(
        web3kinz.connect(addr1).adoptPet(
          ethers.encodeBytes32String("cat"),
          ethers.encodeBytes32String("dodo"),
          { value: ethers.parseEther("0.01") }
        )
      ).to.emit(web3kinz, "PetAdopted");

      expect(await web3kinz.petToOwner(0)).to.equal(addr1.address);

      const userInfo = await web3kinz.users(addr1.address);
      expect(userInfo.balance).to.equal(0);
      expect(userInfo.exists).to.equal(true);

      const petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(100);
      expect(petInfo.happiness).to.equal(100);
      expect(petInfo.sleeplevel).to.equal(100);
      expect(petInfo.asleep).to.equal(false);
      expect(petInfo.comatose).to.equal(false);

      expect(await pet.ownerOf(0)).to.equal(addr1.address);
    });

    it("should allow multiple pet adoptions with incrementing pet IDs", async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );

      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("dog"),
        ethers.encodeBytes32String("buddy"),
        { value: ethers.parseEther("0.01") }
      );

      expect(await web3kinz.petToOwner(0)).to.equal(addr1.address);
      expect(await web3kinz.petToOwner(1)).to.equal(addr1.address);

      expect(await pet.ownerOf(0)).to.equal(addr1.address);
      expect(await pet.ownerOf(1)).to.equal(addr1.address);
    });

    // additional test related to free KinzCash upon pet adoption bug
    it("adopting a pet should not grant user free KinzCash", async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );

      const userInfo = await web3kinz.users(addr1.address);
      const balanceAfterPetOne = userInfo.balance;

      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("dog"),
        ethers.encodeBytes32String("buddy"),
        { value: ethers.parseEther("0.01") }
      );

      const userInfoAfterPetTwo = await web3kinz.users(addr1.address);
      const balanceAfterPetTwo = userInfoAfterPetTwo.balance;
      expect(balanceAfterPetTwo).to.equal(balanceAfterPetOne);
    });
  });


  /**
   * 
   * BUYING KINZCASH TESTS
   * 
   */
  describe("KinzCash", function () {
    it("should allow a user to buy KinzCash", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 5000 });
      const userInfo = await web3kinz.users(addr1.address);
      expect(userInfo.balance).to.equal(5);
    });

    it("should emit the current KinzCash balance", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 7000 });

      await expect(web3kinz.connect(addr1).checkKinzcashBalance())
        .to.emit(web3kinz, "KinzcashBalance")
        .withArgs(addr1.address, 7);
    });
  });

  /**
   * 
   * BUYING FOOD, CLOTHING, FURNITURE ITEMS TESTS
   * 
   */
  describe("Shopping", function () {
    it("should allow purchaseFood and mint ERC20 food", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 100000 });

      await web3kinz.connect(addr1).purchaseFood(10);

      const userInfo = await web3kinz.users(addr1.address);
      expect(userInfo.balance).to.equal(80);
      expect(await food.balanceOf(addr1.address)).to.equal(10);
    });

    it("should revert purchaseFood if amount is zero", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 100000 });

      await expect(
        web3kinz.connect(addr1).purchaseFood(0)
      ).to.be.revertedWith("Must purchase at least 1 food item");
    });

    it("should revert purchaseFood when user has exactly amount * 2 KinzCash because of strict greater-than check", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 20000 }); // 20 KinzCash

      await expect(
        web3kinz.connect(addr1).purchaseFood(10)
      ).to.be.revertedWith("Not enough kinzcash");
    });

    it("should revert purchaseClothing when user has exactly 100 KinzCash because of strict greater-than check", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 1000 }); // 1 KinzCash

      await web3kinz.connect(addr1).purchaseClothing(0);

      await expect(
        web3kinz.connect(addr1).purchaseClothing(1)
      ).to.be.revertedWith("Clothing items cost 100 KinzCash");
    });

    it("should revert purchaseClothing when user has insufficient KinzCash", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 100000 }); // 100 KinzCash

      await expect(
        web3kinz.connect(addr1).purchaseClothing(0)
      ).to.be.revertedWith("Clothing items cost 100 KinzCash");
    });

    it("should allow purchasing clothing after obtaining more than 100 KinzCash", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 101000 }); // 101 KinzCash

      await web3kinz.connect(addr1).purchaseClothing(1);

      const userInfo = await web3kinz.users(addr1.address);
      expect(userInfo.balance).to.equal(1);
      expect(await clothing.ownerOf(0)).to.equal(addr1.address);
    });

    it("should allow purchasing kind 5 clothing, which becomes kind 2 due to modulo logic in the clothing contract", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 101000 });

      await web3kinz.connect(addr1).purchaseClothing(5);

      expect(await clothing.ownerOf(0)).to.equal(addr1.address);

      const uri = await clothing.tokenURI(0);
      expect(uri).to.equal(
        "bafkreigz2qq3wtwnywusd22rtzkkpihjl3ok7hcixixez4vklzeoahi32y"
      );
    });

    it("should revert if user tries to purchase clothing kind 2 directly", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 101000 });

      await expect(
        web3kinz.connect(addr1).purchaseClothing(2)
      ).to.be.revertedWith("Cannot Purchase Crown.");
    });

    // BUG: currently, furniture tests should all fail because furniture child contract wasn't deployed
    // like it should have been in constructor -- will test again for functionality w/fixed (as intended)
    // ver of the main sol files

    it("should revert if user attempts to purchase invalid furniture type", async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 100000 }); // 100 KinzCash

      await expect(
        web3kinz.connect(addr1).purchaseFurniture(150)
      ).to.be.revertedWith("Furniture type does not exist");
    });

    it("should revert if user attempts to purchase furniture with insufficient KinzCash balance", async function () {
      await expect(
        web3kinz.connect(addr1).purchaseFurniture(0)
      ).to.be.revertedWith("Furniture items cost 150 KinzCash");
    });

    it("should allow user to purchase furniture after acquiring 150 or more KinzCash", async function () {
      const userInfo = await web3kinz.users(addr1.address);
      const userBalance = userInfo.balance;
      
      await web3kinz.connect(addr1).buyKinzCash({ value: 200000 });

      expect(await web3kinz.connect(addr1).purchaseFurniture(0).to.not.reverted);
    });

    it("should correctly deduct 150 KinzCash from user upon furniture purchase", async function () {
      const userInfo = await web3kinz.users(addr1.address);
      const userBalance = userInfo.balance;
      
      await web3kinz.connect(addr1).buyKinzCash({ value: 200000 });

      await web3kinz.connect(addr1).purchaseFurniture(0);

      const userInfoAfterBuyingFurniture = await web3kinz.users(addr1.address);
      const userBalanceAfterBuyingFurniture = userInfoAfterBuyingFurniture.balance;

      expect(userBalanceAfterBuyingFurniture).to.equal(userBalance - 150);
    });

    // TO-DO: check again after furniture contract is init
    it("should correctly assign user as owner of nft image representing purchased item", async function () {
      const userInfo = await web3kinz.users(addr1.address);
      const userBalance = userInfo.balance;
      
      await web3kinz.connect(addr1).buyKinzCash({ value: 200000 });

      await web3kinz.connect(addr1).purchaseFurniture(0);

      const uri = await furniture.ownerOf(0).tokenURI(0);
      expect(uri).to.equal(
        "ipfs://bafkreib62nibyvfegj2omkxmytg632fhxz473yxfcij7k7hvzynlf5jseu"
      );
    });
  });

  /**
   * 
   * PET CARE FUNCTION TESTS
   * 
   */
  describe("Pet care", function () {
    beforeEach(async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );
    });

    /**
     *  SLEEP RELATED TESTS
     */
    it("should revert pet-owner-only functions for non-owners", async function () {
      await expect(web3kinz.connect(addr2).checkHunger(0)).to.be.reverted;
      await expect(web3kinz.connect(addr2).naptime(0)).to.be.reverted;
      await expect(web3kinz.connect(addr2).wakeup(0)).to.be.reverted;
      await expect(web3kinz.connect(addr2).feedPet(0, 1)).to.be.reverted;
    });

    it("should not change pet sleep level if pet is asleep and already at max", async function () {
      await web3kinz.connect(addr1).naptime(0);
      await increaseTime(100_000);
      
      await web3kinz.connect(addr1).checkSleepStats(0);
      const pet1AfterCheck = await web3kinz.connect(addr1).pets(0);

      await expect(pet1AfterCheck.sleeplevel).to.equal(100);
    });

    it("the minimum sleep level should be 0", async function () {
      await increaseTime(100_000_000);

      await web3kinz.connect(addr1).checkSleepStats(0);
      const pet1AfterCheck = await web3kinz.connect(addr1).pets(0);

      await expect(pet1AfterCheck.sleeplevel).to.equal(0);
    });

    it("sleep level should increase if pet is asleep and time has passed", async function () {
      // reduce sleeplevel to 0
      await increaseTime(100_000_000);
      await web3kinz.connect(addr1).checkSleepStats(0);

      const pet = await web3kinz.connect(addr1).pets(0);
      const initSleepLevel = await pet.sleeplevel;

      // put pet to sleep
      await web3kinz.connect(addr1).naptime(0);

      // increase time
      await increaseTime(3600);

      await web3kinz.connect(addr1).checkSleepStats(0);
      const pet1 = await web3kinz.connect(addr1).pets(0);
      const afterSleepLevel = await pet1.sleeplevel;

      await expect(afterSleepLevel).to.be.greaterThan(initSleepLevel);
    });

    it("sleep level should decrease if pet is awake and time has passed", async function () {
      const pet = await web3kinz.connect(addr1).pets(0);
      const initSleepLevel = await pet.sleeplevel;

      // increase time
      await increaseTime(100_000_000);

      await web3kinz.connect(addr1).checkSleepStats(0);

      const pet1 = await web3kinz.connect(addr1).pets(0);
      const afterSleepLevel = await pet1.sleeplevel;

      await expect(afterSleepLevel).to.be.lessThan(initSleepLevel);
    });

    it("should put a pet to sleep and wake it up", async function () {
      await web3kinz.connect(addr1).naptime(0);

      let petInfo = await web3kinz.pets(0);
      expect(petInfo.asleep).to.equal(true);

      await increaseTime(3600);
      await web3kinz.connect(addr1).wakeup(0);

      petInfo = await web3kinz.pets(0);
      expect(petInfo.asleep).to.equal(false);
    });

    it("should revert if user tries to put an already sleeping pet to bed", async function () {
      await web3kinz.connect(addr1).naptime(0);

      await expect(
        web3kinz.connect(addr1).naptime(0)
      ).to.be.revertedWith("Your pet is already sleeping!");
    });

    it("should revert if user tries to wake an already awake pet", async function () {
      await expect(
        web3kinz.connect(addr1).wakeup(0)
      ).to.be.revertedWith("Your pet is already awake!");
    });

    /**
     *  HUNGER RELATED TESTS
     */

    it("should reduce hunger after time passes", async function () {
      await increaseTime(3600); // 1 hour

      const hunger = await web3kinz.connect(addr1).checkHunger.staticCall(0);
      expect(hunger).to.equal(90);

      await web3kinz.connect(addr1).checkHunger(0);
      const petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(90);
    });

    it("should allow feeding a pet and burn food tokens", async function () {
      await web3kinz.connect(addr1).purchaseFood(10);

      expect(await food.balanceOf(addr1.address)).to.equal(10);

      await increaseTime(3600);
      await web3kinz.connect(addr1).checkHunger(0);

      let petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(90);

      await web3kinz.connect(addr1).feedPet(0, 5);

      petInfo = await web3kinz.pets(0);
      expect(petInfo.hunger).to.equal(95);
      expect(await food.balanceOf(addr1.address)).to.equal(5);
    });

    it("should revert feeding if user does not have enough food", async function () {
      await expect(
        web3kinz.connect(addr1).feedPet(0, 1)
      ).to.be.revertedWith("You don't have enough food");
    });

    /**
     *  HAPPINESS RELATED TESTS
     */
    it("should emit HappinessLevel event when checkHappiness is called", async function () {
      await expect(
        web3kinz.connect(addr1).checkHappiness(0)
      ).to.emit(web3kinz, "HappinessLevel");
    });

    /**
     *  TAKE TO VET RELATED TESTS
     */
    it("should revert if takeToVet function is called on pet outside of comatose", async function () {
      await expect(
        web3kinz.connect(addr1).takeToVet(0, {value: ethers.parseEther("0.005")})
      ).to.be.revertedWith("Your pet is perfectly healthy!")
    });

    it("should revert if takeToVet function is called with insufficient ETH", async function () {
      // put pet in comatose
      await web3kinz.connect(owner)._setStatsForTesting(0, 0, 0, 0);
      await web3kinz.connect(addr1).checkHunger(0);
      
      await expect(
        web3kinz.connect(addr1).takeToVet(0, {value: ethers.parseEther("0.0001")})
      ).to.be.revertedWith("The vet fee is 0.005 ETH")
    });

    it("should emit VetTrip event if takeToVet is called and runs successfully", async function () {
      // put pet in comatose
      await web3kinz.connect(owner)._setStatsForTesting(0, 0, 0, 0);
      await web3kinz.connect(addr1).checkHunger(0);
      
      await expect(
        web3kinz.connect(addr1).takeToVet(0, {value: ethers.parseEther("0.005")})
      ).to.emit(web3kinz, "VetTrip")
    });
  });

  /**
   * 
   * GAME FUNCTION TESTS
   * 
   * checkCrown(address user)
   * redeemCrown()
   * 
   * 
   */
  describe("Wheel of Wow", function () {
    beforeEach(async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );
    });
    it("should revert if less than 24 hours have past since last play time", async function () {
      await web3kinz.connect(addr1).wheelOfWow(0);
      
      await expect(web3kinz.connect(addr1).wheelOfWow(0)).to.be.revertedWith("24 hours have not yet passed!!")
    });

    it("should emit WheelPrize event after sucessful wheelOfWow game", async function () {
      expect(await web3kinz.connect(addr1).wheelOfWow(0)).to.emit(web3kinz, "WheelPrize");
    });

    it("should decrease hunger and sleep after sucessful wheelOfWow game", async function () {
      const pet = await web3kinz.connect(addr1).pets(0);
      const initHunger = await pet.hunger;
      const initSleepLevel = await pet.sleeplevel;
      const initHappiness = await pet.happiness;

      await web3kinz.connect(addr1).wheelOfWow(0);

      const petAfter = await web3kinz.connect(addr1).pets(0);
      const afterHunger = await petAfter.hunger;
      const afterSleepLevel = await petAfter.sleeplevel;
      const afterHappiness = await petAfter.happiness;
      
      expect(initHunger).to.be.greaterThan(afterHunger);
      expect(initSleepLevel).to.be.greaterThan(afterSleepLevel);
      expect(initHappiness).to.equal(100);
    });
  });

  describe("Wishing Well", function () {
    beforeEach(async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );
    });

    // BUG: a non-owner can call WishingWell on another user's pet due to missing isPetOwner(petId)
    it("should revert if a non-owner calls wishingWell on another user's pet", async function () {
      expect(await web3kinz.connect(addr2).wishingWell(0)).to.be.reverted;
    });

    // BUG: in the case that there is no matching pair (col1==col2, col2==col3) then goes to case
    // with rowprize == 5 instead of intended assignment rowprize = 5 --> fails test
    it("should increase the user's balance after a sucessful game of wishingWell", async function () {
      const before = await web3kinz.users(addr1.address);
      const beforeBalance = before.balance;

      await web3kinz.connect(addr1).wishingWell(0);

      const after = await web3kinz.users(addr1.address);
      const afterBalance = after.balance;
      const balanceDifference = after.balance - before.balance;

      expect(afterBalance).to.be.greaterThan(beforeBalance);
    });

    it("should revert if user's wish count is 0", async function () {
      // use 5 daily wishes
      web3kinz.connect(addr1).wishingWell(0)
      web3kinz.connect(addr1).wishingWell(0)
      web3kinz.connect(addr1).wishingWell(0)
      web3kinz.connect(addr1).wishingWell(0)
      web3kinz.connect(addr1).wishingWell(0)

      expect(web3kinz.connect(addr1).wishingWell(0)).to.be.revertedWith("You've run out of wishes, come back tomorrow!");
    });
  });

  describe("Gem Hunt", function () {
    beforeEach(async function () {
      await web3kinz.connect(addr1).adoptPet(
        ethers.encodeBytes32String("cat"),
        ethers.encodeBytes32String("milo"),
        { value: ethers.parseEther("0.01") }
      );
    });

    it("should revert if user tries to play gemHunt twice within 24 hours", async function () {
      await web3kinz.connect(addr1).gemHunt(0);

      await expect(
        web3kinz.connect(addr1).gemHunt(0)
      ).to.be.revertedWith("Gem hunt can only be played once a day");
    });

    // BUG: if gem is found, break does not exit the full game function and pet hunger, sleep, happiness still decrement
    it("should decrease pet hunger and sleep, and happiness after a successful gemHunt game", async function () {
      const petBefore = await web3kinz.connect(addr1).pets(0);
      const initHunger = petBefore.hunger;
      const initSleepLevel = petBefore.sleeplevel;
      const initHappiness = petBefore.happiness;

      const playGame = await web3kinz.connect(addr1).gemHunt(0);
      const receipt = await playGame.wait();
      const gemFoundEvent = receipt.logs.find((log) => log.fragment?.name === "GemFound");
      const gemIsFound = !!gemFoundEvent;

      const petAfter = await web3kinz.connect(addr1).pets(0);
      const afterHunger = petAfter.hunger;
      const afterSleepLevel = petAfter.sleeplevel;
      const afterHappiness = petAfter.happiness;

      if (gemIsFound) {
        expect(afterHappiness).to.be.greaterThanOrEqual(initHappiness);
      } else {
        expect(afterHappiness).to.be.lessThanOrEqual(initHappiness);
        expect(afterHunger).to.be.lessThanOrEqual(initHunger);
        expect(afterSleepLevel).to.be.lessThanOrEqual(initSleepLevel);
      }
    });

    it("should return false and emit CrownRedeemable(false) when user is missing any required gem", async function () {
      const result = await web3kinz.connect(addr1).checkCrown.staticCall(addr1.address);
      expect(result).to.equal(false);

      await expect(
        web3kinz.connect(addr1).checkCrown(addr1.address)
      ).to.emit(web3kinz, "CrownRedeemable").withArgs(addr1.address, false);
    });

    // BUG: iterative check over all gem type inventory does not check the 29th gem type 'carat eclipse'
    it("should return true and emit CrownRedeemable(true) when user has all required gems", async function () {
      const result = await web3kinz.connect(addr1).checkCrown.staticCall(addr1.address);
      expect(result).to.equal(true);

      await expect(
        web3kinz.connect(addr1).checkCrown(addr1.address)
      ).to.emit(web3kinz, "CrownRedeemable").withArgs(addr1.address, true);
    });

    it("should revert redeemCrown when user does not have enough gems", async function () {
      await expect(
        web3kinz.connect(addr1).redeemCrown()
      ).to.be.revertedWith("You don't have enough gems");
    });

    it("should revert redeemCrown when user does not have enough gems", async function () {
      await expect(
        web3kinz.connect(addr1).redeemCrown()
      ).to.be.revertedWith("You don't have enough gems");
    });

  });


  /**
   * 
   * TRADING ITEM TESTS
   * 
   */
  describe("Trading", function () {
    beforeEach(async function () {
      await web3kinz.connect(addr1).buyKinzCash({ value: 101000 });
      await web3kinz.connect(addr2).buyKinzCash({ value: 101000 });

      await web3kinz.connect(addr1).purchaseClothing(0);
      await web3kinz.connect(addr2).purchaseClothing(1);
    });

    it("should revert if a user proposes a trade with themselves", async function () {
      await expect(
        web3kinz.connect(addr1).proposeTrade(
          addr1.address,
          await web3kinz.clothing(),
          0,
          await web3kinz.clothing(),
          1
        )
      ).to.be.revertedWith("You cannot trade with yourself!");
    });

    it("should revert if proposer does not own the offered NFT", async function () {
      await expect(
        web3kinz.connect(addr3).proposeTrade(
          addr1.address,
          await web3kinz.clothing(),
          0,
          await web3kinz.clothing(),
          1
        )
      ).to.be.revertedWith("You don't own the item you're offering");
    });

    it("should create a trade proposal", async function () {
      await web3kinz.connect(addr1).proposeTrade(
        addr2.address,
        await web3kinz.clothing(),
        0,
        await web3kinz.clothing(),
        1
      );

      const trade = await web3kinz.trades(0);
      expect(trade.proposer).to.equal(addr1.address);
      expect(trade.receiver).to.equal(addr2.address);
      expect(trade.active).to.equal(true);
    });

    it("should allow the intended receiver to complete a trade after approvals", async function () {
      const clothingAddress = await web3kinz.clothing();

      await clothing.connect(addr1).approve(await web3kinz.getAddress(), 0);
      await clothing.connect(addr2).approve(await web3kinz.getAddress(), 1);

      await web3kinz.connect(addr1).proposeTrade(
        addr2.address,
        clothingAddress,
        0,
        clothingAddress,
        1
      );

      await web3kinz.connect(addr2).makeTrade(0);

      expect(await clothing.ownerOf(0)).to.equal(addr2.address);
      expect(await clothing.ownerOf(1)).to.equal(addr1.address);

      const trade = await web3kinz.trades(0);
      expect(trade.active).to.equal(false);
    });

    it("should revert if someone other than the intended receiver tries to accept the trade", async function () {
      const clothingAddress = await web3kinz.clothing();

      await clothing.connect(addr1).approve(await web3kinz.getAddress(), 0);
      await clothing.connect(addr2).approve(await web3kinz.getAddress(), 1);

      await web3kinz.connect(addr1).proposeTrade(
        addr2.address,
        clothingAddress,
        0,
        clothingAddress,
        1
      );

      await expect(
        web3kinz.connect(addr3).makeTrade(0)
      ).to.be.revertedWith("You are not the intended recipient");
    });
  });
});