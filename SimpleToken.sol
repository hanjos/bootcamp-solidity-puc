pragma solidity ^0.4.0;

contract SimpleToken {
  uint supply;
  mapping(address => uint) balance;

  function SimpleToken(uint _supply) public {
    supply = _supply;
    balance[msg.sender] = _supply;
  }

  function getBalance() public view returns (uint)  {
    return balance[msg.sender];
  }

  function transferTo(address to, uint amount) public {
    require(balance[msg.sender] >= amount); // saldo disponivel
    require(balance[to] + amount >= balance[to]); // overflow

    balance[msg.sender] -= amount;
    balance[to] += amount;
  }
}
