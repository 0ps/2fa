import { describe, expect, it } from "vitest";
import { displayNameFromOtpAuth, isOtpAuthUri, parseOtpAuth } from "../src/otpauth";

describe("otpauth parse", () => {
  it("parses a full totp URI", () => {
    const parsed = parseOtpAuth(
      "otpauth://totp/ACME:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME&algorithm=SHA256&digits=8&period=60",
    );
    expect(parsed.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(parsed.issuer).toBe("ACME");
    expect(parsed.account).toBe("alice@example.com");
    expect(parsed.algorithm).toBe("SHA-256");
    expect(parsed.digits).toBe(8);
    expect(parsed.period).toBe(60);
    expect(displayNameFromOtpAuth(parsed)).toBe("ACME");
  });

  it("defaults algorithm, digits, and period", () => {
    const parsed = parseOtpAuth("otpauth://totp/mailbox?secret=MFRGGZDF");
    expect(parsed.algorithm).toBe("SHA-1");
    expect(parsed.digits).toBe(6);
    expect(parsed.period).toBe(30);
    expect(parsed.account).toBe("mailbox");
    expect(displayNameFromOtpAuth(parsed)).toBe("mailbox");
  });

  it("uses path issuer when query issuer is missing", () => {
    const parsed = parseOtpAuth("otpauth://totp/Work:you?secret=MFRGGZDF");
    expect(parsed.issuer).toBe("Work");
    expect(parsed.account).toBe("you");
  });

  it("accepts SHA1 / SHA-512 spellings", () => {
    expect(parseOtpAuth("otpauth://totp/x?secret=MFRGGZDF&algorithm=SHA1").algorithm).toBe("SHA-1");
    expect(parseOtpAuth("otpauth://totp/x?secret=MFRGGZDF&algorithm=SHA-512").algorithm).toBe("SHA-512");
  });

  it("rejects hotp and missing secret", () => {
    expect(() => parseOtpAuth("otpauth://hotp/x?secret=MFRGGZDF")).toThrow(/totp/i);
    expect(() => parseOtpAuth("otpauth://totp/x")).toThrow(/secret/i);
  });

  it("detects otpauth URIs", () => {
    expect(isOtpAuthUri("otpauth://totp/x?secret=AA")).toBe(true);
    expect(isOtpAuthUri("  otpauth://totp/x?secret=AA")).toBe(true);
    expect(isOtpAuthUri("GEZDGNBV")).toBe(false);
  });
});
