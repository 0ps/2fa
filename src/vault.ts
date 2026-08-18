import type { TotpAlgorithm } from "./totp";

export const SESSION_KEY = "totpSessionCards";
export const VAULT_KEY = "totpLocalVault";

export interface PersistedCard {
  name: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
}

export interface VaultPayload {
  cards: PersistedCard[];
  timeOffset: number;
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

export function dedupePersistedCards(cards: PersistedCard[]): PersistedCard[] {
  const seen = new Set<string>();
  const out: PersistedCard[] = [];
  for (const raw of cards) {
    const secret = typeof raw.secret === "string" ? raw.secret : "";
    if (!secret.trim()) continue;
    const key = normalizeSecret(secret);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: typeof raw.name === "string" ? raw.name : "",
      secret,
      algorithm: isAlgorithm(raw.algorithm) ? raw.algorithm : "SHA-1",
      digits: raw.digits === 8 ? 8 : 6,
      period: sanitizePeriod(raw.period),
    });
  }
  return out;
}

export function parseVaultJson(raw: string | null): VaultPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return { cards: dedupePersistedCards(data as PersistedCard[]), timeOffset: 0 };
    }
    if (!data || typeof data !== "object") return null;
    const rec = data as { cards?: unknown; timeOffset?: unknown };
    const cards = Array.isArray(rec.cards) ? dedupePersistedCards(rec.cards as PersistedCard[]) : [];
    return { cards, timeOffset: clampOffset(Number(rec.timeOffset) || 0) };
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
): void {
  if (!storage) return;
  const payload: VaultPayload = {
    cards: dedupePersistedCards(cards),
    timeOffset: clampOffset(timeOffset),
  };
  storage.setItem(key, JSON.stringify(payload));
}

export function pickStoredPayload(
  local: VaultPayload | null,
  session: VaultPayload | null,
): { payload: VaultPayload; from: "local" | "session" } | null {
  if (local && local.cards.length) return { payload: local, from: "local" };
  if (session && session.cards.length) return { payload: session, from: "session" };
  return null;
}
