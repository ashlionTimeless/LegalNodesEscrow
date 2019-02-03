pragma solidity 0.4.24;

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

    /**
    * @dev Multiplies two numbers, throws on overflow.
    */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    /**
    * @dev Integer division of two numbers, truncating the quotient.
    */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    /**
    * @dev Substracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
    */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    /**
    * @dev Adds two numbers, throws on overflow.
    */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}


contract Ownable {
    address public owner;


    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

}

contract LegalNodesEscrow is Ownable //1914164 gas
{
    using SafeMath for uint256;

    // shows total amount of all deposited ether from all clients    
    uint256 allDeposited;
    // shows total amount of all withdrawable ether from all providers    
//    uint256 allWithdrawable;
    // shows total wei transferred through smart contract
    uint256 totalWeiTransferred;
    // price of KYC Service    
    uint256 kycPrice;
    
 //   uint256 depositTax;

    // tax on withdrawal of ether by provider
    uint256 withdrawalTax;
    
    mapping (address=>uint256) nonces;
    
    mapping(address=>mapping(address=>mapping(uint256=>uint256))) deposits;

    mapping(address=>mapping(address=>uint256[])) depositsIds;    

//    mapping(address=>mapping(address=>uint256)) withdawable;

    mapping (address=>uint256) totalDeposited;

//    mapping (address=>uint256) totalWithdrawable;

    mapping(address => address[]) clients;
    
    mapping(address => address[]) providers;

    event Deposit(address indexed _client, address indexed _provider, uint256 indexed depositId);

//    event Withdrawal(address indexed _client, address indexed _provider);
    
    event Release(address indexed _client, address indexed _provider, uint256 indexed deposit);
    
    event Refund(address indexed _client, address indexed _provider, uint256 indexed depositId);

    event WithdrawalTaxChanged(uint _oldValue, uint _newValue);
    
    event KycPriceChanged(uint _oldValue, uint _newValue);
    
    function deposit(address _provider) external payable//186794 gas on first / 77212 gas subsequent
    {
        require(msg.sender!= _provider);
        require(msg.value>0+kycPrice);

        // send pre-payment
        //TODO make transfer secure
        uint256 amount= msg.value.div(2);
        _provider.transfer(amount);
        
        // if the client uses smart contract for the first time - include KYC Service price
        if(nonces[msg.sender]==0)
        {
            amount=amount.sub(kycPrice);
        }
        
        nonces[msg.sender]=nonces[msg.sender].add(1);
        uint depositId=now+nonces[msg.sender];
        depositsIds[msg.sender][_provider].push(depositId);
        
        deposits[msg.sender][_provider][depositId]=amount;
     
        totalDeposited[msg.sender]=totalDeposited[msg.sender].add(amount);
        allDeposited=allDeposited.add(amount);

        emit Deposit(msg.sender, _provider, depositId);

        //add parties to each other's contact books. This costs almost 110 000 gas
        if(depositsIds[msg.sender][_provider].length==1){        
            clients[_provider].push(msg.sender);
            providers[msg.sender].push(_provider);
        }
    }
    
    // function withdraw(address _client) external
    // {
    //     require(msg.sender!= _client);
    //     require(withdawable[msg.sender][_client]>0);
        
    //     uint256 amount = withdawable[msg.sender][_client].mul(withdrawalTax).div(100);
        
    //     withdawable[msg.sender][_client]=0;

    //     totalWithdrawable[msg.sender]=totalWithdrawable[msg.sender].sub(amount);
    //     allWithdrawable=allWithdrawable.sub(amount);

    //     msg.sender.transfer(amount);
    //     emit Withdrawal(_client, msg.sender);
    // }
    
    // function release(address _client, address _provider, uint256 _depositId) external //36906 gas
    // {
    //     require(msg.sender == owner || msg.sender ==  _client);
    //     require(deposits[_client][_provider][_depositId]>0);

    //     uint256 amount = deposits[_client][_provider][_depositId];

    //     deposits[_client][_provider][_depositId]=0;

    //     totalDeposited[_client]=totalDeposited[_client].sub(amount);
    //     allDeposited=allDeposited.sub(amount);

    //     withdawable[_provider][_client]=withdawable[_provider][_client].add(amount);

    //     totalWithdrawable[_provider]=totalWithdrawable[_provider].add(amount);
    //     allWithdrawable=allWithdrawable.add(amount);
    //     totalWeiTransferred.add(amount);
    //     emit Release(_client,_provider,_depositId);
    // }

    function release(address _client, address _provider, uint256 _depositId) external
    {
        require(msg.sender == owner || msg.sender ==  _client);
        require(deposits[_client][_provider][_depositId]>0);

        uint256 amount = deposits[_client][_provider][_depositId];
        
        deposits[_client][_provider][_depositId]=0;

        totalDeposited[_client]=totalDeposited[_client].sub(amount);
        allDeposited=allDeposited.sub(amount);
        
        // substract service fee
        amount = amount - amount.mul(withdrawalTax).div(100);
        _provider.transfer(amount);
        
        totalWeiTransferred.add(amount);
        emit Release(_client,_provider,_depositId);
    }

    // can only be called by Owner of the contract, perphaps should add expiration date after which can be called by    
    function refund(address _client, address _provider, uint256 _depositId) external onlyOwner
    {
        require(deposits[_client][_provider][_depositId]>0);

        uint256 amount = deposits[_client][_provider][_depositId];

        deposits[_client][_provider][_depositId]=0;

        totalDeposited[_client]=totalDeposited[_client].sub(amount);
        allDeposited=allDeposited.sub(amount);

        _client.transfer(amount);

        emit Refund(_client,_provider,_depositId);
    }
    
    // escrow information
    function getDeposits(address _client, address _provider) view public returns(uint256[])
    {
        return depositsIds[_client][_provider];
    }
    
    function getDepositAmount(address _client, address _provider, uint256 _depositId) view public returns(uint256)
    {
        return deposits[_client][_provider][_depositId];
    }

    // function getWithdawable(address _provider,address _client) view public returns(uint256)
    // {
    //     return withdawable[_provider][_client];
    // }

    // personal record book    
    function getClients(address _provider) view public returns(address[])
    {
        require(msg.sender == _provider || msg.sender == owner);
        return clients[_provider];
    }
    
    function getProviders(address _client) view public returns(address[])
    {
        require(msg.sender == _client || msg.sender == owner);
        return providers[_client];
    }
    
    function getTotalDeposited(address _client) view external returns(uint256)
    {
        require(msg.sender == _client || msg.sender == owner);
        return totalDeposited[_client];
    }
    
    // function getTotalWithdrawable(address _provider) view external returns(uint256)
    // {
    //     require(msg.sender == _provider || msg.sender == owner);
    //     return totalWithdrawable[_provider];
    // }
    // statistics
    function getAllDeposited() view external returns(uint256)
    {
        return allDeposited;
    }
    
    // function getAllWithdrawable() view external returns(uint256)
    // {
    //     return allWithdrawable;
    // }
    
    function getTotalWeiTransferred() view external returns(uint256)
    {
        return totalWeiTransferred;
    }
    
    function getWithdrawalTax() view public returns(uint256)
    {
        return withdrawalTax;
    }
    
    function getKycPrice() view public returns(uint256)
    {
        return kycPrice;
    }

    // admin functions
    // function setDepositTax(uint256 _newValue) external onlyOwner
    // {
    //     depositTax=_newValue;
    // }
    function setWithdrawalTax(uint256 _newValue) external onlyOwner // 42011 gas
    {
        uint old = withdrawalTax;
        withdrawalTax=_newValue;
        emit WithdrawalTaxChanged(old,_newValue);
    }
    
    function setKycPrice(uint256 _newPrice) external onlyOwner //42053 gas
    {
        uint old = kycPrice;
        kycPrice=_newPrice;
        emit KycPriceChanged(old, kycPrice);
    }
 
    
}