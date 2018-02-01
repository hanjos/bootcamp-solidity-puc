var FudCoin = artifacts.require("./FudCoin.sol");

module.exports = function(deployer) {
  deployer.deploy(FudCoin);
};
