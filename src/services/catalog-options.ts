import type { NftNetwork } from "@/types";

export const collectionOptions = [
  { id: "original", label: "Arte digital" },
  { id: "photography", label: "Fotografia" },
  { id: "music", label: "Música" },
  { id: "art3d", label: "Arte 3D" },
  { id: "collectibles", label: "Colecionáveis" },
  { id: "generative", label: "Generativa" },
  { id: "games", label: "Jogos" },
  { id: "memberships", label: "Assinaturas" },
  { id: "utility", label: "Utilidade" },
] as const;

export const additionalCollectionOptions = [
  { id: "rare", label: "Raros" },
  { id: "legendary", label: "Lendarios" },
  { id: "new", label: "Novidades" },
] as const;

export const categoryIds: readonly string[] = [
  ...collectionOptions.map(({ id }) => id),
  ...additionalCollectionOptions.map(({ id }) => id),
  "trending",
];

export const networkOptions: ReadonlyArray<{ id: NftNetwork; label: string }> =
  [
    { id: "ethereum", label: "Ethereum" },
    { id: "polygon", label: "Polygon" },
    { id: "solana", label: "Solana" },
  ];
