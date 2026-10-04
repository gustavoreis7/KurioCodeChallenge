import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  bindSessionCache,
  onSessionEnd,
  setSession,
} from "../src/services/session";
import type { Session } from "../src/types";

it("encerra subscriptions e remove cache privado ao trocar conta e sair", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  const client = new QueryClient();
  bindSessionCache(client);
  setSession({ token: "token-ana", user: { id: "user-ana" } } as Session);
  const disconnect = vi.fn();
  const unsubscribe = onSessionEnd(disconnect);
  try {
    client.setQueryData(["private", "token-ana", "profile"], { name: "Ana" });
    client.setQueryData(["visitor", "guest", "cart"], { items: [] });
    client.setQueryData(["nft", "001"], { id: "001" });
    client
      .getMutationCache()
      .build(client, { mutationFn: async () => undefined });
    setSession({ token: "token-bruno", user: { id: "user-bruno" } } as Session);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(
      client.getQueryData(["private", "token-ana", "profile"]),
    ).toBeUndefined();
    expect(client.getQueryData(["visitor", "guest", "cart"])).toBeUndefined();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryData(["nft", "001"])).toEqual({ id: "001" });
    storage.set("kurio.attempt.user-bruno", "tentativa");
    storage.set("kurio.guest.id", "guest-anterior");
    setSession(null, true);
    expect(storage.has("kurio.session.token")).toBe(false);
    expect(storage.has("kurio.attempt.user-bruno")).toBe(false);
    expect(storage.get("kurio.guest.id")).not.toBe("guest-anterior");
  } finally {
    unsubscribe();
    setSession(null);
    client.clear();
    vi.unstubAllGlobals();
  }
});
