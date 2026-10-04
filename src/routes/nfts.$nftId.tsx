import { createFileRoute } from "@tanstack/react-router";
import { NftDetailPage } from "@/pages/NftDetailPage";
export const Route = createFileRoute("/nfts/$nftId")({
  head: ({ params }) => ({ meta: [{ title: `NFT ${params.nftId} | Kurio` }] }),
  component: () => (
    <NftDetailPage key={Route.useParams().nftId} id={Route.useParams().nftId} />
  ),
});
