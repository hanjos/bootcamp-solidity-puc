pragma solidity ^0.4.0;

// ----------------------------------------------------------------------------
// ERC Token Standard #20 Interface
// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md
// ----------------------------------------------------------------------------
contract ERC20Interface {
    function totalSupply() public constant returns (uint);
    function balanceOf(address tokenOwner) public constant returns (uint balance);
    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);
    function transfer(address to, uint tokens) public returns (bool success);
    function approve(address spender, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract FudCoin is ERC20Interface {
  uint _totalSupply;

  // Balances for each account
  mapping(address => uint) _balance;

  mapping(address => mapping(address => uint)) _allowance; // owner => (spender => amount)

  string public constant name = "FudCoin";
  string public constant symbol = "FUD";
  uint8 public constant decimals = 18;  // 18 is the most common number of decimal places

  function FudCoin() public {
    _totalSupply = 10000;
    _balance[tx.origin] = 10000;
  }

  function totalSupply() public constant returns (uint) { return _totalSupply; }

  // Get the token balance for account `tokenOwner`
  function balanceOf(address tokenOwner) public constant returns (uint) {
    return _balance[tokenOwner];
  }

  // Transfer the balance from owner's account to another account
  function transfer(address to, uint tokens) public returns (bool success) {
    require(_balance[msg.sender] >= tokens); // enough balance
    require(_balance[to] + tokens >= _balance[to]); // overflow

    _balance[msg.sender] -= tokens;
    _balance[to] += tokens;

    Transfer(msg.sender, to, tokens);
    return true;
  }

  function allowance(address tokenOwner, address spender) public constant returns (uint remaining) {
    return _allowance[tokenOwner][spender];
  }

  // Allow `spender` to withdraw from your account, multiple times, up to the `tokens` amount.
  // If this function is called again it overwrites the current allowance with _value.
  function approve(address spender, uint tokens) public returns (bool success) {
    _allowance[msg.sender][spender] = tokens;

    Approval(msg.sender, spender, tokens);
    return true;
  }

  // Send `tokens` amount of tokens from address `from` to address `to`
  // The transferFrom method is used for a withdraw workflow, allowing contracts to send
  // tokens on your behalf, for example to "deposit" to a contract address and/or to charge
  // fees in sub-currencies; the command should fail unless the _from account has
  // deliberately authorized the sender of the message via some mechanism; we propose
  // these standardized APIs for approval:
  function transferFrom(address from, address to, uint tokens) public returns (bool success) {
    require(_balance[from] >= tokens);
    require(_balance[to] + tokens >= _balance[to]);
    require(_allowance[from][to] >= tokens);

    _balance[from] -= tokens;
    _balance[to] += tokens;
    _allowance[from][to] -= tokens;

    Transfer(from, to, tokens);

    return true;
  }
}
