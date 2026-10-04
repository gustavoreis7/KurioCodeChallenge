import { createFileRoute, Link } from "@tanstack/react-router";
import { CartContent } from "@/components/CartContent";
import { ContentSkeleton, Failure } from "@/components/Feedback";
import { NftGrid } from "@/components/NftGrid";
import { useCart, useNfts } from "@/hooks/useMarketplace";
import { catalogSearch } from "@/services/search";

function CartPage() {
  const cart = useCart();
  const related = useNfts(catalogSearch({}));
  return (
    <>
      <nav className="breadcrumb" aria-label="Caminho">
        <Link to="/">Inicio</Link> / Mercado / Carrinho
      </nav>
      <h1 className="page-heading">Carrinho de NFTs</h1>
      <CartContent />
      {!!cart.data?.items.length && (
        <section className="related-section cart-recommendations">
          <h2>Colecionadores tambem viram</h2>
          {related.isPending ? (
            <ContentSkeleton count={5} />
          ) : related.isError ? (
            <Failure
              error={related.error}
              retry={() => void related.refetch()}
            />
          ) : (
            <NftGrid
              items={related.data.items
                .filter(
                  (nft) =>
                    !cart.data.items.some((item) => item.nftId === nft.id),
                )
                .slice(0, 5)}
            />
          )}
        </section>
      )}
    </>
  );
}
export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Carrinho de NFTs | Kurio" }] }),
  component: CartPage,
});
