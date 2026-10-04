import type { Network, NFT, Order, Quote } from "../types";
import { coupons } from "./fixtures";
import { fromWei, toWei } from "./money";
import {
  cartFor,
  now,
  readState,
  timestamp,
  transact,
  type MockState,
} from "./state";
import { emitNftUpdated, emitOrderUpdated, nftEvent } from "./socket";

export class DomainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function requireValue(
  condition: unknown,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): asserts condition {
  if (!condition) throw new DomainError(status, code, message, fields);
}
export function validateEmail(email: unknown): asserts email is string {
  requireValue(
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    422,
    "VALIDATION",
    "Email invalido",
    { email: "Informe um email valido" },
  );
}
export function validatePassword(
  password: unknown,
): asserts password is string {
  requireValue(
    typeof password === "string" &&
      password.length >= 8 &&
      /[a-z]/i.test(password) &&
      /\d/.test(password),
    422,
    "VALIDATION",
    "Senha invalida",
    { password: "Use ao menos 8 caracteres, letras e numeros" },
  );
}
export function validateName(name: unknown): asserts name is string {
  requireValue(
    typeof name === "string" &&
      name.trim().length >= 2 &&
      name.trim().length <= 100,
    422,
    "VALIDATION",
    "Nome invalido",
    { name: "Informe de 2 a 100 caracteres" },
  );
}
export function validateNetwork(network: unknown): asserts network is Network {
  requireValue(
    network === "ethereum" || network === "polygon",
    422,
    "VALIDATION",
    "Rede invalida",
    { network: "Selecione uma rede" },
  );
}
export function getNft(state: MockState, id: string): NFT {
  const nft = state.nfts.find((item) => item.id === id);
  requireValue(nft, 404, "NFT_NOT_FOUND", "NFT nao encontrado");
  return nft;
}
export function remaining(
  state: MockState,
  nftId: string,
  editionId: string,
): number {
  const edition = getNft(state, nftId).editions.find(
    (item) => item.id === editionId,
  );
  requireValue(edition, 404, "EDITION_NOT_FOUND", "Edicao nao encontrada");
  const reserved = Object.values(state.orders)
    .filter((order) => order.status === "pending")
    .flatMap((order) => order.quote.items)
    .filter((item) => item.nftId === nftId && item.editionId === editionId)
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, edition.available - reserved);
}
export function publicNft(state: MockState, nft: NFT): NFT {
  return {
    ...structuredClone(nft),
    editions: nft.editions.map((edition) => ({
      ...edition,
      available: remaining(state, nft.id, edition.id),
    })),
  };
}
export function publishAvailability(nftIds: string[]) {
  const updated = transact((state) =>
    [...new Set(nftIds)].map((id) => {
      const nft = getNft(state, id);
      nft.version++;
      nft.updatedAt = timestamp();
      return publicNft(state, nft);
    }),
  );
  for (const nft of updated) emitNftUpdated(nftEvent(nft));
}
export function validateQuantity(
  state: MockState,
  nftId: string,
  editionId: string,
  quantity: unknown,
): asserts quantity is number {
  requireValue(
    typeof quantity === "number" &&
      Number.isSafeInteger(quantity) &&
      quantity > 0,
    422,
    "VALIDATION",
    "Quantidade invalida",
    { quantity: "Informe um inteiro positivo" },
  );
  const edition = getNft(state, nftId).editions.find(
    (item) => item.id === editionId,
  );
  requireValue(edition, 404, "EDITION_NOT_FOUND", "Edicao nao encontrada");
  requireValue(
    quantity <= edition.maxPerOrder &&
      quantity <= remaining(state, nftId, editionId),
    409,
    "AVAILABILITY_CONFLICT",
    "Quantidade indisponivel",
  );
}
export function couponDiscount(code: string | null): number {
  if (!code) return 0;
  const coupon = coupons.find((item) => item.code === code);
  requireValue(coupon, 422, "COUPON_INVALID", "Cupom invalido", {
    couponCode: "Cupom nao encontrado",
  });
  requireValue(
    Date.parse(coupon.expiresAt) > now(),
    410,
    "COUPON_EXPIRED",
    "Cupom expirado",
    { couponCode: "Este cupom expirou" },
  );
  return coupon.discountBasisPoints;
}
export function buildQuote(
  state: MockState,
  owner: string,
  userId: string | null,
  network: Network,
): Quote {
  validateNetwork(network);
  const cart = cartFor(state, owner);
  requireValue(cart.items.length > 0, 422, "EMPTY_CART", "Carrinho vazio");
  const items = cart.items.map((item) => {
    validateQuantity(state, item.nftId, item.editionId, item.quantity);
    const nft = getNft(state, item.nftId);
    const edition = nft.editions.find((entry) => entry.id === item.editionId)!;
    return {
      ...item,
      title: nft.title,
      imageUrl: nft.imageUrl,
      editionLabel: edition.label,
      nftVersion: nft.version,
      unitPriceEth: nft.priceEth,
      lineTotalEth: fromWei(toWei(nft.priceEth) * BigInt(item.quantity)),
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + toWei(item.lineTotalEth),
    0n,
  );
  const discount =
    (subtotal * BigInt(couponDiscount(cart.couponCode))) / 10_000n;
  const fee = network === "ethereum" ? "0.03" : "0.001";
  return {
    id: crypto.randomUUID(),
    userId,
    cartVersion: cart.version,
    network,
    items,
    couponCode: cart.couponCode,
    subtotalEth: fromWei(subtotal),
    discountEth: fromWei(discount),
    networkFeeEth: fee,
    totalEth: fromWei(subtotal - discount + toWei(fee)),
    createdAt: timestamp(),
    expiresAt: new Date(now() + 5 * 60_000).toISOString(),
  };
}
export function quoteFingerprint(quote: Quote): string {
  return JSON.stringify({
    userId: quote.userId,
    cartVersion: quote.cartVersion,
    network: quote.network,
    items: quote.items,
    couponCode: quote.couponCode,
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
  });
}
export function mergeVisitorCart(
  state: MockState,
  guestId: string,
  userId: string,
): void {
  const guest = state.carts[`guest:${guestId}`];
  if (!guest) return;
  const target = cartFor(state, userId);
  for (const item of guest.items) {
    const existing = target.items.find(
      (entry) =>
        entry.nftId === item.nftId && entry.editionId === item.editionId,
    );
    const edition = getNft(state, item.nftId).editions.find(
      (entry) => entry.id === item.editionId,
    );
    if (!edition) continue;
    const quantity = Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      edition.maxPerOrder,
      remaining(state, item.nftId, item.editionId),
    );
    if (quantity > 0) {
      if (existing) existing.quantity = quantity;
      else target.items.push({ ...item, quantity });
    }
  }
  if (!target.couponCode) target.couponCode = guest.couponCode;
  target.version++;
  delete state.carts[`guest:${guestId}`];
}

const timers = new Set<ReturnType<typeof setTimeout>>();
export function clearMockTimers() {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}
export function scheduleSettlement(
  id: string,
  refused: boolean,
  milliseconds: number,
) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    settleOrder(id, refused ? "refused" : "confirmed");
  }, milliseconds);
  timers.add(timer);
}
export function settleOrder(
  id: string,
  status: "confirmed" | "refused",
): Order {
  let transitioned = false;
  const order = transact((state) => {
    const order = state.orders[id];
    requireValue(order, 404, "ORDER_NOT_FOUND", "Pedido nao encontrado");
    if (order.status !== "pending") return order;
    transitioned = true;
    // Availability may have been changed externally after the reservation.
    const hasStock = order.quote.items.every(
      (item) =>
        getNft(state, item.nftId).editions.find((e) => e.id === item.editionId)!
          .available >= item.quantity,
    );
    order.status = hasStock ? status : "refused";
    order.refusalReason =
      order.status === "refused"
        ? hasStock
          ? "PAYMENT_REFUSED"
          : "AVAILABILITY_CONFLICT"
        : null;
    order.version++;
    order.updatedAt = timestamp();
    if (order.status === "confirmed") {
      order.transactionId = `simulated-${order.id}`;
      order.explorerUrl = `https://example.com/simulated-transactions/${order.id}`;
      const cart = cartFor(state, order.userId);
      for (const item of order.quote.items) {
        const nft = getNft(state, item.nftId);
        nft.editions.find((e) => e.id === item.editionId)!.available -=
          item.quantity;
        const current = cart.items.find(
          (entry) =>
            entry.nftId === item.nftId && entry.editionId === item.editionId,
        );
        if (current)
          current.quantity = Math.max(0, current.quantity - item.quantity);
      }
      cart.items = cart.items.filter((item) => item.quantity > 0);
      cart.version++;
    }
    return order;
  });
  if (transitioned) {
    publishAvailability(order.quote.items.map((item) => item.nftId));
    emitOrderUpdated(order);
  }
  return order;
}
export function updateMockNft(
  id: string,
  patch: { priceEth?: string; editionId?: string; available?: number },
): NFT {
  if (patch.priceEth !== undefined) toWei(patch.priceEth);
  if (patch.available !== undefined)
    requireValue(
      Number.isSafeInteger(patch.available) && patch.available >= 0,
      422,
      "VALIDATION",
      "Disponibilidade invalida",
    );
  const nft = transact((state) => {
    const nft = getNft(state, id);
    if (patch.priceEth !== undefined) nft.priceEth = patch.priceEth;
    if (patch.available !== undefined) {
      const edition = nft.editions.find(
        (e) => e.id === (patch.editionId ?? "edition-1"),
      );
      requireValue(edition, 404, "EDITION_NOT_FOUND", "Edicao nao encontrada");
      edition.available = patch.available;
    }
    nft.version++;
    nft.updatedAt = timestamp();
    return nft;
  });
  const visible = publicNft(readState(), nft);
  emitNftUpdated(nftEvent(visible));
  return visible;
}
/** On browser refresh, recover pending operations without creating new orders. */
export function recoverPendingOrders() {
  for (const order of Object.values(readState().orders)) {
    const plan = readState().settlements[order.id];
    if (order.status === "pending" && plan?.automatic)
      scheduleSettlement(
        order.id,
        plan.refused,
        Math.max(0, plan.dueAt - now()),
      );
  }
}
