# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

# BrigeToken.sol

It's a regular ERC20 token excepts for these two features:

```
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
```

Allows a third address (can be a smart contract or a private address) to mint and burn tokens.

#Bridge.sol

Those two particular features allow the contract (set as an admin for the bridge token) to perform owner mint and owner burn of the bridge token:

```
    function bridgeReceive(address _token, uint256 _amount, address _to) onlyAdmin external {
        if(bridgeable[_token] == true){
            IBridgeToken token = IBridgeToken(_token);
            token.ownerMint(msg.sender, _amount);
            emit TokenReceived(_to, _token, _amount);
        }
        revert("Token isn't bridgeable :'(");
    }

    function bridgeSent(address _token, uint256 _amount, address _to) external {
        if(bridgeable[_token] == true){
            IBridgeToken token = IBridgeToken(_token);
            token.ownerBurn(msg.sender, _amount);
            emit TokenSent(_to, _token, _amount);
        }
        revert("Token isn't bridgeable :'(");
    }
```


#BACKEND

The feature that perform the token transfer on the other side of the bridge:

```
mumbaiRef.on('value', (snapshot) => {
        snapshot.forEach(async (data) => {
        try {
          const bridgeData = data.val();
          bridgeData.data.map(async (_data) => {
            GOERLI_BRIGE_CONTRACT.ownerMint(_data.to, _data.amount);
          })          
        } catch (error) {
          console.log(error);
        }
      })
    })

    goerliRef.on('value', (snapshot) => {
        snapshot.forEach(async (data) => {
        try {
          const bridgeData = data.val();
          bridgeData.data.map(async (_data) => {
            MUMBAI_BRIGE_CONTRACT.ownerMint(_data.to, _data.amount)
          })          
        } catch (error) {
          console.log(error);
        }
      })
    })
```

Everytime the bridge token is burned on bridge side A, we mint new tokens on the B side.
