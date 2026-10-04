import { decimalPattern } from "./search";
export function toWei(value: string) {
  if (!decimalPattern.test(value)) throw new Error("Valor ETH invalido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}
export function fromWei(value: bigint) {
  const fraction = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${value / 10n ** 18n}${fraction ? `.${fraction}` : ""}`;
}
export function quantityPrice(price: string, quantity: number) {
  return fromWei(toWei(price) * BigInt(quantity));
}
