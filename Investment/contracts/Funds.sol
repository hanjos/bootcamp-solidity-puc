pragma solidity ^0.4.0;

// questões em aberto:
// * este contrato é que cria a carteira dos operadores?
// * operadores
// * eventos
// * testes!
// * não creio que tenhamos tempo hábil, mas emitir tokens a serem redimidos depois pode ser interessante :)
// * que poderes o owner teria aqui? Um setState?
contract Funds {
  // há três estados: Open, Investing, Finished
  // Open é quando os investidores põem o dinheiro a ser investido
  // Investing é quando os analistas estão operando com o dinheiro do pessoal
  // Finished é quando as operações acabaram, e o dinheiro está sendo retornado
  enum State { Open, Investing, Finished }

  State state; // o estado atual do fundo

  address owner; // o administrador de tudo
  address operatingWallet; // a carteira dos operadores

  uint totalInvested; // o total investido em wei
  uint totalReceived; // o total recebido de volta em wei
  mapping(address => uint) balances; // o total investido em wei por endereço

  event InvestingStarted();
  event InvestingFinished();
  event ReturnsReceived(uint value);

  // a função só executa se este contrato estiver no estado `_state`
  modifier onlyDuring(State _state) {
    require(state == _state);
    _;
  }

  // a função só executa se for chamada por `_address`
  modifier onlyBy(address _address) {
    require(operatingWallet == _address);
    _;
  }

  // retorna quanto dinheiro `_address` colocou
  function balanceOf(address _address) public view returns (uint) {
    return balances[_address];
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

  // registra quem mandou o dinheiro e quanto
  // só durante Open
  function invest() public payable onlyDuring(State.Open) {
    require(msg.value > 0); // rejeita depósitos sem dinheiro
    require(balances[msg.sender] + msg.value > balances[msg.sender]); // checa overflow

    balances[msg.sender] += msg.value;
  }

  // resgata `value` de quem pedir
  // só durante Open
  // só até o total que aquela pessoa tiver
  function divest(uint value) public onlyDuring(State.Open) {
    require(value > 0); // rejeita resgates de nada
    require(balances[msg.sender] >= value); // rejeita resgates acima do valor depositado

    balances[msg.sender] -= value;

    msg.sender.transfer(value);
  }

  // transfere todos os ethers deste contrato para a carteira dos operadores
  // XXX quem pode chamar?
  // só durante Open
  // muda o estado para Investing
  function start() public onlyDuring(State.Open) {
    totalInvested = this.balance; // guarda quanto tinha, para calcular a proporção de cada um depois

    operatingWallet.transfer(totalInvested); // que comecem os jogos!

    state = State.Investing;
    InvestingStarted(); // notificando interessados de que o investimento começou
  }

  // invocado apenas pela carteira dos operadores para entregar o resultado final
  // só durante Investing
  // NÃO muda o estado para Finished! Assim os operadores podem mandar o dinheiro em múltiplas chamadas
  function receive() public payable onlyDuring(State.Investing) onlyBy(operatingWallet) {
    require(this.balance + msg.value > this.balance); // checa overflow

    ReturnsReceived(msg.value);
  }

  // invocado apenas pela carteira dos operadores
  // só durante Investing
  // SÓ muda o estado para Finished
  function finish() public onlyDuring(State.Investing) onlyBy(operatingWallet) {
    totalReceived = this.balance; // guarda quanto recebeu para calcular a proporção de cada um depois

    state = State.Finished;
    InvestingFinished();
  }

  // paga a parte do resultado a quem o chamar 
  // só durante Finished
  function withdraw() public onlyDuring(State.Finished) {
    require(balances[msg.sender] > 0); // gaiatos não recebem nada
    
    uint result = balances[msg.sender] * (totalReceived / totalInvested);
    balances[msg.sender] = 0;
    msg.sender.transfer(result);
  }
}