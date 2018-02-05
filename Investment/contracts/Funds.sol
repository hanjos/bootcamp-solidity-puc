pragma solidity ^0.4.0;

import "./FundToken.sol";

// questões em aberto:
// * este contrato é que cria a carteira dos operadores?
// * operadores
// * eventos
// * que poderes o owner teria aqui? Um setState?
contract Funds is FundToken {
  // há três estados: Open, Investing, Finished
  // Open é quando os investidores põem o dinheiro a ser investido
  // Investing é quando os analistas estão operando com o dinheiro do pessoal
  // Finished é quando as operações acabaram, e o dinheiro está sendo retornado
  enum State { Open, Investing, Finished }

  State private state; // o estado atual do fundo

  address private owner; // o administrador de tudo
  address private operatingWallet; // a carteira dos operadores

  uint private totalInvested; // o total investido em wei
  uint private totalReceived; // o total recebido de volta em wei

  event InvestingStarted();
  event InvestingFinished();
  event ReturnsReceived(uint value);

  function Funds() public {
    owner = msg.sender;
  }

  /*
   * Modificadores
   */

  // a função só executa se este contrato estiver no estado `_state`
  modifier onlyDuring(State _state) {
    require(state == _state);
    _;
  }

  // a função só executa se for chamada por `_address`
  modifier onlyBy(address _address) {
    require(msg.sender == _address);
    _;
  }

  /*
   * gerenciamento de estado
   */

  function getOwner() public view returns (address) {
    return owner;
  }

  function getOperatingWallet() public view returns (address) {
    return operatingWallet;
  }

  function setOperatingWallet(address wallet) public onlyBy(owner) {
    operatingWallet = wallet;
  }

  // retorna o total de weis investidos
  function getTotalInvested() public view returns (uint) {
    if (state == State.Open) {
      return this.balance;
    } else {
      return totalInvested;
    }
  }

  // retorna o total de weis que o investimento rendeu. 
  // Só será diferente de zero se estivermos no estado Finished
  function getTotalReceived() public view returns (uint) {
    return totalReceived;
  }

  /*
   * Funções OPEN
   */

  // registra quem mandou o dinheiro e quanto
  function invest() public payable onlyDuring(State.Open) {
    mint(msg.sender, msg.value);
  }

  // resgata `value` de quem pedir
  function divest(uint value) public onlyDuring(State.Open) {
    burn(msg.sender, value);

    msg.sender.transfer(value);
  }

  // transfere todos os ethers deste contrato para a carteira dos operadores
  // XXX quem pode chamar?
  // muda o estado para Investing
  function start() public onlyDuring(State.Open) {
    totalInvested = this.balance; // guarda quanto tinha, para calcular a proporção de cada um depois

    operatingWallet.transfer(totalInvested); // que comecem os jogos!

    state = State.Investing;
    InvestingStarted(); // notificando interessados de que o investimento começou
  }

  /*
   * Funções INVESTING
   */

  // invocado apenas pela carteira dos operadores para entregar o resultado final
  // NÃO muda o estado para Finished! Assim os operadores podem mandar o dinheiro em múltiplas chamadas
  function receive() public payable onlyDuring(State.Investing) onlyBy(operatingWallet) {
    require(this.balance + msg.value > this.balance); // checa overflow

    ReturnsReceived(msg.value);
  }

  // invocado apenas pela carteira dos operadores
  // SÓ muda o estado para Finished
  function finish() public onlyDuring(State.Investing) onlyBy(operatingWallet) {
    totalReceived = this.balance; // guarda quanto recebeu para calcular a proporção de cada um depois

    state = State.Finished;
    InvestingFinished();
  }

  /*
   * Funções FINISHED
   */

  // paga a parte do resultado a quem o chamar
  function withdraw() public onlyDuring(State.Finished) {
    require(balances[msg.sender] > 0); // gaiatos não recebem nada

    uint result = balances[msg.sender] * (totalReceived / totalInvested); // o quanto o investimento rendeu
    burn(msg.sender, balances[msg.sender]); // os tokens não existirão mais

    msg.sender.transfer(result);
  }
}