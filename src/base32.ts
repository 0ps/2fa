const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/[\s\-]+/g, "").replace(/=+$/g, "");
}

export function decodeBase32(input: string): Uint8Array {
  const normalized = normalizeBase32(input);
  if (normalized.length === 0) {
    throw new Error("empty secret");
  }
  if (normalized.length > 256) {
    throw new Error("secret too long");
  }
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of normalized) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) {
      throw new Error("invalid base32 character");
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function isPlausibleBase32(input: string): boolean {
  try {
    decodeBase32(input);
    return true;
  } catch {
    return false;
  }
}
