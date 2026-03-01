//SPDX-License-Identifier: unlicensed
pragma solidity 0.7.6;

contract Admin {

    address _owner;

    mapping(address => bool) admin;
    
    event AdminSet(address);
    event AdminRemoved(address);        
    
    modifier onlyOwner {
        require(msg.sender == _owner, "Only owner is able to access this function");
        _;
    }

    modifier onlyAdmin {
        require(msg.sender == _owner || admin[msg.sender] == true, "You don't have permission to access this function");
        _;
    }

    /**
    * @dev set an address as admin
    * @param _address address that you wanna turn admin
     */
    
    function setAdmin(address _address) external onlyOwner returns(bool){
        admin[_address] = true;
        emit AdminSet(_address);
        return true;
    }

    function removeAdmin(address _address) external onlyOwner returns(bool){
        admin[_address] = false;
        emit AdminRemoved(_address);
        return true;
    }

}