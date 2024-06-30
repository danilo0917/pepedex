import { calculateGlobalDataPda } from "./pda";
import { program } from "./instructions";

export async function getNextId() {
    let globalDataPda = await calculateGlobalDataPda();
    let data = await program.account.globalData.fetchNullable(globalDataPda[0]);
    return data?.id;
}