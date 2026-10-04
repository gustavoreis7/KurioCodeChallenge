import { redirect } from "@tanstack/react-router";
import { restoreSession, sessionState } from "./session";

export async function requireSession(location: { href: string }) {
  await restoreSession();
  if (!sessionState().session)
    throw redirect({ to: "/login", search: { redirect: location.href } });
}
