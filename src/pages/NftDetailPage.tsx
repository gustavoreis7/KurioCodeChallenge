import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCartAction, useNft, useNfts } from "@/hooks/useMarketplace";
import { useFavorite } from "@/hooks/useFavorite";
import { useSession } from "@/services/session";
import { catalogSearch } from "@/services/search";
import { fieldErrors } from "@/services/http";
import { quantityPrice } from "@/services/money";
import { Button } from "@/components/ui/button";
import { ContentSkeleton, Failure } from "@/components/Feedback";
import { NftGrid } from "@/components/NftGrid";
import { useMarketplace } from "@/components/MarketplaceProvider";

export function NftDetailPage({ id }: { id: string }) {
  const query = useNft(id),
    related = useNfts(catalogSearch({ categories: ["original"] })),
    favorite = useFavorite(),
    action = useCartAction(),
    { session } = useSession(),
    router = useRouter();
  const { openCart, announce } = useMarketplace();
  const [imageId, setImageId] = useState(""),
    [editionId, setEditionId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [tab, setTab] = useState("details");
  if (query.isPending) return <ContentSkeleton detail />;
  if (query.isError)
    return (
      <>
        <h1 className="page-heading">NFT nao encontrado ou indisponivel</h1>
        <Failure error={query.error} retry={() => void query.refetch()} />
        <Link to="/">Voltar ao mercado</Link>
      </>
    );
  const nft = query.data,
    edition =
      nft.editions.find((item) => item.id === editionId) ?? nft.editions[0],
    limit = Math.min(edition.available, edition.maxPerOrder);
  const image =
      nft.gallery.find((item) => item.id === imageId) ?? nft.gallery[0],
    selected = favorite.ids.includes(nft.id);
  const add = (buy: boolean) =>
    action.mutate(
      { type: "add", item: { nftId: id, editionId: edition.id, quantity } },
      {
        onSuccess: () => {
          if (buy) void router.navigate({ to: "/checkout" });
          else {
            openCart(true);
            announce("Item adicionado ao carrinho.");
          }
        },
      },
    );
  return (
    <>
      <nav className="breadcrumb" aria-label="Caminho">
        <Link to="/">Inicio</Link> / Mercado / {nft.title}
      </nav>
      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="gallery-thumbnails">
            {nft.gallery.map((item) => (
              <button
                key={item.id}
                aria-label={`Ver imagem ${item.id}`}
                aria-pressed={image.id === item.id}
                onClick={() => setImageId(item.id)}
              >
                <img src={item.src} alt={item.alt} width={64} height={64} />
              </button>
            ))}
          </div>
          <img
            className="detail-image"
            src={image.src}
            alt={image.alt}
            width={768}
            height={768}
            fetchPriority="high"
          />
        </div>
        <div className="detail-info">
          <h1>{nft.title}</h1>
          <p className="eth-value detail-price">{nft.priceEth} ETH</p>
          <p className="detail-description">{nft.description}</p>
          <label htmlFor="edition">Edicao</label>
          <select
            id="edition"
            value={edition.id}
            onChange={(event) => {
              setEditionId(event.target.value);
              setQuantity(1);
            }}
          >
            {nft.editions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.available} disponiveis
              </option>
            ))}
          </select>
          <fieldset className="mobile-editions">
            <legend>Edicao</legend>
            {nft.editions.map((item) => (
              <label
                key={item.id}
                className={item.id === edition.id ? "edition-selected" : ""}
              >
                <input
                  type="radio"
                  name="mobile-edition"
                  aria-label={item.label}
                  checked={item.id === edition.id}
                  onChange={() => {
                    setEditionId(item.id);
                    setQuantity(1);
                  }}
                />
                {item.label}
              </label>
            ))}
          </fieldset>
          <div className="detail-purchase">
            <div className="quantity-control">
              <span className="quantity-label">Qtd.</span>
              <Button
                size="icon"
                variant="outline"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus />
              </Button>
              <output aria-label="Quantidade">{quantity}</output>
              <Button
                size="icon"
                variant="outline"
                aria-label="Aumentar quantidade"
                disabled={quantity >= limit}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus />
              </Button>
            </div>
            <Button
              className="detail-buy"
              disabled={!limit || quantity > limit || action.isPending}
              onClick={() => add(true)}
            >
              <ShoppingCart size={15} />
              Comprar
            </Button>
            <Button
              variant="outline"
              className="detail-favorite"
              aria-label="Favoritar NFT"
              aria-pressed={selected}
              disabled={
                favorite.mutation.isPending || (!!session && !favorite.data)
              }
              onClick={() => {
                if (!session)
                  void router.navigate({
                    to: "/login",
                    search: { redirect: router.state.location.href },
                  });
                else favorite.mutation.mutate({ id, selected: !selected });
              }}
            >
              <Heart size={15} fill={selected ? "currentColor" : "none"} />
              Favoritar
            </Button>
            <p className="detail-purchase-price eth-value">
              {quantityPrice(nft.priceEth, quantity)} ETH
            </p>
          </div>
          <Button
            variant="outline"
            className="detail-add"
            aria-label="Adicionar ao carrinho"
            disabled={!limit || quantity > limit || action.isPending}
            onClick={() => add(false)}
          >
            <ShoppingCart size={18} aria-hidden="true" />
            <span>Adicionar ao carrinho</span>
          </Button>
          {(!limit || quantity > limit) && (
            <p role="alert" className="notice">
              Edicao indisponivel para esta quantidade.
            </p>
          )}
          <Failure error={action.error || favorite.mutation.error} />
          <p className="detail-meta">
            ID do token: #{nft.id}
            <br />
            Coleção: {nft.details?.collectionName ?? nft.categories.join(", ")}
            <br />
            Atributos: {nft.attributes.map((item) => item.value).join(", ")}
          </p>
          {fieldErrors(action.error).quantity && (
            <p role="alert">{fieldErrors(action.error).quantity}</p>
          )}
        </div>
      </section>
      <section className="detail-tabs">
        <div
          role="tablist"
          aria-label="Informacoes do NFT"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              ),
            );
            const index = tabs.findIndex(
              (button) => button === document.activeElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            tabs[next]?.focus();
            tabs[next]?.click();
          }}
        >
          <button
            id="details-tab"
            role="tab"
            aria-selected={tab === "details"}
            tabIndex={tab === "details" ? 0 : -1}
            aria-controls="details-panel"
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            id="history-tab"
            role="tab"
            aria-selected={tab === "history"}
            tabIndex={tab === "history" ? 0 : -1}
            aria-controls="history-panel"
            onClick={() => setTab("history")}
          >
            Historico
          </button>
        </div>
        {tab === "details" ? (
          <div
            id="details-panel"
            role="tabpanel"
            aria-labelledby="details-tab"
            tabIndex={0}
          >
            <div className="nft-details-copy">
              {(nft.details?.paragraphs ?? [nft.description]).map(
                (paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ),
              )}
              {nft.details && (
                <dl className="nft-contract-details">
                  {nft.details.metadata.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}:</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <dl className="nft-attributes">
              {nft.attributes.map((item) => (
                <div key={item.trait}>
                  <dt>{item.trait}</dt>
                  <dd>
                    {item.value} · {item.rarity}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <ul
            id="history-panel"
            role="tabpanel"
            aria-labelledby="history-tab"
            tabIndex={0}
          >
            {nft.history.map((item) => (
              <li key={item.id}>
                {item.event} · {new Date(item.date).toLocaleDateString("pt-BR")}
                {item.priceEth && ` · ${item.priceEth} ETH`}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="related-section">
        <h2>Mais desta colecao</h2>
        {related.isPending ? (
          <ContentSkeleton count={5} />
        ) : related.isError ? (
          <Failure error={related.error} retry={() => void related.refetch()} />
        ) : (
          related.data && (
            <NftGrid
              items={related.data.items
                .filter((item) => item.id !== id)
                .slice(0, 5)}
            />
          )
        )}
      </section>
    </>
  );
}
