import type { NFT, NftSearch } from "@/types";
import { toWei } from "./money";

export function matchesSearch(nft: NFT, search: NftSearch) {
  const price = toWei(nft.priceEth);
  return (
    `${nft.title} ${nft.description} ${nft.creator}`
      .toLowerCase()
      .includes(search.q.trim().toLowerCase()) &&
    search.categories.every((category) => nft.categories.includes(category)) &&
    (!search.networks.length || search.networks.includes(nft.network)) &&
    (!search.minPrice || price >= toWei(search.minPrice)) &&
    (!search.maxPrice || price <= toWei(search.maxPrice)) &&
    (!search.available || nft.editions.some((edition) => edition.available > 0))
  );
}
export function compareNfts(a: NFT, b: NFT, search: NftSearch) {
  if (search.sort === "recent")
    return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  if (search.sort === "title")
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  const difference = toWei(a.priceEth) - toWei(b.priceEth);
  return (
    (difference < 0n ? -1 : difference > 0n ? 1 : a.id.localeCompare(b.id)) *
    (search.sort === "price-desc" ? -1 : 1)
  );
}
