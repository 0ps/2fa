import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeBase32 } from "../src/base32";
import { generateTotp, type TotpAlgorithm } from "../src/totp";

const here = dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(join(here, "../public/rfc6238-test-vectors.json"), "utf8"),
) as {
  digits: number;
  period: number;
  secrets: Record<string, { ascii: string; base32: string }>;
  vectors: Array<{ unix: number; SHA1: string; SHA256: string; SHA512: string }>;
};

const algMap: Record<string, TotpAlgorithm> = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
};

describe("RFC 6238 Appendix B", () => {
  for (const row of vectors.vectors) {
    for (const [shortAlg, algorithm] of Object.entries(algMap)) {
      it(`unix ${row.unix} ${algorithm} => ${row[shortAlg as "SHA1"]}`, async () => {
        const ascii = vectors.secrets[shortAlg].ascii;
        const key = new TextEncoder().encode(ascii);
        const code = await generateTotp(key, {
          algorithm,
          digits: vectors.digits,
          period: vectors.period,
          unixSeconds: row.unix,
        });
        expect(code).toBe(row[shortAlg as "SHA1"]);
      });

      it(`unix ${row.unix} ${algorithm} via Base32 secret`, async () => {
        const key = decodeBase32(vectors.secrets[shortAlg].base32);
        const code = await generateTotp(key, {
          algorithm,
          digits: vectors.digits,
          period: vectors.period,
          unixSeconds: row.unix,
        });
        expect(code).toBe(row[shortAlg as "SHA1"]);
      });
    }
  }
});
