var Funds = artifacts.require("./Funds.sol");

function closeEnough(a, b, errorMargin) {
  return Math.abs(a - b) <= Math.abs(errorMargin);
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
    var ownerStartingBalance = await web3.eth.getBalance(owner).toNumber();
    var metaStartingBalance = await web3.eth.getBalance(meta.contract.address).toNumber();
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
    var ownerEndingBalance = await web3.eth.getBalance(owner).toNumber();
    var metaEndingBalance = await web3.eth.getBalance(meta.contract.address).toNumber();
    var events = await eventWatcher.get();

    assert.ok(closeEnough(ownerEndingBalance, ownerStartingBalance, gasCost), "Shouldn't have paid");
    assert.equal(metaEndingBalance, metaStartingBalance, "Shouldn't have received");

    assert.equal(events.length, 0, "Wrong number of events");
  });

  it("only the wallet can put money back in", async function () {
    var walletStartingBalance = await web3.eth.getBalance(wallet).toNumber();
    var metaStartingBalance = await web3.eth.getBalance(meta.contract.address).toNumber();
    var eventWatcher = meta.allEvents();

    var amount = minimumInvestment; // no minimum investment

    await meta.receive({from: wallet, value: amount });

    var gasCost = await calculateLatestGasCost();
    var walletEndingBalance = await web3.eth.getBalance(wallet).toNumber();
    var metaEndingBalance = await web3.eth.getBalance(meta.contract.address).toNumber();
    var events = await eventWatcher.get();

    assert.ok(closeEnough(walletEndingBalance, walletStartingBalance - amount, gasCost), "Should've paid");
    assert.equal(metaEndingBalance, metaStartingBalance + amount, "Should've received");

    assert.equal(events.length, 1, "Wrong number of events");
    assert.equal(events[0].event, "ReturnsReceived", "Wrong event");
    assert.equal(events[0].args.value, amount, "Wrong value transferred");
  });
});