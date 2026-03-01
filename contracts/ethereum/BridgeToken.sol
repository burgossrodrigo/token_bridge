//SPDX-License-Identifier: unlicensed
pragma solidity 0.7.6;

import "./extension/Admin.sol";

contract BridgeToken is Admin {

    constructor() public {
        _name = "Bridge Token";
        _symbol = "BRDGTK";
        _decimals = 18;
        _owner = msg.sender;
        admin[msg.sender] = true;        
    }

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint)) _allowed;
    uint _totalSupply;
    string _name;
    string _symbol;
    uint8 _decimals;
    uint _maxSupply;


    event Transfer(address, address, uint);
    event Approval(address, address, uint);
    event OwnershipTransfered(address);
    event Burn(address, uint256);

    /**
    * @dev return the name of the token
    * @return the name as string
     */

    function name() public view returns (string memory){
        return _name;
    }

        /**
    * @dev return the symbol of the token
    * @return the symbol as string
     */

    function symbol() public view returns (string memory){
        return _symbol;
    }

        /**
    * @dev return the decimals of the token
    * @return the decimals as uint
     */

    function decimals() public view returns (uint8){
        return _decimals;
    }

    /**
    * @dev function to check the total supply
    * @return uint representing the total supply
    */

    function totalSupply() public view returns(uint){
        return _totalSupply;
    }

    /**
    * @dev function to return the address of the _owner
     */

    function getOwner() external view returns(address){
        return _owner;
    }

    /**
    * @dev function to get the remaining tokens
    * @return the result of the maximum supply minus the total supply as uint
     */

    function remainingTokens() external view returns(uint){
        uint result = _maxSupply - _totalSupply;
        return result;
    }    

    /**
    * @dev sets the maximum supply
    * @param amount amount of the maximum supply
    */

    function setMaxSupply(uint amount) external onlyOwner returns(bool){
        _maxSupply = amount;
        return true;
    }

    /**
    * @dev transfer ownership
    * @param _address address that the owner wants to turn into the new owner.
     */

    function transferOwnership(address _address) external onlyOwner returns(bool){
        _owner = _address;
        emit OwnershipTransfered(_address);
        return true;
    }

    /**
    * @dev set the total supply
     */

    function setTotalSupply(uint amount) external onlyOwner returns(bool){
        _totalSupply = amount;
        return true;
    }

    /**
    * @dev allow owner to mint to specific addresses
    * @param to address where the tokens should go
    * @param amount number of tokens that you want to send
    */

    function ownerMint(address to, uint amount) external onlyAdmin returns(bool){
        require(_totalSupply < _maxSupply, "The max supply has already be meet");
        _mint(to, amount);
        emit Transfer(address(0), to, amount);
        return true;
    }

    function ownerBurn(address from, uint amount) external onlyAdmin returns(bool){
        _burn(from, amount);
        emit Burn(from, amount);
        return true;
    }    

    /**
    * @dev return the amount the the owner has authorized a third party address to spend
    * @param owner owner of the token
    * @param spender address responsible for spending in behalf of the owner
    * @return uint for the allowance
     */

    function allowance(address owner, address spender) public view returns(uint){
        return _allowed[owner][spender];
    }

    /**
    * @dev transfer tokens from the sender to an specific address
    * @param to address where the owner wants to send tokens
    * @param value value in which the owner wants to transfer in wei 
     */

    function transfer(address to, uint value) public returns (bool) {
        require(value <= balanceOf[msg.sender], "Not enough balance");
        require(to != address(0), "You can't burn tokens");
        //transfer fees go here!
        balanceOf[msg.sender] = balanceOf[msg.sender] - value;
        balanceOf[to] = balanceOf[to] + value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    /**
    * @dev approve an address to spend tokens on behalf of owner
    * @param spender address to spend in behalf of owner
    * @param value amount of tokens to be authorized 
     */

    function approve(address spender, uint value) public returns (bool) {
        require(spender != address(0), "You can't set allowance to address 0");
        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
    * @dev spend tokens in behalf of owner
    * @param from owner of the tokens
    * @param to address where the tokens will be sent
    * @param value amount of tokens to be spended
     */

    function transferFrom(address from, address to, uint value) public returns (bool) {
        require(value <= balanceOf[from], "Target addres doesn't have enough balance");
        require(value <= _allowed[from][msg.sender], "You are not allowed to transfer this amount of tokens");
        require(to != address(0), "You can't send tokens to address 0");

        balanceOf[from] = balanceOf[from] - value;
        balanceOf[to] = balanceOf[to] + value;
        _allowed[from][msg.sender] = _allowed[from][msg.sender] - value;
        emit Transfer(from, to, value);
        return true;
    }

    /**
    * @dev uprise the allowance of an address to spend in behalf of other
    * @param addedValue amount of tokens to be uprised on allowance
     */

    function increaseAllowance(address spender, uint addedValue) public returns (bool) {
        require(spender != address(0), "You can't delegate allowance to address 0");
        _allowed[msg.sender][spender] = (_allowed[msg.sender][spender] + addedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
    * @dev downgrade the allowance for an address to spend in behalf of other
    * @param spender address to spend tokens in behalf of owner
    * @param subtractedValue value to be downgraded from the spender allowance
     */

    function decreaseAllowance(address spender, uint subtractedValue) public returns (bool) {
        require(spender != address(0), "You can't delegate allowance to address 0");
        _allowed[msg.sender][spender] = (_allowed[msg.sender][spender] - subtractedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
    * @dev internal function to mint tokens
    * @param account where the new tokens will be minted
    * @param amount number of tokens that will be minted
     */

    function _mint(address account, uint amount) internal {
        require(account != address(0), "You can't mint tokens to address 0");
        _totalSupply = _totalSupply + amount;
        balanceOf[account] = balanceOf[account] + amount;
        emit Transfer(address(0), account, amount);
    }

    /**
    * @dev internal function to burn tokens
    * @param account where the tokens will be burned from
    * @param amount number of tokens to be burned
     */

    function _burn(address account, uint amount) internal {
        require(account != address(0));
        require(amount <= balanceOf[account], "Not enough balance to burn");
        _totalSupply = _totalSupply - amount;
        balanceOf[account] = balanceOf[account] - amount;
        emit Transfer(account, address(0), amount);
    }

    /**
    * @dev internal
     */

    function _burnFrom(address account, uint amount) internal {
        require(amount <= _allowed[account][msg.sender], "You are not allowed to burn this amount from the address");
        _allowed[account][msg.sender] = _allowed[account][msg.sender] - amount;
        _burn(account, amount);
    }
}