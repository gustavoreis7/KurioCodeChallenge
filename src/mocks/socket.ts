import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { NFT, NftUpdatedEvent, Order, OrderUpdatedEvent } from "../types";
import { findSession, timestamp } from "./state";

export const SOCKET_PATH = "/socket.io/";
// MSW 2.10 removes the /socket.io/ prefix before matching this URL.
const link = ws.link(/wss?:\/\/[^/]+\/$/);
type Binding = ReturnType<typeof toSocketIo>;
const connections = new Set<{
  binding: Binding;
  token: string | null;
  close: () => void;
}>();

export const socketHandlers = [
  link.addEventListener("connection", (connection) => {
    const binding = toSocketIo(connection);
    const entry = {
      binding,
      token: null as string | null,
      close: () => connection.client.close(),
    };
    // The published binding performs the handshake but does not send Engine.IO heartbeats.
    const heartbeat = setInterval(() => {
      if (entry.token && !findSession(entry.token)) entry.close();
      else connection.client.send("2");
    }, 20_000);
    connections.add(entry);
    // Authentication is explicit because the binding does not expose namespace auth/rooms.
    binding.client.on(
      "session.subscribe",
      (_event, payload: { token: string }) => {
        entry.token =
          typeof payload?.token === "string" && findSession(payload.token)
            ? payload.token
            : null;
        if (!entry.token) entry.close();
      },
    );
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      connections.delete(entry);
    });
  }),
];

export function nftEvent(nft: NFT): NftUpdatedEvent {
  return {
    eventId: crypto.randomUUID(),
    resourceId: nft.id,
    version: nft.version,
    occurredAt: timestamp(),
    data: structuredClone(nft),
  };
}
export function emitNftUpdated(event: NftUpdatedEvent) {
  for (const { binding } of connections)
    binding.client.emit("nft.updated", event);
}
export function emitOrderUpdated(order: Order) {
  for (const entry of connections) {
    const session = findSession(entry.token);
    if (!session) {
      if (entry.token) {
        entry.close();
        connections.delete(entry);
      }
      continue;
    }
    if (session.user.id !== order.userId) continue;
    const event: OrderUpdatedEvent = {
      eventId: crypto.randomUUID(),
      resourceId: order.id,
      version: order.version,
      occurredAt: timestamp(),
      data: structuredClone(order),
      userId: order.userId,
      sessionToken: session.token,
    };
    entry.binding.client.emit("order.updated", event);
  }
}
export function disconnectMockSockets(token?: string) {
  for (const entry of connections)
    if (token === undefined || entry.token === token) {
      entry.close();
      connections.delete(entry);
    }
}
