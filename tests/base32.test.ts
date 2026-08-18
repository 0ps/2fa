import { describe, expect, it } from "vitest";
import { decodeBase32, encodeBase32, normalizeBase32 } from "../src/base32";

describe("base32", () => {
  it("normalizes spaces, hyphens, and padding", () => {
    expect(normalizeBase32("gezd gnbv-gy3t====")).toBe("GEZDGNBVGY3T");
  });

  it("decodes the RFC 4226/6238 SHA-1 secret", () => {
    const bytes = decodeBase32("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(new TextDecoder().decode(bytes)).toBe("12345678901234567890");
  });

  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 2, 250, 255, 16, 32]);
    const encoded = encodeBase32(original);
    expect(decodeBase32(encoded)).toEqual(original);
  });

  it("rejects characters outside A-Z2-7", () => {
    expect(() => decodeBase32("GEZD1")).toThrow(/invalid/i);
    expect(() => decodeBase32("GEZD!")).toThrow(/invalid/i);
  });

  it("rejects empty input after normalize", () => {
    expect(() => decodeBase32(" --- === ")).toThrow(/empty/i);
  });

  it("rejects secrets longer than 256 characters after normalize", () => {
    const tooLong = "A".repeat(257);
    expect(() => decodeBase32(tooLong)).toThrow(/too long/i);
    expect(decodeBase32("A".repeat(256)).length).toBeGreaterThan(0);
  });
});
