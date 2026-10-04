import type { NFT } from "@/types";
import { NftCard } from "./NftCard";

export function NftGrid({ items }: { items: NFT[] }) {
  return (
    <div className="catalog-grid">
      {items.map((nft, i) => (
        <NftCard key={nft.id} nft={nft} priority={i < 3} />
      ))}
    </div>
  );
}
