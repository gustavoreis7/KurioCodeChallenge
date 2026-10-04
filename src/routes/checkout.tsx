import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { requireSession } from "@/services/guard";
import { useSession } from "@/services/session";
function Checkout() {
  const { session } = useSession();
  return <CheckoutPage key={session?.token} />;
}
export const Route = createFileRoute("/checkout")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location),
  head: () => ({ meta: [{ title: "Pagamento | Kurio" }] }),
  component: Checkout,
});
