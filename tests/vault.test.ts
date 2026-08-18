import { describe, expect, it } from "vitest";
import {
  VAULT_KEY,
  SESSION_KEY,
  dedupePersistedCards,
  fillOrAddAction,
  hasDuplicateSecret,
  loadVault,
  normalizeSecret,
  pickStoredPayload,
  saveVault,
  type PersistedCard,
  type StorageLike,
} from "../src/vault";

function memStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

function card(secret: string, name = "a"): PersistedCard {
  return { name, secret, algorithm: "SHA-1", digits: 6, period: 30 };
}

describe("normalizeSecret", () => {
  it("uppercases and strips spaces and hyphens", () => {
    expect(normalizeSecret("jbsw y3dh-ei")).toBe("JBSWY3DHEI");
  });
});

describe("saveVault / loadVault", () => {
  it("round-trips cards and timeOffset through a mock storage object", () => {
    const storage = memStorage();
    saveVault(storage, VAULT_KEY, [card("JBSWY3DPEHPK3PXP", "mail")], -12);
    const loaded = loadVault(storage, VAULT_KEY);
    expect(loaded).toEqual({
      cards: [card("JBSWY3DPEHPK3PXP", "mail")],
      timeOffset: -12,
    });
  });

  it("does not persist empty cards, and writes an empty list so a wipe sticks", () => {
    const storage = memStorage();
    saveVault(storage, VAULT_KEY, [card("JBSWY3DPEHPK3PXP", "mail")], 4);
    saveVault(storage, SESSION_KEY, [card("JBSWY3DPEHPK3PXP", "mail")], 4);
    saveVault(storage, VAULT_KEY, [card("", "gone")], 7);
    saveVault(storage, SESSION_KEY, [card("", "gone")], 7);
    expect(JSON.parse(storage.data[VAULT_KEY])).toEqual({ cards: [], timeOffset: 7 });
    expect(loadVault(storage, VAULT_KEY)?.cards).toEqual([]);
    expect(loadVault(storage, SESSION_KEY)?.cards).toEqual([]);
  });

  it("dedupes by normalized secret when saving", () => {
    const storage = memStorage();
    saveVault(
      storage,
      VAULT_KEY,
      [card("JBSW Y3DH", "one"), card("jbsw-y3dh", "two"), card("OTHERSECRET", "three")],
      0,
    );
    const loaded = loadVault(storage, VAULT_KEY);
    expect(loaded?.cards.map((c) => c.name)).toEqual(["one", "three"]);
  });
});

describe("pickStoredPayload", () => {
  it("prefers local vault when it has cards", () => {
    const picked = pickStoredPayload(
      { cards: [card("AAAA")], timeOffset: 1 },
      { cards: [card("BBBB")], timeOffset: 2 },
    );
    expect(picked?.from).toBe("local");
    expect(picked?.payload.cards[0].secret).toBe("AAAA");
  });

  it("falls back to session when local has no cards", () => {
    const picked = pickStoredPayload({ cards: [], timeOffset: 9 }, { cards: [card("BBBB")], timeOffset: 2 });
    expect(picked?.from).toBe("session");
    expect(picked?.payload.timeOffset).toBe(2);
  });

  it("returns null when both are empty", () => {
    expect(pickStoredPayload({ cards: [], timeOffset: 0 }, null)).toBeNull();
  });
});

describe("fillOrAddAction", () => {
  it("fills an empty card, adds when the current card has a secret, skips duplicates", () => {
    expect(fillOrAddAction(false, false)).toBe("fill");
    expect(fillOrAddAction(true, false)).toBe("add");
    expect(fillOrAddAction(false, true)).toBe("skip");
    expect(fillOrAddAction(true, true)).toBe("skip");
  });
});

describe("hasDuplicateSecret", () => {
  it("matches normalized secrets and ignores empty cards", () => {
    const cards = [card(""), card("JBSW Y3DH")];
    expect(hasDuplicateSecret(cards, "jbsw-y3dh")).toBe(true);
    expect(hasDuplicateSecret(cards, "OTHER")).toBe(false);
  });
});

describe("dedupePersistedCards", () => {
  it("drops empty secrets", () => {
    expect(dedupePersistedCards([card(""), card("ABCD")])).toEqual([card("ABCD")]);
  });
});
