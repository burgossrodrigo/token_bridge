import { ConnectButton  } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

const Wrapper = styled.div`
    margin: 0 auto;
    @media (max-width: 480px ){
        margin: 0 auto;
      }
`

const Wallet = () => {

    return(
        <Wrapper>
            <ConnectButton />
        </Wrapper>
    )
}

export default Wallet