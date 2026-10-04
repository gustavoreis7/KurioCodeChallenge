import { Link, useRouter } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import { useCartAction } from "@/hooks/useMarketplace";
import { useFavorite } from "@/hooks/useFavorite";
import { useSession } from "@/services/session";
import { errorMessage } from "@/services/http";
import type { NFT } from "@/types";
import { useMarketplace } from "./MarketplaceProvider";
import { Button } from "./ui/button";

export function NftCard({
  nft,
  priority = false,
}: {
  nft: NFT;
  priority?: boolean;
}) {
  const favorite = useFavorite(),
    cart = useCartAction(),
    { session } = useSession(),
    router = useRouter();
  const { announce, openCart } = useMarketplace();
  const edition = nft.editions.find((item) => item.available > 0),
    selected = favorite.ids.includes(nft.id);
  const toggle = () => {
    if (!session) {
      void router.navigate({
        to: "/login",
        search: { redirect: router.state.location.href },
      });
      return;
    }
    favorite.mutation.mutate(
      { id: nft.id, selected: !selected },
      { onError: (error) => announce(errorMessage(error)) },
    );
  };
  return (
    <article className="nft-card">
      <div className="nft-image">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`Ver ${nft.title}`}
        >
          <img
            src={nft.imageUrl}
            alt={nft.imageAlt}
            width={768}
            height={768}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="nft-favorite"
          title={selected ? "Remover dos favoritos" : "Favoritar"}
          aria-label={`Favoritar ${nft.title}`}
          aria-pressed={selected}
          disabled={
            favorite.mutation.isPending || (!!session && !favorite.data)
          }
          onClick={toggle}
        >
          <Heart size={16} fill={selected ? "currentColor" : "none"} />
        </Button>
      </div>
      <div className="nft-card-info">
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>
          {nft.title}
        </Link>
        <p className="eth-value">{nft.priceEth} ETH</p>
        <Button
          variant="ghost"
          size="icon"
          title="Adicionar ao carrinho"
          aria-label={`Adicionar ${nft.title} ao carrinho`}
          disabled={!edition || cart.isPending}
          onClick={() =>
            edition &&
            cart.mutate(
              {
                type: "add",
                item: { nftId: nft.id, editionId: edition.id, quantity: 1 },
              },
              {
                onSuccess: () => {
                  announce("Item adicionado ao carrinho.");
                  openCart(true);
                },
                onError: (error) => announce(errorMessage(error)),
              },
            )
          }
        >
          <ShoppingCart size={15} />
        </Button>
        {!edition && <p>Indisponivel</p>}
      </div>
    </article>
  );
}
