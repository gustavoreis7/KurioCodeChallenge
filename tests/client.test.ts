import { describe, expect, it } from "vitest";
import { fromWei, quantityPrice, toWei } from "../src/services/money";
import { catalogSearch, safeReturn } from "../src/services/search";
import { newest } from "../src/services/query";
import { matchesSearch } from "../src/services/catalog";
import type { NFT, Order } from "../src/types";

describe("Contratos do cliente", () => {
  it("preserva 18 casas decimais sem ponto flutuante", () => {
    expect(quantityPrice("0.000000000000000001", 3)).toBe(
      "0.000000000000000003",
    );
    expect(fromWei(toWei("9007199254740993.123456789123456789"))).toBe(
      "9007199254740993.123456789123456789",
    );
    expect(() => toWei("1e-18")).toThrow();
  });
  it("normaliza parametros e preserva filtros combinados", () => {
    expect(
      catalogSearch({
        categories: ["original", "rare"],
        networks: "ethereum,solana,invalid",
        page: "2",
        minPrice: "0.000000000000000001",
      }),
    ).toMatchObject({
      categories: ["original", "rare"],
      networks: ["ethereum", "solana"],
      page: 2,
      minPrice: "0.000000000000000001",
    });
    expect(catalogSearch({ page: "invalido", sort: "invalido" })).toMatchObject(
      { page: 1, sort: "recent" },
    );
    expect(safeReturn("//example.com")).toBe("/");
    expect(safeReturn("/\\example.com")).toBe("/");
    expect(safeReturn("/\n/example.com")).toBe("/");
    expect(safeReturn("/login?returnTo=/checkout")).toBe("/");
    expect(safeReturn("/checkout")).toBe("/checkout");
  });
  it("nao regride pedido terminal por resposta REST atrasada", () => {
    const old = { id: "1", status: "confirmed", version: 3 } as Order;
    expect(newest(old, { ...old, status: "pending", version: 1 })).toBe(old);
    expect(newest(old, { ...old, status: "pending", version: 4 })).toBe(old);
  });
  it("usa os mesmos filtros de rede e preco ao reconciliar NFTs recebidos pelo socket", () => {
    const nft = {
      title: "Arte",
      description: "",
      creator: "Ana",
      categories: ["original", "photography"],
      network: "polygon",
      priceEth: "1.000000000000000001",
      editions: [{ available: 1 }],
    } as NFT;
    const search = catalogSearch({
      categories: "original,photography",
      networks: "polygon,solana",
      maxPrice: "1.000000000000000001",
      available: true,
    });
    expect(matchesSearch(nft, search)).toBe(true);
    expect(matchesSearch({ ...nft, network: "ethereum" }, search)).toBe(false);
    expect(
      matchesSearch({ ...nft, priceEth: "1.000000000000000002" }, search),
    ).toBe(false);
    expect(
      matchesSearch(
        {
          ...nft,
          editions: nft.editions.map((edition) => ({
            ...edition,
            available: 0,
          })),
        },
        search,
      ),
    ).toBe(false);
    expect(matchesSearch(nft, catalogSearch({}))).toBe(true);
  });
});
