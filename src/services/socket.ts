import type { Socket } from "socket.io-client";
import type { ClientSocketEvents, SocketEvents } from "../types";

export type MarketplaceSocket = Socket<SocketEvents, ClientSocketEvents>;
/** Call only after MSW has started; Engine.IO captures WebSocket during import. */
export async function createMarketplaceSocket(
  origin: string,
  token?: string,
): Promise<MarketplaceSocket> {
  const { io } = await import("socket.io-client");
  const { WebSocket } = await import("engine.io-client");
  const socket: MarketplaceSocket = io(origin, {
    transports: [WebSocket],
    path: "/socket.io/",
    autoConnect: false,
    forceNew: true,
  });
  if (token)
    socket.on("connect", () => socket.emit("session.subscribe", { token }));
  return socket;
}
