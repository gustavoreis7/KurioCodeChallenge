import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { requireSession } from "@/services/guard";
import { useScope } from "@/hooks/useMarketplace";
import { api } from "@/services/api";
import { AccountLayout } from "@/components/AccountLayout";
import { Failure, SummarySkeleton } from "@/components/Feedback";
export const Route = createFileRoute("/orders")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location),
  head: () => ({ meta: [{ title: "Pedidos | Kurio" }] }),
  component: Orders,
});
function Orders() {
  const detail = useRouterState({
    select: (state) => state.location.pathname !== "/orders",
  });
  const scope = useScope(),
    query = useQuery({
      queryKey: [...scope.key, "orders"],
      queryFn: ({ signal }) => api.orders(signal),
      enabled: scope.ready && !!scope.session && !detail,
    });
  if (detail) return <Outlet />;
  return (
    <AccountLayout>
      <h1 className="page-heading">Meus pedidos</h1>
      {query.isPending ? (
        <SummarySkeleton />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length ? (
        <ul className="orders-list">
          {query.data.items.map((order) => (
            <li key={order.id}>
              <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                {order.quote.items[0]?.title}
                <span>
                  {order.status === "confirmed"
                    ? "Confirmado"
                    : order.status === "refused"
                      ? "Recusado"
                      : "Pendente"}
                </span>
                <span>{order.quote.totalEth} ETH</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Voce ainda nao possui pedidos.</p>
      )}
    </AccountLayout>
  );
}
