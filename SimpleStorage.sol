pragma solidity ^0.4.0;

contract SimpleStorage {
  uint storedData;
  address owner;

  // para notificar entidades externas ao blockchain
  // contratos so rodam quanto diretamente invocados
  event ValueSet(uint value);

  modifier onlyOwner() {
    require(msg.sender == owner);

    // chama a funcao onde este modificador esta aplicado
    _;
  }

  modifier greater10(uint value) {
    require(value > 10);
    _;
  }

  function SimpleStorage(uint _storedData) public {
    storedData = _storedData;
    owner = msg.sender;
  }

  function set(uint x) public onlyOwner greater10(x) {
    storedData = x;

    ValueSet(x);
  }

  function get() public view returns (uint) {
    return storedData;
  }
}
