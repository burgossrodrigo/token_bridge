const express = require('express')
const bodyParse = require('body-parser')
const ethers = require('ethers')
const cors = require('cors')
const { getDatabase } = require('firebase-admin/database')
const serviceAccount = require('./testnet-token-bridge-firebase-adminsdk-uh5kr-138d6d92be.json')

const BRIDGE_ABI = require('../artifacts/contracts/Bridge.sol/Bridge.json')
const BRIDGE_TOKEN_ABI = require('../artifacts/contracts/BridgeToken.sol/BridgeToken.json')
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://testnet-token-bridge-default-rtdb.firebaseio.com/"
  });

const db = getDatabase()


const json = bodyParse.json
const app = express();
const router = express.Router()
const goerliProvider = new ethers.providers.JsonRpcProvider(`https://eth-goerli.g.alchemy.com/v2/dyt7aJu0I5SExDy2IxOSORNpDYKnTRCU`)
const mumbaiProvider = new ethers.providers.JsonRpcProvider(`https://polygon-mumbai.g.alchemy.com/v2/nRYjkKqGYBrDLnjYwpLsaO4lRgcvJDKy`)

const goerliWss = new ethers.providers.JsonRpcProvider(`wss://eth-goerli.g.alchemy.com/v2/X_71lyvSJ09ASLV4smEvvVs2ZY-vSJ5h`)
const mumbaiWss = new ethers.providers.JsonRpcProvider(`wss://eth-goerli.g.alchemy.com/v2/X_71lyvSJ09ASLV4smEvvVs2ZY-vSJ5h`)

app.use(json());
app.use(router);
const PORT = process.env.PORT || 5000
var server_host = process.env.YOUR_HOST || '0.0.0.0';
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
};

const goerliRef = db.ref('/sendGoerli').push();
const mumbaiRef = db.ref('/sendMumbai').push();

const GOERLI_BRIGE_CONTRACT = new ethers.Contract(
    '0x5De04Fd0a00b3d378CbD2eC881134C53FB93ce9F',
    BRIDGE_ABI.abi,
    goerliProvider
    )

    const MUMBAI_BRIGE_CONTRACT = new ethers.Contract(
        '0x1C6Ed7e8E9496E9121819620AF40B5bc2B09e29A',
        BRIDGE_ABI.abi,
        mumbaiProvider
    )
    
    const GOERLI_BRIGE_CONTRACT_WSS = new ethers.Contract(
        '0x5De04Fd0a00b3d378CbD2eC881134C53FB93ce9F',
        BRIDGE_ABI.abi,
        goerliWss
        )
    
        const MUMBAI_BRIGE_CONTRACT_WSS = new ethers.Contract(
            '0x1C6Ed7e8E9496E9121819620AF40B5bc2B09e29A',
            BRIDGE_ABI.abi,
            mumbaiWss
        )        

app.listen(PORT, server_host, () => {
    console.log(`server is listening on port: ${PORT}`)
})

router.get('/bridge/mumbai', cors(corsOptions), async (req, res) => {
    try {
        const result = await GOERLI_BRIGE_CONTRACT.brigeStatus()
        return res.json(result)
    } catch (error) {
        return res.json(error.message)
    }
})

router.get('/bridge/mumbai', cors(corsOptions), async (req, res) => {
    try {
        const result = await MUMBAI_BRIGE_CONTRACT.brigeStatus()
        return res.json(result)
    } catch (error) {
        return res.json(error.message)
    }
})

const mumbaiSent = async () => {
    MUMBAI_BRIGE_CONTRACT_WSS.on('TokenSent', (_to, _token, _amount) => {
        mumbaiRef.set({
            to: _to,
            token: _token,
            amount: _amount,
            status: 'pending'
        })
    })
}

const goerliSent = async () => {
    GOERLI_BRIGE_CONTRACT_WSS.on('TokenSent', (_to, _token, _amount) => {
        goerliRef.set({
            to: _to,
            token: _token,
            amount: _amount,
            status: 'pending'
        })
    })
}

mumbaiRef.on('value', (snapshot) => {
        snapshot.forEach(async (data) => {
        try {
          const bridgeData = data.val();
          bridgeData.data.map(async (_data) => {
            GOERLI_BRIGE_CONTRACT.ownerBurn(_data.to, _data.amount)
            MUMBAI_BRIGE_CONTRACT.ownerMint(_data.to, _data.amount);
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
            MUMBAI_BRIGE_CONTRACT.ownerBurn(_data.to, _data.amount)
            GOERLI_BRIGE_CONTRACT.ownerMint(_data.to, _data.amount)
          })          
        } catch (error) {
          console.log(error);
        }
      })
    })    

goerliWss.on('block', _ => {
    goerliSent()
})

mumbaiWss.on('block', _ => {
    mumbaiSent()
})








