import type { TotpAlgorithm } from "./totp";

export const SESSION_KEY = "totpSessionCards";
export const VAULT_KEY = "totpLocalVault";

export interface PersistedCard {
  name: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
  pinned?: boolean;
}

export interface VaultPayload {
  cards: PersistedCard[];
  timeOffset: number;
  selectedSecret?: string;
}

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type FillOrAddAction = "fill" | "add" | "skip";

export function clampOffset(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(90, Math.max(-90, Math.round(n)));
}

export function normalizeSecret(secret: string): string {
  return secret.toUpperCase().replace(/[\s-]/g, "");
}

export function fillOrAddAction(currentHasSecret: boolean, isDuplicate: boolean): FillOrAddAction {
  if (isDuplicate) return "skip";
  return currentHasSecret ? "add" : "fill";
}

export function hasDuplicateSecret(cards: Array<{ secret: string }>, secret: string): boolean {
  const key = normalizeSecret(secret);
  if (!key) return false;
  return cards.some((card) => Boolean(card.secret.trim()) && normalizeSecret(card.secret) === key);
}

function isAlgorithm(value: unknown): value is TotpAlgorithm {
  return value === "SHA-1" || value === "SHA-256" || value === "SHA-512";
}

function sanitizePeriod(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 30;
  return Math.min(120, Math.max(10, Math.round(value)));
}

function sanitizeCard(raw: PersistedCard, secret: string): PersistedCard {
  const card: PersistedCard = {
    name: typeof raw.name === "string" ? raw.name : "",
    secret,
    algorithm: isAlgorithm(raw.algorithm) ? raw.algorithm : "SHA-1",
    digits: raw.digits === 8 ? 8 : 6,
    period: sanitizePeriod(raw.period),
  };
  if (raw.pinned) card.pinned = true;
  return card;
}

export function dedupePersistedCards(cards: PersistedCard[]): PersistedCard[] {
  const seen = new Set<string>();
  const out: PersistedCard[] = [];
  for (const raw of cards) {
    const secret = typeof raw.secret === "string" ? raw.secret : "";
    if (!secret.trim()) continue;
    const key = normalizeSecret(secret);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(sanitizeCard(raw, secret));
  }
  return out;
}

export function sortPinnedFirst<T extends { pinned?: boolean }>(cards: T[]): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const card of cards) {
    if (card.pinned) pinned.push(card);
    else rest.push(card);
  }
  return [...pinned, ...rest];
}

export function cardMatchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}

export function filterCardsByQuery<T extends { name: string; secret: string }>(cards: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return cards;
  return cards.filter((card) => Boolean(card.secret.trim()) && cardMatchesQuery(card.name, q));
}

export function matchingCardIndex(cards: Array<{ secret: string }>, selectedSecret?: string): number {
  const key = selectedSecret ? normalizeSecret(selectedSecret) : "";
  if (key) {
    const idx = cards.findIndex((card) => Boolean(card.secret.trim()) && normalizeSecret(card.secret) === key);
    if (idx >= 0) return idx;
  }
  return 0;
}

export function mergeBackupCards(current: PersistedCard[], incoming: PersistedCard[]): PersistedCard[] {
  const result: PersistedCard[] = current.map((card) => ({ ...card }));
  for (const card of dedupePersistedCards(incoming)) {
    const key = normalizeSecret(card.secret);
    const existing = result.find((c) => Boolean(c.secret.trim()) && normalizeSecret(c.secret) === key);
    if (existing) {
      if (card.name.trim()) existing.name = card.name;
      if (card.pinned) existing.pinned = true;
      continue;
    }
    const empty = result.find((c) => !c.secret.trim());
    if (empty) {
      empty.name = card.name;
      empty.secret = card.secret;
      empty.algorithm = card.algorithm;
      empty.digits = card.digits;
      empty.period = card.period;
      if (card.pinned) empty.pinned = true;
      else delete empty.pinned;
    } else {
      result.push({ ...card });
    }
  }
  return result;
}

export function buildVaultPayload(
  cards: PersistedCard[],
  timeOffset: number,
  selectedSecret?: string,
): VaultPayload {
  const payload: VaultPayload = {
    cards: dedupePersistedCards(cards),
    timeOffset: clampOffset(timeOffset),
  };
  const key = selectedSecret ? normalizeSecret(selectedSecret) : "";
  if (key && payload.cards.some((card) => normalizeSecret(card.secret) === key)) {
    payload.selectedSecret = key;
  }
  return payload;
}

export function vaultBackupJson(cards: PersistedCard[], timeOffset: number, selectedSecret?: string): string {
  return JSON.stringify(buildVaultPayload(cards, timeOffset, selectedSecret), null, 2);
}

function readSelectedSecret(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const key = normalizeSecret(value);
  return key || undefined;
}

export function parseVaultJson(raw: string | null): VaultPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return { cards: dedupePersistedCards(data as PersistedCard[]), timeOffset: 0 };
    }
    if (!data || typeof data !== "object") return null;
    const rec = data as { cards?: unknown; timeOffset?: unknown; selectedSecret?: unknown };
    const cards = Array.isArray(rec.cards) ? dedupePersistedCards(rec.cards as PersistedCard[]) : [];
    const payload: VaultPayload = { cards, timeOffset: clampOffset(Number(rec.timeOffset) || 0) };
    const selectedSecret = readSelectedSecret(rec.selectedSecret);
    if (selectedSecret) payload.selectedSecret = selectedSecret;
    return payload;
  } catch {
    return null;
  }
}

export function loadVault(storage: StorageLike | null | undefined, key: string): VaultPayload | null {
  if (!storage) return null;
  try {
    return parseVaultJson(storage.getItem(key));
  } catch {
    return null;
  }
}

export function saveVault(
  storage: StorageLike | null | undefined,
  key: string,
  cards: PersistedCard[],
  timeOffset: number,
  selectedSecret?: string,
): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(buildVaultPayload(cards, timeOffset, selectedSecret)));
}

export function pickStoredPayload(
  local: VaultPayload | null,
  session: VaultPayload | null,
): { payload: VaultPayload; from: "local" | "session" } | null {
  if (local && local.cards.length) return { payload: local, from: "local" };
  if (session && session.cards.length) return { payload: session, from: "session" };
  return null;
}
