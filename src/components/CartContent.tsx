import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  useCart,
  useCartAction,
  useNft,
  useQuote,
} from "@/hooks/useMarketplace";
import type { CartItem, Quote } from "@/types";
import { quantityPrice } from "@/services/money";
import { fieldErrors } from "@/services/http";
import { Button } from "./ui/button";
import { Field, Failure, SummarySkeleton } from "./Feedback";

export function QuoteSummary({ quote }: { quote: Quote }) {
  return (
    <dl className="quote-summary">
      <div>
        <dt>Subtotal</dt>
        <dd>{quote.subtotalEth} ETH</dd>
      </div>
      <div>
        <dt>Desconto do lancamento</dt>
        <dd>− {quote.discountEth} ETH</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>
          {quote.networkFeeEth} ETH
          <small className="network-fee-note">Taxa estimada</small>
        </dd>
      </div>
      <div className="quote-total">
        <dt>Total</dt>
        <dd>{quote.totalEth} ETH</dd>
      </div>
    </dl>
  );
}
function CartRow({ item }: { item: CartItem }) {
  const nft = useNft(item.nftId),
    action = useCartAction();
  const edition = nft.data?.editions.find(
      (value) => value.id === item.editionId,
    ),
    limit = edition ? Math.min(edition.available, edition.maxPerOrder) : 0;
  return (
    <li className="cart-row">
      {nft.data ? (
        <>
          <Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>
            <img
              src={nft.data.imageUrl}
              alt={nft.data.imageAlt}
              width={64}
              height={64}
            />
          </Link>
          <div className="cart-row-name">
            <Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>
              {nft.data.title}
            </Link>
            <p>Edicao: {edition?.label}</p>
            {item.quantity > limit && (
              <p role="alert" className="field-error">
                Disponibilidade alterada
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="shimmer cart-row-placeholder" />
      )}
      <span className="cart-unit-price">
        {nft.data ? `${nft.data.priceEth} ETH` : "..."}
      </span>
      <div className="quantity-control">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Diminuir quantidade de ${nft.data?.title ?? item.nftId}`}
          disabled={item.quantity <= 1 || action.isPending}
          onClick={() =>
            action.mutate({
              type: "change",
              item: { ...item, quantity: item.quantity - 1 },
            })
          }
        >
          <Minus size={13} />
        </Button>
        <output aria-label={`Quantidade de ${nft.data?.title ?? item.nftId}`}>
          {item.quantity}
        </output>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Aumentar quantidade de ${nft.data?.title ?? item.nftId}`}
          disabled={item.quantity >= limit || action.isPending}
          onClick={() =>
            action.mutate({
              type: "change",
              item: { ...item, quantity: item.quantity + 1 },
            })
          }
        >
          <Plus size={13} />
        </Button>
      </div>
      <span className="eth-value cart-line-total">
        {nft.data
          ? `${quantityPrice(nft.data.priceEth, item.quantity)} ETH`
          : "…"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remover ${nft.data?.title ?? item.nftId} do carrinho`}
        title="Remover item"
        className="cart-remove"
        disabled={action.isPending}
        onClick={() => action.mutate({ type: "remove", item })}
      >
        <Trash2 size={15} />
      </Button>
      <Failure error={action.error || nft.error} />
    </li>
  );
}
export function CartContent({ close }: { close?: () => void }) {
  const cart = useCart(),
    quote = useQuote("ethereum"),
    coupon = useCartAction();
  if (cart.isPending)
    return (
      <>
        <div className="shimmer h-20 mb-4" />
        <div className="shimmer h-20" />
        <SummarySkeleton />
      </>
    );
  if (cart.isError)
    return <Failure error={cart.error} retry={() => void cart.refetch()} />;
  if (!cart.data.items.length)
    return (
      <div className="empty-state">
        <h2>Seu carrinho esta vazio</h2>
        <Link to="/" hash="catalogo" onClick={close} className="primary-link">
          Explorar NFTs
        </Link>
      </div>
    );
  return (
    <div className="cart-layout">
      <section aria-label="Itens do carrinho">
        <div className="cart-table-heading">
          <span>NFTs</span>
          <span>Preco</span>
          <span>Edicoes</span>
          <span>Total</span>
        </div>
        <ul className="cart-items">
          {cart.data.items.map((item) => (
            <CartRow key={`${item.nftId}:${item.editionId}`} item={item} />
          ))}
        </ul>
      </section>
      <section className="cart-summary" aria-label="Resumo do carrinho">
        <h2>Resumo da carteira</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            coupon.mutate({
              type: "coupon",
              code: String(new FormData(event.currentTarget).get("coupon")),
            });
          }}
        >
          <Field
            name="coupon"
            label="Codigo promocional"
            error={fieldErrors(coupon.error).couponCode}
            placeholder="Digite o codigo promocional..."
            defaultValue={cart.data.couponCode ?? ""}
          />
          <Button type="submit" disabled={coupon.isPending}>
            Aplicar
          </Button>
        </form>
        {cart.data.couponCode && (
          <div className="coupon-applied">
            <span>{cart.data.couponCode}</span>
            <Button
              variant="ghost"
              disabled={coupon.isPending}
              onClick={() => coupon.mutate({ type: "coupon", code: null })}
            >
              Remover cupom
            </Button>
          </div>
        )}
        <Failure error={coupon.error} />
        {quote.isPending ? (
          <SummarySkeleton />
        ) : quote.isError ? (
          <Failure error={quote.error} retry={() => void quote.refetch()} />
        ) : (
          <QuoteSummary quote={quote.data} />
        )}
        <Link
          to="/checkout"
          onClick={close}
          className={`primary-link wide-link ${quote.isError || quote.isFetching ? "disabled-link" : ""}`}
          aria-disabled={quote.isError || quote.isFetching}
          onClickCapture={(event) => {
            if (quote.isError || quote.isFetching) event.preventDefault();
          }}
        >
          Finalizar compra
        </Link>
        <Link to="/" hash="catalogo" className="continue-link" onClick={close}>
          Continuar explorando
        </Link>
      </section>
    </div>
  );
}
