import BN from "bn.js";

const DECIMALS = 9;

export function tokenAmountFromStr(amountStr: string) {
    let exp = new BN(10 ** DECIMALS);
    let amount = new BN(amountStr).mul(exp);
    return amount;
}

export function tokenAmount(amount: number) {
    let amountStr = (amount * 10 ** DECIMALS).toString();
    return new BN(amountStr);
}

export function fromTokenAmount(amount: BN) {
    let amountNumber = amount.toNumber();

    return amountNumber / (10 ** DECIMALS)
}

export function fromBigIntTokenAmount(amount: BigInt) {
    let amountNumber = Number(amount);

    return amountNumber / (10 ** DECIMALS)
}