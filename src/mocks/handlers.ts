import { delay, http, HttpResponse, type HttpHandler } from "msw";
import type {
  CartItem,
  CreateOrderRequest,
  Credentials,
  Network,
  NftListResponse,
  Order,
  ProfileUpdate,
  Registration,
  SocialAccountsResponse,
  SocialLoginRequest,
  SocialProvider,
  WalletInput,
} from "../types";
import { categoryIds, networkOptions } from "../services/catalog-options";
import {
  apiError,
  applyNetwork,
  getMockConfig,
  getScenario,
} from "./scenarios";
import {
  cartFor,
  findSession,
  hashPassword,
  mockGeneration,
  now,
  readState,
  timestamp,
  transact,
} from "./state";
import {
  buildQuote,
  couponDiscount,
  DomainError,
  getNft,
  mergeVisitorCart,
  publicNft,
  publishAvailability,
  quoteFingerprint,
  remaining,
  requireValue,
  scheduleSettlement,
  updateMockNft,
  validateEmail,
  validateName,
  validateNetwork,
  validatePassword,
  validateQuantity,
} from "./domain";
import { disconnectMockSockets, emitOrderUpdated } from "./socket";
import { fromWei, toWei } from "./money";
import { socialIdentities } from "./fixtures";

function socialProvider(value: unknown): SocialProvider {
  requireValue(
    value === "google" || value === "facebook",
    422,
    "INVALID_SOCIAL_PROVIDER",
    "Provedor de autenticacao invalido",
  );
  return value;
}

const tokenFor = (request: Request) =>
  request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? null;
const requestGenerations = new WeakMap<Request, number>();
function assertCurrentRequest(request: Request) {
  requireValue(
    requestGenerations.get(request) === mockGeneration(),
    409,
    "SCENARIO_RESET",
    "Requisicao de um cenario anterior descartada",
  );
}
function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry !== null && typeof entry === "object")
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, normalize(value)]),
      );
    return entry;
  };
  return JSON.stringify(normalize(value));
}
function sessionFor(request: Request) {
  assertCurrentRequest(request);
  const session = findSession(tokenFor(request));
  requireValue(session, 401, "SESSION_INVALID", "Autenticacao necessaria");
  return session;
}
function guestFor(request: Request) {
  const id = request.headers.get("X-Guest-Id");
  requireValue(
    id && /^[a-zA-Z0-9-]{8,80}$/.test(id),
    422,
    "GUEST_ID_REQUIRED",
    "Envie X-Guest-Id estavel",
  );
  return id;
}
function ownerFor(request: Request) {
  assertCurrentRequest(request);
  if (tokenFor(request)) return sessionFor(request).user.id;
  return `guest:${guestFor(request)}`;
}
async function body<T>(request: Request): Promise<T> {
  try {
    const value = await request.json();
    requireValue(
      value && typeof value === "object" && !Array.isArray(value),
      400,
      "INVALID_JSON",
      "Corpo JSON invalido",
    );
    return value as T;
  } catch {
    throw new DomainError(400, "INVALID_JSON", "Corpo JSON invalido");
  }
}
type RouteContext = {
  request: Request;
  params: Record<string, string | readonly string[] | undefined>;
};
function endpoint(
  method: "get" | "post" | "patch" | "put" | "delete",
  path: string,
  resolver: (context: RouteContext) => Response | Promise<Response>,
): HttpHandler {
  return http[method](`*/api${path}`, async (context) => {
    try {
      requestGenerations.set(context.request, mockGeneration());
      const failure = await applyNetwork(context.request);
      if (failure) return failure;
      assertCurrentRequest(context.request);
      // Recheck authentication after latency to catch logout/expiry in flight.
      return await resolver(context);
    } catch (error) {
      if (error instanceof DomainError)
        return apiError(
          error.status,
          error.code,
          error.message,
          error.fields,
          error.details,
        );
      throw error;
    }
  });
}
function createSession(userId: string, request: Request) {
  assertCurrentRequest(request);
  const token = crypto.randomUUID();
  return transact((state) => {
    // Revoke sessions of the previous account on an explicit account switch.
    const previousToken = tokenFor(request);
    if (previousToken) {
      delete state.sessions[previousToken];
      disconnectMockSockets(previousToken);
    }
    const user = state.accounts.find(
      (account) => account.user.id === userId,
    )!.user;
    const expiresAt = new Date(now() + 60 * 60_000).toISOString();
    state.sessions[token] = { userId, expiresAt };
    const guest = request.headers.get("X-Guest-Id");
    if (guest) mergeVisitorCart(state, guest, userId);
    return { token, user, expiresAt };
  });
}
function positiveInteger(value: string | null, fallback: number, max: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  requireValue(
    Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max,
    422,
    "VALIDATION",
    "Paginacao invalida",
  );
  return parsed;
}
function validateWallet(input: WalletInput) {
  validateName(input.name);
  validateNetwork(input.network);
  if (input.provider !== undefined)
    requireValue(
      ["metamask", "walletconnect", "coinbase"].includes(input.provider),
      422,
      "VALIDATION",
      "Tipo de carteira invalido",
      { provider: "Selecione um tipo de carteira valido" },
    );
  requireValue(
    typeof input.address === "string" && /^0x[\da-f]{40}$/i.test(input.address),
    422,
    "VALIDATION",
    "Endereco invalido",
    { address: "Informe um endereco hexadecimal de 40 digitos" },
  );
  requireValue(
    typeof input.isPrimary === "boolean",
    422,
    "VALIDATION",
    "isPrimary deve ser boolean",
  );
}
function validateIdentity(input: { username?: string; ens?: string }) {
  if (input.username !== undefined && input.username !== "")
    requireValue(
      typeof input.username === "string" &&
        /^[a-zA-Z0-9_]{3,30}$/.test(input.username),
      422,
      "VALIDATION",
      "Nome de usuario invalido",
      { username: "Use 3 a 30 letras, numeros ou underscore" },
    );
  if (input.ens !== undefined && input.ens !== "")
    requireValue(
      typeof input.ens === "string" && /^[a-z0-9-]+\.eth$/i.test(input.ens),
      422,
      "VALIDATION",
      "Nome ENS invalido",
      { ens: "Informe um nome terminado em .eth" },
    );
}

export const restHandlers: HttpHandler[] = [
  endpoint("post", "/auth/register", async ({ request }) => {
    const input = await body<Registration>(request);
    validateEmail(input.email);
    validateName(input.name);
    validatePassword(input.password);
    validateIdentity(input);
    const email = input.email.toLowerCase().trim();
    if (getScenario(request) === "registration-conflict")
      throw new DomainError(409, "EMAIL_CONFLICT", "Email ja cadastrado", {
        email: "Email ja cadastrado",
      });
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password, salt);
    assertCurrentRequest(request);
    const user = transact((state) => {
      requireValue(
        !state.accounts.some((account) => account.user.email === email),
        409,
        "EMAIL_CONFLICT",
        "Email ja cadastrado",
        { email: "Email ja cadastrado" },
      );
      const user = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        email,
        username: input.username ?? "",
        ens: "",
        avatarUrl: null,
        createdAt: timestamp(),
        version: 1,
      };
      state.accounts.push({ user, salt, passwordHash });
      state.favorites[user.id] = [];
      return user;
    });
    return HttpResponse.json(createSession(user.id, request), { status: 201 });
  }),
  endpoint("post", "/auth/login", async ({ request }) => {
    const input = await body<Credentials>(request);
    validateEmail(input.email);
    requireValue(
      typeof input.password === "string",
      422,
      "VALIDATION",
      "Informe a senha",
      { password: "Informe a senha" },
    );
    const account = readState().accounts.find(
      (item) => item.user.email === input.email.toLowerCase().trim(),
    );
    requireValue(
      account &&
        (await hashPassword(input.password, account.salt)) ===
          account.passwordHash,
      401,
      "INVALID_CREDENTIALS",
      "Email ou senha incorretos",
    );
    return HttpResponse.json(createSession(account.user.id, request));
  }),
  endpoint("get", "/auth/social/:provider/accounts", ({ params }) => {
    const provider = socialProvider(params.provider);
    return HttpResponse.json<SocialAccountsResponse>({
      provider,
      simulated: true,
      accounts: socialIdentities[provider].map(({ id, name, email }) => ({
        id,
        name,
        email,
      })),
    });
  }),
  endpoint("post", "/auth/social/:provider", async ({ request, params }) => {
    const provider = socialProvider(params.provider);
    const input = await body<SocialLoginRequest>(request);
    const identity = socialIdentities[provider].find(
      (account) => account.id === input.accountId,
    );
    requireValue(
      identity &&
        readState().accounts.some(
          (account) => account.user.id === identity.userId,
        ),
      422,
      "INVALID_SOCIAL_ACCOUNT",
      "Selecione uma conta de demonstracao deste provedor",
    );
    return HttpResponse.json(createSession(identity.userId, request));
  }),
  endpoint("get", "/auth/session", ({ request }) =>
    HttpResponse.json(sessionFor(request)),
  ),
  endpoint("post", "/auth/logout", ({ request }) => {
    const token = tokenFor(request);
    if (token) {
      transact((state) => {
        delete state.sessions[token];
      });
      disconnectMockSockets(token);
    }
    return new HttpResponse(null, { status: 204 });
  }),
  endpoint("post", "/auth/expire", ({ request }) => {
    const session = sessionFor(request);
    transact((state) => {
      delete state.sessions[session.token];
    });
    disconnectMockSockets(session.token);
    return new HttpResponse(null, { status: 204 });
  }),
  endpoint("get", "/nfts", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = positiveInteger(params.get("page"), 1, 100_000);
    const pageSize = positiveInteger(params.get("pageSize"), 6, 100);
    const sort = params.get("sort") ?? "recent";
    requireValue(
      ["recent", "price-asc", "price-desc", "title"].includes(sort),
      422,
      "VALIDATION",
      "Ordenacao invalida",
    );
    const categories = params
      .getAll("categories")
      .flatMap((value) => value.split(","))
      .filter(Boolean);
    const networks = params
      .getAll("networks")
      .flatMap((value) => value.split(","))
      .filter(Boolean);
    requireValue(
      networks.every((network) =>
        networkOptions.some((option) => option.id === network),
      ),
      422,
      "VALIDATION",
      "Rede invalida",
    );
    let min: bigint | undefined, max: bigint | undefined;
    try {
      min = params.has("minPrice") ? toWei(params.get("minPrice")!) : undefined;
      max = params.has("maxPrice") ? toWei(params.get("maxPrice")!) : undefined;
    } catch {
      throw new DomainError(
        422,
        "VALIDATION",
        "Preco deve ser string decimal",
        { price: "Informe ETH com ate 18 casas decimais" },
      );
    }
    requireValue(
      min === undefined || max === undefined || min <= max,
      422,
      "VALIDATION",
      "Intervalo de preco invalido",
    );
    const q = (params.get("q") ?? "").trim().toLowerCase();
    const state = readState();
    const source = getScenario(request) === "empty" ? [] : state.nfts;
    let items = source.filter((nft) => {
      const price = toWei(nft.priceEth);
      return (
        `${nft.title} ${nft.description} ${nft.creator}`
          .toLowerCase()
          .includes(q) &&
        categories.every((category) => nft.categories.includes(category)) &&
        (!networks.length || networks.includes(nft.network)) &&
        (min === undefined || price >= min) &&
        (max === undefined || price <= max) &&
        (params.get("available") !== "true" ||
          nft.editions.some((e) => remaining(state, nft.id, e.id) > 0))
      );
    });
    items.sort((a, b) => {
      if (sort === "title")
        return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
      if (sort === "recent")
        return (
          b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
        );
      const delta = toWei(a.priceEth) - toWei(b.priceEth);
      return (
        (delta < 0n ? -1 : delta > 0n ? 1 : a.id.localeCompare(b.id)) *
        (sort === "price-desc" ? -1 : 1)
      );
    });
    const total = items.length;
    items = items
      .slice((page - 1) * pageSize, page * pageSize)
      .map((nft) => publicNft(state, nft));
    return HttpResponse.json<NftListResponse>({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      facets: {
        categories: Object.fromEntries(
          categoryIds.map((id) => [
            id,
            source.filter((nft) => nft.categories.includes(id)).length,
          ]),
        ),
        networks: {
          ethereum: source.filter((nft) => nft.network === "ethereum").length,
          polygon: source.filter((nft) => nft.network === "polygon").length,
          solana: source.filter((nft) => nft.network === "solana").length,
        },
      },
    });
  }),
  endpoint("get", "/nfts/:id", ({ params }) => {
    const state = readState();
    return HttpResponse.json(
      publicNft(state, getNft(state, String(params.id))),
    );
  }),
  endpoint("get", "/favorites", ({ request }) => {
    const userId = sessionFor(request).user.id;
    return HttpResponse.json({ nftIds: readState().favorites[userId] ?? [] });
  }),
  endpoint("put", "/favorites/:id", ({ request, params }) => {
    const userId = sessionFor(request).user.id;
    const nftId = String(params.id);
    transact((state) => {
      getNft(state, nftId);
      const favorites = (state.favorites[userId] ??= []);
      if (!favorites.includes(nftId)) favorites.push(nftId);
    });
    return HttpResponse.json({ userId, nftId });
  }),
  endpoint("delete", "/favorites/:id", ({ request, params }) => {
    const userId = sessionFor(request).user.id;
    transact((state) => {
      state.favorites[userId] = (state.favorites[userId] ?? []).filter(
        (id) => id !== params.id,
      );
    });
    return new HttpResponse(null, { status: 204 });
  }),
  endpoint("get", "/cart", ({ request }) => {
    const owner = ownerFor(request);
    return HttpResponse.json(transact((state) => cartFor(state, owner)));
  }),
  endpoint("post", "/cart/items", async ({ request }) => {
    const input = await body<CartItem>(request);
    const owner = ownerFor(request);
    return HttpResponse.json(
      transact((state) => {
        const cart = cartFor(state, owner);
        const existing = cart.items.find(
          (item) =>
            item.nftId === input.nftId && item.editionId === input.editionId,
        );
        requireValue(
          Number.isSafeInteger(input.quantity) && input.quantity > 0,
          422,
          "VALIDATION",
          "Quantidade invalida",
        );
        const quantity = (existing?.quantity ?? 0) + input.quantity;
        validateQuantity(state, input.nftId, input.editionId, quantity);
        if (existing) existing.quantity = quantity;
        else
          cart.items.push({
            nftId: input.nftId,
            editionId: input.editionId,
            quantity,
          });
        cart.version++;
        return cart;
      }),
      { status: 201 },
    );
  }),
  endpoint(
    "patch",
    "/cart/items/:nftId/:editionId",
    async ({ request, params }) => {
      const input = await body<{ quantity: number }>(request);
      const owner = ownerFor(request);
      return HttpResponse.json(
        transact((state) => {
          const cart = cartFor(state, owner);
          const item = cart.items.find(
            (item) =>
              item.nftId === params.nftId &&
              item.editionId === params.editionId,
          );
          requireValue(item, 404, "CART_ITEM_NOT_FOUND", "Item nao encontrado");
          validateQuantity(state, item.nftId, item.editionId, input.quantity);
          item.quantity = input.quantity;
          cart.version++;
          return cart;
        }),
      );
    },
  ),
  endpoint("delete", "/cart/items/:nftId/:editionId", ({ request, params }) => {
    const owner = ownerFor(request);
    return HttpResponse.json(
      transact((state) => {
        const cart = cartFor(state, owner);
        cart.items = cart.items.filter(
          (item) =>
            item.nftId !== params.nftId || item.editionId !== params.editionId,
        );
        cart.version++;
        return cart;
      }),
    );
  }),
  endpoint("put", "/cart/coupon", async ({ request }) => {
    const input = await body<{ code: string }>(request);
    const owner = ownerFor(request);
    requireValue(
      typeof input.code === "string",
      422,
      "VALIDATION",
      "Codigo invalido",
    );
    const scenario = getScenario(request);
    const code =
      scenario === "expired-coupon"
        ? "EXPIRED"
        : scenario === "invalid-coupon"
          ? "INVALID"
          : input.code.trim().toUpperCase();
    couponDiscount(code);
    return HttpResponse.json(
      transact((state) => {
        const cart = cartFor(state, owner);
        cart.couponCode = code;
        cart.version++;
        return cart;
      }),
    );
  }),
  endpoint("delete", "/cart/coupon", ({ request }) => {
    const owner = ownerFor(request);
    return HttpResponse.json(
      transact((state) => {
        const cart = cartFor(state, owner);
        cart.couponCode = null;
        cart.version++;
        return cart;
      }),
    );
  }),
  endpoint("post", "/cart/quote", async ({ request }) => {
    const input = await body<{ network: Network }>(request);
    const owner = ownerFor(request);
    return HttpResponse.json(
      transact((state) => {
        const quote = buildQuote(
          state,
          owner,
          owner.startsWith("guest:") ? null : owner,
          input.network,
        );
        state.quotes[quote.id] = quote;
        return quote;
      }),
    );
  }),
  endpoint("post", "/orders", async ({ request }) => {
    const input = await body<CreateOrderRequest>(request);
    const session = sessionFor(request);
    const key = request.headers.get("Idempotency-Key");
    requireValue(
      key &&
        /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
          key,
        ),
      422,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Envie Idempotency-Key UUID v4",
    );
    requireValue(
      typeof input.quoteId === "string" &&
        typeof input.walletId === "string" &&
        input.collector,
      422,
      "VALIDATION",
      "Dados do pedido invalidos",
    );
    validateName(input.collector.name);
    validateEmail(input.collector.email);
    validateIdentity(input.collector);
    if (input.collector.profileName !== undefined)
      requireValue(
        typeof input.collector.profileName === "string" &&
          input.collector.profileName.trim().length >= 2 &&
          input.collector.profileName.length <= 80,
        422,
        "VALIDATION",
        "Nome do perfil invalido",
        { profileName: "Use entre 2 e 80 caracteres" },
      );
    if (
      input.collector.referralCode !== undefined &&
      input.collector.referralCode !== ""
    )
      requireValue(
        typeof input.collector.referralCode === "string" &&
          /^[a-zA-Z0-9_-]{1,30}$/.test(input.collector.referralCode),
        422,
        "VALIDATION",
        "Codigo de indicacao invalido",
        { referralCode: "Use ate 30 letras, numeros, hifen ou underscore" },
      );
    if (input.collector.notes !== undefined)
      requireValue(
        typeof input.collector.notes === "string" &&
          input.collector.notes.length <= 500,
        422,
        "VALIDATION",
        "Observacao deve ter ate 500 caracteres",
      );
    const fingerprint = canonicalJson(input);
    const scopedKey = `${session.user.id}:${key}`;
    const existing = readState().attempts[scopedKey];
    if (existing) {
      requireValue(
        existing.fingerprint === fingerprint,
        409,
        "IDEMPOTENCY_CONFLICT",
        "Chave reutilizada com conteudo diferente",
      );
      return HttpResponse.json(readState().orders[existing.orderId]);
    }
    const scenario = getScenario(request);
    const snapshot = readState().quotes[input.quoteId];
    requireValue(
      snapshot?.userId === session.user.id,
      404,
      "QUOTE_NOT_FOUND",
      "Cotacao nao encontrada",
    );
    if (scenario === "price-changed") {
      const item = snapshot.items[0];
      updateMockNft(item.nftId, {
        priceEth: fromWei(
          toWei(getNft(readState(), item.nftId).priceEth) + toWei("0.1"),
        ),
      });
    }
    if (scenario === "edition-sold-out")
      updateMockNft(snapshot.items[0].nftId, {
        editionId: snapshot.items[0].editionId,
        available: 0,
      });
    const order = transact((state) => {
      // Concurrent retries must check again inside the transaction.
      const attempt = state.attempts[scopedKey];
      if (attempt) {
        requireValue(
          attempt.fingerprint === fingerprint,
          409,
          "IDEMPOTENCY_CONFLICT",
          "Chave reutilizada",
        );
        return state.orders[attempt.orderId];
      }
      requireValue(
        Date.parse(snapshot.expiresAt) > now(),
        409,
        "QUOTE_EXPIRED",
        "Revalide a cotacao",
      );
      const latest = buildQuote(
        state,
        session.user.id,
        session.user.id,
        snapshot.network,
      );
      requireValue(
        quoteFingerprint(snapshot) === quoteFingerprint(latest),
        409,
        "QUOTE_CHANGED",
        "Preco, cupom, taxa ou carrinho alterado; confirme uma nova cotacao",
      );
      const wallet = state.wallets.find(
        (item) => item.id === input.walletId && item.userId === session.user.id,
      );
      requireValue(wallet, 404, "WALLET_NOT_FOUND", "Carteira nao encontrada");
      requireValue(
        wallet.network === snapshot.network &&
          wallet.connection === "connected",
        409,
        "WALLET_DISCONNECTED",
        "Carteira indisponivel para pagamento na rede selecionada",
      );
      const order: Order = {
        id: crypto.randomUUID(),
        userId: session.user.id,
        status: "pending",
        quote: structuredClone(snapshot),
        wallet: structuredClone(wallet),
        collector: structuredClone(input.collector),
        transactionId: null,
        explorerUrl: null,
        refusalReason: null,
        version: 1,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      state.orders[order.id] = order;
      state.attempts[scopedKey] = { fingerprint, orderId: order.id };
      state.settlements[order.id] = {
        refused: scenario === "payment-refused",
        automatic: scenario !== "pending",
        dueAt: now() + getMockConfig().paymentDelayMs,
      };
      return order;
    });
    publishAvailability(order.quote.items.map((item) => item.nftId));
    emitOrderUpdated(order);
    if (scenario !== "pending")
      scheduleSettlement(
        order.id,
        scenario === "payment-refused",
        getMockConfig().paymentDelayMs,
      );
    if (scenario === "timeout-after-create") {
      await delay(getMockConfig().timeoutMs);
      return apiError(
        504,
        "TIMEOUT_AFTER_CREATE",
        "Resposta perdida. Reenvie a mesma tentativa com a mesma chave.",
      );
    }
    return HttpResponse.json(order, { status: 201 });
  }),
  endpoint("get", "/orders", ({ request }) => {
    const userId = sessionFor(request).user.id;
    return HttpResponse.json({
      items: Object.values(readState().orders).filter(
        (order) => order.userId === userId,
      ),
    });
  }),
  endpoint("get", "/orders/:id", ({ request, params }) => {
    const userId = sessionFor(request).user.id;
    const order = readState().orders[String(params.id)];
    requireValue(
      order?.userId === userId,
      404,
      "ORDER_NOT_FOUND",
      "Pedido nao encontrado",
    );
    return HttpResponse.json(order);
  }),
  endpoint("get", "/profile", ({ request }) =>
    HttpResponse.json(sessionFor(request).user),
  ),
  endpoint("patch", "/profile", async ({ request }) => {
    const input = await body<ProfileUpdate>(request);
    const userId = sessionFor(request).user.id;
    if (input.name !== undefined) validateName(input.name);
    if (input.email !== undefined) validateEmail(input.email);
    validateIdentity(input);
    if (input.avatarUrl !== undefined && input.avatarUrl !== null)
      requireValue(
        typeof input.avatarUrl === "string" &&
          (/^https?:\/\//.test(input.avatarUrl) ||
            /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(
              input.avatarUrl,
            )),
        422,
        "VALIDATION",
        "Avatar invalido",
        { avatarUrl: "Use imagem PNG, JPEG ou WebP" },
      );
    return HttpResponse.json(
      transact((state) => {
        const user = state.accounts.find(
          (account) => account.user.id === userId,
        )!.user;
        const email = input.email?.toLowerCase().trim();
        requireValue(
          !email ||
            !state.accounts.some(
              (account) =>
                account.user.id !== userId && account.user.email === email,
            ),
          409,
          "EMAIL_CONFLICT",
          "Email ja cadastrado",
          { email: "Email ja cadastrado" },
        );
        if (input.name !== undefined) user.name = input.name.trim();
        if (email !== undefined) user.email = email;
        if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
        if (input.username !== undefined) user.username = input.username;
        if (input.ens !== undefined) user.ens = input.ens;
        user.version++;
        return user;
      }),
    );
  }),
  endpoint("put", "/profile/password", async ({ request }) => {
    const input = await body<{ currentPassword: string; newPassword: string }>(
      request,
    );
    const session = sessionFor(request);
    validatePassword(input.newPassword);
    const account = readState().accounts.find(
      (item) => item.user.id === session.user.id,
    )!;
    requireValue(
      typeof input.currentPassword === "string" &&
        (await hashPassword(input.currentPassword, account.salt)) ===
          account.passwordHash,
      422,
      "CURRENT_PASSWORD_INVALID",
      "Senha atual incorreta",
      { currentPassword: "Senha atual incorreta" },
    );
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(input.newPassword, salt);
    sessionFor(request);
    transact((state) => {
      const current = state.accounts.find(
        (item) => item.user.id === session.user.id,
      )!;
      current.salt = salt;
      current.passwordHash = passwordHash;
    });
    return new HttpResponse(null, { status: 204 });
  }),
  endpoint("get", "/wallets", ({ request }) => {
    const userId = sessionFor(request).user.id;
    return HttpResponse.json({
      items: readState().wallets.filter((wallet) => wallet.userId === userId),
    });
  }),
  ...(["post", "patch"] as const).map((method) =>
    endpoint(
      method,
      method === "post" ? "/wallets" : "/wallets/:id",
      async ({ request, params }) => {
        const input = await body<WalletInput>(request);
        const userId = sessionFor(request).user.id;
        validateWallet(input);
        return HttpResponse.json(
          transact((state) => {
            const owned = state.wallets.filter(
              (wallet) => wallet.userId === userId,
            );
            const existing =
              method === "patch"
                ? owned.find((wallet) => wallet.id === params.id)
                : undefined;
            if (method === "patch")
              requireValue(
                existing,
                404,
                "WALLET_NOT_FOUND",
                "Carteira nao encontrada",
              );
            requireValue(
              !owned.some(
                (wallet) =>
                  wallet.id !== existing?.id &&
                  wallet.address.toLowerCase() ===
                    input.address.toLowerCase() &&
                  wallet.network === input.network,
              ),
              409,
              "WALLET_CONFLICT",
              "Carteira ja cadastrada",
            );
            requireValue(
              existing || owned.length < 2,
              409,
              "WALLET_LIMIT",
              "Cadastre no maximo duas carteiras",
            );
            const wallet = {
              id: existing?.id ?? crypto.randomUUID(),
              userId,
              name: input.name.trim(),
              address: input.address,
              network: input.network,
              isPrimary: owned.length === 0 || input.isPrimary,
              provider: input.provider ?? existing?.provider ?? "metamask",
              connection: "disconnected" as const,
              version: (existing?.version ?? 0) + 1,
            };
            if (existing?.isPrimary && !wallet.isPrimary)
              requireValue(
                owned.some(
                  (entry) => entry.id !== existing.id && entry.isPrimary,
                ),
                422,
                "PRIMARY_REQUIRED",
                "Defina outra carteira principal primeiro",
              );
            if (wallet.isPrimary)
              for (const item of owned)
                if (item.id !== wallet.id && item.isPrimary) {
                  item.isPrimary = false;
                  item.version++;
                }
            if (existing) Object.assign(existing, wallet);
            else state.wallets.push(wallet);
            return wallet;
          }),
          { status: method === "post" ? 201 : 200 },
        );
      },
    ),
  ),
  endpoint("post", "/wallets/:id/connection", async ({ request, params }) => {
    const input = await body<{ action: "connect" | "disconnect" | "refuse" }>(
      request,
    );
    const userId = sessionFor(request).user.id;
    requireValue(
      ["connect", "disconnect", "refuse"].includes(input.action),
      422,
      "VALIDATION",
      "Acao invalida",
    );
    const wallet = transact((state) => {
      const wallet = state.wallets.find(
        (item) => item.id === params.id && item.userId === userId,
      );
      requireValue(wallet, 404, "WALLET_NOT_FOUND", "Carteira nao encontrada");
      wallet.connection =
        input.action === "refuse" || getScenario(request) === "wallet-refused"
          ? "refused"
          : input.action === "connect"
            ? "connected"
            : "disconnected";
      wallet.version++;
      return wallet;
    });
    return HttpResponse.json(wallet);
  }),
];
