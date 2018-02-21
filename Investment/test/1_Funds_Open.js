var Funds = artifacts.require("./Funds.sol");

assert.bigNumberEqual = function (actual, expected, message) {
  if(! actual.eq(expected)) {
    message = (message != undefined) ? message + ": " : "";
    throw new AssertionError(message + "expected " + actual.toString() + " to equal " + expected.toString());
  }
}

contract('Funds: Open phase', function (accounts) {
  const owner = accounts[0];
  const openDurationInDays = 30;
  const minimumInvestment = Math.pow(10, 18);

  var meta;

  // XXX since the ABI doesn't store enum values (as per https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#if-i-return-an-enum-i-only-get-integer-values-in-web3-js-how-to-get-the-named-values),
  // here we go
  const STATE_OPEN = 0;
  const STATE_INVESTING = 1;
  const STATE_FINISHED = 2;

  beforeEach(async function () {
    meta = await Funds.new(minimumInvestment, openDurationInDays, {from: owner});
  });

  it("should invest correctly", async function() {
    var account1 = accounts[1];
    var amount = minimumInvestment;

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1StartingBalance = (await meta.balanceOf.call(account1));
    var startingTokenSupply = (await meta.totalSupply.call());
    var eventWatcher = meta.allEvents();

    await meta.invest({from: account1, value: amount});

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1EndingBalance = (await meta.balanceOf.call(account1));
    var endingTokenSupply = (await meta.totalSupply.call());
    var events = await eventWatcher.get();

    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance.plus(amount), "Amount wasn't stored in the contract");
    assert.bigNumberEqual(account1EndingBalance, account1StartingBalance.plus(amount), "Amount wasn't marked as invested by account1");
    assert.bigNumberEqual(endingTokenSupply, startingTokenSupply.plus(amount), "The right number of tokens wasn't minted");

    assert.equal(events.length, 1, "Wrong number of events!");
    assert.equal(events[0].event, "Mint", "Wrong event emitted!");
    assert.equal(events[0].args.value, amount, "Wrong amount emitted!");
  });

  it("one should invest a minimum amount", async function() {
    var account1 = accounts[1];
    var amount = 1000;

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1StartingBalance = (await meta.balanceOf.call(account1));
    var startingTokenSupply = (await meta.totalSupply.call());
    var eventWatcher = meta.allEvents();

    try {
      await meta.invest({from: account1, value: amount});
      assert.fail("Shouldn't have accepted the investment!");
    } catch (e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1EndingBalance = (await meta.balanceOf.call(account1));
    var endingTokenSupply = (await meta.totalSupply.call());
    var events = await eventWatcher.get();

    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance, "Amount shouldn't have been stored in the contract");
    assert.bigNumberEqual(account1EndingBalance, account1StartingBalance, "Amount shouldn't have been invested by account1");
    assert.bigNumberEqual(endingTokenSupply, startingTokenSupply, "No token should have been minted");

    assert.equal(events.length, 0, "No event should have been emitted!");
  });

  it("should divest correctly", async function() {
    const startingAmount = minimumInvestment + 1000;
    const amountToDivest = 500;
    const account1 = accounts[1];

    await meta.invest({from: account1, value: startingAmount});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1StartingBalance = (await meta.balanceOf.call(account1));
    var startingTokenSupply = (await meta.totalSupply.call());
    var eventWatcher = meta.allEvents();

    await meta.divest(amountToDivest, {from: account1});

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1EndingBalance = (await meta.balanceOf.call(account1));
    var endingTokenSupply = (await meta.totalSupply.call());
    var events = await eventWatcher.get();

    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance.minus(amountToDivest), "Amount wasn't correctly stored in the contract");
    assert.bigNumberEqual(account1EndingBalance, account1StartingBalance.minus(amountToDivest), "Amount wasn't correctly marked as divested by accounts[1]");
    assert.bigNumberEqual(endingTokenSupply, startingTokenSupply.minus(amountToDivest), "The right number of tokens wasn't burned");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "Burn", "Wrong event emitted");
    assert.equal(events[0].args.value, amountToDivest, "Wrong amount emitted");
  });

  it("should divest only enough to keep the minimum", async function() {
    const startingAmount = minimumInvestment;
    const amountToDivest = 1000;
    const account1 = accounts[1];

    await meta.invest({from: account1, value: startingAmount});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1StartingBalance = (await meta.balanceOf.call(account1));
    var startingTokenSupply = (await meta.totalSupply.call());
    var eventWatcher = meta.allEvents(); // ignoring the Mint event earlier

    try {
      await meta.divest(amountToDivest, {from: account1});
      assert.fail("Shouldn't have gotten here!");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1EndingBalance = (await meta.balanceOf.call(account1));
    var endingTokenSupply = (await meta.totalSupply.call());
    var events = await eventWatcher.get();

    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance, "Nothing should've been removed!");
    assert.bigNumberEqual(account1EndingBalance, account1StartingBalance, "Nothing should've been divested from accounts[1]");
    assert.bigNumberEqual(endingTokenSupply, startingTokenSupply, "No tokens should've been burned");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("divesting everything at once is allowed", async function() {
    const startingAmount = minimumInvestment;
    const account1 = accounts[1];

    await meta.invest({from: account1, value: startingAmount});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1StartingBalance = (await meta.balanceOf.call(account1));
    var startingTokenSupply = (await meta.totalSupply.call());
    var eventWatcher = meta.allEvents(); // ignoring the Mint event earlier

    await meta.divest(startingAmount, {from: account1});

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var account1EndingBalance = (await meta.balanceOf.call(account1));
    var endingTokenSupply = (await meta.totalSupply.call());
    var events = await eventWatcher.get();

    assert.bigNumberEqual(metaEndingBalance, 0, "No tokens should've remained!");
    assert.bigNumberEqual(account1EndingBalance, 0, "Everything should've been divested from accounts[1]");
    assert.bigNumberEqual(endingTokenSupply, 0, "All tokens should've been burned");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "Burn", "Wrong event emitted");
    assert.equal(events[0].args.value, startingAmount, "Wrong amount emitted");
  });

  it("non-owners can't change the operating wallet", async function () {
    var account0 = accounts[0];
    var account1 = accounts[1];

    var owner = await meta.getOwner.call();

    // it's always good to check the test's premises
    assert.equal(account0, owner, "Bad test! Check the migrations script");
    assert.notEqual(account1, account0, "accounts[0] and [1] should be different");

    var oldOperatingWallet = await meta.getOperatingWallet.call();
    var eventWatcher = meta.allEvents();

    try {
      await meta.setOperatingWallet(account1, {from: account1});
      assert.fail("setOperatingWallet should fail when not called by the owner");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
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

    // it's always good to check the test's premises
    assert.equal(account0, owner, "Bad test! Check the migrations script");
    assert.notEqual(account1, account0, "accounts[0] and [1] should be different");

    var oldOperatingWallet = await meta.getOperatingWallet.call();
    var eventWatcher = meta.allEvents();

    await meta.setOperatingWallet(account1, {from: owner});

    var newOperatingWallet = await meta.getOperatingWallet.call();
    var events = await eventWatcher.get();

    assert.notEqual(newOperatingWallet, oldOperatingWallet, "Operating wallet should've changed");
    assert.equal(account1, newOperatingWallet, "Operating wallet should now be accounts[1]");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "OperatingWalletChanged", "Wrong event emitted");
    assert.equal(events[0].args.oldWallet, 0, "Wrong old wallet");
    assert.equal(events[0].args.newWallet, account1, "Wrong new wallet");
  });

  it("can't start the investment phase without a wallet set", async function () {
    // we can invest right now!
    var meta = await Funds.new(minimumInvestment, 0, {from: owner});

    var wallet = await meta.getOperatingWallet.call();

    assert.equal(0, wallet, "The wallet should begin unset!");

    var startingState = (await meta.getState.call()).toNumber();
    assert.equal(startingState, STATE_OPEN, "The initial state should be Open");

    // for the contract to start with some funds
    var account1 = accounts[1];
    await meta.invest({from: account1, value: minimumInvestment});

    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var eventWatcher = meta.allEvents();

    try {
      await meta.start();
      assert.fail("Should never get here!");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var endingState = (await meta.getState.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(endingState, startingState, "The state shouldn't have changed");
    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance, "No money should've come out of the contract");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("can't start the investment phase ahead of time", async function () {
    // operating wallet set
    var account1 = accounts[1];
    await meta.setOperatingWallet(account1);

    // for the contract to start with some funds
    var account2 = accounts[2];
    await meta.invest({from: account2, value: minimumInvestment});

    var startingState = (await meta.getState.call()).toNumber();
    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var eventWatcher = meta.allEvents();

    try {
      await meta.start();
      assert.fail("Should never get here!");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }

    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var endingState = (await meta.getState.call()).toNumber();
    var events = await eventWatcher.get();

    assert.equal(endingState, startingState, "The state shouldn't have changed");
    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance, "No money should've come out of the contract");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("anybody can kick off the investment phase when preconditions are right", async function () {
    // we can invest right now!
    var meta = await Funds.new(minimumInvestment, 0, {from: owner});

    // operating wallet set
    var operatingWallet = accounts[1];
    await meta.setOperatingWallet(operatingWallet);

    // for the contract to start with some funds
    var account2 = accounts[2];
    await meta.invest({from: account2, value: minimumInvestment});

    var startingState = (await meta.getState.call()).toNumber();
    var metaStartingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var operatingWalletStartingBalance = await web3.eth.getBalance(operatingWallet);
    var eventWatcher = meta.allEvents();

    await meta.start();

    var endingState = (await meta.getState.call()).toNumber();
    var metaEndingBalance = await meta.contract._eth.getBalance(meta.contract.address);
    var operatingWalletEndingBalance = await web3.eth.getBalance(operatingWallet);
    var events = await eventWatcher.get();

    assert.equal(startingState, STATE_OPEN);
    assert.equal(endingState, STATE_INVESTING);

    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance.minus(minimumInvestment), "Money should've been transferred");
    assert.bigNumberEqual(operatingWalletEndingBalance, operatingWalletStartingBalance.plus(minimumInvestment), "Should've been paid");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "StateChanged", "Wrong event");
    assert.equal(events[0].args.from, STATE_OPEN, "Wrong old state");
    assert.equal(events[0].args.to, STATE_INVESTING, "Wrong new state");
  });
});