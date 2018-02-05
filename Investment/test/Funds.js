var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  it("should invest correctly", function() {
    var account1 = accounts[0];
    var amount = 10;

    return Funds.deployed().then(async function(meta) {
      var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
      
      await meta.invest({from: account1, value: amount});

      var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
      
      assert.equal(metaEndingBalance, metaStartingBalance + amount, "Amount wasn't stored in the contract");
      assert.equal(account1EndingBalance, account1StartingBalance + amount, "Amount wasn't marked as invested by account1");
      assert.equal(endingTokenSupply, startingTokenSupply + amount, "The right number of tokens wasn't minted");
    });
  });

  // XXX está apagando o contexto anterior?
  it("should divest correctly", function() {
    var startingAmount = 10;
    var amountToDivest = 5;
    var account1 = accounts[0];

    return Funds.deployed().then(async function(meta) {
      await meta.invest({from: account1, value: startingAmount});

      var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
      
      await meta.divest(amountToDivest, {from: account1});
      
      var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
      
      assert.equal(metaEndingBalance, metaStartingBalance - amountToDivest, "Amount wasn't correctly stored in the contract");
      assert.equal(account1EndingBalance, account1StartingBalance - amountToDivest, "Amount wasn't correctly marked as divested by account1");
      assert.equal(endingTokenSupply, startingTokenSupply - amountToDivest, "The right number of tokens wasn't minted");
    });
  });
});