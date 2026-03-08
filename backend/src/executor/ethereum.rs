use crate::config::Config;
use alloy::{
    network::EthereumWallet,
    primitives::{Address, U256},
    providers::ProviderBuilder,
    signers::local::PrivateKeySigner,
    sol,
};
use anyhow::Result;
use std::sync::Arc;

sol! {
    #[sol(rpc)]
    contract Bridge {
        function bridgeReceive(address token, uint256 amount, address to) external;
    }
}

/// Calls bridgeReceive on the Ethereum Bridge contract.
///
/// `dest_token` — ETH token address (0x-prefixed)
/// `to`         — ETH recipient address (0x-prefixed)
/// `amount`     — token amount
pub async fn bridge_receive(
    cfg: Arc<Config>,
    dest_token: &str,
    amount: u64,
    to: &str,
) -> Result<String> {
    let signer: PrivateKeySigner = cfg.eth_private_key.parse()?;
    let wallet = EthereumWallet::from(signer);

    let provider = ProviderBuilder::new()
        .with_recommended_fillers()
        .wallet(wallet)
        .on_http(cfg.eth_rpc_url.parse()?);

    let bridge_address: Address = cfg.eth_bridge_address.parse()?;
    let token: Address = dest_token.parse()?;
    let recipient: Address = to.parse()?;

    let bridge = Bridge::new(bridge_address, provider);
    let receipt = bridge
        .bridgeReceive(token, U256::from(amount), recipient)
        .send()
        .await?
        .get_receipt()
        .await?;

    let tx_hash = format!("{:?}", receipt.transaction_hash);
    Ok(tx_hash)
}
