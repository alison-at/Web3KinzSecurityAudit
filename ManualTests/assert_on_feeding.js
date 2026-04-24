const hre = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
describe("Feed Pets, Food Token Functionality", function () {

    async function deployTokenFixture() {
        const [owner, owner2] = await hre.ethers.getSigners();

        const Main = await hre.ethers.getContractFactory("Web3Kinz");
        const web3kinz = await Main.deploy();
        await web3kinz.waitForDeployment();

        return { owner, owner2, web3kinz };
    }

    describe("Transactions", function () {

        it("Should handle full pet feeding correctly", async function () {
            const { owner, owner2, web3kinz } = await loadFixture(deployTokenFixture);

            // adopt pet
            const petType = hre.ethers.encodeBytes32String("dog");
            const petName = hre.ethers.encodeBytes32String("Chopper");

            const tx = await web3kinz.adoptPet(petType, petName, {
                value: hre.ethers.parseEther("0.01")
            });

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment?.name === "PetAdopted");
            const petId = event.args.petId;

            // check kinzcash balance
            const kinztx = await web3kinz.checkKinzcashBalance();
            const receipt1 = await kinztx.wait();
            const kinzevent = receipt1.logs.find(log => log.fragment?.name === "KinzcashBalance");
            const balance = kinzevent.args.balance;

            expect(balance).to.equal(100n);

            // food contract
            const foodAddress = await web3kinz.food();
            const Food = await hre.ethers.getContractFactory("Web3kinzFood");
            const food = Food.attach(foodAddress);

            const foodBalanceBeforeBuying = await food.balanceOf(owner.address);
            expect(foodBalanceBeforeBuying).to.equal(0n);

            //let time pass to make pet hungry
            await time.increase(3600)

            // hunger level
            const hltx = await web3kinz.checkHunger(petId);
            const receipt7 = await hltx.wait();
            const hlevent = receipt7.logs.find(log => log.fragment?.name === "HungerLevel");
            const hungerLevel = hlevent.args.hunger;
            console.log("hunger after wait, before feeding: ", hungerLevel);

            expect(hungerLevel).to.equal(90n);

            // buy food
            await (await web3kinz.purchaseFood(5)).wait();

            const foodBalanceBought = await food.balanceOf(owner.address);
            expect(foodBalanceBought).to.equal(5n);

            // feed pet
            await (await web3kinz.feedPet(petId, 5)).wait();

            const foodBalanceAfterFeeding = await food.balanceOf(owner.address);
            expect(foodBalanceAfterFeeding).to.equal(0n);
            
            // hunger after feeding
            const hltx2 = await web3kinz.checkHunger(petId);
            const receipt8 = await hltx2.wait();
            const hlevent2 = receipt8.logs.find(log => log.fragment?.name === "HungerLevel");
            const hungerLevel2 = hlevent2.args.hunger;

            expect(hungerLevel2).to.equal(95n);
            
            // === exploit test ===
            const petTypeOwner2 = hre.ethers.encodeBytes32String("cat");
            const petNameOwner2 = hre.ethers.encodeBytes32String("Whiskers");
            
            await web3kinz.connect(owner2).adoptPet(petTypeOwner2, petNameOwner2, {
                value: hre.ethers.parseEther("0.01")
            });
            console.log("HERE");
            await (await web3kinz.connect(owner2).purchaseFood(5)).wait();

            const owner2FoodBalanceBought = await food.balanceOf(owner2.address);
            expect(owner2FoodBalanceBought).to.equal(5n);
            
            // impersonate contract
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [web3kinz.target],
            });

            const kinzSigner = await hre.ethers.getSigner(web3kinz.target);

            await food.connect(kinzSigner).burnFromAddress(owner2.address, 3);

            const owner2FoodBalanceBought2 = await food.balanceOf(owner2.address);

            // this SHOULD NOT change if burn is gated
            expect(owner2FoodBalanceBought2).to.equal(5n);
        });

    });
});