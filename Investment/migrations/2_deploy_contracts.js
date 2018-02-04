var Funds = artifacts.require("./Funds.sol");

module.exports = function(deployer) {
  deployer.deploy(Funds);
};
