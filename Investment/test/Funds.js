var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  const owner = accounts[0];
  const openDurationInDays = 30;
  var meta;

  beforeEach(async function () {
    meta = await Funds.new(30, {from: owner});
  });

  it("should invest correctly", async function() {
    var account2 = accounts[1];
    var amount = 10;

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
    assert.equal(events[0].event, "Mint", "Wrong event emitted!");
    assert.equal(events[0].args.value, amount, "Wrong amount emitted!");
  });

  it("should divest correctly", async function() {
    const startingAmount = 10;
    const amountToDivest = 5;
    const account1 = accounts[1];

    await meta.invest({from: account1, value: startingAmount});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var eventWatcher = meta.allEvents();

    await meta.divest(amountToDivest, {from: account1});

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(metaEndingBalance, metaStartingBalance - amountToDivest, "Amount wasn't correctly stored in the contract");
    assert.equal(account1EndingBalance, account1StartingBalance - amountToDivest, "Amount wasn't correctly marked as divested by accounts[1]");
    assert.equal(endingTokenSupply, startingTokenSupply - amountToDivest, "The right number of tokens wasn't minted");

    assert.equal(events.length, 1, "Wrong number of events!");
    assert.equal(events[0].event, "Burn", "Wrong event emitted!");
    assert.equal(events[0].args.value, amountToDivest, "Wrong amount emitted!");
  });

  it("setOperatingWallet has restrictions on the caller, and fires an event", async function () {
    var account0 = accounts[0];
    var account1 = accounts[1];

    var owner = await meta.getOwner.call();

    // pode ser pedantismo, mas sempre é bom verificar as premissas do teste
    assert.equal(account0, owner, "Bad test! Check the migrations script");
    assert.notEqual(account1, account0, "accounts[0] and [1] should be different");

    assertThrowAsync(meta.setOperatingWallet(account1, {from: account1}), 
      "setOperatingWallet should fail when not called by the owner");

    var oldOperatingWallet = await meta.getOperatingWallet.call();
    var eventWatcher = meta.allEvents();

    await meta.setOperatingWallet(account1, {from: owner});

    var newOperatingWallet = await meta.getOperatingWallet.call();
    var events = await eventWatcher.get();

    assert.notEqual(newOperatingWallet, oldOperatingWallet, "Operating wallet should've changed");
    assert.equal(account1, newOperatingWallet, "Operating wallet should now be accounts[1]");

    assert.equal(events.length, 1, "Wrong number of events!");
    assert.equal(events[0].event, "OperatingWalletChanged", "Wrong event emitted!");
    assert.equal(events[0].args.oldWallet, 0, "Wrong old wallet!");
    assert.equal(events[0].args.newWallet, account1, "Wrong new wallet!");
  });
});

async function assertThrowAsync(promise, message) {
  try {
    await promise;
  } catch(error) {
    return;
  }

  assert.fail("Expected throw not received: " + message);
}