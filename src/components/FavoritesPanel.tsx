import { useNfts } from "@/hooks/useMarketplace";
import { useFavorite } from "@/hooks/useFavorite";
import { catalogSearch } from "@/services/search";
import { Modal } from "./ui/dialog";
import { ContentSkeleton, Failure } from "./Feedback";
import { NftGrid } from "./NftGrid";

export function FavoritesPanel({ onClose }: { onClose: () => void }) {
  const favorite = useFavorite();
  const catalog = useNfts({ ...catalogSearch({}), pageSize: 100 });
  const items =
    catalog.data?.items.filter((nft) => favorite.ids.includes(nft.id)) ?? [];
  return (
    <Modal
      open
      onClose={onClose}
      title="Lista de interesse"
      className="favorites-modal"
    >
      <div
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a[href]")) onClose();
        }}
      >
        {favorite.isPending || catalog.isPending ? (
          <ContentSkeleton count={2} />
        ) : favorite.isError || catalog.isError ? (
          <Failure
            error={favorite.error || catalog.error}
            retry={() => {
              void favorite.refetch();
              void catalog.refetch();
            }}
          />
        ) : items.length ? (
          <NftGrid items={items} />
        ) : (
          <p className="empty-state">Nenhum NFT favoritado.</p>
        )}
      </div>
    </Modal>
  );
}
