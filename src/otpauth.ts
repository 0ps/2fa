import type { TotpAlgorithm } from "./totp";

export interface OtpAuthTotp {
  type: "totp";
  secret: string;
  label: string;
  issuer: string;
  account: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
}

function parseAlgorithm(raw: string | null): TotpAlgorithm {
  const n = (raw || "SHA1").toUpperCase().replace(/-/g, "").replace(/\s+/g, "");
  if (n === "SHA256") return "SHA-256";
  if (n === "SHA512") return "SHA-512";
  return "SHA-1";
}

export function isOtpAuthUri(value: string): boolean {
  return /^\s*otpauth:\/\//i.test(value);
}

export function parseOtpAuth(uri: string): OtpAuthTotp {
  const raw = uri.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid otpauth URI");
  }
  if (url.protocol !== "otpauth:") {
    throw new Error("not an otpauth URI");
  }
  const kind = (url.host || url.hostname || "").toLowerCase();
  if (kind !== "totp") {
    throw new Error("only totp URIs are supported");
  }
  const path = decodeURIComponent((url.pathname || "").replace(/^\//, ""));
  let issuer = url.searchParams.get("issuer") || "";
  let account = path;
  const colon = path.indexOf(":");
  if (colon >= 0) {
    const pathIssuer = path.slice(0, colon).trim();
    account = path.slice(colon + 1).replace(/^\/+/, "").trim();
    if (!issuer) issuer = pathIssuer;
  }
  const secret = url.searchParams.get("secret");
  if (!secret) {
    throw new Error("missing secret");
  }
  const digitsN = Number(url.searchParams.get("digits") || 6);
  const digits: 6 | 8 = digitsN === 8 ? 8 : 6;
  const periodN = Number(url.searchParams.get("period") || 30);
  const period = Number.isFinite(periodN) && periodN > 0 ? periodN : 30;
  return {
    type: "totp",
    secret,
    label: path || issuer || account,
    issuer,
    account,
    algorithm: parseAlgorithm(url.searchParams.get("algorithm")),
    digits,
    period,
  };
}

export function displayNameFromOtpAuth(parsed: OtpAuthTotp): string {
  return parsed.issuer || parsed.label || parsed.account;
}
