import { describe, expect, it } from "vitest";
import {
  VAULT_KEY,
  SESSION_KEY,
  cardMatchesQuery,
  dedupePersistedCards,
  fillOrAddAction,
  filterCardsByQuery,
  hasDuplicateSecret,
  loadVault,
  matchingCardIndex,
  mergeBackupCards,
  normalizeSecret,
  pickStoredPayload,
  saveVault,
  sortPinnedFirst,
  vaultBackupJson,
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

describe("pinned cards", () => {
  it("sorts pinned cards first and keeps relative order", () => {
    const cards = [
      card("AAAA", "one"),
      { ...card("BBBB", "two"), pinned: true },
      card("CCCC", "three"),
      { ...card("DDDD", "four"), pinned: true },
    ];
    expect(sortPinnedFirst(cards).map((c) => c.name)).toEqual(["two", "four", "one", "three"]);
  });

  it("keeps pinned through save, load, and dedupe", () => {
    const storage = memStorage();
    saveVault(storage, VAULT_KEY, [{ ...card("AAAA", "mail"), pinned: true }, card("", "empty")], 0);
    expect(loadVault(storage, VAULT_KEY)?.cards).toEqual([{ ...card("AAAA", "mail"), pinned: true }]);
    expect(dedupePersistedCards([{ ...card("JBSW Y3DH", "one"), pinned: true }, card("jbsw-y3dh", "two")])).toEqual([
      { ...card("JBSW Y3DH", "one"), pinned: true },
    ]);
  });
});

describe("selectedSecret", () => {
  it("round-trips the selected secret as a normalized key", () => {
    const storage = memStorage();
    saveVault(storage, VAULT_KEY, [card("AAAA", "a"), card("BBBB", "b")], 0, "bb bb");
    const loaded = loadVault(storage, VAULT_KEY);
    expect(loaded?.selectedSecret).toBe("BBBB");
    expect(matchingCardIndex(loaded!.cards, loaded!.selectedSecret)).toBe(1);
  });

  it("falls back to the first card when that secret is gone", () => {
    expect(matchingCardIndex([card("AAAA"), card("BBBB")], "CCCC")).toBe(0);
    expect(matchingCardIndex([card("AAAA"), card("BBBB")])).toBe(0);
  });

  it("loads old payloads without pinned or selectedSecret", () => {
    const storage = memStorage();
    storage.setItem(VAULT_KEY, JSON.stringify({ cards: [card("AAAA", "mail")], timeOffset: 3 }));
    expect(loadVault(storage, VAULT_KEY)).toEqual({ cards: [card("AAAA", "mail")], timeOffset: 3 });
  });

  it("omits selectedSecret when the matching card is empty", () => {
    const storage = memStorage();
    saveVault(storage, VAULT_KEY, [card("", "gone")], 0, "AAAA");
    expect(JSON.parse(storage.data[VAULT_KEY])).toEqual({ cards: [], timeOffset: 0 });
  });
});

describe("search filter", () => {
  it("matches name case-insensitively and treats empty query as all", () => {
    expect(cardMatchesQuery("GitHub", "")).toBe(true);
    expect(cardMatchesQuery("GitHub", "git")).toBe(true);
    expect(cardMatchesQuery("邮箱 SSO", "sso")).toBe(true);
    expect(cardMatchesQuery("GitHub", "mail")).toBe(false);
  });

  it("hides empty-secret cards when the query is non-empty", () => {
    const cards = [card("AAAA", "mail"), card("", "ghost"), card("BBBB", "work")];
    expect(filterCardsByQuery(cards, "mail").map((c) => c.name)).toEqual(["mail"]);
    expect(filterCardsByQuery(cards, "").map((c) => c.name)).toEqual(["mail", "ghost", "work"]);
  });
});

describe("backup merge", () => {
  it("adds new secrets and updates name/pin on an existing match", () => {
    const merged = mergeBackupCards(
      [card("AAAA", "old")],
      [{ ...card("AAAA", "new"), pinned: true }, card("BBBB", "added")],
    );
    expect(merged).toEqual([{ ...card("AAAA", "new"), pinned: true }, card("BBBB", "added")]);
  });

  it("fills an empty slot and skips adding a second copy of a normalized secret", () => {
    expect(mergeBackupCards([card("", "")], [card("AAAA", "mail")])).toEqual([card("AAAA", "mail")]);
    const merged = mergeBackupCards([card("JBSW Y3DH", "one")], [card("jbsw-y3dh", "two")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("two");
  });

  it("drops empty secrets from the backup JSON", () => {
    const json = vaultBackupJson([card("AAAA", "mail"), card("", "x")], 4, "aaaa");
    expect(JSON.parse(json)).toEqual({
      cards: [card("AAAA", "mail")],
      timeOffset: 4,
      selectedSecret: "AAAA",
    });
  });
});
