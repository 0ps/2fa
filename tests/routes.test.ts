import { describe, expect, it } from "vitest";
import { ROUTES, reservedPathSet } from "../src/routes";

const required = [
  "/",
  "/site-map",
  "/privacy",
  "/about",
  "/what-is-totp",
  "/2fa-vs-mfa",
  "/totp-vs-hotp",
  "/2fa-setup-key-guide",
  "/2fa-code-not-working",
  "/compatible-authenticator-apps",
  "/test-totp-token",
  "/2fa-backup-codes",
  "/2fa-secret-url",
  "/online-totp-generator",
  "/2fa-generator",
  "/totp-generator",
  "/totp-code-generator",
  "/2fa-code-generator",
  "/authenticator-app-code-generator",
  "/chatgpt-authenticator-app",
  "/time-based-one-time-password-generator",
  "/google-authenticator-code-generator",
  "/microsoft-authenticator-code-generator",
  "/mfa-code-generator",
  "/authenticator-setup-key",
  "/2fa-qr-code-setup-key",
  "/cannot-scan-2fa-qr-code",
  "/otpauth-qr-code-reader",
  "/authenticator-qr-code-reader",
  "/authenticator-setup-key-to-code",
  "/mfa-token-generator",
  "/base32-secret-totp",
  "/otpauth-totp-generator",
  "/totp-parameters",
  "/8-digit-totp-generator",
  "/sha256-totp-generator",
  "/sha512-totp-generator",
  "/2fa-secret-to-code",
  "/free-otp-generator",
  "/authenticator-code-generator",
  "/google-authenticator-online",
  "/two-factor-authentication-code-generator",
  "/online-one-time-password-generator",
  "/otp-code-generator",
];

describe("routes", () => {
  it("registers every required path with unique H1 and titles", () => {
    const paths = ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of required) {
      const route = ROUTES.find((r) => r.path === path);
      expect(route, path).toBeTruthy();
      expect(route!.h1.en.length).toBeGreaterThan(8);
      expect(route!.h1.zh.length).toBeGreaterThan(2);
      expect(route!.titles.en.length).toBeGreaterThan(3);
      expect(route!.faq.en.length).toBeGreaterThan(0);
    }
  });

  it("defaults 8-digit and sha pages", () => {
    expect(ROUTES.find((r) => r.path === "/8-digit-totp-generator")!.defaults).toEqual({
      algorithm: "SHA-1",
      digits: 8,
      period: 30,
    });
    expect(ROUTES.find((r) => r.path === "/sha256-totp-generator")!.defaults?.algorithm).toBe("SHA-256");
    expect(ROUTES.find((r) => r.path === "/sha512-totp-generator")!.defaults?.algorithm).toBe("SHA-512");
  });

  it("reserves well-known files", () => {
    const reserved = reservedPathSet();
    expect(reserved.has("/robots.txt")).toBe(true);
    expect(reserved.has("/rfc6238-test-vectors.json")).toBe(true);
    expect(reserved.has("/totp-generator")).toBe(true);
  });
});
