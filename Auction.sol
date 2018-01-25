pragma solidity ^0.4.19;

contract Auction {
    address owner;
    uint minAsk;
    
    uint startingTime;
    uint duration;
    bool isRunning;
    
    mapping(address => uint) bids;
    
    address winner;
    uint winningBid;
    
    function Auction(uint _minAsk, uint _duration) public {
        owner = msg.sender;
        
        startingTime = now;
        duration = _duration;
        isRunning = true;
        
        minAsk = _minAsk;
    }
    
    // It's on the current bidder to return the previous winner's money.
    // This way, each bid is slightly more expensive, but the owner doesn't
    // have to pay for returning everybody's bids, which may be too expensive 
    // to run.
    function bid() payable public {
        require(isRunning); 
        require(now < (startingTime + duration));
        require(minAsk <= msg.value);
        require(winningBid < msg.value);
        
        if(winner > 0) {
            // Mutual recursion can be abused! Make the transfer idempotent.
            uint value = bids[winner];
            bids[winner] = 0;
            winner.transfer(value);
        }
        
        bids[msg.sender] = msg.value;
        winningBid = msg.value;
        winner = msg.sender;
    }
    
    function end() public {
        isRunning = false;
        
        uint value = winningBid;
        winningBid = 0;
        
        // Mutual recursion can be abused! Generally sends and transfers are 
        // the last thing to do in a function
        owner.transfer(value);
    }
    
    function getMinimalAsk() public view returns (uint) {
        return minAsk;
    }
    
    function getWinner() public view returns (address) {
        return winner;
    }
    
    function getWinningBid() public view returns (uint) {
        return winningBid;
    }
}
