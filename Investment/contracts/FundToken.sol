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

  // Called only by this or derived contracts
  function mint(address account, uint tokens) internal {
    require(tokens > 0);
    require(tokenCount + tokens > tokenCount);
    require(balances[account] + tokens > balances[account]);

    tokenCount += tokens;
    balances[account] += tokens;

    Minted(tokens);
  }

  // Called only by this or derived contracts
  function burn(address account, uint tokens) internal {
    require(tokens > 0);
    require(tokenCount >= tokens);
    require(balances[account] >= tokens);

    tokenCount -= tokens;
    balances[account] -= tokens;

    Burned(tokens);
  }

  event Minted(uint value);
  event Burned(uint value);

  // ==============
  // ERC20 standard
  // ==============

  // How many tokens exist
  function totalSupply() public view returns (uint) {
    return tokenCount;
  }

  // Get the token balance for account `_address`
  function balanceOf(address account) public view returns (uint) {
    return balances[account];
  }

  // Transfer the balance from owner's account to another account
  function transfer(address to, uint tokens) public returns (bool) {
    require(balances[msg.sender] >= tokens);
    require(balances[to] + tokens > balances[to]);

    balances[msg.sender] -= tokens;
    balances[to] += tokens;

    Transfer(msg.sender, to, tokens);
    return true;
  }

  // Returns how many tokens `owner` has allowed `spender` to spend in their name
  function allowance(address owner, address spender) public view returns (uint) {
    return allowances[owner][spender];
  }

  // Allow `spender` to withdraw from your account, multiple times, up to the `tokens` amount.
  // If this function is called again it overwrites the current allowance with _value.
  function approve(address spender, uint tokens) public returns (bool) {
    allowances[msg.sender][spender] = tokens;

    Approval(msg.sender, spender, tokens);
    return true;
  }

  // Send `tokens` amount of tokens from address `from` to address `to`
  // The transferFrom method is used for a withdraw workflow, allowing contracts to send
  // tokens on your behalf, for example to "deposit" to a contract address and/or to charge
  // fees in sub-currencies; the command should fail unless the _from account has
  // deliberately authorized the sender of the message via some mechanism
  function transferFrom(address from, address to, uint tokens) public returns (bool) {
    require(balances[from] >= tokens);
    require(allowances[from][to] >= tokens);
    require(balances[to] + tokens > balances[to]);

    balances[from] -= tokens;
    balances[to] += tokens;
    allowances[from][to] -= tokens;

    Transfer(from, to, tokens);
    return true;
  }

  event Approval(address indexed owner, address indexed spender, uint tokens);
  event Transfer(address indexed from, address indexed to, uint tokens);
}