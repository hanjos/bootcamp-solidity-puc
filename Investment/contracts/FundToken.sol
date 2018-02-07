pragma solidity ^0.4.0;

// Implements the ERC20 standard, plus mint and burn functions
contract FundToken {
  uint internal tokenCount = 0;
  mapping(address => uint) internal balances;
  mapping(address => mapping(address => uint)) internal allowances;

  string public constant name = "FundToken";
  string public constant symbol = "FUND";
  uint8 public constant decimals = 18;

  // =============
  // Mint and burn
  // =============

  /** 
   * Creates `amount` FUNDs in the total supply, which are deposited in 
   * `account`. This function is only for derived contracts, which control
   * the token emission.
   * 
   * Fires a `Mint` event.
   */
  function mint(address account, uint amount) internal {
    require(amount > 0);
    require(tokenCount + amount > tokenCount);
    require(balances[account] + amount > balances[account]);

    tokenCount += amount;
    balances[account] += amount;

    Mint(amount);
  }

  /** 
   * Destroys `amount` tokens from the total supply and `account`. This 
   * function is only for derived contracts, which control the token emission.
   * 
   * Fires a `Burn` event.
   */
  function burn(address account, uint amount) internal {
    require(amount > 0);
    require(tokenCount >= amount);
    require(balances[account] >= amount);

    tokenCount -= amount;
    balances[account] -= amount;

    Burn(amount);
  }

  /// Fired when tokens are `mint`ed.
  event Mint(uint value);

  /// Fired when tokens are `burn`ed.
  event Burn(uint value);

  // ==============
  // ERC20 standard
  // ==============

  /// Returns how many tokens exist.
  function totalSupply() public view returns (uint) {
    return tokenCount;
  }

  /// Gets the token balance for `account`.
  function balanceOf(address account) public view returns (uint) {
    return balances[account];
  }

  /// Transfers `amount` tokens from the sender's account to the account `to`.
  /// Fires a `Transfer` event.
  function transfer(address to, uint amount) public returns (bool) {
    require(balances[msg.sender] >= amount);
    require(balances[to] + amount > balances[to]);

    balances[msg.sender] -= amount;
    balances[to] += amount;

    Transfer(msg.sender, to, amount);
    return true;
  }

  /// Returns how many tokens `owner` has allowed `spender` to spend in their
  /// name.
  function allowance(address owner, address spender) public view returns (uint) {
    return allowances[owner][spender];
  }

  /**
   * Allows `spender` to withdraw from `msg.sender`'s account, multiple times,
   * up to `amount`. If this function is called again, it overwrites the current
   * allowance with `amount`.
   * 
   * Fires an `Approval` event.
   */
  function approve(address spender, uint amount) public returns (bool) {
    allowances[msg.sender][spender] = amount;

    Approval(msg.sender, spender, amount);
    return true;
  }

  /** 
   * Send `amount` tokens from `from` to `to`. Errors if the amount hasn't
   * been approved previously with `approve`. The maximum amount authorized 
   * can be checked with `allowance`.
   */
  function transferFrom(address from, address to, uint amount) public returns (bool) {
    require(balances[from] >= amount);
    require(allowances[from][to] >= amount);
    require(balances[to] + amount > balances[to]);

    balances[from] -= amount;
    balances[to] += amount;
    allowances[from][to] -= amount;

    Transfer(from, to, amount);
    return true;
  }

  event Approval(address indexed owner, address indexed spender, uint amount);
  event Transfer(address indexed from, address indexed to, uint amount);
}