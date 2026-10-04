import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CanceledError, isAxiosError } from "axios";
import { Circle, ChevronDown } from "lucide-react";
import { api } from "@/services/api";
import {
  useCart,
  useQuote,
  useScope,
  useWallets,
} from "@/hooks/useMarketplace";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { Field, Failure, SummarySkeleton } from "@/components/Feedback";
import { QuoteSummary } from "@/components/CartContent";
import { CheckoutWalletSelector } from "@/components/CheckoutWalletSelector";
import { walletProviders } from "@/services/wallet-options";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { newest } from "@/services/query";
import { fieldErrors } from "@/services/http";
import { sessionState } from "@/services/session";
import type {
  Collector,
  CreateOrderRequest,
  Network,
  Order,
  Quote,
  Wallet,
} from "@/types";

interface Attempt {
  key: string;
  body: CreateOrderRequest;
  orderId?: string;
}
export const quoteSignature = (quote: Quote) =>
  JSON.stringify({
    cartVersion: quote.cartVersion,
    network: quote.network,
    items: quote.items,
    coupon: quote.couponCode,
    subtotal: quote.subtotalEth,
    discount: quote.discountEth,
    fee: quote.networkFeeEth,
    total: quote.totalEth,
  });
export function CheckoutPage() {
  const scope = useScope(),
    router = useRouter(),
    client = useQueryClient(),
    cart = useCart(),
    wallets = useWallets();
  const { cartRevision } = useMarketplace();
  const [network, setNetwork] = useState<Network>("ethereum"),
    [walletId, setWalletId] = useState("");
  const [collectorOpen, setCollectorOpen] = useState(false),
    [itemsOpen, setItemsOpen] = useState(false);
  const quote = useQuote(network);
  const [reviewed, setReviewed] = useState<{
    quote: Quote;
    collector: Collector;
    revision: number;
  } | null>(null);
  const [clock, setClock] = useState(Date.now()),
    lock = useRef(false);
  const storageKey = `kurio.attempt.${scope.session?.user.id}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(
        localStorage.getItem(storageKey) ?? "null",
      ) as Attempt | null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const wallet =
    wallets.data?.items.find(
      (item) => item.id === walletId && item.network === network,
    ) ??
    wallets.data?.items.find(
      (item) => item.network === network && item.isPrimary,
    ) ??
    wallets.data?.items.find((item) => item.network === network);
  const reviewing = useMutation({
    mutationFn: async (collector: Collector) => {
      const assertSession = () => {
        if (
          !scope.session ||
          scope.session.token !== sessionState().session?.token
        )
          throw new CanceledError("Sessao encerrada");
      };
      assertSession();
      if (!wallet) throw new Error("Selecione uma carteira para o pagamento.");
      const authorized = await api.connectWallet(wallet.id, "connect");
      assertSession();
      await client.invalidateQueries({ queryKey: [...scope.key, "wallets"] });
      assertSession();
      if (authorized.connection !== "connected")
        throw new Error(
          "A carteira não autorizou o pagamento. Selecione outra carteira ou tente novamente.",
        );
      const value = await api.quote(network);
      assertSession();
      return { quote: value, collector, revision: cartRevision };
    },
    onSuccess: (value) => {
      if (scope.session?.token !== sessionState().session?.token) return;
      client.setQueryData(
        [...scope.key, "quote", network, cart.data?.version],
        value.quote,
      );
      setReviewed(value);
    },
  });
  const submitting = useMutation({
    mutationFn: (value: Attempt) => api.createOrder(value.body, value.key),
    onSuccess: async (order, submitted) => {
      if (scope.session?.token !== sessionState().session?.token) return;
      const value = { ...submitted, orderId: order.id };
      localStorage.setItem(storageKey, JSON.stringify(value));
      client.setQueryData<Order>([...scope.key, "order", order.id], (old) =>
        newest(old, order),
      );
      setReviewed(null);
      await router.navigate({
        to: "/orders/$orderId",
        params: { orderId: order.id },
      });
    },
    onError: (error) => {
      setReviewed(null);
      if (
        isAxiosError(error) &&
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500 &&
        error.response.status !== 401
      ) {
        localStorage.removeItem(storageKey);
        setAttempt(null);
        setReviewed(null);
        void quote.refetch();
      }
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  const stale =
    !!reviewed &&
    (reviewed.revision !== cartRevision ||
      quote.isFetching ||
      !quote.data ||
      quoteSignature(reviewed.quote) !== quoteSignature(quote.data) ||
      Date.parse(reviewed.quote.expiresAt) <= clock);
  const errors = fieldErrors(submitting.error || reviewing.error);
  const selectWallet = (selected: Wallet) => {
    setNetwork(selected.network);
    setWalletId(selected.id);
    setReviewed(null);
    reviewing.reset();
  };
  const secondaryWallet = wallets.data?.items.find((item) => !item.isPrimary);
  const send = (existing?: Attempt) => {
    if (
      lock.current ||
      (!existing &&
        (attempt || !reviewed || stale || wallet?.connection !== "connected"))
    )
      return;
    const value = existing ?? {
      key: crypto.randomUUID(),
      body: {
        quoteId: reviewed!.quote.id,
        walletId: wallet!.id,
        collector: reviewed!.collector,
      },
    };
    lock.current = true;
    localStorage.setItem(storageKey, JSON.stringify(value));
    setAttempt(value);
    submitting.mutate(value);
  };
  if (!scope.session) return <SummarySkeleton />;
  return (
    <>
      <nav className="breadcrumb" aria-label="Caminho">
        <Link to="/">Início</Link> /{" "}
        <Link to="/" hash="catalogo">
          Mercado
        </Link>{" "}
        / Pagamento
      </nav>
      <h1 className="sr-only">Pagamento</h1>
      {attempt && (
        <section className="notice" role="status">
          <p>
            Existe uma tentativa de compra. Recupere o resultado antes de
            iniciar outra.
          </p>
          {attempt.orderId ? (
            <Link to="/orders/$orderId" params={{ orderId: attempt.orderId }}>
              Ver pedido
            </Link>
          ) : (
            <Button
              disabled={submitting.isPending}
              onClick={() => send(attempt)}
            >
              Recuperar pedido
            </Button>
          )}
        </section>
      )}
      <div className="checkout-layout">
        <section className="checkout-collector">
          <h2 className="collector-heading">Perfil do colecionador</h2>
          <form
            id="checkout-form"
            onInvalidCapture={(event) => {
              setCollectorOpen(true);
              const input = event.target as HTMLElement;
              requestAnimationFrame(() => input.focus());
            }}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              reviewing.mutate({
                name: String(data.get("collectorName")),
                email: String(data.get("collectorEmail")),
                username: String(data.get("collectorUsername")),
                profileName: String(data.get("collectorProfileName")),
                referralCode: String(data.get("collectorReferralCode")),
                ens: String(data.get("collectorEns")),
                notes: String(data.get("collectorNotes")),
              });
            }}
          >
            <button
              className="mobile-collector-toggle"
              type="button"
              aria-expanded={collectorOpen}
              aria-controls="collector-fields"
              onClick={() => setCollectorOpen(!collectorOpen)}
            >
              Perfil do colecionador
              <ChevronDown size={16} />
            </button>
            <div
              id="collector-fields"
              className="collector-fields"
              data-expanded={collectorOpen}
            >
              <div className="form-columns">
                <Field
                  label="Nome de exibição"
                  name="collectorName"
                  error={errors.name}
                  required
                  minLength={2}
                  defaultValue={scope.session.user.name}
                  autoComplete="name"
                />
                <Field
                  label="Nome de usuário"
                  name="collectorUsername"
                  error={errors.username}
                  required
                  maxLength={30}
                  defaultValue={scope.session.user.username}
                  pattern="[A-Za-z0-9_]{3,30}"
                  autoComplete="username"
                />
              </div>
              <div className="form-columns checkout-network-row">
                <div className="form-field">
                  <label htmlFor="checkout-network">
                    Rede{" "}
                    <span aria-hidden="true" className="text-primary">
                      *
                    </span>
                  </label>
                  <select
                    id="checkout-network"
                    value={network}
                    onChange={(event) => {
                      setNetwork(event.target.value as Network);
                      setWalletId("");
                      setReviewed(null);
                    }}
                    disabled={!!attempt || reviewing.isPending}
                    required
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>
                <Field
                  label="Nome do perfil"
                  name="collectorProfileName"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={scope.session.user.name}
                  error={errors.profileName}
                />
              </div>
              <div className="form-columns checkout-address-row">
                <Field
                  label="Endereço da carteira"
                  name="paymentAddress"
                  required
                  readOnly
                  value={wallet?.address ?? ""}
                  placeholder="Endereço 0x da carteira"
                />
                <div className="secondary-wallet-address">
                  <Field
                    label="Carteira secundária (opcional)"
                    name="secondaryAddress"
                    readOnly
                    disabled={!secondaryWallet}
                    value={secondaryWallet?.address ?? ""}
                    placeholder="ENS ou carteira secundária (opcional)"
                  />
                </div>
              </div>
              <div className="form-columns checkout-wallet-selects">
                <div className="form-field">
                  <label htmlFor="checkout-wallet">
                    Tipo de carteira{" "}
                    <span aria-hidden="true" className="text-primary">
                      *
                    </span>
                  </label>
                  <select
                    id="checkout-wallet"
                    value={wallet?.id ?? ""}
                    onChange={(event) => {
                      setWalletId(event.target.value);
                      setReviewed(null);
                    }}
                    disabled={!!attempt || reviewing.isPending}
                    required
                  >
                    <option value="" disabled>
                      Selecione uma carteira
                    </option>
                    {wallets.data?.items
                      .filter((item) => item.network === network)
                      .map((item) => (
                        <option value={item.id} key={item.id}>
                          {walletProviders.find(
                            (provider) => provider.id === item.provider,
                          )?.label ?? item.name}
                          {item.provider ? ` · ${item.name}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <Field
                  label="Código de indicação"
                  name="collectorReferralCode"
                  maxLength={30}
                  pattern="[A-Za-z0-9_-]{1,30}"
                  error={errors.referralCode}
                />
              </div>
              <div className="form-columns">
                <Field
                  label="E-mail"
                  name="collectorEmail"
                  error={errors.email}
                  required
                  type="email"
                  defaultValue={scope.session.user.email}
                  autoComplete="email"
                />
                <Field
                  label="Nome ENS"
                  name="collectorEns"
                  error={errors.ens}
                  defaultValue={scope.session.user.ens}
                  pattern="[A-Za-z0-9-]+\.eth"
                  placeholder="nome.eth"
                />
              </div>
              {secondaryWallet ? (
                <label className="check-row checkout-other-wallet">
                  <input
                    type="checkbox"
                    checked={!!wallet && !wallet.isPrimary}
                    disabled={!!attempt || reviewing.isPending}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? secondaryWallet
                        : wallets.data?.items.find((item) => item.isPrimary);
                      if (next) selectWallet(next);
                    }}
                  />
                  Usar outra carteira?
                </label>
              ) : (
                <Link to="/wallets" className="check-row checkout-other-wallet">
                  <Circle size={16} aria-hidden="true" />
                  Usar outra carteira?
                </Link>
              )}
            </div>
            <div
              className="form-field collector-notes"
              data-expanded={collectorOpen}
            >
              <label htmlFor="collectorNotes">
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="collectorNotes"
                name="collectorNotes"
                maxLength={500}
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes ? "collectorNotes-error" : undefined
                }
                rows={3}
                className="border border-input bg-transparent p-3"
              />
              {errors.notes && (
                <p id="collectorNotes-error" className="field-error">
                  {errors.notes}
                </p>
              )}
            </div>
          </form>
        </section>
        <section className="checkout-summary">
          <button
            type="button"
            className="mobile-item-toggle"
            aria-expanded={itemsOpen}
            aria-controls="checkout-items"
            onClick={() => setItemsOpen(!itemsOpen)}
          >
            Seus NFTs ({cart.data?.items.length ?? 0})
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <h2>Seus NFTs</h2>
          <div className="checkout-items-heading" aria-hidden="true">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          {cart.isPending ? (
            <div className="checkout-loading" data-expanded={itemsOpen}>
              <SummarySkeleton />
            </div>
          ) : cart.data && !cart.data.items.length ? (
            <div className="empty-state">
              <p>Seu carrinho esta vazio.</p>
              <Link to="/" hash="catalogo" className="primary-link">
                Explorar NFTs
              </Link>
            </div>
          ) : quote.isPending && !cart.isError ? (
            <div className="checkout-loading" data-expanded={itemsOpen}>
              <SummarySkeleton itemCount={cart.data?.items.length} />
            </div>
          ) : quote.isError ? (
            <Failure error={quote.error} retry={() => void quote.refetch()} />
          ) : quote.data ? (
            <>
              <ul
                id="checkout-items"
                className="receipt-items"
                data-expanded={itemsOpen}
              >
                {quote.data.items.map((item) => (
                  <li key={`${item.nftId}:${item.editionId}`}>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      width={64}
                      height={64}
                    />
                    <div>
                      <strong>{item.title}</strong>
                      <p>ID do token: #{item.nftId}</p>
                    </div>
                    <span className="checkout-item-quantity">
                      (x {item.quantity})
                    </span>
                    <span className="checkout-line-total">
                      {item.lineTotalEth} ETH
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/cart" className="checkout-coupon-link">
                Tem um código promocional? Aplique aqui
              </Link>
              <div className="checkout-quote-summary" data-expanded={itemsOpen}>
                <QuoteSummary quote={quote.data} />
              </div>
            </>
          ) : null}
          <Failure error={cart.error || submitting.error} />
        </section>
        <section className="checkout-wallets">
          <div className="mobile-wallet-heading">
            <h2>Carteira e rede</h2>
            <Link to="/wallets" className="inline-link">
              Trocar carteira
            </Link>
          </div>
          <div
            className="checkout-provider-strip"
            aria-label="Tipos de carteira compatíveis"
          >
            METAMASK · WALLETCONNECT · COINBASE
          </div>
          {wallets.isPending ? (
            <div
              className="checkout-wallet-placeholder shimmer"
              aria-label="Carregando carteiras"
            />
          ) : (
            <CheckoutWalletSelector
              wallets={wallets.data?.items ?? []}
              selectedId={wallet?.id}
              disabled={!!attempt || reviewing.isPending}
              onSelect={selectWallet}
            />
          )}
          {!wallets.isPending &&
            !wallets.isError &&
            !wallets.data?.items.length && (
              <Link to="/wallets" className="inline-link">
                Cadastrar carteira
              </Link>
            )}
          <Failure
            error={wallets.error || reviewing.error}
            retry={wallets.isError ? () => void wallets.refetch() : undefined}
          />
          <Button
            type="submit"
            form="checkout-form"
            className="checkout-review"
            aria-label="Confirmar compra e revisar pedido"
            disabled={
              !!attempt ||
              !wallet ||
              !cart.data?.items.length ||
              reviewing.isPending ||
              quote.isError ||
              quote.isFetching
            }
          >
            Confirmar compra
          </Button>
          <div className="checkout-action-backdrop" aria-hidden="true" />
        </section>
      </div>
      <Modal
        open={!!reviewed}
        onClose={() => {
          if (!submitting.isPending) setReviewed(null);
        }}
        title="Revisar e confirmar compra"
        description="Confira o colecionador, a carteira e os valores antes de confirmar."
      >
        {reviewed && (
          <>
            <p>
              {reviewed.collector.name} · {reviewed.collector.email}
            </p>
            <p>
              {reviewed.collector.profileName}
              {reviewed.collector.username &&
                ` · @${reviewed.collector.username}`}
            </p>
            {reviewed.collector.referralCode && (
              <p>Código de indicação: {reviewed.collector.referralCode}</p>
            )}
            {reviewed.collector.ens && <p>ENS: {reviewed.collector.ens}</p>}
            {reviewed.collector.notes && <p>{reviewed.collector.notes}</p>}
            <p>
              {wallet?.name} · {network}
            </p>
            <QuoteSummary quote={reviewed.quote} />
            {stale && (
              <div className="notice" role="alert">
                Preco ou disponibilidade alterados. E necessario revalidar os
                valores.
                <Button
                  onClick={() => reviewing.mutate(reviewed.collector)}
                  disabled={reviewing.isPending}
                >
                  Revalidar valores
                </Button>
              </div>
            )}
            <Failure error={reviewing.error || submitting.error} />
            <Button
              className="w-full"
              disabled={
                stale ||
                submitting.isPending ||
                wallet?.connection !== "connected"
              }
              onClick={() => send()}
            >
              {submitting.isPending ? "Enviando…" : "Confirmar compra"}
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}
