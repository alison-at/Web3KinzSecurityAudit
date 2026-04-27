.solcover.js and hardhat.config.js should sit at root folder level. These files were used to conduct coverage testing, the .solcover.js file was added to overcome gas limits at deployment preventing a more cohesive coverage test.

The Web3Kinz.sol file included in this folder contains a helper function called _setStatsForTesting which is used as a setter for setting initial pet parameters to induce a comatose state.

In CoverageTests, the assert_on_games.test.js file is for tests on sellGem and checkGemAmount related to error with require statements (not including 29th index, which relates to 'carat eclipse' gem).

The coverage folder holds the results from the coverage test I conducted.