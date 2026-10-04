import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Session, User } from "@/types";

const TOKEN_KEY = "kurio.session.token";
const GUEST_KEY = "kurio.guest.id";
let snapshot: { session: Session | null; ready: boolean; revision: number } = {
  session: null,
  ready: false,
  revision: 0,
};
const serverSnapshot = snapshot;
const listeners = new Set<() => void>();
const cleanups = new Set<() => void>();
let client: QueryClient | undefined;
let restoring: Promise<void> | undefined;

export function bindSessionCache(queryClient: QueryClient) {
  client = queryClient;
}
export function sessionState() {
  return snapshot;
}
export function updateSessionUser(user: User) {
  if (snapshot.session?.user.id !== user.id) return;
  snapshot = { ...snapshot, session: { ...snapshot.session, user } };
  for (const listener of listeners) listener();
}
export function guestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}
export function onSessionEnd(cleanup: () => void) {
  cleanups.add(cleanup);
  return () => {
    cleanups.delete(cleanup);
  };
}
export function setSession(session: Session | null, explicitLogout = false) {
  if (snapshot.session?.token !== session?.token) {
    for (const cleanup of cleanups) cleanup();
    void client?.cancelQueries({
      predicate: (q) =>
        q.queryKey[0] === "private" || q.queryKey[0] === "visitor",
    });
    client?.removeQueries({
      predicate: (q) =>
        q.queryKey[0] === "private" || q.queryKey[0] === "visitor",
    });
    client?.getMutationCache().clear();
  }
  if (explicitLogout && snapshot.session)
    localStorage.removeItem(`kurio.attempt.${snapshot.session.user.id}`);
  if (session) localStorage.setItem(TOKEN_KEY, session.token);
  else localStorage.removeItem(TOKEN_KEY);
  if (explicitLogout) localStorage.setItem(GUEST_KEY, crypto.randomUUID());
  snapshot = { session, ready: true, revision: snapshot.revision + 1 };
  for (const listener of listeners) listener();
}
export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sessionState,
    () => serverSnapshot,
  );
}
export async function restoreSession() {
  if (typeof window === "undefined" || snapshot.ready) return;
  restoring ??= (async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSession(null);
      return;
    }
    const { http } = await import("./http");
    try {
      const { data } = await http.get<Session>("/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSession(data);
    } catch (error) {
      const { isAxiosError } = await import("axios");
      if (isAxiosError(error) && error.response?.status === 401)
        setSession(null);
      else throw error;
    }
  })();
  try {
    await restoring;
  } finally {
    restoring = undefined;
  }
}
