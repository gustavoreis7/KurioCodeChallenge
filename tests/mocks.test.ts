import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import axios, { type AxiosInstance } from "axios";
import { WebSocket } from "ws";
import type {
  Cart,
  CreateOrderRequest,
  NFT,
  NftListResponse,
  NftUpdatedEvent,
  Order,
  Quote,
  Session,
  SocialAccountsResponse,
  Wallet,
} from "../src/types";
import { DEMO_CREDENTIALS } from "../src/mocks/fixtures";
import { configureMocks } from "../src/mocks/scenarios";
import { recoverPendingOrders, clearMockTimers } from "../src/mocks/domain";
import { resetMocks } from "../src/mocks/controls";
import {
  initializeMockState,
  readState,
  STORAGE_KEY,
} from "../src/mocks/state";
import { fromWei, toWei } from "../src/mocks/money";
import {
  createMarketplaceSocket,
  type MarketplaceSocket,
} from "../src/services/socket";

const origin = "http://localhost:5173";
const guestId = "guest-00000001";
const client = axios.create({
  baseURL: `${origin}/api`,
  validateStatus: () => true,
  headers: { "X-Guest-Id": guestId },
});
const sockets: MarketplaceSocket[] = [];
let server: typeof import("../src/mocks/node").server;
let storage: Map<string, string>;

beforeAll(async () => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("WebSocket", WebSocket);
  const node = await import("../src/mocks/node");
  server = node.server;
  await node.startMockServer();
});
beforeEach(async () => {
  for (const socket of sockets.splice(0)) socket.disconnect();
  await resetMocks();
  configureMocks({ latencyMs: 0, paymentDelayMs: 25, timeoutMs: 50 });
});
afterAll(() => {
  for (const socket of sockets) socket.disconnect();
  clearMockTimers();
  server.close();
  vi.unstubAllGlobals();
});

async function login(index = 0) {
  const response = await client.post<Session>(
    "/auth/login",
    DEMO_CREDENTIALS[index],
  );
  expect(response.status).toBe(200);
  const session = response.data;
  const api = axios.create({
    baseURL: `${origin}/api`,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${session.token}` },
  });
  return { api, session };
}
async function checkout(api: AxiosInstance, nftId = "001") {
  expect(
    (
      await api.post("/cart/items", {
        nftId,
        editionId: "edition-1",
        quantity: 1,
      })
    ).status,
  ).toBe(201);
  const wallets = (await api.get<{ items: Wallet[] }>("/wallets")).data.items;
  expect(
    (
      await api.post(`/wallets/${wallets[0].id}/connection`, {
        action: "connect",
      })
    ).status,
  ).toBe(200);
  const response = await api.post<Quote>("/cart/quote", {
    network: "ethereum",
  });
  expect(response.status).toBe(200);
  const input: CreateOrderRequest = {
    quoteId: response.data.id,
    walletId: wallets[0].id,
    collector: { name: "Ana Silva", email: "ana@example.test" },
  };
  return {
    input,
    quote: response.data,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  };
}
async function connect(token?: string) {
  const socket = await createMarketplaceSocket(origin, token);
  sockets.push(socket);
  const connected = new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  socket.connect();
  await connected;
  // Ensure the subscription frame is processed before triggering private events.
  await new Promise((resolve) => setTimeout(resolve, 10));
  return socket;
}
async function confirmed(
  api: AxiosInstance,
  orderId: string,
  status: Order["status"] = "confirmed",
) {
  await vi.waitFor(async () =>
    expect((await api.get<Order>(`/orders/${orderId}`)).data.status).toBe(
      status,
    ),
  );
  return (await api.get<Order>(`/orders/${orderId}`)).data;
}

describe("REST contracts and deterministic scenarios", () => {
  it.each(["google", "facebook"])(
    "authenticates demo %s identities, merges the visitor cart and restores the persisted session",
    async (provider) => {
      await client.post("/cart/items", {
        nftId: "001",
        editionId: "edition-1",
        quantity: 1,
      });
      const choices = await client.get<SocialAccountsResponse>(
        `/auth/social/${provider}/accounts`,
      );
      expect(choices.status).toBe(200);
      expect(choices.data.simulated).toBe(true);
      expect(choices.data.provider).toBe(provider);
      expect(choices.data.accounts).toHaveLength(2);
      expect(Object.keys(choices.data.accounts[0]).sort()).toEqual([
        "email",
        "id",
        "name",
      ]);
      const response = await client.post<Session>(`/auth/social/${provider}`, {
        accountId: choices.data.accounts[0].id,
      });
      expect(response.status).toBe(200);
      expect(response.data.user.id).toBe("user-ana");
      const headers = { Authorization: `Bearer ${response.data.token}` };
      expect(
        (await client.get<Cart>("/cart", { headers })).data.items,
      ).toHaveLength(1);
      expect((await client.get<Cart>("/cart")).data.items).toHaveLength(0);
      await initializeMockState();
      expect(
        (await client.get<Session>("/auth/session", { headers })).data,
      ).toEqual(response.data);
      expect(readState().accounts).toHaveLength(2);
      await client.post("/auth/logout", {}, { headers });
      expect((await client.get("/profile", { headers })).status).toBe(401);
    },
  );
  it("rejects invalid providers, mismatched subjects and arbitrary emails without creating a session", async () => {
    expect((await client.get("/auth/social/unknown/accounts")).status).toBe(
      422,
    );
    for (const input of [
      {},
      { accountId: "facebook-demo-user-ana" },
      { accountId: "user-ana" },
      { email: "ana@example.test" },
    ]) {
      expect((await client.post("/auth/social/google", input)).status).toBe(
        422,
      );
    }
    expect(
      (
        await client.post("/auth/social/unknown", {
          accountId: "google-demo-user-ana",
        })
      ).status,
    ).toBe(422);
    expect(readState().sessions).toEqual({});
  });
  it("keeps social subjects stable after a private profile edit without exposing that edit in public choices", async () => {
    const { api } = await login();
    await api.patch("/profile", {
      name: "Nome privado",
      email: "privado@example.test",
    });
    const choices = (
      await client.get<SocialAccountsResponse>("/auth/social/google/accounts")
    ).data;
    expect(choices.accounts[0].email).toBe("ana@example.test");
    expect(choices.accounts[0].name).toBe("Ana Silva");
    const session = (
      await client.post<Session>("/auth/social/google", {
        accountId: choices.accounts[0].id,
      })
    ).data;
    expect(session.user).toMatchObject({
      id: "user-ana",
      name: "Nome privado",
      email: "privado@example.test",
    });
    expect(readState().accounts).toHaveLength(2);
  });
  it("recovers social sign-in after HTTP or offline failure without authenticating the failed attempt", async () => {
    const input = { accountId: "google-demo-user-ana" };
    expect(
      (
        await client.post("/auth/social/google", input, {
          headers: { "X-Mock-Scenario": "http-500" },
        })
      ).status,
    ).toBe(503);
    await expect(
      client.post("/auth/social/google", input, {
        headers: { "X-Mock-Scenario": "offline" },
      }),
    ).rejects.toThrow();
    expect(readState().sessions).toEqual({});
    expect((await client.post("/auth/social/google", input)).status).toBe(200);
  });
  it("upgrades persisted artwork without resetting account, price, cart or receipt data", async () => {
    const { api } = await login();
    const { input, headers } = await checkout(api);
    const order = (await api.post<Order>("/orders", input, { headers })).data;
    await confirmed(api, order.id);
    const stored = readState();
    stored.nfts[0].imageUrl = "/assets/nft-beanie-old-build.jpg";
    stored.nfts[0].priceEth = "1.000000000000000001";
    const legacy = stored.nfts[0] as Partial<NFT>;
    delete legacy.network;
    delete legacy.details;
    stored.nfts[0].description = "Retrato digital da colecao Mutt Originals.";
    stored.nfts[0].creator = "Mutt Club";
    stored.nfts[0].attributes = [
      { trait: "Colecao", value: "Originals", rarity: "100%" },
    ];
    stored.nfts[0].categories = ["original", "rare"];
    stored.nfts[0].gallery[0].src = stored.nfts[0].imageUrl;
    stored.orders[order.id].quote.items[0].imageUrl =
      "/assets/nft-beanie-DGQMQtLn.jpg";
    storage.set(STORAGE_KEY, JSON.stringify(stored));
    await initializeMockState();
    const upgraded = readState();
    expect(upgraded.nfts[0].imageUrl).toBe("/artworks/emerald-ape.webp");
    expect(upgraded.nfts[0].gallery[0].src).toBe(upgraded.nfts[0].imageUrl);
    expect(upgraded.nfts[0].priceEth).toBe(stored.nfts[0].priceEth);
    expect(upgraded.nfts[0].version).toBe(stored.nfts[0].version);
    expect(upgraded.nfts[0].network).toBe("ethereum");
    expect(upgraded.nfts[0].details?.paragraphs).toHaveLength(2);
    expect(upgraded.nfts[0].creator).toBe("Nova Sato");
    expect(upgraded.nfts[0].attributes[0].value).toBe("Óculos");
    expect(upgraded.nfts[0].description).toContain("Kurio Editions");
    expect(upgraded.nfts[1].network).toBe(stored.nfts[1].network);
    expect(upgraded.accounts).toEqual(stored.accounts);
    expect(upgraded.sessions).toEqual(stored.sessions);
    expect(upgraded.carts).toEqual(stored.carts);
    expect(upgraded.orders).toEqual(stored.orders);
    expect(upgraded.attempts).toEqual(stored.attempts);
  });
  it("serves complete product descriptions and metadata for every network", async () => {
    for (const id of ["001", "002", "003"]) {
      const { data: nft } = await client.get<NFT>(`/nfts/${id}`);
      expect(nft.details?.collectionName).toBe("Kurio Apes");
      expect(nft.details?.paragraphs).toHaveLength(2);
      expect(nft.details?.paragraphs[0]).toContain(nft.title);
      expect(nft.details?.paragraphs[1]).toContain(`${nft.creator} recebe 5%`);
      expect(nft.details?.metadata.map((item) => item.label)).toEqual([
        "Rede",
        "Contrato",
        "Direitos autorais",
      ]);
      expect(nft.details?.metadata[1].value).toContain(
        nft.network === "solana" ? "SPL" : "ERC-721",
      );
      expect(typeof nft.priceEth).toBe("string");
    }
  });
  it("validates checkout layout fields and snapshots the registered wallet provider", async () => {
    const { api } = await login();
    const { input, headers } = await checkout(api);
    const wallet = (await api.get<{ items: Wallet[] }>("/wallets")).data
      .items[0];
    expect(
      (
        await api.patch(`/wallets/${wallet.id}`, {
          ...wallet,
          provider: "invalid",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await api.patch(`/wallets/${wallet.id}`, {
          ...wallet,
          provider: "coinbase",
        })
      ).status,
    ).toBe(200);
    await api.post(`/wallets/${wallet.id}/connection`, { action: "connect" });
    for (const collector of [
      { ...input.collector, profileName: "A" },
      { ...input.collector, referralCode: "invalid code!" },
    ]) {
      expect(
        (await api.post("/orders", { ...input, collector }, { headers }))
          .status,
      ).toBe(422);
    }
    expect(readState().orders).toEqual({});
    const collector = {
      ...input.collector,
      username: "ana_silva",
      profileName: "Galeria Ana",
      referralCode: "ANA2026",
      ens: "ana.eth",
    };
    const response = await api.post<Order>(
      "/orders",
      { ...input, collector },
      { headers },
    );
    expect(response.status).toBe(201);
    const order = await confirmed(api, response.data.id);
    expect(order.collector).toEqual(collector);
    expect(order.wallet.provider).toBe("coinbase");
    expect(typeof order.quote.totalEth).toBe("string");
  });
  it("combines search, categories, prices, sorting and pagination with exact decimals", async () => {
    const result = await client.get("/nfts", {
      params: {
        q: "Mutt",
        categories: "original,rare",
        minPrice: "0.8",
        maxPrice: "2",
        sort: "price-asc",
        page: 1,
        pageSize: 2,
      },
    });
    expect(result.status).toBe(200);
    expect(result.data.total).toBeGreaterThan(2);
    const items = result.data.items as NFT[];
    expect(items).toHaveLength(2);
    expect(
      items.every(
        (nft) =>
          nft.categories.includes("rare") && typeof nft.priceEth === "string",
      ),
    ).toBe(true);
    expect(toWei(items[0].priceEth) <= toWei(items[1].priceEth)).toBe(true);
    expect(
      (await client.get("/nfts", { params: { q: "does-not-exist" } })).data
        .total,
    ).toBe(0);
    expect(
      (await client.get("/nfts", { params: { minPrice: "1e-3" } })).status,
    ).toBe(422);
    expect((await client.get("/nfts/absent")).status).toBe(404);
    expect(
      fromWei(toWei("1.000000000000000001") + toWei("0.000000000000000001")),
    ).toBe("1.000000000000000002");
  });
  it("filters catalog networks with OR, combines categories with AND and returns real global facets", async () => {
    const all = (
      await client.get<NftListResponse>("/nfts", { params: { pageSize: 100 } })
    ).data;
    expect(all.total).toBe(24);
    expect(all.facets.networks).toEqual({ ethereum: 8, polygon: 8, solana: 8 });
    const combined = await client.get<NftListResponse>("/nfts", {
      params: {
        categories: "original,photography",
        networks: "polygon,solana",
        minPrice: "0.000000000000000001",
        maxPrice: "2",
        sort: "price-asc",
      },
    });
    expect(combined.status).toBe(200);
    expect(combined.data.items.length).toBeGreaterThan(0);
    expect(
      combined.data.items.every(
        (nft) =>
          nft.network === "polygon" &&
          nft.categories.includes("photography") &&
          toWei(nft.priceEth) <= toWei("2"),
      ),
    ).toBe(true);
    expect(combined.data.facets).toEqual(all.facets);
    for (const [category, count] of Object.entries(all.facets.categories)) {
      expect(count).toBe(
        all.items.filter((nft) => nft.categories.includes(category)).length,
      );
    }
    const twoNetworks = (
      await client.get<NftListResponse>("/nfts", {
        params: { networks: "ethereum,solana", pageSize: 100 },
      })
    ).data;
    expect(twoNetworks.total).toBe(16);
    expect(twoNetworks.items.every((nft) => nft.network !== "polygon")).toBe(
      true,
    );
    expect(
      (await client.get("/nfts", { params: { networks: "invalid" } })).status,
    ).toBe(422);
    const empty = (
      await client.get<NftListResponse>("/nfts", {
        headers: { "X-Mock-Scenario": "empty" },
      })
    ).data;
    expect(empty.facets.networks).toEqual({
      ethereum: 0,
      polygon: 0,
      solana: 0,
    });
  });
  it("reproduces network errors, HTTP errors and out-of-order responses", async () => {
    expect(
      (
        await client.get("/nfts", {
          headers: { "X-Mock-Scenario": "http-500" },
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await client.get("/nfts", {
          headers: { "X-Mock-Scenario": "http-422" },
        })
      ).status,
    ).toBe(422);
    await expect(
      client.get("/nfts", { headers: { "X-Mock-Scenario": "offline" } }),
    ).rejects.toThrow();
    configureMocks({ scenario: "variable-latency" });
    const completed: number[] = [];
    // Reset the deterministic latency counter without changing the initialized database.
    const { resetMockConfig } = await import("../src/mocks/scenarios");
    resetMockConfig();
    configureMocks({ scenario: "variable-latency" });
    await Promise.all(
      [0, 1].map((id) =>
        client
          .get("/nfts", { params: { page: id + 1 } })
          .then(() => completed.push(id)),
      ),
    );
    expect(completed).toEqual([1, 0]);
  });
  it("validates registration conflicts and stores no plaintext password", async () => {
    expect(
      (
        await client.post("/auth/register", {
          ...DEMO_CREDENTIALS[0],
          name: "Ana",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await client.post("/auth/register", {
          email: "bad",
          password: "short",
          name: "A",
        })
      ).status,
    ).toBe(422);
    const result = await client.post<Session>("/auth/register", {
      email: "carla@example.test",
      password: "Carla1234!",
      name: "Carla",
    });
    expect(result.status).toBe(201);
    expect(JSON.stringify(readState())).not.toContain("Carla1234!");
    expect(JSON.stringify(readState())).not.toContain(
      DEMO_CREDENTIALS[0].password,
    );
    expect(storage.has(STORAGE_KEY)).toBe(true);
  });
  it("isolates profiles, wallets and favorites, expires sessions and revokes logout", async () => {
    const ana = await login();
    const bruno = await login(1);
    expect((await client.get("/profile")).status).toBe(401);
    expect((await ana.api.put("/favorites/001")).status).toBe(200);
    expect((await bruno.api.get("/favorites")).data.nftIds).not.toContain(
      "001",
    );
    expect((await bruno.api.get("/wallets")).data.items[0].userId).toBe(
      bruno.session.user.id,
    );
    expect(
      (
        await ana.api.get("/profile", {
          headers: { "X-Mock-Scenario": "forbidden" },
        })
      ).status,
    ).toBe(403);
    await ana.api.post("/auth/logout");
    expect((await ana.api.get("/profile")).status).toBe(401);
    await bruno.api.post("/auth/expire");
    expect((await bruno.api.get("/auth/session")).status).toBe(401);
  });
  it("merges visitor cart on login, enforces limits and validates coupons", async () => {
    await client.post("/cart/items", {
      nftId: "001",
      editionId: "edition-1",
      quantity: 1,
    });
    expect(
      (await client.patch("/cart/items/001/edition-1", { quantity: 4 })).status,
    ).toBe(409);
    expect(
      (await client.patch("/cart/items/001/edition-1", { quantity: 1.2 }))
        .status,
    ).toBe(422);
    const { api } = await login();
    expect((await api.get<Cart>("/cart")).data.items[0].quantity).toBe(1);
    expect((await client.get<Cart>("/cart")).data.items).toHaveLength(0);
    expect((await api.put("/cart/coupon", { code: "INVALID" })).status).toBe(
      422,
    );
    expect((await api.put("/cart/coupon", { code: "EXPIRED" })).status).toBe(
      410,
    );
    await api.put("/cart/coupon", { code: "MUTT10" });
    const quote = (
      await api.post<Quote>("/cart/quote", { network: "ethereum" })
    ).data;
    expect(quote).toMatchObject({
      subtotalEth: "1.48",
      discountEth: "0.148",
      networkFeeEth: "0.03",
      totalEth: "1.362",
    });
    await api.delete("/cart/coupon");
    expect((await api.get<Cart>("/cart")).data.couponCode).toBeNull();
  });
  it("persists profile, avatar, password and primary/secondary wallets", async () => {
    const { api } = await login();
    expect(
      (await api.patch("/profile", { email: DEMO_CREDENTIALS[1].email }))
        .status,
    ).toBe(409);
    await api.patch("/profile", {
      name: "Ana Atualizada",
      avatarUrl: "data:image/png;base64,aGVsbG8=",
    });
    expect((await api.get("/profile")).data.name).toBe("Ana Atualizada");
    expect(
      (
        await api.put("/profile/password", {
          currentPassword: "wrong",
          newPassword: "New12345!",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await api.put("/profile/password", {
          currentPassword: DEMO_CREDENTIALS[0].password,
          newPassword: "New12345!",
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await client.post("/auth/login", {
          email: DEMO_CREDENTIALS[0].email,
          password: "New12345!",
        })
      ).status,
    ).toBe(200);
    const wallet = await api.post<Wallet>("/wallets", {
      name: "Secundaria",
      address: `0x${"3".repeat(40)}`,
      network: "polygon",
      isPrimary: true,
    });
    expect(wallet.status).toBe(201);
    expect(
      (await api.get<{ items: Wallet[] }>("/wallets")).data.items.filter(
        (item) => item.isPrimary,
      ),
    ).toHaveLength(1);
    expect(
      (
        await api.post("/wallets", {
          name: "Terceira",
          address: `0x${"4".repeat(40)}`,
          network: "ethereum",
          isPrimary: false,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api.post(`/wallets/${wallet.data.id}/connection`, {
          action: "refuse",
        })
      ).data.connection,
    ).toBe("refused");
  });
});

describe("checkout invariants", () => {
  it("creates one order for concurrent retries and rejects a changed request", async () => {
    const { api } = await login();
    const { input, headers } = await checkout(api);
    expect((await api.post("/orders", input)).status).toBe(422);
    const responses = await Promise.all([
      api.post<Order>("/orders", input, { headers }),
      api.post<Order>("/orders", input, { headers }),
    ]);
    expect(responses[0].data.id).toBe(responses[1].data.id);
    const reordered = {
      collector: { email: input.collector.email, name: input.collector.name },
      walletId: input.walletId,
      quoteId: input.quoteId,
    };
    expect(
      (await api.post<Order>("/orders", reordered, { headers })).data.id,
    ).toBe(responses[0].data.id);
    expect(Object.keys(readState().orders)).toHaveLength(1);
    expect(
      (
        await api.post(
          "/orders",
          { ...input, collector: { ...input.collector, name: "Different" } },
          { headers },
        )
      ).status,
    ).toBe(409);
    expect(
      (await api.post("/orders", { ...input, unexpected: true }, { headers }))
        .status,
    ).toBe(409);
    await confirmed(api, responses[0].data.id);
  });
  it("recovers the same order after an actual Axios timeout", async () => {
    const { api } = await login();
    const { input, headers } = await checkout(api);
    configureMocks({ timeoutMs: 100, paymentDelayMs: 10 });
    await expect(
      api.post("/orders", input, {
        timeout: 30,
        headers: { ...headers, "X-Mock-Scenario": "timeout-after-create" },
      }),
    ).rejects.toMatchObject({ code: "ECONNABORTED" });
    const retry = await api.post<Order>("/orders", input, { headers });
    expect(retry.status).toBe(200);
    expect(Object.keys(readState().orders)).toEqual([retry.data.id]);
    await confirmed(api, retry.data.id);
    await new Promise((resolve) => setTimeout(resolve, 110));
  });
  it.each(["price-changed", "edition-sold-out"])(
    "rejects stale checkout in %s",
    async (scenario) => {
      const { api } = await login();
      const { input, headers } = await checkout(api);
      const response = await api.post("/orders", input, {
        headers: { ...headers, "X-Mock-Scenario": scenario },
      });
      expect(response.status).toBe(409);
      expect(Object.keys(readState().orders)).toHaveLength(0);
      expect((await api.get<Cart>("/cart")).data.items).toHaveLength(1);
    },
  );
  it("confirms immutable receipts and removes only purchased quantities", async () => {
    const { api } = await login();
    const { input, headers, quote } = await checkout(api);
    const order = (await api.post<Order>("/orders", input, { headers })).data;
    await api.patch("/cart/items/001/edition-1", { quantity: 2 });
    await api.post("/cart/items", {
      nftId: "002",
      editionId: "edition-1",
      quantity: 1,
    });
    await confirmed(api, order.id);
    expect((await api.get<Cart>("/cart")).data.items).toEqual([
      { nftId: "001", editionId: "edition-1", quantity: 1 },
      { nftId: "002", editionId: "edition-1", quantity: 1 },
    ]);
    await client.post("/__mock/nfts/001", { priceEth: "9.99" });
    const receipt = (await api.get<Order>(`/orders/${order.id}`)).data;
    expect(receipt.quote).toEqual(quote);
    expect(receipt.transactionId).toBeTruthy();
    const other = await login(1);
    expect((await other.api.get(`/orders/${order.id}`)).status).toBe(404);
    await client.post(`/__mock/orders/${order.id}/settle`, {
      status: "refused",
    });
    expect((await api.get<Order>(`/orders/${order.id}`)).data.status).toBe(
      "confirmed",
    );
  });
  it("preserves cart on refusal and recovers the persisted refusal plan", async () => {
    const { api } = await login();
    const { input, headers } = await checkout(api);
    configureMocks({ paymentDelayMs: 30 });
    const order = (
      await api.post<Order>("/orders", input, {
        headers: { ...headers, "X-Mock-Scenario": "payment-refused" },
      })
    ).data;
    clearMockTimers();
    recoverPendingOrders();
    expect(
      (await confirmed(api, order.id, "refused")).transactionId,
    ).toBeNull();
    expect((await api.get<Cart>("/cart")).data.items).toHaveLength(1);
    await client.post(`/__mock/orders/${order.id}/settle`, {
      status: "confirmed",
    });
    expect((await api.get<Order>(`/orders/${order.id}`)).data.status).toBe(
      "refused",
    );
  });
  it("reserves pending inventory so two users cannot oversell", async () => {
    await client.post("/__mock/nfts/001", { available: 1 });
    const ana = await login();
    const bruno = await login(1);
    const first = await checkout(ana.api);
    const second = await checkout(bruno.api);
    expect(
      (
        await ana.api.post("/orders", first.input, {
          headers: { ...first.headers, "X-Mock-Scenario": "pending" },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await bruno.api.post("/orders", second.input, {
          headers: second.headers,
        })
      ).status,
    ).toBe(409);
  });
});

describe("real socket.io-client intercepted by MSW binding", () => {
  it("social account switching revokes the previous token and actual Socket.IO subscription", async () => {
    const ana = await login();
    await ana.api.put("/favorites/001");
    const socket = await connect(ana.session.token);
    const response = await ana.api.post<Session>("/auth/social/facebook", {
      accountId: "facebook-demo-user-bruno",
    });
    expect(response.status).toBe(200);
    expect(response.data.user.id).toBe("user-bruno");
    await vi.waitFor(() => expect(socket.connected).toBe(false));
    expect((await ana.api.get("/profile")).status).toBe(401);
    const headers = { Authorization: `Bearer ${response.data.token}` };
    expect(
      (await client.get("/favorites", { headers })).data.nftIds,
    ).not.toContain("001");
    expect(
      (
        await client.get<{ items: Wallet[] }>("/wallets", { headers })
      ).data.items.every((wallet) => wallet.userId === "user-bruno"),
    ).toBe(true);
    await resetMocks();
    configureMocks({ latencyMs: 0 });
    expect((await client.get("/auth/session", { headers })).status).toBe(401);
  });
  it("delivers NFT events, duplicate IDs and old versions through Socket.IO", async () => {
    const socket = await connect();
    const events: NftUpdatedEvent[] = [];
    socket.on("nft.updated", (event) => events.push(event));
    await client.post("/__mock/nfts/001", {
      priceEth: "1.500000000000000001",
      duplicate: true,
      stale: true,
    });
    await vi.waitFor(() => expect(events).toHaveLength(4));
    expect(events.map((event) => event.version)).toEqual([2, 2, 2, 1]);
    expect(events[1].eventId).toBe(events[2].eventId);
    expect(events[0].data.priceEth).toBe("1.500000000000000001");
    expect((await client.get<NFT>("/nfts/001")).data.version).toBe(2);
  });
  it("delivers private order events only to the current user's subscribed socket", async () => {
    const ana = await login();
    const bruno = await login(1);
    const anaSocket = await connect(ana.session.token);
    const brunoSocket = await connect(bruno.session.token);
    const anaEvents: Order[] = [];
    const otherEvents: Order[] = [];
    anaSocket.on("order.updated", (event) => anaEvents.push(event.data));
    brunoSocket.on("order.updated", (event) => otherEvents.push(event.data));
    const { input, headers } = await checkout(ana.api);
    const order = (await ana.api.post<Order>("/orders", input, { headers }))
      .data;
    await vi.waitFor(() => expect(anaEvents.at(-1)?.status).toBe("confirmed"));
    expect(otherEvents).toHaveLength(0);
    expect(anaEvents[0].id).toBe(order.id);
    await ana.api.post("/auth/logout");
    await vi.waitFor(() => expect(anaSocket.connected).toBe(false));
  });
  it("recovers a pending order via REST after socket interruption without another purchase", async () => {
    const { api, session } = await login();
    const socket = await connect(session.token);
    const { input, headers } = await checkout(api);
    const order = (
      await api.post<Order>("/orders", input, {
        headers: { ...headers, "X-Mock-Scenario": "pending" },
      })
    ).data;
    socket.disconnect();
    await client.post(`/__mock/orders/${order.id}/settle`, {
      status: "confirmed",
    });
    await connect(session.token);
    expect((await api.get<Order>(`/orders/${order.id}`)).data.status).toBe(
      "confirmed",
    );
    expect((await api.post<Order>("/orders", input, { headers })).data.id).toBe(
      order.id,
    );
    expect(Object.keys(readState().orders)).toHaveLength(1);
  });
  it("reset restores fixtures and removes all private state and connections", async () => {
    const { api, session } = await login();
    const socket = await connect(session.token);
    await api.put("/favorites/001");
    await client.post("/__mock/nfts/001", { priceEth: "9" });
    await client.post("/__mock/reset");
    configureMocks({ latencyMs: 0 });
    await vi.waitFor(() => expect(socket.connected).toBe(false));
    expect((await api.get("/profile")).status).toBe(401);
    expect((await client.get<NFT>("/nfts/001")).data.priceEth).toBe("1.48");
    expect(readState().orders).toEqual({});
    expect(readState().sessions).toEqual({});
  });
  it("revokes an expired session and prevents an in-flight private response after logout", async () => {
    const { api, session } = await login();
    const socket = await connect(session.token);
    const request = api.get("/profile", {
      headers: { "X-Mock-Scenario": "slow" },
    });
    await api.post("/auth/logout");
    expect((await request).status).toBe(401);
    await vi.waitFor(() => expect(socket.connected).toBe(false));
    const next = await login();
    expect(
      (
        await next.api.get("/profile", {
          headers: { "X-Mock-Scenario": "session-expired" },
        })
      ).status,
    ).toBe(401);
    expect((await next.api.get("/profile")).status).toBe(401);
  });
  it("account switch closes the previous subscription and invalidates its token", async () => {
    const ana = await login();
    const socket = await connect(ana.session.token);
    const bruno = await ana.api.post<Session>(
      "/auth/login",
      DEMO_CREDENTIALS[1],
    );
    expect(bruno.data.user.id).toBe("user-bruno");
    expect((await ana.api.get("/profile")).status).toBe(401);
    await vi.waitFor(() => expect(socket.connected).toBe(false));
  });
  it("discards a previous scenario's mutation still in flight during reset", async () => {
    const request = client.post(
      "/cart/items",
      { nftId: "001", editionId: "edition-1", quantity: 1 },
      { headers: { "X-Mock-Scenario": "slow" } },
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    await client.post("/__mock/reset");
    expect((await request).data.error.code).toBe("SCENARIO_RESET");
    configureMocks({ latencyMs: 0 });
    expect((await client.get<Cart>("/cart")).data.items).toHaveLength(0);
  });
});
