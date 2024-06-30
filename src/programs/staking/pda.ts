import { BN, web3 } from "@project-serum/anchor";
import { STAKING_PROGRAM_PUBKEY } from "@/application/staking/useStakingInitializer";

export async function calculateGlobalDataPda(programId: web3.PublicKey = STAKING_PROGRAM_PUBKEY) {
    const prefix = "global-data";
    let seeds = [
        Buffer.from(prefix, "utf-8")
    ];
    return await web3.PublicKey.findProgramAddress(seeds, programId);
}

export async function calculateStakePoolPda(id: number, programId: web3.PublicKey = STAKING_PROGRAM_PUBKEY) {
    const prefix = "stake-pool";
    let seeds = [
        Buffer.from(prefix, "utf-8"),
        new BN(id).toArrayLike(Buffer, "le", 2)
    ];
    return await web3.PublicKey.findProgramAddress(seeds, programId);
}

export async function calculateStakeEntryPda(user: web3.PublicKey, stakePool: web3.PublicKey, programId: web3.PublicKey = STAKING_PROGRAM_PUBKEY) {
    const prefix = "stake-entry";
    let seeds = [
        Buffer.from(prefix, "utf-8"),
        stakePool.toBytes(),
        user.toBytes(),
    ];
    return await web3.PublicKey.findProgramAddress(seeds, programId);
}