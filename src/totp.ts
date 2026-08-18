export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpOptions {
  algorithm?: TotpAlgorithm;
  digits?: number;
  period?: number;
  unixSeconds: number;
}

function counterBytes(unixSeconds: number, period: number): Uint8Array {
  const counter = BigInt(Math.floor(unixSeconds / period));
  const buf = new Uint8Array(8);
  let n = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return buf;
}

function dynamicTruncate(hmacResult: Uint8Array, digits: number): string {
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binCode =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(binCode % mod).padStart(digits, "0");
}

export async function hmacSign(
  algorithm: TotpAlgorithm,
  keyBytes: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, data as BufferSource);
  return new Uint8Array(sig);
}

export async function generateTotp(
  keyBytes: Uint8Array,
  options: TotpOptions,
): Promise<string> {
  const algorithm = options.algorithm ?? "SHA-1";
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const counter = counterBytes(options.unixSeconds, period);
  const digest = await hmacSign(algorithm, keyBytes, counter);
  return dynamicTruncate(digest, digits);
}

export function remainingSeconds(unixSeconds: number, period: number): number {
  const used = unixSeconds % period;
  return used === 0 ? period : period - used;
}
