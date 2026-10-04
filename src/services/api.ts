import { http } from "./http";
import type {
  Cart,
  CartItem,
  CreateOrderRequest,
  Credentials,
  NFT,
  Network,
  NftSearch,
  Order,
  NftListResponse,
  PasswordUpdate,
  ProfileUpdate,
  Quote,
  Registration,
  Session,
  SocialAccountsResponse,
  SocialLoginRequest,
  SocialProvider,
  User,
  Wallet,
  WalletInput,
} from "@/types";

const itemPath = (item: CartItem) =>
  `/cart/items/${encodeURIComponent(item.nftId)}/${encodeURIComponent(item.editionId)}`;
export const api = {
  login: async (input: Credentials) =>
    (await http.post<Session>("/auth/login", input)).data,
  register: async (input: Registration) =>
    (await http.post<Session>("/auth/register", input)).data,
  socialAccounts: async (provider: SocialProvider, signal?: AbortSignal) =>
    (
      await http.get<SocialAccountsResponse>(
        `/auth/social/${provider}/accounts`,
        { signal },
      )
    ).data,
  socialLogin: async (
    provider: SocialProvider,
    input: SocialLoginRequest,
    signal?: AbortSignal,
  ) =>
    (await http.post<Session>(`/auth/social/${provider}`, input, { signal }))
      .data,
  logout: async (token: string) => {
    await http.post(
      "/auth/logout",
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
  nfts: async (search: NftSearch, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined || value === "") continue;
      if (Array.isArray(value))
        value.forEach((entry) => params.append(key, entry));
      else params.set(key, String(value));
    }
    return (await http.get<NftListResponse>("/nfts", { params, signal })).data;
  },
  nft: async (id: string, signal?: AbortSignal) =>
    (await http.get<NFT>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
  favorites: async (signal?: AbortSignal) =>
    (await http.get<{ nftIds: string[] }>("/favorites", { signal })).data,
  favorite: async (id: string, selected: boolean) => {
    await http.request({
      method: selected ? "PUT" : "DELETE",
      url: `/favorites/${encodeURIComponent(id)}`,
    });
  },
  cart: async (signal?: AbortSignal) =>
    (await http.get<Cart>("/cart", { signal })).data,
  addItem: async (item: CartItem) =>
    (await http.post<Cart>("/cart/items", item)).data,
  changeItem: async (item: CartItem) =>
    (await http.patch<Cart>(itemPath(item), { quantity: item.quantity })).data,
  removeItem: async (item: CartItem) =>
    (await http.delete<Cart>(itemPath(item))).data,
  coupon: async (code: string | null) =>
    (code === null
      ? await http.delete<Cart>("/cart/coupon")
      : await http.put<Cart>("/cart/coupon", { code })
    ).data,
  quote: async (network: Network, signal?: AbortSignal) =>
    (await http.post<Quote>("/cart/quote", { network }, { signal })).data,
  createOrder: async (body: CreateOrderRequest, key: string) =>
    (
      await http.post<Order>("/orders", body, {
        headers: { "Idempotency-Key": key },
        timeout: 1000,
      })
    ).data,
  orders: async (signal?: AbortSignal) =>
    (await http.get<{ items: Order[] }>("/orders", { signal })).data,
  order: async (id: string, signal?: AbortSignal) =>
    (await http.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal }))
      .data,
  profile: async (signal?: AbortSignal) =>
    (await http.get<User>("/profile", { signal })).data,
  updateProfile: async (input: ProfileUpdate) =>
    (await http.patch<User>("/profile", input)).data,
  password: async (input: PasswordUpdate) => {
    await http.put("/profile/password", input);
  },
  wallets: async (signal?: AbortSignal) =>
    (await http.get<{ items: Wallet[] }>("/wallets", { signal })).data,
  saveWallet: async (input: WalletInput, id?: string) =>
    (
      await http.request<Wallet>({
        url: id ? `/wallets/${encodeURIComponent(id)}` : "/wallets",
        method: id ? "PATCH" : "POST",
        data: input,
      })
    ).data,
  connectWallet: async (
    id: string,
    action: "connect" | "disconnect" | "refuse",
  ) =>
    (
      await http.post<Wallet>(`/wallets/${encodeURIComponent(id)}/connection`, {
        action,
      })
    ).data,
};
