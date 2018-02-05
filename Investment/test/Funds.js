var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  it("should invest correctly", function() {
    var account_one = accounts[0];
    var amount = 10;

    return Funds.deployed().then(async function(meta) {
      var meta_starting_balance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account_one_starting_balance = (await meta.balanceOf.call(account_one)).toNumber();

      await meta.invest({from: account_one, value: amount});

      var meta_ending_balance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account_one_ending_balance = (await meta.balanceOf.call(account_one)).toNumber();

      assert.equal(meta_ending_balance, meta_starting_balance + amount, "Amount wasn't correctly stored in the contract");
      assert.equal(account_one_ending_balance, account_one_starting_balance + amount, "Amount wasn't correctly marked as invested by account_one");
    });
  });

  // XXX está apagando o contexto anterior?
  it("should divest correctly", function() {
    var starting_amount = 10;
    var amount_to_divest = 5;
    var account_one = accounts[0];

    return Funds.deployed().then(async function(meta) {
      await meta.invest({from: account_one, value: starting_amount});

      var meta_starting_balance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account_one_starting_balance = (await meta.balanceOf.call(account_one)).toNumber();

      await meta.divest(amount_to_divest, {from: account_one});
      var meta_ending_balance = await meta.contract._eth.getBalance(meta.contract.address).toNumber();
      var account_one_ending_balance = (await meta.balanceOf.call(account_one)).toNumber();

      assert.equal(meta_ending_balance, meta_starting_balance - amount_to_divest, "Amount wasn't correctly stored in the contract");
      assert.equal(account_one_ending_balance, account_one_starting_balance - amount_to_divest, "Amount wasn't correctly marked as divested by account_one");
    });
  });
});