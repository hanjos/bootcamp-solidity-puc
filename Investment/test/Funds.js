var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  it("should invest correctly", function() {
    var account2 = accounts[1];
    var amount = 10;

    return Funds.deployed().then(async function(meta) {
      var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account2StartingBalance = (await meta.balanceOf.call(account2)).toNumber();
      var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var eventWatcher = meta.allEvents();

      await meta.invest({from: account2, value: amount});

      var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account2EndingBalance = (await meta.balanceOf.call(account2)).toNumber();
      var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var events = await eventWatcher.get();

      assert.equal(metaEndingBalance, metaStartingBalance + amount, "Amount wasn't stored in the contract");
      assert.equal(account2EndingBalance, account2StartingBalance + amount, "Amount wasn't marked as invested by account2");
      assert.equal(endingTokenSupply, startingTokenSupply + amount, "The right number of tokens wasn't minted");

      assert.equal(events.length, 1, "Wrong number of events!");
      assert.equal(events[0].event, "Minted", "Wrong event emitted!");
      assert.equal(events[0].args.value, amount, "Wrong amount emitted!");
    });
  });

  // XXX está apagando o contexto anterior?
  it("should divest correctly", function() {
    var startingAmount = 10;
    var amountToDivest = 5;
    var account2 = accounts[1];

    return Funds.deployed().then(async function(meta) {
      await meta.invest({from: account2, value: startingAmount});

      var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account2StartingBalance = (await meta.balanceOf.call(account2)).toNumber();
      var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var eventWatcher = meta.allEvents();

      await meta.divest(amountToDivest, {from: account2});
      
      var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account2EndingBalance = (await meta.balanceOf.call(account2)).toNumber();
      var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var events = await eventWatcher.get();

      assert.equal(metaEndingBalance, metaStartingBalance - amountToDivest, "Amount wasn't correctly stored in the contract");
      assert.equal(account2EndingBalance, account2StartingBalance - amountToDivest, "Amount wasn't correctly marked as divested by account2");
      assert.equal(endingTokenSupply, startingTokenSupply - amountToDivest, "The right number of tokens wasn't minted");

      assert.equal(events.length, 1, "Wrong number of events!");
      assert.equal(events[0].event, "Burned", "Wrong event emitted!");
      assert.equal(events[0].args.value, amountToDivest, "Wrong amount emitted!");
    });
  });
});