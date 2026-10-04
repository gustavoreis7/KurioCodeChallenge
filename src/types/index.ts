/** Non-negative base-10 ETH string with at most 18 fractional digits. */
export type EthDecimal = string;
export type ISODate = string;
export type Network = "ethereum" | "polygon";
export type NftNetwork = Network | "solana";
export type NftSort = "recent" | "price-asc" | "price-desc" | "title";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  ens?: string;
  avatarUrl: string | null;
  createdAt: ISODate;
  version: number;
}
export interface Session {
  token: string;
  user: User;
  expiresAt: ISODate;
}
export interface Credentials {
  email: string;
  password: string;
}
export interface Registration extends Credentials {
  name: string;
  username?: string;
}
export type SocialProvider = "google" | "facebook";
export interface SocialAccount {
  id: string;
  name: string;
  email: string;
}
export interface SocialAccountsResponse {
  provider: SocialProvider;
  simulated: true;
  accounts: SocialAccount[];
}
export interface SocialLoginRequest {
  accountId: string;
}
export interface ProfileUpdate {
  name?: string;
  email?: string;
  username?: string;
  ens?: string;
  avatarUrl?: string | null;
}
export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}
export interface NftEdition {
  id: string;
  label: string;
  available: number;
  maxPerOrder: number;
}
export interface NFT {
  id: string;
  title: string;
  description: string;
  details?: {
    collectionName: string;
    paragraphs: string[];
    metadata: Array<{ label: string; value: string }>;
  };
  creator: string;
  imageUrl: string;
  imageAlt: string;
  gallery: Array<{ id: string; src: string; alt: string }>;
  categories: string[];
  network: NftNetwork;
  attributes: Array<{ trait: string; value: string; rarity: string }>;
  history: Array<{
    id: string;
    event: string;
    date: ISODate;
    priceEth?: EthDecimal;
  }>;
  priceEth: EthDecimal;
  editions: NftEdition[];
  version: number;
  updatedAt: ISODate;
}
export interface NftSearch {
  q: string;
  categories: string[];
  networks: NftNetwork[];
  minPrice?: EthDecimal;
  maxPrice?: EthDecimal;
  available?: boolean;
  sort: NftSort;
  page: number;
  pageSize: number;
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface CatalogFacets {
  categories: Record<string, number>;
  networks: Record<NftNetwork, number>;
}
export interface NftListResponse extends Paginated<NFT> {
  facets: CatalogFacets;
}
export interface Favorite {
  nftId: string;
  userId: string;
}
export interface CartItem {
  nftId: string;
  editionId: string;
  quantity: number;
}
export interface Cart {
  id: string;
  items: CartItem[];
  couponCode: string | null;
  version: number;
}
export interface Coupon {
  code: string;
  discountBasisPoints: number;
  expiresAt: ISODate;
}
export interface QuoteItem extends CartItem {
  title: string;
  imageUrl: string;
  editionLabel: string;
  nftVersion: number;
  unitPriceEth: EthDecimal;
  lineTotalEth: EthDecimal;
}
export interface Quote {
  id: string;
  userId: string | null;
  cartVersion: number;
  network: Network;
  items: QuoteItem[];
  couponCode: string | null;
  subtotalEth: EthDecimal;
  discountEth: EthDecimal;
  networkFeeEth: EthDecimal;
  totalEth: EthDecimal;
  createdAt: ISODate;
  expiresAt: ISODate;
}
export interface QuoteRequest {
  network: Network;
}
export type WalletProvider = "metamask" | "walletconnect" | "coinbase";
export interface Wallet {
  id: string;
  userId: string;
  name: string;
  address: string;
  network: Network;
  isPrimary: boolean;
  provider?: WalletProvider;
  connection: "disconnected" | "connected" | "refused";
  version: number;
}
export interface WalletInput {
  name: string;
  address: string;
  network: Network;
  isPrimary: boolean;
  provider?: WalletProvider;
}
export interface Collector {
  name: string;
  email: string;
  username?: string;
  profileName?: string;
  referralCode?: string;
  ens?: string;
  notes?: string;
}
export interface CreateOrderRequest {
  quoteId: string;
  walletId: string;
  collector: Collector;
}
export type OrderStatus = "pending" | "confirmed" | "refused";
export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  quote: Quote;
  collector: Collector;
  wallet: Wallet;
  transactionId: string | null;
  explorerUrl: string | null;
  refusalReason: string | null;
  version: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}
export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    details?: unknown;
  };
}
export interface ResourceEvent<T> {
  eventId: string;
  resourceId: string;
  version: number;
  occurredAt: ISODate;
  data: T;
}
export type NftUpdatedEvent = ResourceEvent<NFT>;
export interface OrderUpdatedEvent extends ResourceEvent<Order> {
  userId: string;
  sessionToken: string;
}
export interface SocketEvents {
  "nft.updated": (event: NftUpdatedEvent) => void;
  "order.updated": (event: OrderUpdatedEvent) => void;
}
export interface ClientSocketEvents {
  "session.subscribe": (payload: { token: string }) => void;
}
