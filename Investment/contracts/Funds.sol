pragma solidity ^0.4.0;

import "./FundToken.sol";

// questões em aberto:
// * este contrato é que cria a carteira dos operadores?
// * já viram https://github.com/TokenMarketNet/ico/blob/master/contracts/GnosisWallet.sol ?
// * operadores
// * eventos
// * que poderes o owner teria aqui? Um setState?

/** 
 * Manages the funds of a group of investors, following a simple workflow.
 
 * This contract emits ERC20 tokens (FUND) for the ethers deposited. These 
 * FUNDs can be exchanged between the investors or eventually redeemed for the
 * returns on the investment.
 */
contract Funds is FundToken {
  address private owner;
  address private operatingWallet;

  uint private totalInvested;
  uint private totalReceived;

  /**
   * The valid states for this contract, which define what operations are 
   * valid.
   * 
   * * `Open` means that this contract is taking investors.
   * * `Investing` is when the investors' money is in the operating wallet, 
   *    and this contract is awaiting the returns.
   * * `Finished` means that the returns have been paid, and now the investors
   *    can get their share.
   */
  enum State { Open, Investing, Finished }

  State private state;

  /** Fired when the state changes from Open to Investing. */
  event InvestingStarted();

  /** Fired when the state changes from Investing to Finished. */
  event InvestingFinished();

  /** Fired when the operating wallet deposits `value` weis back. */
  event ReturnsReceived(uint value);

  /** Fired when the operating wallet changes. */
  event OperatingWalletChanged(address oldWallet, address newWallet);

  /** Creates this contract, with `msg.sender` as the `owner`. */
  function Funds() public {
    owner = msg.sender;
  }

  /*
   * Modifiers
   */

  /** Checks if this contract is in state `_state`. */
  modifier onlyDuring(State _state) {
    require(state == _state);
    _;
  }

  /** Checks if the function is being called by `_address`. */
  modifier onlyBy(address _address) {
    require(msg.sender == _address);
    _;
  }

  /*
   * gerenciamento de estado
   */

  /** Returns this contract's owner. */
  function getOwner() public view returns (address) {
    return owner;
  }

  /** Returns the current operating wallet. */
  function getOperatingWallet() public view returns (address) {
    return operatingWallet;
  }

  /**
   * Changes the operating wallet. 
   * Can be called only by the owner, and only during State.Open.
   * 
   * @param wallet The new wallet.
   */
  function setOperatingWallet(address wallet) public onlyBy(owner) onlyDuring(State.Open) {
    address old = operatingWallet;
    operatingWallet = wallet;

    OperatingWalletChanged(old, wallet);
  }

  /** Returns the current state. */
  function getState() public view returns (State) {
    return state;
  }

  /**
   * The total amount invested in this contract, in weis. This value should 
   * be set in stone after State.Open.
   * 
   * This value is useful because the contract's balance and totalSupply() 
   * can change after State.Open, and that would distort the ROI calculation.
   */
  function getTotalInvested() public view returns (uint) {
    if (state == State.Open) {
      return totalSupply();
    } else {
      return totalInvested;
    }
  }

  /** 
   * The total amount returned after the investment, in weis. 
   */
  function getTotalReceived() public view returns (uint) {
    return totalReceived;
  }

  /*
   * OPEN operations
   */

  /** 
   * Stores and registers the amount paid by `msg.sender`, who gets in
   * return a number of FUND tokens equal to the amount paid.
   * 
   * After State.Open, this contract is closed for further investments, 
   * although FUND owners can still exchange FUND tokens afterwards :)
   */
  function invest() public payable onlyDuring(State.Open) {
    mint(msg.sender, msg.value);
  }

  /** 
   * Exchanges `value` FUND tokens from `msg.sender` (which are destroyed) 
   * for `value` weis.
   * 
   * This function works only during State.Open, and `msg.sender` cannot redeem
   * more tokens than they actually own.
   * 
   * @param value The amount of FUND tokens to exchange.
   */
  function divest(uint value) public onlyDuring(State.Open) {
    burn(msg.sender, value);

    msg.sender.transfer(value);
  }

  /** 
   * Transfers all the ethers in this contract to the operating wallet, which
   * kicks off the State.Investing state. Works only during State.Open.
   * 
   * Fires InvestingStarted.
   */
  function start() public onlyDuring(State.Open) {
    require(operatingWallet > 0); // precisa ser definido antes do investimento começar
    
    totalInvested = this.balance; // guarda quanto tinha, para calcular a proporção de cada um depois

    operatingWallet.transfer(totalInvested); // que comecem os jogos!

    state = State.Investing;
    InvestingStarted(); // notificando interessados de que o investimento começou
  }

  /*
   * INVESTING operations
   */

  /**
   * Stores any early returns from the investments. 
   * 
   * Can be called only by the operating wallet, and only during 
   * State.Investing.
   * Fires ReturnsReceived.
   */
  function receive() public payable onlyDuring(State.Investing) onlyBy(operatingWallet) {
    require(this.balance + msg.value > this.balance); // checa overflow

    ReturnsReceived(msg.value);
  }

  /**
   * Ends State.Investing, and transitions to State.Finished. 
   * 
   * Can be called only by the operating wallet, and only during 
   * State.Investing.
   * Fires InvestingFinished.
   */
  function finish() public onlyDuring(State.Investing) onlyBy(operatingWallet) {
    totalReceived = this.balance; // guarda quanto recebeu para calcular a proporção de cada um depois

    state = State.Finished;
    InvestingFinished();
  }

  /*
   * FINISHED operations
   */

  /**
   * Exchanges all `msg.sender`'s FUND tokens for their returns on the 
   * investment.
   * 
   * Can be called only during State.Finished. Errors if `msg.sender` has no 
   * FUNDs to exchange.
   */
  function withdraw() public onlyDuring(State.Finished) {
    require(balances[msg.sender] > 0); // gaiatos não recebem nada

    uint result = balances[msg.sender] * (totalReceived / totalInvested); // o quanto o investimento rendeu
    burn(msg.sender, balances[msg.sender]); // os tokens não existirão mais

    msg.sender.transfer(result);
  }
}