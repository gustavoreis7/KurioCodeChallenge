import type { EthDecimal } from "../types";

const SCALE = 10n ** 18n;
export function toWei(value: EthDecimal): bigint {
  if (typeof value !== "string" || !/^\d+(\.\d{1,18})?$/.test(value)) {
    throw new Error(
      "ETH must be a non-negative decimal string with at most 18 decimal places",
    );
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function fromWei(value: bigint): EthDecimal {
  if (value < 0n) throw new Error("Negative ETH amount");
  const fraction = (value % SCALE)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${value / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function multiplyEth(value: EthDecimal, quantity: number): EthDecimal {
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new Error("Invalid quantity");
  return fromWei(toWei(value) * BigInt(quantity));
}
