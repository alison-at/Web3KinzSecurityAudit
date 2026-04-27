// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Web3kinzFood.sol";
import "./Web3KinzPet.sol";
import "./Web3kinzClothing.sol";
import "./Web3KinzFurniture.sol";
import "../openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Base contract for Web3Kinz. Holds all common structs, events, and base variables.
/// @author Olivia Boyer, Rebecca Lassman, Glory Zhang


contract Web3Kinz {

    // *************
    // ** structs **
    // *************

    /// @dev The main pet struct. Every pet in Web3Kinz is represented by a copy of this struct
    // Size: 968 bytes
    struct Pet {
        // pet needs
        uint256 hunger;
        uint16 happiness;
        uint8 sleeplevel; //out of 100
        //for calculating sleeplevel
        //same variable for sleeping time and wake-time
        //usage depends on asleep bool
        uint32 sleeptime;
        uint256 hungertime;
        //pet status
        bool asleep;
        bool comatose;
        // pet information
        uint256 petID; // unique pet id (from nft code)
        bytes32 petType; // pet type
        bytes32 petName; // pet name (this can be a bug)
        uint64 birthTime; // to give the pet a birthday
    }

    // stores information on each user
    struct UserInfo {
        uint256 balance; // amount of kinzcash
        //times reset after 24 hours
        uint64 lastGemHunt; //time of last gem hunt
        uint64 lastWheelOfWoW; //time of last wheel spin
        uint64 lastWish; //time of last wish in wishing well
        uint8 wishes; //number of daily wishes left
        bool exists; //used for checking if user in users mapping
       // Pet[] pets; // pets owned by user
    }

    // tracks the offer made
    struct TradeOffer {
        address proposer; // user making trade offer
        address receiver; // user receiving trade offer
        address nftAddressA; // clothing or furniture of proposer
        uint256 tokenIdA;
        address nftAddressB; // clothing or furniture of receiver
        uint256 tokenIdB;
        bool active;
    }

    mapping(uint256 => TradeOffer) public trades;
    uint256 public tradeCounter;

    // *************
    // ** storage **
    // *************

    // for pet nft contract
    Web3KinzPet public nftPet;
    Web3KinzClothing public clothing;
    Web3kinzFood public food;
    Web3KinzFurniture public furniture;

    //owner
    address owner;

    // global variable for total amount of food items
    uint256 gameFoodCount = 100;

    // global variable for total amount of furniture items
    uint256 gameFurnitureCount = 100;

    // global variable for total amount of clothing items
    uint256 gameClothingCount = 100;


    // mappings + arrays

    // general
    mapping(uint256 => address) public petToOwner; // petID to owner address
    Pet[] public pets; // index = petID

    mapping(address => UserInfo) public users; //mapping of users and their information

    uint256 private nonce = 0; // used for random number generation

    // gem hunt
    mapping(address => uint256[30]) public userGems; // stores users' gems

    mapping(bytes32 => uint256) public gemToIndex; // stores index position for each gem

    // ***************
    // ** Events **
    // ***************

    // for gem hunt
    event GemFound(address user, string gem);

    event GemAmount(address user, string gem, uint256 amount);

    event CrownRedeemable(address user, bool redeemable);

    // for adoption
    event PetAdopted(uint256 petId, address owner);

    // for kinzcash
    event KinzcashBalance(address user, uint256 balance);

    // for pet care
    event HungerLevel(uint256 petId, uint256 hunger);

    event HappinessLevel(uint256 petId, uint16 happiness);

    event SleepLevel(uint256 petId, uint8 sleep);
    // for vet trip
    event VetTrip(uint256 petId);

    // for wheel of wow
    event WheelPrize(string prizeType, uint256 amountOrId);

    // ***************
    // ** functions **
    // ***************

    // in order to build test for takeToVet need to induce comatose state using this helper function
    function _setStatsForTesting(uint256 petId, uint16 _happiness, uint256 _hunger, uint8 _sleeplevel) external onlyOwner {
        pets[petId].happiness = _happiness;
        pets[petId].hunger = _hunger;
        pets[petId].sleeplevel = _sleeplevel;
    }

    // modifier for only owner
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    // modifier isSleeping - cannot play games when pet is sleeping
    modifier isAwake(Pet memory target) {
        require(target.asleep == false, "Your pet is asleep. Wake them up!");
        _;
    }

    //check if pet is comatose
    modifier notComatose(Pet memory target) {
        require(target.comatose == false, "Your pet is comatose. Take them to the vet!!");
        _;
    }

    //check if sender had adopted a pet
    //needed to play games
    modifier hasPet(address addr) {
        require(users[addr].exists, "You need to adopt a pet first!!");
        _;
    }

    //check if sender is the owner of the pet they are interacting with
    modifier isPetOwner(uint256 petId) {
        require(petToOwner[petId] == msg.sender);
        _;
    }


    // constructor (deploys nft contracts)
    constructor() payable {
        owner = msg.sender;
        //nftPet = NFT(_nftAddress);
        //clothing = CNFT(_clothaddr);
        //food = FT(_foodaddr);

        food = new Web3kinzFood(address(this));
        nftPet = new Web3KinzPet(address(this));
        clothing = new Web3KinzClothing(address(this));

        // set up gem index mapping
        gemToIndex[keccak256("webkinz diamond")] = 0;
        gemToIndex[keccak256("unicorn horn")] = 1;
        gemToIndex[keccak256("yum zum sparkle")] = 2;
        gemToIndex[keccak256("zingos zincoz")] = 3;
        gemToIndex[keccak256("goober glitter")] = 4;
        gemToIndex[keccak256("booger nugget")] = 5;
        gemToIndex[keccak256("red ruby heart")] = 6;
        gemToIndex[keccak256("ember amber")] = 7;
        gemToIndex[keccak256("volcano viscose")] = 8;
        gemToIndex[keccak256("flare fyca")] = 9;
        gemToIndex[keccak256("torch treasure")] = 10;
        gemToIndex[keccak256("lava lamp")] = 11;
        gemToIndex[keccak256("earth emerald")] = 12;
        gemToIndex[keccak256("moss marble")] = 13;
        gemToIndex[keccak256("cat's eye glint")] = 14;
        gemToIndex[keccak256("jaded envy")] = 15;
        gemToIndex[keccak256("pearl egg")] = 16;
        gemToIndex[keccak256("terra tectonic")] = 17;
        gemToIndex[keccak256("ocean sapphire")] = 18;
        gemToIndex[keccak256("teardrop tower")] = 19;
        gemToIndex[keccak256("sea stone")] = 20;
        gemToIndex[keccak256("rainbow flower")] = 21;
        gemToIndex[keccak256("river ripple")] = 22;
        gemToIndex[keccak256("aqua orb")] = 23;
        gemToIndex[keccak256("corona topaz")] = 24;
        gemToIndex[keccak256("aurora rax")] = 25;
        gemToIndex[keccak256("pyramid plunder")] = 26;
        gemToIndex[keccak256("starlight shimmer")] = 27;
        gemToIndex[keccak256("lemon drop")] = 28;
        gemToIndex[keccak256("carat eclipse")] = 29;                
    }


    // *******************
    // ** eth functions **
    // *******************

    // adoption
    function adoptPet(bytes32 petType, bytes32 petName) public payable {
        // payment
        require(msg.value >= 0.01 ether, "Adopting a pet costs 0.01 eth"); // idk what price we want

       // mint pet nft
        uint256 petId = nftPet.safeMint(msg.sender);

         // create pet struct
        Pet memory p = Pet({hunger: 100, happiness: 100, sleeplevel: 100, sleeptime: uint32(block.timestamp), hungertime: uint32(block.timestamp),
        asleep: false, comatose: false, petID: petId, petType: petType, petName: petName, 
        birthTime: uint64(block.timestamp)});

        // assign pet to owner & store pet
        if (!users[msg.sender].exists) {
            uint64 curtime = uint64(block.timestamp);
            users[msg.sender] = UserInfo({balance: 0, lastGemHunt: curtime - 1 days, lastWheelOfWoW: curtime - 1 days, lastWish: curtime - 1 days, wishes: 5, exists: true});
        }
        petToOwner[petId] = msg.sender;
        pets.push(p);

        // for testing lol
        users[msg.sender].balance += 100;

        // emit event (to give user petid)
        emit PetAdopted(petId, msg.sender);
    }

    // purchase KinzCash
    function buyKinzCash() public payable{
        //1 kinzCash == 1000 wei
        uint256 bought = msg.value / 1000;
        users[msg.sender].balance += bought;
    }

    // user can see amount of kinzcash they have
    function checkKinzcashBalance() public {
        // get balance
        uint256 balance = users[msg.sender].balance;

        // emit event
        emit KinzcashBalance(msg.sender, balance);
    }

    // ************************
    // ** KinzCash functions **
    // ************************
    
    // purchase furniture - furniture is NFT
    // kind: type of furniture to purchase
    function purchaseFurniture(uint8 kind) public {
        // limited number of furniture
        require(kind < 100, "Furniture type does not exist.");
        // make a purchase using KinzCash
        require(users[msg.sender].balance >= 150, "Furniture items cost 150 KinzCash");
        users[msg.sender].balance -= 150;
        // call function from other contract
        furniture.safeMint(msg.sender, kind);
    }
    
    // purchase pet clothing - clothing is NFT
    // kind: type of clothing to purchase 
    function purchaseClothing(uint8 kind) public {
        // there are only 100 clothing items
        require(kind < 100, "Clothing type does not exist.");
        require(kind != 2, "Cannot Purchase Crown.");
        require(users[msg.sender].balance > 100, "Clothing items cost 100 KinzCash");
        users[msg.sender].balance -= 100;
        // call function from other contract
        clothing.safeMint(msg.sender, kind);
    }

    // purchase pet food - food is ERC20
    function purchaseFood(uint256 amount) public {
        // check balance
        // price of food is 2 kinzcash per hunger point (maybe change)
        require(users[msg.sender].balance > amount * 2, "Not enough kinzcash");
        require(amount > 0, "Must purchase at least 1 food item");

        // update balance
        users[msg.sender].balance -= amount * 2;

        // mint food
        food.mint(msg.sender, amount);
    }

    // ************************
    // ** pet care functions **
    // ************************

    //recalculates pet sleeplevel based on time since last 
    function checkSleepStats(uint256 petId) isPetOwner(petId) public returns (uint8) {
        uint32 timedif = ((uint32(block.timestamp) - pets[petId].sleeptime) / 3600) * 13;
        if (timedif > 100) {
            timedif = 100;
        }

        if (pets[petId].asleep) {
            pets[petId].sleeplevel += uint8(timedif);
            if (pets[petId].sleeplevel > 100) {
                pets[petId].sleeplevel = 100;
            }
        } else {
            if (pets[petId].sleeplevel < uint8(timedif)) {
                timedif = pets[petId].sleeplevel;
            }
            pets[petId].sleeplevel -= uint8(timedif);
        }
        
        // check health
        _checkHealth(petId);

        //update sleeptime to prevent issues for wakeup function
        pets[petId].sleeptime = uint32(block.timestamp);
        emit SleepLevel(petId, pets[petId].sleeplevel);
        return pets[petId].sleeplevel;
    }

    // check hunger level
    function checkHunger(uint256 petId) isPetOwner(petId) public returns (uint256) {
        updateHunger(petId);

        // emit event so user can see
        emit HungerLevel(petId, pets[petId].hunger);

        return pets[petId].hunger;
    }

    // helper function to calc hunger decrease over time
    function updateHunger(uint256 petId) internal {
        uint256 timedif = ((uint256(block.timestamp) - pets[petId].hungertime) / 3600) * 10;

        if (timedif > 100) {
            timedif = 100;
        }

        if (pets[petId].hunger < timedif) {
            timedif = pets[petId].hunger;
        }

        pets[petId].hunger -= uint8(timedif);
        pets[petId].hungertime = uint32(block.timestamp);

        // check health
        _checkHealth(petId);
    }

    function checkHappiness(uint256 petId) isPetOwner(petId) public {
        emit HappinessLevel(petId, pets[petId].happiness);
    }

    // put pet to bed
    function naptime(uint256 petId) isPetOwner(petId) public {
        require(!pets[petId].asleep, "Your pet is already sleeping!");
        pets[petId].asleep = true;
        //update sleeptime
        pets[petId].sleeptime = uint32(block.timestamp);
    }

    // wake pet up
    function wakeup(uint256 petId) isPetOwner(petId) public {
        require(pets[petId].asleep, "Your pet is already awake!");
        pets[petId].asleep = false;
        // full sleep is a little under 8 hours, regain sleep level at rate of 13 per hour
        uint32 addup = ((uint32(block.timestamp) - pets[petId].sleeptime)/3600)*13;
        // maximum sleep level is 100
        if (addup > 100) {
            addup = 100;
        }
        if (addup + pets[petId].sleeplevel > 100) {
            pets[petId].sleeplevel = 100;
        } else {
            pets[petId].sleeplevel += uint8(addup);
        }
        // update wake time
        pets[petId].sleeptime = uint32(block.timestamp); 
    }

    // feed pet
    // uses food tokens directly, burns once used
    function feedPet(uint256 petId, uint256 amount) isPetOwner(petId) public {
        // check user has enough food
        require(food.balanceOf(msg.sender) >= amount, "You don't have enough food");

        // remove food tokens
        food.burnFromAddress(msg.sender, amount);
        // burns from caller

        // update pet hunger
        if (pets[petId].hunger + amount > 100) {
            pets[petId].hunger = 100;
        } else {
            pets[petId].hunger += uint256(amount);
        }
    }
    
    // take pet to the vet
    function takeToVet(uint256 petId) public payable isPetOwner(petId) {
        // check if pet is comatose
        require(pets[petId].comatose == true, "Your pet is perfectly healthy!");

        // pay vet fee
        require(msg.value >= 0.005 ether, "The vet fee is 0.005 ETH");

        // revive pet and reset basic needs
        pets[petId].comatose = false;
        pets[petId].hunger = 50;
        pets[petId].sleeplevel = 50;
        pets[petId].happiness = 50;

        // reset timers so needs don't immediately drop
        pets[petId].hungertime = uint32(block.timestamp);
        pets[petId].sleeptime = uint32(block.timestamp);

        // emit an event
        emit VetTrip(petId);
    } 

    // check health stats and determine if comatose
    function _checkHealth(uint256 petId) internal {
        if (pets[petId].hunger == 0 && pets[petId].sleeplevel == 0 && pets[petId].happiness == 0) {
            pets[petId].comatose = true;
        }
    }

    // ************************
    // ** gameplay functions **
    // ************************

    //TODO: modify to match new storage form
    // spinning a wheel - give you furniture, clothes, KinzCash - once a day //glory
    function wheelOfWow(uint32 petId) public isPetOwner(petId) notComatose(pets[petId]) {
        uint256 cashAmount;
        // check the time, ensure 24 hours has past since last play time
        require(block.timestamp >= users[msg.sender].lastWheelOfWoW + 1 days, "24 hours have not yet passed!!");
        // update mapping to current time
        users[msg.sender].lastWheelOfWoW = uint64(block.timestamp);

        // generate a random number
        uint256 wowValue = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 100;
        nonce++;

        // logic for prizes
        // random selection of clothing
        if (wowValue < 10) {
            // generate random value
            uint8 clothingKind = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % gameClothingCount);
            nonce++;

            // mint clothing nft
            clothing.safeMint(msg.sender, clothingKind);

            // emit event
            emit WheelPrize("Clothing", clothingKind);
        }
        // random selection of furniture
        else if (wowValue < 30) {
            // generate random value
            uint8 furnitureKind = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % gameClothingCount);
            nonce++;

            // mint furniture nft
            furniture.safeMint(msg.sender, furnitureKind);

            // emit event
            emit WheelPrize("Furniture", furnitureKind);
        }
        // random selection of food
        else if (wowValue < 50) {
            // generate a random number to select a random food from the gameFoodDirectory array
            //uint256 foodIndex = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % gameFoodCount;
            //nonce++;

            // increment count for specific food item in user's inventory
            //userFoodCount[msg.sender][foodIndex] += 1;
            food.mint(msg.sender, 10);

            // emit event
            emit WheelPrize("Food", 10);
        }
        // random amount of KinzCash
        else {
            // receive 20 KinzCash
            if (wowValue < 60) {
                // specified win value
               cashAmount = 20;
            }
            // receive 50 KinzCash
            else if (wowValue < 70) {
                // specified win value
                cashAmount = 50;
            }
            // receive 100 KinzCash
            else if (wowValue < 80) {
                // specified win value
                cashAmount = 100;
            }
            // receive 500 KinzCash
            else if (wowValue < 90) {
                // specified win value
                cashAmount = 500;
            }
            // receive random amount of KinzCash between 20 and 500
            else if (wowValue < 100) {
                // 500 - 20 = 480 => use % 481 to include 480 and add 20 to make up for the offset
                cashAmount = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 481) + 20;
                nonce++;
            }
            // output owed amount to user's account
            users[msg.sender].balance += cashAmount;

            // emit event
            emit WheelPrize("KinzCash", cashAmount);
        }

        // decrease hunger & sleep after playing
        if (pets[petId].hunger > 5) {
            pets[petId].hunger -= 5;
        } else {
            pets[petId].hunger = 0;
        }

        if (pets[petId].sleeplevel > 5) {
            pets[petId].sleeplevel -= 5;
        } else {
            pets[petId].sleeplevel = 0;
        }

        // increase happiness after playing
        if (pets[petId].happiness <= 90) {
            pets[petId].happiness += 10;
        } else {
            pets[petId].happiness = 100;
        }
    }

    //helper function for Wishing Well game
    //converts random number to a value from 0-8
    //representing the 9 possible icons rolled
    function findResult(uint8 target) private pure returns (uint8) {
        //checks if is fruit
        if (target < 80) {
            //decide if fruit number 0-3
            return target / 20;
        }
        //checks if is animal
        if (target < 100) {
            //decide if animal number 4-7
            return 4 + ((target - 80) / 5);
        }
        //must be well
        return 8;
    }

    // wishing well - slot machine (3 random number generators) - KinzCash, once a day x5// olivia
   function wishingWell(uint32 petId) public notComatose(pets[petId]) {

           // check the time, ensure 24 hours has past since last play time
     
        if (block.timestamp >= users[msg.sender].lastWish + 1 days){
        // update mapping to current time
        users[msg.sender].lastWish = uint64(block.timestamp);
        users[msg.sender].wishes = 5;
        }

        require(users[msg.sender].wishes > 0, "You've run out of wishes, come back tomorrow!");

        uint16 prize = 0;
        uint8 col1;
        uint8 col2;
        uint8 col3;
        uint8 typematch;
        uint8 matchCount;
        uint16 rowprize;
        //there are three rows
        for (int i = 0; i < 3; i++) {
                //generate items randomly 
                //9 options: 4 fruits, 4 animals; and 1 well
                //odds of fruit: 19.8%; odds of animal: 5%; odds of well: 0.99%
                col1 = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 101);
                col1 = findResult(col1);
                nonce++;

                col2 = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 101);
                col2 = findResult(col2);
                nonce++;

                col3 = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 101);
                col3 = findResult(col3);
                nonce++;

                //type of item there was a match of
                typematch = 27; //random number outside of range of item numbers
                //max number of matching items
                matchCount = 1;

                if (col1 == col2) {
                    typematch = col1;
                    matchCount++;
                } 

                if (col2 == col3) {
                    typematch = col2;
                    matchCount++;
                }
                
                rowprize = 0;

                if (matchCount == 2) {
                    //fruit
                    if (typematch < 4) {

                        rowprize = 5;
                    //animal
                    } else if (typematch < 8) {

                        rowprize =10;
                    } else {
                    //well
                        rowprize = 50;
                    }

                    //check type and dole out rewards
                } else if (matchCount == 3) {
                    //fruit
                     if (typematch < 4) {

                        rowprize = 35;
                    //animal
                    } else if (typematch < 8) {

                        rowprize = 100;
                    //well
                    } else {

                        rowprize = 1000;
                    }
                    //check if there is a single well
                } else if (matchCount == 1) {

                    if (col1 == 8 || col2 == 8 || col3 == 8) {

                        rowprize == 5;
                    }
                }
                //the prize for the middle row is tripled
                if (i == 1) {

                    rowprize = rowprize * 3;
                }

                prize += rowprize;
        }
        users[msg.sender].wishes -= 1; //decrement daily wish count before cashout
           if (pets[petId].hunger > 5) {
            pets[petId].hunger -= 5;
        } else {
            pets[petId].hunger = 0;
        }

        if (pets[petId].sleeplevel > 5) {
            pets[petId].sleeplevel -= 5;
        } else {
            pets[petId].sleeplevel = 0;
        }

        // decrease happiness for no gem
        if (prize == 0){
        if (pets[petId].happiness > 5) {
            pets[petId].happiness -= 5;
        } else {
            pets[petId].happiness = 0;
        }
        } else {
               if (pets[petId].happiness <= 90) {
                    pets[petId].happiness += 10;
                } else {
                    pets[petId].happiness = 100;
                } 
        }
        users[msg.sender].balance += prize; //add prize money to user balance
    }

    // gem hunt game
    // user gets 3 tries to find a gem
    // can play once per day
    // (gems are tracked as numbers in array, not nfts)
    function gemHunt(uint256 petId) public isPetOwner(petId) notComatose(pets[petId]) {
        // check time
        require(block.timestamp - users[msg.sender].lastGemHunt >= 1 days, "Gem hunt can only be played once a day");

        // update time
        users[msg.sender].lastGemHunt = uint64(block.timestamp);

        // for 3 tries
        for (int i=0; i<3; i++) {
            // generate random number
            uint256 randomNumber = uint256(keccak256(abi.encodePacked(
                block.timestamp, 
                msg.sender, 
                nonce
            )));
            nonce++;

            // got gem
            if ((randomNumber % 100) < 50) {
                string memory gem;

                // randomly choose gem (weighted by rarity)
                uint256 randomNumber2 = uint256(keccak256(abi.encodePacked(
                    block.timestamp, 
                    msg.sender, 
                    nonce
                )));
                nonce++;
                
                uint256 gemNum = randomNumber2 % 425;

                // white gems
                if (gemNum < 5) {
                    gem = "webkinz diamond";
                    userGems[msg.sender][0]++;
                } else if (gemNum < 15) {
                    gem = "unicorn horn";
                    userGems[msg.sender][1]++;
                } else if (gemNum < 25) {
                    gem = "yum zum sparkle";
                    userGems[msg.sender][2]++;
                } else if (gemNum < 45) {
                    gem = "zingos zincoz";
                    userGems[msg.sender][3]++;
                } else if (gemNum < 65) {
                    gem = "goober glitter";
                    userGems[msg.sender][4]++;
                } else if (gemNum < 85) {
                    gem = "booger nugget";
                    userGems[msg.sender][5]++;

                // red gems
                } else if (gemNum < 90) {
                    gem = "red ruby heart";
                    userGems[msg.sender][6]++;
                } else if (gemNum < 100) {
                    gem = "ember amber";
                    userGems[msg.sender][7]++;
                } else if (gemNum < 110) {
                    gem = "volcano viscose";
                    userGems[msg.sender][8]++;
                } else if (gemNum < 130) {
                    gem = "flare fyca";
                    userGems[msg.sender][9]++;
                } else if (gemNum < 150) {
                    gem = "torch treasure";
                    userGems[msg.sender][10]++;
                } else if (gemNum < 170) {
                    gem = "lava lamp";
                    userGems[msg.sender][11]++;

                // green gems
                } else if (gemNum < 175) {
                    gem = "earth emerald";
                    userGems[msg.sender][12]++;
                } else if (gemNum < 185) {
                    gem = "moss marble";
                    userGems[msg.sender][13]++;
                } else if (gemNum < 195) {
                    gem = "cat's eye glint";
                    userGems[msg.sender][14]++;
                } else if (gemNum < 215) {
                    gem = "jaded envy";
                    userGems[msg.sender][15]++;
                } else if (gemNum < 235) {
                    gem = "pearl egg";
                    userGems[msg.sender][16]++;
                } else if (gemNum < 255) {
                    gem = "terra tectonic";
                    userGems[msg.sender][17]++;

                // blue gems
                } else if (gemNum < 260) {
                    gem = "ocean sapphire";
                    userGems[msg.sender][18]++;
                } else if (gemNum < 270) {
                    gem = "teardrop tower";
                    userGems[msg.sender][19]++;
                } else if (gemNum < 280) {
                    gem = "sea stone";
                    userGems[msg.sender][20]++;
                } else if (gemNum < 300) {
                    gem = "rainbow flower";
                    userGems[msg.sender][21]++;
                } else if (gemNum < 320) {
                    gem = "river ripple";
                    userGems[msg.sender][22]++;
                } else if (gemNum < 340) {
                    gem = "aqua orb";
                    userGems[msg.sender][23]++;
                }

                // yellow gems
                else if (gemNum < 345) {
                    gem = "corona topaz";
                    userGems[msg.sender][24]++;
                } else if (gemNum < 355) {
                    gem = "aurora rax";
                    userGems[msg.sender][25]++;
                } else if (gemNum < 365) {
                    gem = "pyramid plunder";
                    userGems[msg.sender][26]++;
                } else if (gemNum < 385) {
                    gem = "starlight shimmer";
                    userGems[msg.sender][27]++;
                } else if (gemNum < 405) {
                    gem = "lemon drop";
                    userGems[msg.sender][28]++;
                } else if (gemNum < 425) {
                    gem = "carat eclipse";
                    userGems[msg.sender][29]++;
                }

                emit GemFound(msg.sender, gem);

                // happiness for finding gem
                // happiness increase is 10, 5 always subtracted
                if (pets[petId].happiness <= 85) {
                    pets[petId].happiness += 15;
                } else {
                    pets[petId].happiness = 100;
                }

                break; 
                // only 1 gem per game
            }
            // no gem found
        }
        // decrease hunger & sleep after playing
        if (pets[petId].hunger > 5) {
            pets[petId].hunger -= 5;
        } else {
            pets[petId].hunger = 0;
        }

        if (pets[petId].sleeplevel > 5) {
            pets[petId].sleeplevel -= 5;
        } else {
            pets[petId].sleeplevel = 0;
        }

        // decrease happiness for no gem
        if (pets[petId].happiness > 5) {
            pets[petId].happiness -= 5;
        } else {
            pets[petId].happiness = 0;
        }

        // check stats
        _checkHealth(petId);
    }

    // user can check amount of gems (have to use gem index)
    function checkGemAmount(string memory gemName) public returns (uint256) {
        // check index
        uint256 index = gemToIndex[keccak256(bytes(gemName))];
        require(index < 29 && index >= 0, "Invalid index");

        // emit event
        emit GemAmount(msg.sender, gemName, userGems[msg.sender][index]);
        return userGems[msg.sender][index];
    }

    // user can sell gems at any time for kinzcash
    function sellGem(string memory gemName) public {
        // check index
        uint256 index = gemToIndex[keccak256(bytes(gemName))];
        require(index < 29 && index >= 0, "Invalid index");
        require(userGems[msg.sender][index] > 0, "You don't have that gem");

        // check if uncommon
        uint8[10] memory uncommonIndicies = [1, 2, 7, 8, 13, 14, 19, 20, 25, 26];
        bool uncommon = false;
        for (uint i=0; i<uncommonIndicies.length; i++) {
            if (index == uncommonIndicies[i])
                uncommon = true;
        }

        // remove gem & give kinzcash
        if (index % 6 == 0) { // rare gem
            userGems[msg.sender][index]--;
            users[msg.sender].balance += 100;
        } else if (uncommon) { // uncommon gem
            userGems[msg.sender][index]--;
            users[msg.sender].balance += 50;
        } else { // common gem
            userGems[msg.sender][index]--;
            users[msg.sender].balance += 15;
        }
    }

    // user or redeem crown function can call, check if enough gems for crown
    function checkCrown(address user) public returns (bool) {
        for (uint i=0; i<29; i++) {
            if (userGems[user][i] == 0) {
                emit CrownRedeemable(user, false);
                return false;
            }
        }
        emit CrownRedeemable(user, true);
        return true;
    }

    // user can call to redeem
    function redeemCrown() public {
        require(checkCrown(msg.sender), "You don't have enough gems");

        // remove gems
        for (uint i=0; i<29; i++) {
            userGems[msg.sender][i]--;
        }

        // make nft (crown is 3)
        clothing.safeMint(msg.sender, 3);
    }


    // **********************
    // ** friend functions **
    // **********************

    // proposing a trade
    function proposeTrade(
        address to, 
        address nftAddressA, 
        uint256 tokenIdA, 
        address nftAddressB, 
        uint256 tokenIdB
    ) public {
        // safety check
        require(to != msg.sender, "You cannot trade with yourself!");
        require(to != address(0), "Invalid receiver address");
        
        // ensure proposer actually owns item they are offering
        require(IERC721(nftAddressA).ownerOf(tokenIdA) == msg.sender, "You don't own the item you're offering");

        // create the trade proposal
        trades[tradeCounter] = TradeOffer({
            proposer: msg.sender,
            receiver: to,
            nftAddressA: nftAddressA,
            tokenIdA: tokenIdA,
            nftAddressB: nftAddressB,
            tokenIdB: tokenIdB,
            active: true
        });

        // increment counter
        tradeCounter++;
    }

    // trading - everything but food
    // transactions open to the ethernet
    function makeTrade(uint256 tradeId) public {
        TradeOffer storage trade = trades[tradeId];
        require(trade.active, "Trade is no longer active");
        require(msg.sender == trade.receiver, "You are not the intended recipient");

        // mark trade as inactive to prevent re-entrancy
        trade.active = false;

        // make trade
        // users must have called .approve() on the NFT contracts first
        IERC721(trade.nftAddressA).transferFrom(trade.proposer, trade.receiver, trade.tokenIdA);
        IERC721(trade.nftAddressB).transferFrom(trade.receiver, trade.proposer, trade.tokenIdB);
    }
}
