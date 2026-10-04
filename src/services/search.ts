import type { NftNetwork, NftSearch, NftSort } from "@/types";
import type { SearchSchemaInput } from "@tanstack/react-router";
import { categoryIds, networkOptions } from "./catalog-options";

export const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
export function catalogSearch(
  raw: Partial<Record<keyof NftSearch, unknown>>,
): NftSearch {
  const price = (value: unknown) =>
    typeof value === "string" && decimalPattern.test(value) ? value : undefined;
  const categories = Array.isArray(raw.categories)
    ? raw.categories
    : typeof raw.categories === "string"
      ? raw.categories.split(",")
      : [];
  const networks = Array.isArray(raw.networks)
    ? raw.networks
    : typeof raw.networks === "string"
      ? raw.networks.split(",")
      : [];
  return {
    q: typeof raw.q === "string" ? raw.q : "",
    categories: categories.filter(
      (x): x is string => typeof x === "string" && categoryIds.includes(x),
    ),
    networks: networks.filter((value): value is NftNetwork =>
      networkOptions.some(({ id }) => id === value),
    ),
    minPrice: price(raw.minPrice),
    maxPrice: price(raw.maxPrice),
    available: raw.available === true || raw.available === "true" || undefined,
    sort: ["recent", "price-asc", "price-desc", "title"].includes(
      String(raw.sort),
    )
      ? (raw.sort as NftSort)
      : "recent",
    page: Math.max(1, Math.min(100_000, Math.floor(Number(raw.page) || 1))),
    pageSize: 9,
  };
}
export function validateCatalogSearch(
  raw: Partial<Record<keyof NftSearch, unknown>> & SearchSchemaInput,
) {
  return catalogSearch(raw);
}
export function safeReturn(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  try {
    const url = new URL(value, "https://kurio.invalid");
    if (
      url.origin !== "https://kurio.invalid" ||
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/register")
    )
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
