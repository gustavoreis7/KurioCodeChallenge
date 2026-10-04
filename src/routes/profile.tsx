import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/services/guard";
import { ProfilePage } from "@/pages/ProfilePage";
import { useSession } from "@/services/session";
function Profile() {
  const { session } = useSession();
  return <ProfilePage key={session?.token} />;
}
export const Route = createFileRoute("/profile")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location),
  head: () => ({ meta: [{ title: "Perfil | Kurio" }] }),
  component: Profile,
});
