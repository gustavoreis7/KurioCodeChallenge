import type {
  Cart,
  CartItem,
  CreateOrderRequest,
  Credentials,
  NFT,
  Order,
  NftListResponse,
  PasswordUpdate,
  ProfileUpdate,
  Quote,
  QuoteRequest,
  Registration,
  Session,
  SocialAccountsResponse,
  SocialLoginRequest,
  User,
  Wallet,
  WalletInput,
} from "./index";

export interface FavoritesResponse {
  nftIds: string[];
}
export interface WalletsResponse {
  items: Wallet[];
}
export interface OrdersResponse {
  items: Order[];
}
export interface QuantityUpdate {
  quantity: number;
}
export interface CouponInput {
  code: string;
}
export interface WalletConnectionInput {
  action: "connect" | "disconnect" | "refuse";
}
/** Paths with parameters use the placeholder names documented in docs/CONTRACTS.md. */
export interface ApiContracts {
  "POST /auth/register": { request: Registration; response: Session };
  "POST /auth/login": { request: Credentials; response: Session };
  "GET /auth/social/:provider/accounts": { response: SocialAccountsResponse };
  "POST /auth/social/:provider": {
    request: SocialLoginRequest;
    response: Session;
  };
  "GET /auth/session": { response: Session };
  "POST /auth/logout": { response: void };
  "POST /auth/expire": { response: void };
  "GET /nfts": { response: NftListResponse };
  "GET /nfts/:id": { response: NFT };
  "GET /favorites": { response: FavoritesResponse };
  "PUT /favorites/:id": { response: { nftId: string; userId: string } };
  "DELETE /favorites/:id": { response: void };
  "GET /cart": { response: Cart };
  "POST /cart/items": { request: CartItem; response: Cart };
  "PATCH /cart/items/:nftId/:editionId": {
    request: QuantityUpdate;
    response: Cart;
  };
  "DELETE /cart/items/:nftId/:editionId": { response: Cart };
  "PUT /cart/coupon": { request: CouponInput; response: Cart };
  "DELETE /cart/coupon": { response: Cart };
  "POST /cart/quote": { request: QuoteRequest; response: Quote };
  "POST /orders": { request: CreateOrderRequest; response: Order };
  "GET /orders": { response: OrdersResponse };
  "GET /orders/:id": { response: Order };
  "GET /profile": { response: User };
  "PATCH /profile": { request: ProfileUpdate; response: User };
  "PUT /profile/password": { request: PasswordUpdate; response: void };
  "GET /wallets": { response: WalletsResponse };
  "POST /wallets": { request: WalletInput; response: Wallet };
  "PATCH /wallets/:id": { request: WalletInput; response: Wallet };
  "POST /wallets/:id/connection": {
    request: WalletConnectionInput;
    response: Wallet;
  };
}
