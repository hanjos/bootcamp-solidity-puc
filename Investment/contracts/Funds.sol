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
 * 
 * This contract emits ERC20 tokens (FUND) for the ethers deposited. These 
 * FUNDs can be exchanged between the investors or eventually redeemed for the
 * returns on the investment.
 */
contract Funds is FundToken {
  address private owner;
  address private operatingWallet;
  uint private investingDate;

  uint private totalInvested;
  uint private totalReceived;

  uint private minimumInvestment;

  /**
   * The states of this contract. Each enables a certain set of operations
   * 
   * * `Open` means that this contract is taking investors.
   * * `Investing` is when the investors' money is in the operating wallet, 
   *    and this contract is awaiting the returns.
   * * `Finished` means that the returns have been paid, and now the investors
   *    can get their share.
   */
  enum State { Open, Investing, Finished }

  State private state;

  /** Fired when the state changes from `from` to `to`. */
  event StateChanged(State from, State to);

  /** Fired when the operating wallet deposits `value` weis back. */
  event ReturnsReceived(uint value);

  /** Fired when the operating wallet changes. */
  event OperatingWalletChanged(address oldWallet, address newWallet);

  /** Creates this contract, with `msg.sender` as the `owner`. */
  function Funds(uint _minimumInvestment, uint openDurationInDays) public {
    owner = msg.sender;
    minimumInvestment = _minimumInvestment;
    investingDate = now + (openDurationInDays * 1 days);

    state = State.Open;
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

  /** Verifies if the function is called after `date`. */
  modifier onlyAfter(uint date) {
    require(now >= date);
    _;
  }

  /*
   * Properties
   */

  /** Returns this contract's owner. */
  function getOwner() public view returns (address) {
    return owner;
  }

  /** Returns when `State.Investing` is available. */
  function getInvestingDate() public view returns (uint) {
    return investingDate;
  }

  /**
   * Returns the current operating wallet, which is where the funds will be
   * sent and where the returns will come from.
   */
  function getOperatingWallet() public view returns (address) {
    return operatingWallet;
  }

  /**
   * Changes the operating wallet. Can be called only by the owner.
   * 
   * @param wallet The new wallet.
   */
  function setOperatingWallet(address wallet) public onlyBy(owner) {
    address old = operatingWallet;
    operatingWallet = wallet;

    OperatingWalletChanged(old, wallet);
  }

  /** Returns the current state. */
  function getState() public view returns (State) {
    return state;
  }

  /** Changes the current state to `to`, and fires `StateChanged`. */
  function setState(State to) internal {
    State from = state;

    state = to;
    StateChanged(from, to);
  }

  function getMinimumInvestment() public view returns (uint) {
    return minimumInvestment;
  }

  /**
   * The total amount invested in this contract, in weis. This value should 
   * be set in stone after State.Open.
   * 
   * This value is useful because the contract's balance and `totalSupply()`
   * can change after `State.Open`, which would distort the ROI.
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
   * After `State.Open`, this contract is closed for further investments,
   * although FUND owners can still exchange FUND tokens afterwards :)
   */
  function invest() public payable onlyDuring(State.Open) {
    require(balances[msg.sender] + msg.value >= minimumInvestment);

    mint(msg.sender, msg.value);
  }

  /** 
   * Exchanges `value` FUND tokens (which are subsequently destroyed) from
   * `msg.sender` for `value` weis.
   * 
   * This function works only during `State.Open`, and `msg.sender` can't
   * return more tokens than they actually own.
   * 
   * @param value The amount of FUND tokens to exchange.
   */
  function divest(uint value) public onlyDuring(State.Open) {
    require(balances[msg.sender] == value || balances[msg.sender] - value >= minimumInvestment);

    burn(msg.sender, value);

    msg.sender.transfer(value);
  }

  /** 
   * Transfers all the ethers in this contract to the operating wallet, and
   * changes the state to `State.Investing`.
   *
   * Works only during `State.Open` and after `investingDate`. Fires 
   * `StateChanged`.
   */
  function start() public onlyDuring(State.Open) onlyAfter(investingDate) {
    require(operatingWallet > 0); // operatingWallet must be set by now
    require(this.balance >= minimumInvestment); // no point in investing nothing
    
    totalInvested = this.balance;

    operatingWallet.transfer(totalInvested);

    setState(State.Investing);
  }

  /*
   * INVESTING operations
   */

  /**
   * Stores any early returns from the investments. 
   * 
   * Can be called only by the operating wallet, and only during 
   * `State.Investing`. Fires `ReturnsReceived`.
   */
  function receive()
      public
      payable
      onlyDuring(State.Investing)
      onlyBy(operatingWallet) 
  {
    require(this.balance + msg.value > this.balance); // overflow

    ReturnsReceived(msg.value);
  }

  /**
   * Ends `State.Investing`, and transitions to `State.Finished`.
   * 
   * Can be called only by the operating wallet, and only during 
   * `State.Investing`. Fires `StateChanged`.
   */
  function finish()
      public
      onlyDuring(State.Investing)
      onlyBy(operatingWallet) 
  {
    totalReceived = this.balance;

    setState(State.Finished);
  }

  /*
   * FINISHED operations
   */

  /**
   * Exchanges all `msg.sender`'s FUND tokens for their returns.
   * 
   * Can be called only during `State.Finished`. Errors if `msg.sender` has no
   * FUNDs to exchange.
   */
  function withdraw() public onlyDuring(State.Finished) {
    require(balances[msg.sender] > 0);

    uint result = (balances[msg.sender] * totalReceived) / totalInvested;
    burn(msg.sender, balances[msg.sender]);

    msg.sender.transfer(result);
  }
}