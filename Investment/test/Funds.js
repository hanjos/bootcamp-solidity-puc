var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  const owner = accounts[0];
  const openDurationInDays = 30;
  const minimumInvestment = Math.pow(10, 18);

  var meta;

  beforeEach(async function () {
    meta = await Funds.new(minimumInvestment, 30, {from: owner});
  });

  it("should invest correctly", async function() {
    var account1 = accounts[1];
    var amount = minimumInvestment;

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var eventWatcher = meta.allEvents();

    await meta.invest({from: account1, value: amount});

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(metaEndingBalance, metaStartingBalance + amount, "Amount wasn't stored in the contract");
    assert.equal(account1EndingBalance, account1StartingBalance + amount, "Amount wasn't marked as invested by account1");
    assert.equal(endingTokenSupply, startingTokenSupply + amount, "The right number of tokens wasn't minted");

    assert.equal(events.length, 1, "Wrong number of events!");
    assert.equal(events[0].event, "Mint", "Wrong event emitted!");
    assert.equal(events[0].args.value, amount, "Wrong amount emitted!");
  });

  it("one should invest a minimum amount", async function() {
    var account1 = accounts[1];
    var amount = 1000; // too small a value, and JavaScript might not notice the difference

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var eventWatcher = meta.allEvents();

    try {
      await meta.invest({from: account1, value: amount});
      assert.fail("Shouldn't have accepted the investment!");
    } catch (e) {
      assert.ok(e);
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(metaEndingBalance, metaStartingBalance, "Amount shouldn't have been stored in the contract");
    assert.equal(account1EndingBalance, account1StartingBalance, "Amount shouldn't have been invested by account1");
    assert.equal(endingTokenSupply, startingTokenSupply, "No token should have been minted");

    assert.equal(events.length, 0, "No event should have been emitted!");
  });

  it("should divest correctly", async function() {
    const startingAmount = minimumInvestment + 1000;
    const amountToDivest = 500; // too small a value, and JavaScript might not notice the difference
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
    assert.equal(endingTokenSupply, startingTokenSupply - amountToDivest, "The right number of tokens wasn't burned");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "Burn", "Wrong event emitted");
    assert.equal(events[0].args.value, amountToDivest, "Wrong amount emitted");
  });

  it("should divest only enough to keep the minimum", async function() {
    const startingAmount = minimumInvestment;
    const amountToDivest = 1000; // too small a value, and JavaScript might not notice the difference
    const account1 = accounts[1];

    await meta.invest({from: account1, value: startingAmount});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var eventWatcher = meta.allEvents(); // ignoring the Mint event earlier

    try {
      await meta.divest(amountToDivest, {from: account1});
      assert.fail("Shouldn't have gotten here!");
    } catch(e) {
      assert.ok(e);
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
    var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
    var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(metaEndingBalance, metaStartingBalance, "Nothing should've been removed!");
    assert.equal(account1EndingBalance, account1StartingBalance, "Nothing should've been divested from accounts[1]");
    assert.equal(endingTokenSupply, startingTokenSupply, "No tokens should've been burned");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("divesting everything at once is allowed", async function() {
      const startingAmount = minimumInvestment;
      const account1 = accounts[1];

      await meta.invest({from: account1, value: startingAmount});

      var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1StartingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var startingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var eventWatcher = meta.allEvents(); // ignoring the Mint event earlier

      try {
        await meta.divest(startingAmount, {from: account1});
        assert.fail("Shouldn't have gotten here!");
      } catch(e) {
        assert.ok(e);
      }

      var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account1EndingBalance = (await meta.balanceOf.call(account1)).toNumber();
      var endingTokenSupply = (await meta.totalSupply.call()).toNumber();
      var events = await eventWatcher.get();

      assert.equal(metaEndingBalance, 0, "No tokens should've remained!");
      assert.equal(account1EndingBalance, 0, "Everything should've been divested from accounts[1]");
      assert.equal(endingTokenSupply, 0, "All tokens should've been burned");

      assert.equal(events.length, 1, "Wrong number of events");
      assert.equal(events[0].event, "Burn", "Wrong event emitted");
      assert.equal(events[0].args.value, startingAmount, "Wrong amount emitted");
    });

  it("non-owners can't change the operating wallet", async function () {
    var account0 = accounts[0];
    var account1 = accounts[1];

    var owner = await meta.getOwner.call();

    // pode ser pedantismo, mas sempre é bom verificar as premissas do teste
    assert.equal(account0, owner, "Bad test! Check the migrations script");
    assert.notEqual(account1, account0, "accounts[0] and [1] should be different");

    var oldOperatingWallet = await meta.getOperatingWallet.call();
    var eventWatcher = meta.allEvents();

    try {
      await meta.setOperatingWallet(account1, {from: account1});
      assert.fail("setOperatingWallet should fail when not called by the owner");
    } catch(e) {
      assert.ok(e);
    }

    var newOperatingWallet = await meta.getOperatingWallet.call();
    var events = await eventWatcher.get();

    assert.equal(newOperatingWallet, oldOperatingWallet, "Operating wallet shouldn't have changed");

    assert.equal(events.length, 0, "Wrong number of events!");
  });

  it("only the owner can change the operating wallet", async function () {
      var account0 = accounts[0];
      var account1 = accounts[1];

      var owner = await meta.getOwner.call();

      // pode ser pedantismo, mas sempre é bom verificar as premissas do teste
      assert.equal(account0, owner, "Bad test! Check the migrations script");
      assert.notEqual(account1, account0, "accounts[0] and [1] should be different");

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