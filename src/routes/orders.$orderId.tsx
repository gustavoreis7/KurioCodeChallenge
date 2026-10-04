import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/services/guard";
import { OrderPage } from "@/pages/OrderPage";
export const Route = createFileRoute("/orders/$orderId")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location),
  head: () => ({ meta: [{ title: "Pedido | Kurio" }] }),
  component: () => <OrderPage id={Route.useParams().orderId} />,
});
