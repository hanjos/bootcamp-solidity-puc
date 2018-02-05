var Funds = artifacts.require("./Funds.sol");

module.exports = function(deployer, network, accounts) {
  const ownerAddress = accounts[0];

  deployer.deploy(Funds, {from: ownerAddress});
};
