var Funds = artifacts.require("./Funds.sol");

assert.bigNumberEqual = function (actual, expected, message) {
  if(! actual.eq(expected)) {
    message = (message != undefined) ? message + ": " : "";
    throw new AssertionError(message + "expected " + actual.toString() + " to equal " + expected.toString());
  }
}

contract('Funds: Investing phase', function (accounts) {
  const owner = accounts[0];
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const wallet = accounts[3];

  const minimumInvestment = Math.pow(10, 18);

  // TODO no idea why, but transfer costs seem to be consistently this * gasUsed
  const actualGasPrice = Math.pow(10, 11);
  const errorMargin = 1;

  var meta;

  // XXX since the ABI doesn't store enum values (as per https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#if-i-return-an-enum-i-only-get-integer-values-in-web3-js-how-to-get-the-named-values),
  // here we go
  const STATE_OPEN = 0;
  const STATE_INVESTING = 1;
  const STATE_FINISHED = 2;

  async function calculateLatestGasCost() {
    var gasUsed = await web3.eth.getBlock('latest').gasUsed;

    return gasUsed * actualGasPrice;
  }

  beforeEach(async function () {
    meta = await Funds.new(minimumInvestment, 0, {from: owner});

    await meta.setOperatingWallet(wallet);
    await meta.invest({ from: investor1, value: minimumInvestment });
    await meta.invest({ from: investor2, value: 2 * minimumInvestment });

    await meta.start();
  });

  it("can't call invest during Investing", async function () {
    try {
      await meta.invest({ from: investor1, value: minimumInvestment + 1000 });
      assert.fail("Should've failed earlier");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }
  });

  it("can't call divest during Investing", async function () {
    try {
      await meta.divest({ from: investor2, value: minimumInvestment });
      assert.fail("Should've failed earlier");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }
  });

  it("can't receive money from just anybody", async function () {
    var ownerStartingBalance = await web3.eth.getBalance(owner);
    var metaStartingBalance = await web3.eth.getBalance(meta.contract.address);
    var eventWatcher = meta.allEvents();

    try {
      await meta.receive({from: owner, value: minimumInvestment });
      assert.fail("Should've failed earlier");
    } catch(e) {
      if(e.name === "AssertionError") {
        throw e;
      }
    }

    var gasCost = await calculateLatestGasCost();
    var ownerEndingBalance = await web3.eth.getBalance(owner);
    var metaEndingBalance = await web3.eth.getBalance(meta.contract.address);
    var events = await eventWatcher.get();

    assert.bigNumberEqual(ownerEndingBalance, ownerStartingBalance.minus(gasCost), "Shouldn't have paid");
    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance, "Shouldn't have received");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("only the wallet can put money back in", async function () {
    var walletStartingBalance = await web3.eth.getBalance(wallet);
    var metaStartingBalance = await web3.eth.getBalance(meta.contract.address);
    var eventWatcher = meta.allEvents();

    var amount = minimumInvestment; // no minimum investment

    await meta.receive({from: wallet, value: amount });

    var gasCost = await calculateLatestGasCost();
    var walletEndingBalance = await web3.eth.getBalance(wallet);
    var metaEndingBalance = await web3.eth.getBalance(meta.contract.address);
    var events = await eventWatcher.get();

    assert.bigNumberEqual(walletEndingBalance, walletStartingBalance.minus(amount).minus(gasCost), "Should've paid");
    assert.bigNumberEqual(metaEndingBalance, metaStartingBalance.plus(amount), "Should've received");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "ReturnsReceived", "Wrong event");
    assert.equal(events[0].args.value, amount, "Wrong value transferred");
  });
});