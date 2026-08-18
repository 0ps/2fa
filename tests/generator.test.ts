import { describe, expect, it } from "vitest";
import {
  codeToCopy,
  fileFromImageBlob,
  formatLocalClock,
  imageFileFromPasteData,
  imageFilesFromList,
  imageMimeFromTypes,
  joinOtpAuthUris,
  paramsChipText,
  shouldAutoCopyCode,
} from "../src/generator";
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

describe("paramsChipText", () => {
  it("formats algorithm, digits, and period", () => {
    expect(paramsChipText("SHA-256", 6, 30)).toBe("SHA-256 · 6 · 30s");
    expect(paramsChipText("SHA-1", 8, 60)).toBe("SHA-1 · 8 · 60s");
  });
});

describe("clipboard image helpers", () => {
  it("picks the first image/* MIME type", () => {
    expect(imageMimeFromTypes(["text/plain", "image/png"])).toBe("image/png");
    expect(imageMimeFromTypes(["text/plain"])).toBeUndefined();
  });

  it("wraps a blob as a File for onFile", () => {
    const blob = new Blob(["qr"], { type: "image/png" });
    const file = fileFromImageBlob(blob, "image/png");
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe("image/png");
  });

  it("reads an image from clipboardData.files", () => {
    const image = new File(["png"], "shot.png", { type: "image/png" });
    const text = new File(["txt"], "note.txt", { type: "text/plain" });
    expect(imageFileFromPasteData({ files: [text, image] })).toBe(image);
    expect(imageFileFromPasteData({ files: [text] })).toBeUndefined();
    expect(imageFileFromPasteData(null)).toBeUndefined();
  });

  it("falls back to clipboardData.items when files is empty", () => {
    const image = new File(["png"], "shot.png", { type: "image/png" });
    const items = [{ type: "image/png", getAsFile: () => image }];
    expect(imageFileFromPasteData({ files: [], items })).toBe(image);
  });
});

describe("shouldAutoCopyCode", () => {
  it("copies when a valid code changes", () => {
    expect(shouldAutoCopyCode("", "910926", true)).toBe(true);
    expect(shouldAutoCopyCode("111222", "910926", true)).toBe(true);
  });

  it("skips the same code after paste/scan already copied", () => {
    expect(shouldAutoCopyCode("910926", "910926", true)).toBe(false);
    expect(shouldAutoCopyCode("", "------", false)).toBe(false);
  });
});

describe("joinOtpAuthUris", () => {
  it("joins every otpauth URI with newlines", () => {
    expect(joinOtpAuthUris(["otpauth://totp/A", "otpauth://totp/B"])).toBe("otpauth://totp/A\notpauth://totp/B");
  });
});

describe("i18n polish strings", () => {
  it("mentions pasting a QR screenshot", () => {
    expect(t("en", "pasteHint").toLowerCase()).toContain("screenshot");
    expect(t("zh", "pasteHint")).toContain("截图");
  });

  it("uses a quiet optional name placeholder", () => {
    expect(t("en", "genNameQuiet")).toBe("Name (optional)");
    expect(t("zh", "genNameQuiet")).toBe("名称（可选）");
  });

  it("labels copy-all otpauth links", () => {
    expect(t("en", "copyAllUri")).toBe("Copy all links");
    expect(t("zh", "copyAllUri")).toBe("复制全部链接");
  });
});

describe("imageFilesFromList", () => {
  it("keeps every image and drops non-images", () => {
    const a = new File(["a"], "a.png", { type: "image/png" });
    const b = new File(["b"], "b.jpg", { type: "image/jpeg" });
    const txt = new File(["t"], "note.txt", { type: "text/plain" });
    expect(imageFilesFromList([txt, a, b])).toEqual([a, b]);
    expect(imageFilesFromList([])).toEqual([]);
    expect(imageFilesFromList(null)).toEqual([]);
  });
});

describe("i18n vault and upload strings", () => {
  it("says keys stay on this device until deleted", () => {
    expect(t("en", "sessionHint").toLowerCase()).toContain("until you delete");
    expect(t("zh", "sessionHint")).toContain("直到你自行删除");
  });

  it("does not claim secrets vanish on tab close or skip localStorage", () => {
    expect(t("en", "sessionHint").toLowerCase()).not.toContain("tab");
    expect(t("en", "privacyBanner").toLowerCase()).toContain("localstorage");
    expect(t("en", "privacyBanner").toLowerCase()).toContain("never go to a server");
    expect(t("zh", "privacyBanner")).toContain("localStorage");
    expect(t("zh", "privacyBanner")).toContain("服务器");
  });

  it("labels QR upload and clearing local records", () => {
    expect(t("en", "uploadQr")).toBe("Upload QR");
    expect(t("zh", "uploadQr")).toBe("上传二维码");
    expect(t("zh", "clearVault")).toBe("清除本机记录");
    expect(t("en", "clearVaultConfirm").endsWith("?")).toBe(true);
  });
});

describe("i18n daily workbench strings", () => {
  it("labels account search", () => {
    expect(t("en", "searchAccounts")).toBe("Search accounts");
    expect(t("zh", "searchAccounts")).toBe("搜索账号");
  });

  it("labels pin and backup actions", () => {
    expect(t("en", "pinCard")).toBe("Pin");
    expect(t("zh", "pinCard")).toBe("置顶");
    expect(t("zh", "unpinCard")).toBe("取消置顶");
    expect(t("en", "exportBackup")).toBe("Export backup");
    expect(t("zh", "exportBackup")).toBe("导出备份");
    expect(t("en", "importBackup")).toBe("Import backup");
    expect(t("zh", "importBackup")).toBe("导入备份");
    expect(t("zh", "importBackupConfirm")).toBe("导入会与本机记录合并，重复密钥会跳过。继续？");
    expect(t("en", "importBackupConfirm").endsWith("?")).toBe(true);
  });
});
