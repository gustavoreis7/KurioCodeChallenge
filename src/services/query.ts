import { isAxiosError } from "axios";
import type { QueryClientConfig } from "@tanstack/react-query";
import type { NFT, Order } from "@/types";

export const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        count < 1 &&
        isAxiosError(error) &&
        (!error.response || error.response.status >= 500),
    },
    mutations: { retry: false },
  },
};
// A delayed REST response must not overwrite a newer socket version.
export function newest<T extends NFT | Order>(old: T | undefined, next: T): T {
  if (
    old &&
    (old.version > next.version ||
      ("status" in old &&
        old.status !== "pending" &&
        "status" in next &&
        next.status === "pending"))
  )
    return old;
  return next;
}
