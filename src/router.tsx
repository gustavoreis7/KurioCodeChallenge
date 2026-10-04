import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryConfig } from "./services/query";
import { bindSessionCache } from "./services/session";

export const getRouter = () => {
  const queryClient = new QueryClient(queryConfig);
  if (typeof window !== "undefined") bindSessionCache(queryClient);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
