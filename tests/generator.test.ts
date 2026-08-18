import { describe, expect, it } from "vitest";
import { codeToCopy, formatLocalClock } from "../src/generator";
import { t } from "../src/i18n";

describe("codeToCopy", () => {
  it("copies the live code while there is time left", () => {
    expect(codeToCopy(5, "910926", "111222")).toEqual({ value: "910926", isNext: false });
    expect(codeToCopy(3, "910926", "111222")).toEqual({ value: "910926", isNext: false });
  });

  it("copies the next code in the last two seconds", () => {
    expect(codeToCopy(2, "910926", "111222")).toEqual({ value: "111222", isNext: true });
    expect(codeToCopy(1, "910926", "111222")).toEqual({ value: "111222", isNext: true });
  });

  it("keeps the current code if next is a placeholder", () => {
    expect(codeToCopy(1, "910926", "------")).toEqual({ value: "910926", isNext: false });
  });
});

describe("formatLocalClock", () => {
  it("formats HH:MM:SS from a local Date", () => {
    expect(formatLocalClock(new Date(2026, 7, 18, 13, 43, 5))).toBe("13:43:05");
    expect(formatLocalClock(new Date(2026, 7, 18, 9, 3, 7))).toBe("09:03:07");
  });
});

describe("i18n copy interpolation", () => {
  it("includes the digits in en and zh", () => {
    expect(t("en", "genCopied", { code: "910926" })).toBe("Copied 910926");
    expect(t("zh", "genCopied", { code: "910926" })).toBe("已复制 910926");
    expect(t("en", "genCopiedNext", { code: "111222" })).toBe("Copied next 111222");
    expect(t("zh", "genCopiedNext", { code: "111222" })).toBe("已复制下一组 111222");
  });
});
