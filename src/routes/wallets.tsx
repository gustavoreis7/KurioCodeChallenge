import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/services/guard";
import { WalletsPage } from "@/pages/WalletsPage";
import { useSession } from "@/services/session";
function Wallets() {
  const { session } = useSession();
  return <WalletsPage key={session?.token} />;
}
export const Route = createFileRoute("/wallets")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location),
  head: () => ({ meta: [{ title: "Carteiras | Kurio" }] }),
  component: Wallets,
});
