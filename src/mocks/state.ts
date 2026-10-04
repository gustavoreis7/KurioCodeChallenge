import type { Cart, NFT, Order, Quote, Session, User, Wallet } from "../types";
import { DEMO_CREDENTIALS, nfts, users, wallets } from "./fixtures";

export const STORAGE_KEY = "mutt.mock.database.v1";
export interface Account {
  user: User;
  passwordHash: string;
  salt: string;
}
export interface StoredSession {
  userId: string;
  expiresAt: string;
}
export interface MockState {
  schema: 1;
  accounts: Account[];
  sessions: Record<string, StoredSession>;
  nfts: NFT[];
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  wallets: Wallet[];
  quotes: Record<string, Quote>;
  orders: Record<string, Order>;
  attempts: Record<string, { fingerprint: string; orderId: string }>;
  settlements: Record<
    string,
    { refused: boolean; automatic: boolean; dueAt: number }
  >;
}
let memory: MockState | undefined;
let initialization: Promise<MockState> | undefined;
let nowOverride: number | undefined;
let generation = 0;
export const mockGeneration = () => generation;

export const now = () => nowOverride ?? Date.now();
export const timestamp = () => new Date(now()).toISOString();
export const setMockClock = (iso?: string) => {
  nowOverride = iso === undefined ? undefined : Date.parse(iso);
};

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
function persist(state: MockState) {
  memory = state;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load(): MockState | undefined {
  const value = storage()?.getItem(STORAGE_KEY);
  if (!value) return memory;
  try {
    const parsed: MockState = JSON.parse(value);
    return parsed.schema === 1 && Array.isArray(parsed.accounts)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 100_000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function initialState(): Promise<MockState> {
  const accounts = await Promise.all(
    users.map(async (user, index) => {
      const salt = `fixture-salt-${user.id}`;
      return {
        user: structuredClone(user),
        salt,
        passwordHash: await hashPassword(
          DEMO_CREDENTIALS[index].password,
          salt,
        ),
      };
    }),
  );
  return {
    schema: 1,
    accounts,
    sessions: {},
    nfts: structuredClone(nfts),
    carts: {},
    favorites: { "user-ana": ["002"], "user-bruno": [] },
    wallets: structuredClone(wallets),
    quotes: {},
    orders: {},
    attempts: {},
    settlements: {},
  };
}
export async function initializeMockState(): Promise<MockState> {
  const existing = load();
  if (existing) {
    // Upgrade NFT presentation metadata without resetting persisted business data.
    let changed = false;
    for (const nft of existing.nfts) {
      const artwork = nfts.find((fixture) => fixture.id === nft.id);
      if (artwork && !nft.details) {
        nft.details = structuredClone(artwork.details);
        if (nft.description === "Retrato digital da colecao Mutt Originals.")
          nft.description = artwork.description;
        if (nft.creator === "Mutt Club") nft.creator = artwork.creator;
        if (
          nft.attributes.length === 1 &&
          nft.attributes[0].value === "Originals"
        )
          nft.attributes = structuredClone(artwork.attributes);
        changed = true;
      }
      if (
        artwork?.categories.includes("trending") &&
        !nft.categories.includes("trending")
      ) {
        nft.categories.push("trending");
        changed = true;
      }
      if (artwork && !nft.network) {
        nft.network = artwork.network;
        nft.categories = [
          ...new Set([...nft.categories, ...artwork.categories]),
        ];
        changed = true;
      }
      if (artwork && nft.imageUrl !== artwork.imageUrl) {
        nft.imageUrl = artwork.imageUrl;
        nft.gallery = structuredClone(artwork.gallery);
        changed = true;
      }
    }
    if (changed) persist(existing);
    return existing;
  }
  initialization ??= initialState().then((state) => {
    persist(state);
    return state;
  });
  return initialization;
}
export function readState(): MockState {
  const state = load();
  if (!state) throw new Error("Initialize mock state before starting MSW");
  return structuredClone(state);
}
/** Transactions are synchronous after initialization to avoid lost concurrent writes. */
export function transact<T>(mutate: (state: MockState) => T): T {
  const state = readState();
  const result = mutate(state);
  persist(state);
  return structuredClone(result);
}
export async function resetMockState(): Promise<void> {
  generation++;
  initialization = undefined;
  nowOverride = undefined;
  persist(await initialState());
}
export function findSession(token: string | null): Session | null {
  if (!token) return null;
  const state = readState();
  const stored = state.sessions[token];
  const user =
    stored &&
    state.accounts.find((account) => account.user.id === stored.userId)?.user;
  return user && Date.parse(stored.expiresAt) > now()
    ? { token, expiresAt: stored.expiresAt, user }
    : null;
}
export function cartFor(state: MockState, owner: string): Cart {
  return (state.carts[owner] ??= {
    id: owner,
    items: [],
    couponCode: null,
    version: 1,
  });
}
