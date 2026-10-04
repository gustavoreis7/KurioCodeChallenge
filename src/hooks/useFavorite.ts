import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { sessionState } from "@/services/session";
import { useScope } from "./useMarketplace";

export function useFavorite() {
  const scope = useScope(),
    client = useQueryClient();
  const key = [...scope.key, "favorites"];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.favorites(signal),
    enabled: scope.ready && !!scope.session,
  });
  const mutation = useMutation({
    mutationFn: ({ id, selected }: { id: string; selected: boolean }) =>
      api.favorite(id, selected),
    onMutate: async ({ id, selected }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<{ nftIds: string[] }>(key);
      client.setQueryData(key, {
        nftIds: selected
          ? [...new Set([...(previous?.nftIds ?? []), id])]
          : (previous?.nftIds ?? []).filter((value) => value !== id),
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (scope.session?.token === sessionState().session?.token)
        client.setQueryData(key, context?.previous ?? { nftIds: [] });
    },
    onSettled: () => {
      if (scope.session?.token === sessionState().session?.token)
        void client.invalidateQueries({ queryKey: key });
    },
  });
  return { ...query, mutation, ids: query.data?.nftIds ?? [] };
}
