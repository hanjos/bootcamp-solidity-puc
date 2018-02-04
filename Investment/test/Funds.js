var Funds = artifacts.require("./Funds.sol");

contract('Funds', function (accounts) {
  it("should invest correctly", function() {
    var meta;
    var meta_starting_balance;
    var meta_ending_balance;
    
    var account_one = accounts[0];
    var account_one_starting_balance;
    var account_one_ending_balance;

    var amount = 10;

    return Funds.deployed().then(function(instance) {
      meta = instance;

      return meta.contract._eth.getBalance(meta.contract.address);
    }).then(function(balance) {
      meta_starting_balance = balance;

      return meta.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_starting_balance = balance.toNumber();

      return meta.invest({from: account_one, value: amount});
    }).then(function() {
      return meta.contract._eth.getBalance(meta.contract.address);
    }).then(function(balance) {
      meta_ending_balance = balance.toNumber();

      return meta.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();

      assert.equal(meta_ending_balance, meta_starting_balance + amount, "Amount wasn't correctly stored in the contract");
      assert.equal(account_one_ending_balance, account_one_starting_balance + amount, "Amount wasn't correctly marked as invested by account_one");
    });
  });

  // XXX está apagando o contexto anterior?
  it("should divest correctly", function() {
    var starting_amount = 10;
    var amount_to_divest = 5;

    var meta;
    var meta_starting_balance;
    var meta_ending_balance;
    
    var account_one = accounts[0];
    var account_one_starting_balance;
    var account_one_ending_balance;

    return Funds.deployed().then(function(instance) {
      meta = instance;

      return meta.invest({from: account_one, value: starting_amount});
    }).then(function () {
      return meta.contract._eth.getBalance(meta.contract.address);
    }).then(function(balance) {
      meta_starting_balance = balance.toNumber();

      return meta.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_starting_balance = balance.toNumber();

      return meta.divest(amount_to_divest, {from: account_one});
    }).then(function () {
      return meta.contract._eth.getBalance(meta.contract.address);
    }).then(function(balance) {
      meta_ending_balance = balance.toNumber();

      return meta.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();

      assert.equal(meta_ending_balance, meta_starting_balance - amount_to_divest, "Amount wasn't correctly stored in the contract");
      assert.equal(account_one_ending_balance, account_one_starting_balance - amount_to_divest, "Amount wasn't correctly marked as divested by account_one");
    });
  });
});