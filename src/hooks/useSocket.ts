import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createMarketplaceSocket } from "@/services/socket";
import { onSessionEnd, sessionState } from "@/services/session";
import { newest } from "@/services/query";
import { compareNfts, matchesSearch } from "@/services/catalog";
import type {
  Cart,
  NFT,
  NftUpdatedEvent,
  NftSearch,
  Order,
  OrderUpdatedEvent,
  Paginated,
} from "@/types";
import { useScope } from "./useMarketplace";

export function useSocket(
  onCartChanged: () => void,
  onConnection?: (connected: boolean) => void,
) {
  const client = useQueryClient(),
    { session, ready, key } = useScope();
  const token = session?.token,
    owner = key.join(":");
  useEffect(() => {
    if (!ready) return;
    let disposed = false,
      connectedOnce = false;
    let close = () => {};
    const stop = onSessionEnd(() => {
      disposed = true;
      close();
    });
    const seen = new Set<string>(),
      versions = new Map<string, number>();
    const accept = (
      event: NftUpdatedEvent | OrderUpdatedEvent,
      kind: string,
    ) => {
      const id = `${kind}:${event.resourceId}`;
      if (
        disposed ||
        seen.has(event.eventId) ||
        event.version <= (versions.get(id) ?? 0)
      )
        return false;
      seen.add(event.eventId);
      versions.set(id, event.version);
      if (seen.size > 1000) seen.delete(seen.values().next().value!);
      return true;
    };
    void createMarketplaceSocket(window.location.origin, token)
      .then((socket) => {
        if (disposed) {
          socket.disconnect();
          return;
        }
        close = () => {
          socket.removeAllListeners();
          socket.disconnect();
        };
        socket.on("connect", () => {
          onConnection?.(true);
          if (connectedOnce) {
            void client.invalidateQueries({ queryKey: ["nfts"] });
            void client.invalidateQueries({ queryKey: ["nft"] });
            void client.invalidateQueries({ queryKey: key });
            if (client.getQueryData<Cart>([...key, "cart"])?.items.length)
              onCartChanged();
          }
          connectedOnce = true;
        });
        socket.on("disconnect", () => {
          if (!disposed) onConnection?.(false);
          // Server-initiated disconnects do not automatically reconnect in Socket.IO.
          if (!disposed) socket.connect();
        });
        socket.on("nft.updated", (event) => {
          const cached = client.getQueryData<NFT>(["nft", event.resourceId]);
          const listVersions = client
            .getQueriesData<Paginated<NFT>>({ queryKey: ["nfts"] })
            .flatMap(
              ([, data]) =>
                data?.items
                  .filter((item) => item.id === event.resourceId)
                  .map((item) => item.version) ?? [],
            );
          if (
            event.version <= Math.max(cached?.version ?? 0, ...listVersions) ||
            !accept(event, "nft")
          )
            return;
          client.setQueryData<NFT>(["nft", event.resourceId], (old) =>
            newest(old, event.data),
          );
          for (const [queryKey, old] of client.getQueriesData<Paginated<NFT>>({
            queryKey: ["nfts"],
          })) {
            if (!old) continue;
            const search = queryKey[1] as NftSearch;
            const previous = old.items.find(
              (item) => item.id === event.resourceId,
            );
            const items = old.items
              .map((item) =>
                item.id === event.resourceId ? newest(item, event.data) : item,
              )
              .filter((item) => matchesSearch(item, search))
              .sort((a, b) => compareNfts(a, b, search));
            const total = Math.max(
              0,
              old.total -
                (previous && !matchesSearch(event.data, search) ? 1 : 0),
            );
            client.setQueryData(queryKey, {
              ...old,
              items,
              total,
              totalPages: Math.ceil(total / search.pageSize),
            });
          }
          // Page boundaries need REST on the next navigation/focus, not a full refetch per event.
          void client.invalidateQueries({
            queryKey: ["nfts"],
            refetchType: "none",
          });
          const cart = client.getQueryData<Cart>([...key, "cart"]);
          if (cart?.items.some((item) => item.nftId === event.resourceId)) {
            onCartChanged();
            void client.invalidateQueries({ queryKey: [...key, "quote"] });
          }
        });
        socket.on("order.updated", (event) => {
          if (
            sessionState().session?.token !== token ||
            event.sessionToken !== token ||
            event.userId !== session?.user.id ||
            !accept(event, "order")
          )
            return;
          client.setQueryData<Order>(
            [...key, "order", event.resourceId],
            (old) => newest(old, event.data),
          );
          void client.invalidateQueries({ queryKey: [...key, "orders"] });
          if (event.data.status === "confirmed")
            void client.invalidateQueries({ queryKey: [...key, "cart"] });
        });
        socket.connect();
      })
      .catch(() => {
        if (!disposed) onConnection?.(false);
      });
    return () => {
      disposed = true;
      stop();
      close();
    };
  }, [client, token, owner, ready, onCartChanged, onConnection]);
}
