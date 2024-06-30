import { web3 } from "@project-serum/anchor";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { BN } from "bn.js";

function createKeypairs(count: number): web3.Keypair[] {
  const keypairs: web3.Keypair[] = [];
  for (let i = 0; i < count; i++) {
    keypairs.push(web3.Keypair.generate());
  }

  return keypairs;
}

async function airdropSol(connection: web3.Connection, recepient: web3.PublicKey, solAmount: number) {
  let signature = await connection.requestAirdrop(recepient, solAmount * 1e9,);
  await connection.confirmTransaction(signature);
}

export async function createAndFundAccounts(connection: web3.Connection, count: number, solAmount: number): Promise<web3.Keypair[]> {
  let keypairs = createKeypairs(count);

  let promises = keypairs.map(async x => await airdropSol(connection, x.publicKey, solAmount));
  await Promise.all(promises);

  return keypairs;
}

export async function createAndFundAccountsWithTokens(
  connection: web3.Connection,
  accounts: web3.PublicKey[],
  mint: web3.PublicKey,
  authority: web3.Signer,
  amount: number
): Promise<void> {
  let promises = accounts.map(async a => {
    let associatedAddress = await createAssociatedTokenAccount(connection, authority, mint, a);
    let tx = await mintTo(connection, authority, mint, associatedAddress, authority, amount);
    await connection.confirmTransaction(tx);
  });

  await Promise.all(promises);
}

export async function fundAccountsWithTokens(
  connection: web3.Connection,
  accounts: web3.PublicKey[],
  mint: web3.PublicKey,
  authority: web3.Signer,
  amount: number
): Promise<void> {
  let promises = accounts.map(async a => {
    let associatedAddr = await associatedAddress({ mint, owner: a });
    let tx = await mintTo(connection, authority, mint, associatedAddr, authority, amount);
    await connection.confirmTransaction(tx);
  });

  await Promise.all(promises);
}

export async function createTokenAccounts(
  connection: web3.Connection,
  accounts: web3.PublicKey[],
  mint: web3.PublicKey,
  authority: web3.Signer
): Promise<void> {
  let promises = accounts.map(async a => {
    await await createAssociatedTokenAccount(connection, authority, mint, a);
  });

  await Promise.all(promises);
}