import { inClient } from '@/functions/judgers/isSSR'
import base58 from 'bs58'
import axios from 'axios'
import useWallet from '../wallet/useWallet'
import { PublicKey, Connection } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, MintLayout } from '@solana/spl-token';
import { LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
// import { OpenOrders } from "@project-serum/serum";

export async function getSignMessage(message: string): Promise<string | undefined> {
  if (!inClient) return
  const signMessage = useWallet.getState().signMessage
  const signature = await signMessage?.(new TextEncoder().encode(message))
  return signature && base58.encode(signature)
}

export async function getNewWalletSignature(newWallet: string) {
  const message = `Reassign my staking eligibility to new wallet: ${newWallet}`
  return getSignMessage(message)
}

export async function customBalanceOf(tokenMint: string, walletMint: string): Promise<string | undefined> {
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  const tokenPublicKey = new PublicKey(tokenMint);
  const walletPublicKey = new PublicKey(walletMint);
  // Get the associated token account address for the wallet
  const tokenAccountAddress = await getAssociatedTokenAddress(
    tokenPublicKey,
    walletPublicKey
  );

  try {
    // Fetch the token account info
    const tokenAccountInfo = await getAccount(connection, tokenAccountAddress);
    return tokenAccountInfo.amount.toString();
  } catch (error) {
    // If the token account does not exist, the balance is zero
    return;
  }
}

export async function getRGamesPriceFromLP(lpPoolID: string): Promise<number | undefined> {
  const connection = useConnection.getState().connection;
  if (!connection) return;
  const poolIDPublicKey = new PublicKey(lpPoolID);
  const lpAccountInfo = await connection.getAccountInfo(poolIDPublicKey);

  if (!lpAccountInfo) {
    throw new Error('Failed to find mint account');
  }

  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(lpAccountInfo.data);

  const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
  const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();
  const baseTokenAmount = await connection.getTokenAccountBalance(poolState.baseVault);
  const quoteTokenAmount = await connection.getTokenAccountBalance(poolState.quoteVault);

  const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
  const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

  const base = (baseTokenAmount.value?.uiAmount || 0) - basePnl;
  const quote = (quoteTokenAmount.value?.uiAmount || 0) - quotePnl;

  let basePrice = 0;
  let quotePrice = 0;
  try {
    const quoteMint = poolState.quoteMint.toString();
    let resp = await axios.get(`https://price.jup.ag/v4/price?ids=${quoteMint}&vsToken=USDT`)
    if (resp.status == 200) {
      const temp = parseFloat(resp.data.data[quoteMint].price);
      quotePrice = temp;
    }

  } catch (error) {
    console.error('Error fetching token price::', error);
  }
  const ECATPrice = quote * quotePrice / base;
  return ECATPrice;

}

export async function getLpPrice(lpPoolID: string): Promise<number | undefined> {
  const connection = useConnection.getState().connection;
  if (!connection) return;
  const poolIDPublicKey = new PublicKey(lpPoolID);
  const lpAccountInfo = await connection.getAccountInfo(poolIDPublicKey);

  if (!lpAccountInfo) {
    throw new Error('Failed to find mint account');
  }

  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(lpAccountInfo.data);

  const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
  const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();
  const baseTokenAmount = await connection.getTokenAccountBalance(poolState.baseVault);
  const quoteTokenAmount = await connection.getTokenAccountBalance(poolState.quoteVault);

  const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
  const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

  const base = (baseTokenAmount.value?.uiAmount || 0) - basePnl;
  const quote = (quoteTokenAmount.value?.uiAmount || 0) - quotePnl;

  let basePrice = 0;
  let quotePrice = 0;
  try {
    const baseMint = poolState.baseMint.toString();
    let resp = await axios.get(`https://price.jup.ag/v4/price?ids=${baseMint}&vsToken=USDT`)
    if (resp.status == 200) {
      const temp = parseFloat(resp.data.data[baseMint].price);
      basePrice = temp;
    }
    const quoteMint = poolState.quoteMint.toString();
    resp = await axios.get(`https://price.jup.ag/v4/price?ids=${quoteMint}&vsToken=USDT`)
    if (resp.status == 200) {
      const temp = parseFloat(resp.data.data[quoteMint].price);
      quotePrice = temp;
    }
  } catch (error) {
    console.error('Error fetching token price::', error);
  }
  const lpMintSupply = await connection.getTokenSupply(poolState.lpMint);
  const lpUiSupply = lpMintSupply.value.uiAmount;
  if (lpUiSupply == 0 || !lpUiSupply) {
    return 0;
  } else {
    const lpPrice = (base * basePrice + quote * quotePrice) / lpUiSupply;
    return lpPrice;
  }
}