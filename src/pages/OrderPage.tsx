import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CircleCheck, Clock, CircleX } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrder, useScope } from "@/hooks/useMarketplace";
import { Failure, SummarySkeleton } from "@/components/Feedback";
import { QuoteSummary } from "@/components/CartContent";

export function OrderPage({ id }: { id: string }) {
  const query = useOrder(id),
    scope = useScope(),
    client = useQueryClient();
  const order = query.data;
  useEffect(() => {
    if (order && order.status !== "pending") {
      localStorage.removeItem(`kurio.attempt.${scope.session?.user.id}`);
      if (order.status === "confirmed")
        void client.invalidateQueries({ queryKey: [...scope.key, "cart"] });
    }
  }, [order?.id, order?.status, scope.session?.token, client]);
  if (query.isPending) return <SummarySkeleton />;
  if (query.isError)
    return <Failure error={query.error} retry={() => void query.refetch()} />;
  if (!order) return null;
  const confirmed = order.status === "confirmed",
    refused = order.status === "refused";
  return (
    <section className="order-receipt" aria-labelledby="order-title">
      {confirmed ? (
        <CircleCheck className="receipt-icon" />
      ) : refused ? (
        <CircleX className="receipt-icon" />
      ) : (
        <Clock className="receipt-icon" />
      )}
      <h1 id="order-title">
        {confirmed
          ? "Seus NFTs agora estao na sua carteira"
          : refused
            ? "Pagamento recusado"
            : "Pedido pendente"}
      </h1>
      <p role="status">
        {confirmed
          ? "Compra confirmada"
          : refused
            ? order.refusalReason
            : "Aguardando a confirmacao do pagamento…"}
      </p>
      <dl className="receipt-metadata">
        <div>
          <dt>Pedido</dt>
          <dd>{order.id}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{new Date(order.createdAt).toLocaleString("pt-BR")}</dd>
        </div>
        <div>
          <dt>Carteira</dt>
          <dd>
            {order.wallet.name} · {order.wallet.network}
          </dd>
        </div>
        {order.transactionId && (
          <div>
            <dt>Transacao simulada</dt>
            <dd>{order.transactionId}</dd>
          </div>
        )}
      </dl>
      <h2>Detalhes da transacao</h2>
      <ul className="receipt-items">
        {order.quote.items.map((item) => (
          <li key={`${item.nftId}:${item.editionId}`}>
            <img src={item.imageUrl} alt={item.title} width={48} height={48} />
            <div>
              {item.title}
              <p>
                {item.editionLabel} · {item.quantity}×
              </p>
            </div>
            <span>{item.lineTotalEth} ETH</span>
          </li>
        ))}
      </ul>
      <QuoteSummary quote={order.quote} />
      {order.explorerUrl && (
        <a
          href={order.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="primary-link"
        >
          Ver referencia simulada
        </a>
      )}
      {refused && (
        <Link to="/checkout" className="primary-link">
          Tentar outra compra
        </Link>
      )}
      <Link to="/" hash="catalogo" className="continue-link">
        Voltar ao mercado
      </Link>
    </section>
  );
}
