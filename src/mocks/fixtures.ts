import type {
  Coupon,
  NFT,
  SocialAccount,
  SocialProvider,
  User,
  Wallet,
} from "../types";
import { collectionOptions, networkOptions } from "../services/catalog-options";

export const FIXTURE_DATE = "2026-10-03T12:00:00.000Z";
export const DEMO_CREDENTIALS = [
  { email: "ana@example.test", password: "Demo1234!" },
  { email: "bruno@example.test", password: "Demo1234!" },
] as const;
export const users: User[] = [
  {
    id: "user-ana",
    name: "Ana Silva",
    username: "ana_silva",
    email: DEMO_CREDENTIALS[0].email,
    avatarUrl: null,
    createdAt: FIXTURE_DATE,
    version: 1,
  },
  {
    id: "user-bruno",
    name: "Bruno Costa",
    username: "bruno_costa",
    email: DEMO_CREDENTIALS[1].email,
    avatarUrl: null,
    createdAt: FIXTURE_DATE,
    version: 1,
  },
];
// Demo identities are provider-bound subjects, not arbitrary client-supplied emails.
export const socialIdentities: Record<
  SocialProvider,
  Array<SocialAccount & { userId: string }>
> = {
  google: users.map((user) => ({
    id: `google-demo-${user.id}`,
    userId: user.id,
    name: user.name,
    email: user.email,
  })),
  facebook: users.map((user) => ({
    id: `facebook-demo-${user.id}`,
    userId: user.id,
    name: user.name,
    email: user.email,
  })),
};
const artwork = [
  "/artworks/emerald-ape.webp",
  "/artworks/violet-nomad.webp",
  "/artworks/ivory-baron.webp",
  "/artworks/golden-beat.webp",
];
const prices = [
  "1.48",
  "0.92",
  "1.12",
  "2.35",
  "0.86",
  "1.64",
  "0.000000000000000001",
  "3.8",
];
export const nfts: NFT[] = Array.from({ length: 24 }, (_, index) => {
  const id = String(index + 1).padStart(3, "0");
  const imageUrl = artwork[index % 4];
  const title = `Mutt #${831 + index}`;
  const creator = ["Nova Sato", "Maya Chen", "Theo Alves", "Luna Costa"][
    index % 4
  ];
  const network = networkOptions[index % networkOptions.length].id;
  const networkName = {
    ethereum: "Ethereum",
    polygon: "Polygon",
    solana: "Solana",
  }[network];
  return {
    id,
    title,
    description: `Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na ${networkName}.`,
    creator,
    details: {
      collectionName: "Kurio Apes",
      paragraphs: [
        `${title} é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${networkName}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
        `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
      ],
      metadata: [
        {
          label: "Rede",
          value: `Cunhado na ${networkName} com procedência imutável e metadados armazenados no IPFS.`,
        },
        {
          label: "Contrato",
          value:
            network === "solana"
              ? "Token SPL verificado na Solana."
              : "0x7A42...19E8 · Contrato inteligente ERC-721 verificado.",
        },
        {
          label: "Direitos autorais",
          value:
            "Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.",
        },
      ],
    },
    imageUrl,
    imageAlt: `Retrato Mutt ${id}`,
    gallery: [{ id: "main", src: imageUrl, alt: `Retrato Mutt ${id}` }],
    categories: [
      ...new Set([
        "original",
        collectionOptions[index % collectionOptions.length].id,
        ["rare", "legendary", "new"][index % 3],
        ...(index % 3 === 1 ? ["trending"] : []),
      ]),
    ],
    network,
    attributes: [
      {
        trait: "Acessório",
        value: ["Óculos", "Chapéu", "Brinco", "Fones de ouvido"][index % 4],
        rarity: "12%",
      },
      {
        trait: "Cor",
        value: ["Esmeralda", "Violeta", "Marfim", "Dourado"][index % 4],
        rarity: "8%",
      },
      {
        trait: "Raridade",
        value: ["Raro", "Lendário", "Nova edição"][index % 3],
        rarity: "6%",
      },
    ],
    history: [
      {
        id: `history-${id}`,
        event: "Listagem",
        date: FIXTURE_DATE,
        priceEth: prices[index % prices.length],
      },
    ],
    priceEth: prices[index % prices.length],
    editions: [
      {
        id: "edition-1",
        label: "01 / 50",
        available: index === 23 ? 0 : 5,
        maxPerOrder: 3,
      },
      { id: "edition-2", label: "02 / 50", available: 2, maxPerOrder: 2 },
    ],
    version: 1,
    updatedAt: new Date(
      Date.parse(FIXTURE_DATE) - index * 60_000,
    ).toISOString(),
  };
});
export const coupons: Coupon[] = [
  {
    code: "MUTT10",
    discountBasisPoints: 1000,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  {
    code: "EXPIRED",
    discountBasisPoints: 1000,
    expiresAt: "2020-01-01T00:00:00.000Z",
  },
];
export const wallets: Wallet[] = users.map((user, index) => ({
  id: `wallet-${user.id}`,
  userId: user.id,
  name: "Principal",
  address: `0x${String(index + 1).repeat(40)}`,
  network: "ethereum",
  isPrimary: true,
  provider: "metamask",
  connection: "disconnected",
  version: 1,
}));
