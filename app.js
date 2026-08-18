(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../tmp/html-port/base32.ts
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function normalizeBase32(input) {
    return input.toUpperCase().replace(/[\s\-]+/g, "").replace(/=+$/g, "");
  }
  function decodeBase32(input) {
    const normalized = normalizeBase32(input);
    if (normalized.length === 0) {
      throw new Error("empty secret");
    }
    if (normalized.length > 256) {
      throw new Error("secret too long");
    }
    let bits = 0;
    let value = 0;
    const out = [];
    for (const ch of normalized) {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) {
        throw new Error("invalid base32 character");
      }
      value = value << 5 | idx;
      bits += 5;
      if (bits >= 8) {
        out.push(value >>> bits - 8 & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  // ../tmp/html-port/otpauth.ts
  function parseAlgorithm(raw) {
    const n = (raw || "SHA1").toUpperCase().replace(/-/g, "").replace(/\s+/g, "");
    if (n === "SHA256") return "SHA-256";
    if (n === "SHA512") return "SHA-512";
    return "SHA-1";
  }
  function isOtpAuthUri(value) {
    return /^\s*otpauth:\/\//i.test(value);
  }
  function parseOtpAuth(uri) {
    const raw = uri.trim();
    let url;
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
    const digits = digitsN === 8 ? 8 : 6;
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
      period
    };
  }
  function displayNameFromOtpAuth(parsed) {
    return parsed.issuer || parsed.label || parsed.account;
  }
  function algorithmParam(algorithm) {
    if (algorithm === "SHA-256") return "SHA256";
    if (algorithm === "SHA-512") return "SHA512";
    return "SHA1";
  }
  function toOtpAuthUri(card) {
    const secret = card.secret.replace(/\s+/g, "");
    const name = card.name.trim();
    const issuer = (card.issuer ?? name).trim();
    const label = encodeURIComponent(name || issuer || "TOTP");
    const parts = [
      `secret=${encodeURIComponent(secret)}`,
      issuer ? `issuer=${encodeURIComponent(issuer)}` : "",
      `algorithm=${algorithmParam(card.algorithm)}`,
      `digits=${card.digits}`,
      `period=${card.period}`
    ].filter(Boolean);
    return `otpauth://totp/${label}?${parts.join("&")}`;
  }

  // ../tmp/html-port/i18n.ts
  var LANGS = ["zh", "en"];
  var LANG_LABELS = { zh: "简体中文", en: "English" };
  var STORAGE_LANG_KEY = "totpPreferredLanguage";
  function isLang(value) {
    return value === "zh" || value === "en";
  }
  function detectLang(_navLang) {
    return "zh";
  }
  var UI = {
    appName: { en: "Local TOTP", zh: "本地 TOTP" },
    tagline: { en: "One-time codes in this browser. Secrets stay on this device.", zh: "一次性验证码在本浏览器中计算。密钥不会离开这台设备。" },
    skip: { en: "Skip to content", zh: "跳到正文" },
    lang: { en: "Language", zh: "语言" },
    langAuto: { en: "Auto", zh: "自动" },
    genAdd: { en: "+ Add generator", zh: "+ 添加生成器" },
    genName: { en: "Account name (optional)", zh: "账户名称（可选）" },
    genNamePh: { en: "e.g. mailbox or work SSO", zh: "例如邮箱或公司 SSO" },
    genSecret: { en: "Setup key", zh: "设置密钥" },
    genSecretPh: { en: "Base32 secret or otpauth:// URI", zh: "Base32 密钥或 otpauth:// 链接" },
    genOptions: { en: "TOTP options", zh: "TOTP 选项" },
    genDigits: { en: "Digits", zh: "位数" },
    genPeriod: { en: "Period", zh: "周期" },
    genPeriodUnit: { en: "s", zh: "秒" },
    genAlgorithm: { en: "Algorithm", zh: "算法" },
    genPaste: { en: "Paste", zh: "粘贴" },
    genScan: { en: "Scan QR image", zh: "扫描二维码图片" },
    genClear: { en: "Clear", zh: "清除" },
    genDelete: { en: "Remove generator", zh: "删除生成器" },
    genCopied: { en: "Copied {code}", zh: "已复制 {code}" },
    genCopyFail: { en: "Could not copy", zh: "无法复制" },
    genWaiting: { en: "Enter a setup key to generate codes", zh: "输入设置密钥以生成验证码" },
    genInvalid: { en: "That setup key is not valid Base32", zh: "该设置密钥不是有效的 Base32" },
    genLive: { en: "Code is live", zh: "验证码有效" },
    genSeconds: { en: "{n}s remaining", zh: "剩余 {n} 秒" },
    genScanNoApi: { en: "This browser cannot decode QR images (BarcodeDetector is missing). Paste the setup key instead.", zh: "当前浏览器无法解码二维码图片（缺少 BarcodeDetector）。请改为粘贴设置密钥。" },
    genScanNoCode: { en: "No QR code found in that image.", zh: "图片中未找到二维码。" },
    genScanOk: { en: "Read QR payload.", zh: "已读取二维码内容。" },
    genPasteEmpty: { en: "Clipboard was empty.", zh: "剪贴板是空的。" },
    genPasteNeedPerm: { en: "Clipboard permission is required to paste.", zh: "粘贴需要剪贴板权限。" },
    privacyBanner: { en: "Codes are computed with Web Crypto in this browser. Secrets live in this browser's localStorage only; they never go to a server.", zh: "验证码用本浏览器的 Web Crypto 计算。密钥只保存在本机 localStorage，不会上传到服务器。" },
    copyHint: { en: "Click to copy", zh: "点击复制" },
    dropHint: { en: "Ctrl+V to paste a key, or drop a QR here", zh: "Ctrl+V 粘贴密钥，或把二维码拖到这里" },
    emptyCta: { en: "Paste your setup key", zh: "粘贴设置密钥" },
    clockSkew: { en: "Clock", zh: "时间校准" },
    nextCode: { en: "Next {code}", zh: "下一组 {code}" },
    hideSecret: { en: "Hide", zh: "隐藏" },
    showSecret: { en: "Show", zh: "显示" },
    copyUri: { en: "Copy link", zh: "复制链接" },
    showQr: { en: "Show QR", zh: "显示二维码" },
    copyCode: { en: "Copy", zh: "复制" },
    sessionHint: { en: "This browser keeps the keys on this device until you delete them.", zh: "本浏览器会把密钥保存在这台设备上，直到你自行删除。" },
    pasteHint: { en: "Ctrl+V to paste a key or QR screenshot, or drop a QR here", zh: "Ctrl+V 粘贴密钥或二维码截图，或把二维码拖到这里" },
    localClock: { en: "Local {time}", zh: "本机 {time}" },
    camScan: { en: "Scan with camera", zh: "摄像头扫码" },
    camScanStop: { en: "Stop camera", zh: "关闭摄像头" },
    moreActions: { en: "More actions", zh: "更多操作" },
    genCopiedNext: { en: "Copied next {code}", zh: "已复制下一组 {code}" },
    genNameQuiet: { en: "Name (optional)", zh: "名称（可选）" },
    copyAllUri: { en: "Copy all links", zh: "复制全部链接" },
    uploadQr: { en: "Upload QR", zh: "上传二维码" },
    clearVault: { en: "Clear device records", zh: "清除本机记录" },
    clearVaultConfirm: { en: "Delete all setup keys saved in this browser?", zh: "确定清除本机保存的全部设置密钥？" },
    genScanSkipped: { en: "Skipped a duplicate key.", zh: "已跳过重复密钥。" },
    searchAccounts: { en: "Search accounts", zh: "搜索账号" },
    pinCard: { en: "Pin", zh: "置顶" },
    unpinCard: { en: "Unpin", zh: "取消置顶" },
    exportBackup: { en: "Export backup", zh: "导出备份" },
    importBackup: { en: "Import backup", zh: "导入备份" },
    importBackupConfirm: { en: "Import will merge with records on this device. Duplicate keys will be skipped. Continue?", zh: "导入会与本机记录合并，重复密钥会跳过。继续？" },
    footerNote: { en: "Local-first TOTP. No accounts, no ads. Secrets stay in this browser and never go to a server.", zh: "本地优先的 TOTP。无账号、无广告。密钥只留在本浏览器，不会上传服务器。" }
  };
  function t(lang, key, vars) {
    let s = UI[key][lang] || UI[key].en;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  }

  // ../tmp/html-port/totp.ts
  function counterBytes(unixSeconds, period) {
    const counter = BigInt(Math.floor(unixSeconds / period));
    const buf = new Uint8Array(8);
    let n = counter;
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(n & 0xffn);
      n >>= 8n;
    }
    return buf;
  }
  function dynamicTruncate(hmacResult, digits) {
    const offset = hmacResult[hmacResult.length - 1] & 15;
    const binCode = (hmacResult[offset] & 127) << 24 | (hmacResult[offset + 1] & 255) << 16 | (hmacResult[offset + 2] & 255) << 8 | hmacResult[offset + 3] & 255;
    const mod = 10 ** digits;
    return String(binCode % mod).padStart(digits, "0");
  }
  async function hmacSign(algorithm, keyBytes, data) {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, data);
    return new Uint8Array(sig);
  }
  async function generateTotp(keyBytes, options) {
    const algorithm = options.algorithm ?? "SHA-1";
    const digits = options.digits ?? 6;
    const period = options.period ?? 30;
    const counter = counterBytes(options.unixSeconds, period);
    const digest = await hmacSign(algorithm, keyBytes, counter);
    return dynamicTruncate(digest, digits);
  }
  function remainingSeconds(unixSeconds, period) {
    const used = unixSeconds % period;
    return used === 0 ? period : period - used;
  }

  // ../tmp/html-port/qr.ts
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x *= 2;
      if (x & 256) x ^= 285;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();
  function gfMul(a, b) {
    if (!a || !b) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }
  function rsDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 2);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      if (!factor) continue;
      for (let j = 0; j < divisor.length; j++) result[j] ^= gfMul(divisor[j], factor);
    }
    return result;
  }
  var VERS = [[1, 21, 16, 10, 1, 16, 0, 0], [2, 25, 28, 16, 1, 28, 0, 0], [3, 29, 44, 26, 1, 44, 0, 0], [4, 33, 64, 18, 2, 32, 0, 0], [5, 37, 86, 24, 2, 43, 0, 0], [6, 41, 108, 16, 4, 27, 0, 0], [7, 45, 124, 18, 4, 31, 0, 0], [8, 49, 154, 22, 2, 38, 2, 39], [9, 53, 182, 22, 3, 36, 2, 37], [10, 57, 216, 26, 4, 43, 1, 44]];
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  var REMAINDER = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
  var VERSION_BITS = { 7: 31892, 8: 34236, 9: 39577, 10: 42195 };
  function byteCap(row) {
    const cc = row[0] >= 10 ? 16 : 8;
    return Math.floor((row[2] * 8 - 4 - cc - 4) / 8);
  }
  function pickVersion(len) {
    for (const row of VERS) if (byteCap(row) >= len) return row;
    throw new Error("too long");
  }
  function pushBits(bits, n, width) {
    for (let i = width - 1; i >= 0; i--) bits.push(n >> i & 1);
  }
  function encodeData(bytes, row) {
    const version = row[0], dataCw = row[2], bits = [];
    pushBits(bits, 4, 4);
    pushBits(bits, bytes.length, version >= 10 ? 16 : 8);
    for (const b of bytes) pushBits(bits, b, 8);
    const maxBits = dataCw * 8;
    for (let i = 0; i < Math.min(4, maxBits - bits.length); i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const pad = [236, 17];
    let pi = 0;
    while (bits.length < maxBits) {
      pushBits(bits, pad[pi % 2], 8);
      pi++;
    }
    const data = new Uint8Array(dataCw);
    for (let i = 0; i < dataCw; i++) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = v << 1 | bits[i * 8 + j];
      data[i] = v;
    }
    return data;
  }
  function interleave(data, row) {
    const ecPer = row[3], n1 = row[4], d1 = row[5], n2 = row[6], d2 = row[7];
    const blocks = [];
    const div = rsDivisor(ecPer);
    let off = 0;
    for (let i = 0; i < n1; i++) {
      const slice = data.subarray(off, off + d1);
      off += d1;
      blocks.push({ data: slice, ec: rsRemainder(slice, div) });
    }
    for (let i = 0; i < n2; i++) {
      const slice = data.subarray(off, off + d2);
      off += d2;
      blocks.push({ data: slice, ec: rsRemainder(slice, div) });
    }
    const maxD = Math.max(d1, d2);
    const out = [];
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
    for (let i = 0; i < ecPer; i++) for (const b of blocks) out.push(b.ec[i]);
    return new Uint8Array(out);
  }
  function placeFinder(mod, r, c) {
    const n = mod.length;
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const rr = r + y, cc = c + x;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const on = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6) || x >= 2 && x <= 4 && y >= 2 && y <= 4;
      mod[rr][cc] = on ? 1 : 0;
    }
  }
  function placeAlign(mod, cy, cx) {
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const d = Math.max(Math.abs(x), Math.abs(y));
      mod[cy + y][cx + x] = d === 0 || d === 2 ? 1 : 0;
    }
  }
  function reservedMask(size, version) {
    const res = Array.from({ length: size }, () => Array(size).fill(false));
    const mark = (r, c) => {
      if (r >= 0 && c >= 0 && r < size && c < size) res[r][c] = true;
    };
    const block = (r0, c0, h, w) => {
      for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) mark(r, c);
    };
    block(0, 0, 9, 9);
    block(0, size - 8, 9, 8);
    block(size - 8, 0, 8, 9);
    for (let i = 0; i < size; i++) {
      mark(6, i);
      mark(i, 6);
    }
    for (const r of ALIGN[version] || []) for (const c of ALIGN[version] || []) {
      if (r <= 8 && c <= 8 || r <= 8 && c >= size - 9 || r >= size - 9 && c <= 8) continue;
      block(r - 2, c - 2, 5, 5);
    }
    mark(size - 8, 8);
    if (version >= 7) {
      block(0, size - 11, 6, 3);
      block(size - 11, 0, 3, 6);
    }
    return res;
  }
  function setModules(size, version) {
    const mod = Array.from({ length: size }, () => Array(size).fill(0));
    placeFinder(mod, 0, 0);
    placeFinder(mod, 0, size - 7);
    placeFinder(mod, size - 7, 0);
    for (let i = 8; i < size - 8; i++) {
      mod[6][i] = i % 2 === 0 ? 1 : 0;
      mod[i][6] = i % 2 === 0 ? 1 : 0;
    }
    for (const r of ALIGN[version] || []) for (const c of ALIGN[version] || []) {
      if (r <= 8 && c <= 8 || r <= 8 && c >= size - 9 || r >= size - 9 && c <= 8) continue;
      placeAlign(mod, r, c);
    }
    mod[size - 8][8] = 1;
    if (version >= 7) {
      const bits = VERSION_BITS[version];
      for (let i = 0; i < 18; i++) {
        const bit = bits >> i & 1, a = Math.floor(i / 3), b = i % 3;
        mod[a][size - 11 + b] = bit;
        mod[size - 11 + b][a] = bit;
      }
    }
    return mod;
  }
  function maskFn(id, r, c) {
    switch (id) {
      case 0:
        return (r + c) % 2 === 0;
      case 1:
        return r % 2 === 0;
      case 2:
        return c % 3 === 0;
      case 3:
        return (r + c) % 3 === 0;
      case 4:
        return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5:
        return r * c % 2 + r * c % 3 === 0;
      case 6:
        return (r * c % 2 + r * c % 3) % 2 === 0;
      default:
        return ((r + c) % 2 + r * c % 3) % 2 === 0;
    }
  }
  function formatBits(mask) {
    const data = mask;
    let d = data << 10;
    for (let i = 14; i >= 10; i--) if (d >> i & 1) d ^= 1335 << i - 10;
    return (data << 10 | d & 1023) ^ 21522;
  }
  function placeFormat(mod, mask) {
    const bits = formatBits(mask), size = mod.length, seq2 = [];
    for (let i = 0; i <= 5; i++) seq2.push([8, i]);
    seq2.push([8, 7], [8, 8], [7, 8]);
    for (let i = 5; i >= 0; i--) seq2.push([i, 8]);
    const seq22 = [];
    for (let i = 0; i <= 6; i++) seq22.push([size - 1 - i, 8]);
    for (let i = 0; i <= 7; i++) seq22.push([8, size - 8 + i]);
    for (let i = 0; i < 15; i++) {
      const bit = bits >> 14 - i & 1;
      mod[seq2[i][0]][seq2[i][1]] = bit;
      mod[seq22[i][0]][seq22[i][1]] = bit;
    }
  }
  function placeData(mod, reserved, codewords, remainder) {
    const size = mod.length, bits = [];
    for (const b of codewords) for (let i = 7; i >= 0; i--) bits.push(b >> i & 1);
    for (let i = 0; i < remainder; i++) bits.push(0);
    let bi = 0, dir = -1;
    for (let c = size - 1; c > 0; c -= 2) {
      if (c === 6) c--;
      for (let i = 0; i < size; i++) {
        const r = dir < 0 ? size - 1 - i : i;
        for (const cc of [c, c - 1]) {
          if (reserved[r][cc]) continue;
          mod[r][cc] = bi < bits.length ? bits[bi++] : 0;
        }
      }
      dir = -dir;
    }
  }
  function applyMask(mod, reserved, id) {
    const size = mod.length, out = mod.map((row) => row.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!reserved[r][c] && maskFn(id, r, c)) out[r][c] ^= 1;
    return out;
  }
  function penalty(mod) {
    const size = mod.length;
    let score = 0;
    for (let r = 0; r < size; r++) {
      let run = 1;
      for (let c = 1; c <= size; c++) {
        if (c < size && mod[r][c] === mod[r][c - 1]) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      let run = 1;
      for (let r = 1; r <= size; r++) {
        if (r < size && mod[r][c] === mod[r - 1][c]) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
    }
    for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) {
      const v = mod[r][c];
      if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) score += 3;
    }
    const pat = (row, i) => {
      let n = 0;
      for (let k = 0; k < 11; k++) n = n << 1 | row[i + k];
      return n === 1488 || n === 93;
    };
    for (let r = 0; r < size; r++) for (let c = 0; c <= size - 11; c++) if (pat(mod[r], c)) score += 40;
    for (let c = 0; c < size; c++) {
      const col = mod.map((row) => row[c]);
      for (let r = 0; r <= size - 11; r++) if (pat(col, r)) score += 40;
    }
    let dark = 0;
    for (const row of mod) for (const v of row) dark += v;
    score += 10 * Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5);
    return score;
  }
  function encodeMatrix(text) {
    const bytes = new TextEncoder().encode(text);
    const row = pickVersion(bytes.length);
    const version = row[0], size = row[1];
    const codewords = interleave(encodeData(bytes, row), row);
    const reserved = reservedMask(size, version);
    const base = setModules(size, version);
    placeData(base, reserved, codewords, REMAINDER[version]);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const masked = applyMask(base, reserved, mask);
      placeFormat(masked, mask);
      const s = penalty(masked);
      if (s < bestScore) {
        bestScore = s;
        best = masked;
      }
    }
    return best;
  }
  function toDataURL(text, opts) {
    const matrix = encodeMatrix(text);
    const n = matrix.length, quiet = opts?.margin ?? 1, dim = n + quiet * 2;
    let path = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (matrix[y][x]) path += "M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z";
    const w = opts?.width ?? 200;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + dim + '" width="' + w + '" height="' + w + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#111827" d="' + path + '"/></svg>';
    return Promise.resolve("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }

  // ../tmp/html-port/vault.ts
  var SESSION_KEY = "totpSessionCards";
  var VAULT_KEY = "totpLocalVault";
  function clampOffset(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.min(90, Math.max(-90, Math.round(n)));
  }
  function normalizeSecret(secret) {
    return secret.toUpperCase().replace(/[\s-]/g, "");
  }
  function fillOrAddAction(currentHasSecret, isDuplicate) {
    if (isDuplicate) return "skip";
    return currentHasSecret ? "add" : "fill";
  }
  function hasDuplicateSecret(cards, secret) {
    const key = normalizeSecret(secret);
    if (!key) return false;
    return cards.some((card) => Boolean(card.secret.trim()) && normalizeSecret(card.secret) === key);
  }
  function isAlgorithm(value) {
    return value === "SHA-1" || value === "SHA-256" || value === "SHA-512";
  }
  function sanitizePeriod(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 30;
    return Math.min(120, Math.max(10, Math.round(value)));
  }
  function sanitizeCard(raw, secret) {
    const card = {
      name: typeof raw.name === "string" ? raw.name : "",
      secret,
      algorithm: isAlgorithm(raw.algorithm) ? raw.algorithm : "SHA-1",
      digits: raw.digits === 8 ? 8 : 6,
      period: sanitizePeriod(raw.period)
    };
    if (raw.pinned) card.pinned = true;
    return card;
  }
  function dedupePersistedCards(cards) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const raw of cards) {
      const secret = typeof raw.secret === "string" ? raw.secret : "";
      if (!secret.trim()) continue;
      const key = normalizeSecret(secret);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(sanitizeCard(raw, secret));
    }
    return out;
  }
  function sortPinnedFirst(cards) {
    const pinned = [];
    const rest = [];
    for (const card of cards) {
      if (card.pinned) pinned.push(card);
      else rest.push(card);
    }
    return [...pinned, ...rest];
  }
  function cardMatchesQuery(name, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return name.toLowerCase().includes(q);
  }
  function filterCardsByQuery(cards, query) {
    const q = query.trim();
    if (!q) return cards;
    return cards.filter((card) => Boolean(card.secret.trim()) && cardMatchesQuery(card.name, q));
  }
  function matchingCardIndex(cards, selectedSecret) {
    const key = selectedSecret ? normalizeSecret(selectedSecret) : "";
    if (key) {
      const idx = cards.findIndex((card) => Boolean(card.secret.trim()) && normalizeSecret(card.secret) === key);
      if (idx >= 0) return idx;
    }
    return 0;
  }
  function mergeBackupCards(current, incoming) {
    const result = current.map((card) => ({ ...card }));
    for (const card of dedupePersistedCards(incoming)) {
      const key = normalizeSecret(card.secret);
      const existing = result.find((c) => Boolean(c.secret.trim()) && normalizeSecret(c.secret) === key);
      if (existing) {
        if (card.name.trim()) existing.name = card.name;
        if (card.pinned) existing.pinned = true;
        continue;
      }
      const empty = result.find((c) => !c.secret.trim());
      if (empty) {
        empty.name = card.name;
        empty.secret = card.secret;
        empty.algorithm = card.algorithm;
        empty.digits = card.digits;
        empty.period = card.period;
        if (card.pinned) empty.pinned = true;
        else delete empty.pinned;
      } else {
        result.push({ ...card });
      }
    }
    return result;
  }
  function buildVaultPayload(cards, timeOffset, selectedSecret) {
    const payload = {
      cards: dedupePersistedCards(cards),
      timeOffset: clampOffset(timeOffset)
    };
    const key = selectedSecret ? normalizeSecret(selectedSecret) : "";
    if (key && payload.cards.some((card) => normalizeSecret(card.secret) === key)) {
      payload.selectedSecret = key;
    }
    return payload;
  }
  function vaultBackupJson(cards, timeOffset, selectedSecret) {
    return JSON.stringify(buildVaultPayload(cards, timeOffset, selectedSecret), null, 2);
  }
  function readSelectedSecret(value) {
    if (typeof value !== "string") return void 0;
    const key = normalizeSecret(value);
    return key || void 0;
  }
  function parseVaultJson(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return { cards: dedupePersistedCards(data), timeOffset: 0 };
      }
      if (!data || typeof data !== "object") return null;
      const rec = data;
      const cards = Array.isArray(rec.cards) ? dedupePersistedCards(rec.cards) : [];
      const payload = { cards, timeOffset: clampOffset(Number(rec.timeOffset) || 0) };
      const selectedSecret = readSelectedSecret(rec.selectedSecret);
      if (selectedSecret) payload.selectedSecret = selectedSecret;
      return payload;
    } catch {
      return null;
    }
  }
  function loadVault(storage, key) {
    if (!storage) return null;
    try {
      return parseVaultJson(storage.getItem(key));
    } catch {
      return null;
    }
  }
  function saveVault(storage, key, cards, timeOffset, selectedSecret) {
    if (!storage) return;
    storage.setItem(key, JSON.stringify(buildVaultPayload(cards, timeOffset, selectedSecret)));
  }
  function pickStoredPayload(local, session) {
    if (local && local.cards.length) return { payload: local, from: "local" };
    if (session && session.cards.length) return { payload: session, from: "session" };
    return null;
  }

  // ../tmp/html-port/generator.ts
  function formatDisplayCode(code) {
    if (/^\d{6}$/.test(code)) return `${code.slice(0, 3)} ${code.slice(3)}`;
    if (/^\d{8}$/.test(code)) return `${code.slice(0, 4)} ${code.slice(4)}`;
    return code;
  }
  function formatLocalClock(date = /* @__PURE__ */ new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  function codeToCopy(remaining, code, nextCode) {
    if (remaining <= 2 && nextCode && nextCode !== "------") {
      return { value: nextCode, isNext: true };
    }
    return { value: code, isNext: false };
  }
  function paramsChipText(algorithm, digits, period) {
    return `${algorithm} · ${digits} · ${period}s`;
  }
  function imageMimeFromTypes(types) {
    return types.find((type) => type.startsWith("image/"));
  }
  function imageFilesFromList(files) {
    if (!files?.length) return [];
    return Array.from(files).filter((file) => file.type.startsWith("image/"));
  }
  function decodedSecret(raw) {
    const value = raw.trim();
    if (!value) return "";
    if (isOtpAuthUri(value)) {
      try {
        return parseOtpAuth(value).secret;
      } catch {
        return value;
      }
    }
    return value;
  }
  function browserStorage(which) {
    try {
      if (which === "local") {
        if (typeof localStorage === "undefined") return null;
        return localStorage;
      }
      if (typeof sessionStorage === "undefined") return null;
      return sessionStorage;
    } catch {
      return null;
    }
  }
  function fileFromImageBlob(blob, mime) {
    return new File([blob], "clipboard-image", { type: mime });
  }
  function imageFileFromPasteData(data) {
    if (!data) return void 0;
    const files = data.files;
    if (files && files.length) {
      const image = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (image) return image;
    }
    const items = data.items;
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) return file;
      }
    }
    return void 0;
  }
  function shouldAutoCopyCode(lastAutoCode, code, valid) {
    return valid && code !== lastAutoCode;
  }
  function joinOtpAuthUris(uris) {
    return uris.join("\n");
  }
  function barcodeDetector() {
    if (typeof window === "undefined") return void 0;
    return window.BarcodeDetector;
  }
  function camScanSupported() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(barcodeDetector());
  }
  var seq = 1;
  function newCard(defaults) {
    return {
      id: `card-${seq++}`,
      name: "",
      secret: "",
      algorithm: defaults.algorithm,
      digits: defaults.digits,
      period: defaults.period,
      pinned: false,
      code: "------",
      nextCode: "------",
      valid: false,
      status: ""
    };
  }
  function pinIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute(
      "d",
      "M16 9V4h1V2H7v2h1v5c0 1.66-1.34 3-3 3v2h5.2V22h1.6v-8H19v-2c-1.66 0-3-1.34-3-3z"
    );
    svg.append(path);
    return svg;
  }
  function isAlgorithm2(value) {
    return value === "SHA-1" || value === "SHA-256" || value === "SHA-512";
  }
  function cardFromPersisted(raw, defaults) {
    const card = newCard(defaults);
    card.name = typeof raw.name === "string" ? raw.name : "";
    card.secret = typeof raw.secret === "string" ? raw.secret : "";
    if (isAlgorithm2(raw.algorithm)) card.algorithm = raw.algorithm;
    if (raw.digits === 6 || raw.digits === 8) card.digits = raw.digits;
    if (typeof raw.period === "number" && Number.isFinite(raw.period)) {
      card.period = Math.min(120, Math.max(10, Math.round(raw.period)));
    }
    card.pinned = Boolean(raw.pinned) && Boolean(card.secret.trim());
    return card;
  }
  function applySecretInput(card, raw, lang) {
    const value = raw.trim();
    if (!value) {
      card.secret = "";
      card.pinned = false;
      card.valid = false;
      card.code = "------";
      card.nextCode = "------";
      card.status = t(lang, "genWaiting");
      return;
    }
    if (isOtpAuthUri(value)) {
      try {
        const parsed = parseOtpAuth(value);
        card.secret = parsed.secret;
        card.algorithm = parsed.algorithm;
        card.digits = parsed.digits;
        card.period = Math.min(120, Math.max(10, Math.round(parsed.period / 5) * 5));
        if (!card.name) card.name = displayNameFromOtpAuth(parsed);
      } catch {
        card.secret = value;
      }
    } else {
      card.secret = value;
    }
  }
  async function refreshCard(card, lang, unixSeconds) {
    if (!card.secret.trim()) {
      card.valid = false;
      card.code = "------";
      card.nextCode = "------";
      card.status = t(lang, "genWaiting");
      return;
    }
    try {
      const key = decodeBase32(card.secret);
      const left = remainingSeconds(unixSeconds, card.period);
      const opts = { algorithm: card.algorithm, digits: card.digits, period: card.period };
      const [code, nextCode] = await Promise.all([
        generateTotp(key, { ...opts, unixSeconds }),
        generateTotp(key, { ...opts, unixSeconds: unixSeconds + left })
      ]);
      card.code = code;
      card.nextCode = nextCode;
      card.valid = true;
      card.status = `${t(lang, "genLive")} — ${t(lang, "genSeconds", { n: left })}`;
    } catch {
      card.valid = false;
      card.code = "------";
      card.nextCode = "------";
      card.status = t(lang, "genInvalid");
    }
  }
  function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    return target.isContentEditable;
  }
  function dragHasPayload(ev) {
    const types = ev.dataTransfer?.types;
    if (!types) return false;
    const list = [...types];
    return list.includes("Files") || list.includes("text/plain") || list.includes("text/uri-list");
  }
  function isFileDrag(ev) {
    return Boolean(ev.dataTransfer?.types && [...ev.dataTransfer.types].includes("Files"));
  }
  function secretLines(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  var GeneratorPanel = class {
    constructor(root, lang, defaults, bootstrapSecret2) {
      __publicField(this, "root");
      __publicField(this, "lang");
      __publicField(this, "defaults");
      __publicField(this, "cards", []);
      __publicField(this, "selectedId", "");
      __publicField(this, "timer", null);
      __publicField(this, "copiedTimer", null);
      __publicField(this, "fileInput", null);
      __publicField(this, "scanTarget", null);
      __publicField(this, "timeOffset", 0);
      __publicField(this, "secretVisible", true);
      __publicField(this, "pendingAutoHide", true);
      __publicField(this, "camStream", null);
      __publicField(this, "camTimer", null);
      __publicField(this, "camActive", false);
      __publicField(this, "lastAutoCode", "");
      __publicField(this, "searchQuery", "");
      __publicField(this, "backupInput", null);
      __publicField(this, "onPaste", (ev) => {
        const image = imageFileFromPasteData(ev.clipboardData);
        if (image) {
          ev.preventDefault();
          this.scanTarget = this.selected();
          void this.onFile(image);
          return;
        }
        const target = ev.target;
        if (target instanceof HTMLInputElement && target.classList.contains("secret-input")) {
          return;
        }
      });
      __publicField(this, "onKeyDown", (ev) => {
        if (isTypingTarget(ev.target)) return;
        const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        const pasteCombo = (ev.metaKey || ev.ctrlKey) && !ev.altKey && key === "v";
        const pasteBare = !ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.shiftKey && key === "v";
        if (pasteCombo || pasteBare) {
          ev.preventDefault();
          const card = this.selected();
          const input = this.root.querySelector(".secret-input");
          if (input) void this.paste(card, input);
          return;
        }
        if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey) return;
        if (key === "c") {
          ev.preventDefault();
          void this.copy(this.selected());
          return;
        }
        if (key === "n") {
          ev.preventDefault();
          this.addCard();
          return;
        }
        if (key === "j" || key === "ArrowDown") {
          ev.preventDefault();
          this.nudgeSelection(1);
          return;
        }
        if (key === "k" || key === "ArrowUp") {
          ev.preventDefault();
          this.nudgeSelection(-1);
        }
      });
      this.root = root;
      this.lang = lang;
      this.defaults = defaults;
      const local = loadVault(browserStorage("local"), VAULT_KEY);
      const session = loadVault(browserStorage("session"), SESSION_KEY);
      const stored = pickStoredPayload(local, session);
      if (stored) this.timeOffset = stored.payload.timeOffset;
      let restoreSecret;
      if (bootstrapSecret2) {
        const first = newCard(defaults);
        applySecretInput(first, bootstrapSecret2, lang);
        this.cards.push(first);
      } else if (stored) {
        this.cards = sortPinnedFirst(stored.payload.cards.map((c) => cardFromPersisted(c, defaults)));
        restoreSecret = stored.payload.selectedSecret;
        if (stored.from === "local") {
          try {
            saveVault(
              browserStorage("session"),
              SESSION_KEY,
              stored.payload.cards,
              stored.payload.timeOffset,
              stored.payload.selectedSecret
            );
          } catch {
          }
        }
      }
      if (!this.cards.length) this.cards.push(newCard(defaults));
      this.selectedId = this.cards[matchingCardIndex(this.cards, restoreSecret)].id;
      this.render();
      void this.tick();
      this.timer = window.setInterval(() => {
        void this.tick();
      }, 1e3);
      document.addEventListener("keydown", this.onKeyDown);
      document.addEventListener("paste", this.onPaste);
    }
    destroy() {
      if (this.timer != null) window.clearInterval(this.timer);
      this.timer = null;
      if (this.copiedTimer != null) window.clearTimeout(this.copiedTimer);
      this.copiedTimer = null;
      this.stopCam();
      document.removeEventListener("keydown", this.onKeyDown);
      document.removeEventListener("paste", this.onPaste);
      this.root.replaceChildren();
    }
    unixNow() {
      return Math.floor(Date.now() / 1e3) + this.timeOffset;
    }
    snapshotCards() {
      return this.cards.map((c) => {
        const row = {
          name: c.name,
          secret: c.secret,
          algorithm: c.algorithm,
          digits: c.digits,
          period: c.period
        };
        if (c.pinned && c.secret.trim()) row.pinned = true;
        return row;
      });
    }
    persistSession() {
      const cards = this.snapshotCards();
      const selected = this.selected()?.secret;
      try {
        saveVault(browserStorage("session"), SESSION_KEY, cards, this.timeOffset, selected);
      } catch {
      }
      try {
        saveVault(browserStorage("local"), VAULT_KEY, cards, this.timeOffset, selected);
      } catch {
      }
    }
    clearDeviceRecords() {
      if (!window.confirm(t(this.lang, "clearVaultConfirm"))) return;
      this.stopCam();
      this.closeQr();
      this.cards = [newCard(this.defaults)];
      this.selectedId = this.cards[0].id;
      this.secretVisible = true;
      this.pendingAutoHide = true;
      this.lastAutoCode = "";
      this.persistSession();
      this.render();
      void this.tick();
    }
    selected() {
      return this.cards.find((c) => c.id === this.selectedId) ?? this.cards[0];
    }
    filledCount() {
      return this.cards.filter((c) => Boolean(c.secret.trim())).length;
    }
    railNeedsRefresh() {
      const needSearch = this.filledCount() >= 2;
      const hasSearch = Boolean(this.root.querySelector(".rail-search"));
      const needMulti = this.cards.length > 1;
      const isSolo = Boolean(this.root.querySelector(".workspace--solo"));
      return needSearch !== hasSearch || needMulti === isSolo;
    }
    visibleCards() {
      if (this.filledCount() < 2) return this.cards;
      return filterCardsByQuery(this.cards, this.searchQuery);
    }
    sortCards() {
      this.cards = sortPinnedFirst(this.cards);
    }
    applySearchFilter() {
      if (this.filledCount() < 2) return;
      const visible = new Set(this.visibleCards().map((c) => c.id));
      for (const card of this.cards) {
        const item = this.root.querySelector(`.rail-item[data-card="${card.id}"]`);
        if (item) item.hidden = !visible.has(card.id);
      }
    }
    nudgeSelection(delta) {
      const visible = this.visibleCards();
      if (!visible.length) return;
      const idx = visible.findIndex((c) => c.id === this.selectedId);
      const next = idx < 0 ? delta > 0 ? visible[0] : visible[visible.length - 1] : visible[(idx + delta + visible.length) % visible.length];
      this.selectCard(next.id);
    }
    togglePin(card) {
      if (!card.secret.trim()) return;
      card.pinned = !card.pinned;
      this.sortCards();
      this.persistSession();
      this.render();
      void this.tick();
    }
    pinButton(card, extraClass = "") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pin-btn${extraClass ? ` ${extraClass}` : ""}`;
      if (card.pinned) btn.classList.add("is-on");
      btn.hidden = !card.secret.trim();
      const label = t(this.lang, card.pinned ? "unpinCard" : "pinCard");
      btn.title = label;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", card.pinned ? "true" : "false");
      btn.append(pinIcon());
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.togglePin(card);
      });
      return btn;
    }
    exportBackup() {
      const json = vaultBackupJson(this.snapshotCards(), this.timeOffset, this.selected()?.secret);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "totp-backup.json";
      a.rel = "noopener";
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    async onBackupFile() {
      const file = this.backupInput?.files?.[0];
      if (this.backupInput) this.backupInput.value = "";
      if (!file) return;
      let text = "";
      try {
        text = await file.text();
      } catch {
        return;
      }
      const payload = parseVaultJson(text);
      const card = this.selected();
      if (!payload) {
        card.status = t(this.lang, "genInvalid");
        this.syncOutputs(this.unixNow());
        return;
      }
      const hasCards = this.cards.some((c) => Boolean(c.secret.trim()));
      if (hasCards && !window.confirm(t(this.lang, "importBackupConfirm"))) return;
      const merged = mergeBackupCards(this.snapshotCards(), payload.cards);
      this.cards = sortPinnedFirst(merged.map((c) => cardFromPersisted(c, this.defaults)));
      if (!this.cards.length) this.cards.push(newCard(this.defaults));
      if (!hasCards) this.timeOffset = payload.timeOffset;
      const prefer = payload.selectedSecret || card.secret;
      this.selectedId = this.cards[matchingCardIndex(this.cards, prefer)].id;
      this.persistSession();
      this.render();
      void this.tick();
    }
    selectCard(id) {
      if (this.selectedId === id) return;
      this.selectedId = id;
      this.persistSession();
      this.render();
      void this.tick();
    }
    addCard() {
      const next = newCard(this.defaults);
      this.cards.push(next);
      this.selectedId = next.id;
      this.persistSession();
      this.render();
      void this.tick();
    }
    async tick(skipAutoCopy = false) {
      const now = this.unixNow();
      await Promise.all(this.cards.map((c) => refreshCard(c, this.lang, now)));
      this.syncOutputs(now);
      if (skipAutoCopy) return;
      const card = this.selected();
      if (shouldAutoCopyCode(this.lastAutoCode, card.code, card.valid)) {
        this.lastAutoCode = card.code;
        await this.copy(card);
      }
    }
    railName(card) {
      return card.name.trim() || t(this.lang, "genNamePh");
    }
    leftLabel(card, unixSeconds) {
      return `${remainingSeconds(unixSeconds, card.period)}${t(this.lang, "genPeriodUnit")}`;
    }
    syncOutputs(unixSeconds) {
      const workspace = this.root.querySelector(".workspace");
      if (workspace) workspace.classList.toggle("workspace--solo", this.cards.length === 1);
      for (const card2 of this.cards) {
        const item = this.root.querySelector(`.rail-item[data-card="${card2.id}"]`);
        if (!item) continue;
        const name2 = item.querySelector(".rail-name");
        if (name2) name2.textContent = this.railName(card2);
        const code = item.querySelector(".rail-code");
        if (code) code.textContent = formatDisplayCode(card2.code);
        const left2 = item.querySelector(".rail-left");
        if (left2) left2.textContent = this.leftLabel(card2, unixSeconds);
        if (card2.id === this.selectedId) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
        item.classList.toggle("is-pinned", card2.pinned);
        const pinBtn = item.querySelector(".pin-btn");
        if (pinBtn) {
          pinBtn.hidden = !card2.secret.trim();
          pinBtn.classList.toggle("is-on", card2.pinned);
          const pinLabel = t(this.lang, card2.pinned ? "unpinCard" : "pinCard");
          pinBtn.title = pinLabel;
          pinBtn.setAttribute("aria-label", pinLabel);
          pinBtn.setAttribute("aria-pressed", card2.pinned ? "true" : "false");
        }
      }
      this.applySearchFilter();
      const card = this.selected();
      if (!card) return;
      const stage = this.root.querySelector(".stage");
      if (!stage) return;
      const left = remainingSeconds(unixSeconds, card.period);
      const urgent = card.valid && left <= 5;
      const showNext = card.valid && (left <= 10 || urgent);
      const noSecret = !card.secret.trim();
      if (card.valid && this.pendingAutoHide) {
        this.secretVisible = false;
        this.pendingAutoHide = false;
      }
      const cardTop = stage.querySelector(".card-top");
      if (cardTop) cardTop.hidden = noSecret && this.cards.length === 1;
      const nameInput = stage.querySelector(".name-input");
      if (nameInput) nameInput.placeholder = t(this.lang, "genNameQuiet");
      const codeRow = stage.querySelector(".code-row");
      if (codeRow) codeRow.hidden = !card.valid;
      const codeBtn = stage.querySelector(".code-display");
      if (codeBtn) {
        codeBtn.hidden = !card.valid;
        codeBtn.textContent = formatDisplayCode(card.code);
        codeBtn.disabled = !card.valid;
        codeBtn.classList.toggle("is-urgent", urgent);
      }
      const otpLeft = stage.querySelector(".otp-left");
      if (otpLeft) {
        otpLeft.hidden = !card.valid;
        otpLeft.textContent = card.valid ? String(left) : "";
        otpLeft.setAttribute("aria-label", t(this.lang, "genSeconds", { n: left }));
      }
      const copyCodeBtn = stage.querySelector(".copy-code-btn");
      if (copyCodeBtn) copyCodeBtn.hidden = !card.valid;
      const board = stage.querySelector(".otp-board");
      if (board) {
        board.classList.toggle("has-code", card.valid);
        board.classList.toggle("is-urgent", urgent);
        board.classList.toggle("is-empty", noSecret);
      }
      const bar = stage.querySelector(".otp-bar");
      if (bar) bar.hidden = !card.valid;
      const fill = stage.querySelector(".otp-bar-fill");
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, left / card.period * 100))}%`;
      const chip = stage.querySelector(".params-chip");
      if (chip) {
        chip.hidden = !card.valid;
        if (card.valid) chip.textContent = paramsChipText(card.algorithm, card.digits, card.period);
      }
      const nextEl = stage.querySelector(".next-code");
      if (nextEl) {
        nextEl.hidden = !showNext;
        nextEl.classList.toggle("is-urgent", urgent);
        if (showNext) nextEl.textContent = t(this.lang, "nextCode", { code: formatDisplayCode(card.nextCode) });
      }
      const hint = stage.querySelector(".otp-hint");
      if (hint) hint.hidden = true;
      const emptyActions = stage.querySelector(".empty-actions");
      if (emptyActions) emptyActions.hidden = !noSecret;
      const emptyCta = stage.querySelector(".empty-cta");
      if (emptyCta) emptyCta.hidden = !noSecret;
      const dropHint = stage.querySelector(".drop-hint");
      if (dropHint) dropHint.hidden = card.valid;
      const status = stage.querySelector(".status");
      if (status) {
        status.textContent = card.status;
        const ok = /copied|已复制|已複製/i.test(card.status);
        status.classList.toggle("is-toast", Boolean(card.status) && card.valid);
        status.classList.toggle("is-ok", ok);
      }
      const clockEl = stage.querySelector(".local-clock");
      if (clockEl) clockEl.textContent = t(this.lang, "localClock", { time: formatLocalClock() });
      const name = stage.querySelector(".name-input");
      if (name && name.value !== card.name) name.value = card.name;
      const secret = stage.querySelector(".secret-input");
      if (secret && document.activeElement !== secret && secret.value !== card.secret) {
        secret.value = card.secret;
      }
      if (secret) secret.type = this.secretVisible ? "text" : "password";
      const hideBtn = stage.querySelector(".hide-secret-btn");
      if (hideBtn) {
        hideBtn.hidden = noSecret;
        hideBtn.textContent = t(this.lang, this.secretVisible ? "hideSecret" : "showSecret");
      }
      const pasteBtn = stage.querySelector(".paste-btn");
      if (pasteBtn) pasteBtn.hidden = true;
      const clearBtn = stage.querySelector(".clear-btn");
      if (clearBtn) clearBtn.hidden = noSecret;
      const canCam = camScanSupported();
      stage.querySelectorAll(".scan-empty").forEach((btn) => {
        if (btn.classList.contains("scan-row")) {
          btn.hidden = card.valid || noSecret;
        } else {
          btn.hidden = card.valid;
        }
      });
      stage.querySelectorAll(".cam-empty").forEach((btn) => {
        btn.hidden = card.valid || !canCam;
        btn.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
      });
      stage.querySelectorAll(".scan-live").forEach((btn) => {
        btn.hidden = !card.valid;
      });
      stage.querySelectorAll(".cam-live").forEach((btn) => {
        btn.hidden = !card.valid || !canCam;
        btn.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
      });
      const digits = stage.querySelector(".digits-input");
      if (digits) digits.value = String(card.digits);
      const period = stage.querySelector(".period-input");
      if (period && document.activeElement !== period) period.value = String(card.period);
      const alg = stage.querySelector(".alg-input");
      if (alg) alg.value = card.algorithm;
      const del = stage.querySelector(".delete-btn");
      if (del) del.hidden = this.cards.length === 1;
      const addInline = stage.querySelector(".add-inline");
      if (addInline) addInline.hidden = !(card.valid && this.cards.length === 1);
      const extra = stage.querySelector(".more-actions");
      if (extra) extra.hidden = false;
      const exportBtn = stage.querySelector(".export-backup-btn");
      if (exportBtn) exportBtn.hidden = this.filledCount() === 0;
      const copyUriBtn = stage.querySelector(".copy-uri-btn");
      if (copyUriBtn) copyUriBtn.hidden = !card.valid;
      const showQrBtn = stage.querySelector(".show-qr-btn");
      if (showQrBtn) showQrBtn.hidden = !card.valid;
      const copyAllBtn = stage.querySelector(".copy-all-uri-btn");
      if (copyAllBtn) copyAllBtn.hidden = this.filledCount() === 0;
      const clearVaultBtn = stage.querySelector(".clear-vault-btn");
      if (clearVaultBtn) clearVaultBtn.hidden = this.filledCount() === 0;
      const stagePin = stage.querySelector(".stage-pin");
      if (stagePin) {
        stagePin.hidden = noSecret;
        stagePin.classList.toggle("is-on", card.pinned);
        const pinLabel = t(this.lang, card.pinned ? "unpinCard" : "pinCard");
        stagePin.title = pinLabel;
        stagePin.setAttribute("aria-label", pinLabel);
        stagePin.setAttribute("aria-pressed", card.pinned ? "true" : "false");
      }
      const clockRange = stage.querySelector(".clock-range");
      const clockNum = stage.querySelector(".clock-num");
      if (clockRange && document.activeElement !== clockRange) clockRange.value = String(this.timeOffset);
      if (clockNum && document.activeElement !== clockNum) clockNum.value = String(this.timeOffset);
    }
    render() {
      this.stopCam();
      this.root.innerHTML = "";
      const selected = this.selected();
      this.selectedId = selected.id;
      const workspace = document.createElement("div");
      workspace.className = this.cards.length === 1 ? "workspace workspace--solo" : "workspace";
      const rail = document.createElement("aside");
      rail.className = "rail";
      const railLabel = document.createElement("p");
      railLabel.className = "rail-label";
      railLabel.textContent = t(this.lang, "genName");
      const list = document.createElement("div");
      list.className = "rail-list";
      const visible = new Set(this.visibleCards().map((c) => c.id));
      for (const card of this.cards) {
        const item = this.railItem(card);
        if (this.filledCount() >= 2 && this.searchQuery.trim() && !visible.has(card.id)) item.hidden = true;
        list.append(item);
      }
      const add = document.createElement("button");
      add.type = "button";
      add.className = "add-btn";
      add.textContent = t(this.lang, "genAdd");
      add.addEventListener("click", () => this.addCard());
      rail.append(railLabel);
      if (this.filledCount() >= 2) {
        const search = document.createElement("input");
        search.type = "search";
        search.className = "rail-search";
        search.autocomplete = "off";
        search.placeholder = t(this.lang, "searchAccounts");
        search.setAttribute("aria-label", t(this.lang, "searchAccounts"));
        search.value = this.searchQuery;
        search.addEventListener("input", () => {
          this.searchQuery = search.value;
          this.applySearchFilter();
        });
        rail.append(search);
      }
      rail.append(list, add);
      const stage = this.stageEl(selected);
      this.fileInput = document.createElement("input");
      this.fileInput.type = "file";
      this.fileInput.accept = "image/*";
      this.fileInput.multiple = true;
      this.fileInput.hidden = true;
      this.fileInput.addEventListener("change", () => void this.onFile());
      this.backupInput = document.createElement("input");
      this.backupInput.type = "file";
      this.backupInput.accept = "application/json,.json";
      this.backupInput.hidden = true;
      this.backupInput.addEventListener("change", () => void this.onBackupFile());
      workspace.append(rail, stage, this.fileInput, this.backupInput);
      this.root.append(workspace);
      if (!selected.secret.trim()) {
        this.root.querySelector(".secret-input")?.focus();
      }
    }
    railItem(card) {
      const item = document.createElement("div");
      item.className = "rail-item";
      item.dataset.card = card.id;
      if (card.id === this.selectedId) item.setAttribute("aria-current", "true");
      if (card.pinned) item.classList.add("is-pinned");
      const select = document.createElement("button");
      select.type = "button";
      select.className = "rail-select";
      const name = document.createElement("span");
      name.className = "rail-name";
      name.textContent = this.railName(card);
      const code = document.createElement("span");
      code.className = "rail-code";
      code.textContent = formatDisplayCode(card.code);
      const left = document.createElement("span");
      left.className = "rail-left";
      left.textContent = this.leftLabel(card, this.unixNow());
      select.append(name, code, left);
      select.addEventListener("click", () => this.selectCard(card.id));
      item.append(select, this.pinButton(card, "rail-pin"));
      return item;
    }
    stageEl(card) {
      const stage = document.createElement("section");
      stage.className = "stage";
      this.bindDrop(stage, card);
      const top = document.createElement("div");
      top.className = "card-top";
      const name = document.createElement("input");
      name.className = "name-input";
      name.type = "text";
      name.autocomplete = "off";
      name.placeholder = t(this.lang, "genNameQuiet");
      name.setAttribute("aria-label", t(this.lang, "genName"));
      name.value = card.name;
      name.addEventListener("input", () => {
        card.name = name.value;
        const railName = this.root.querySelector(`.rail-item[data-card="${card.id}"] .rail-name`);
        if (railName) railName.textContent = this.railName(card);
        this.persistSession();
        this.applySearchFilter();
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn icon-btn";
      del.textContent = "×";
      del.setAttribute("aria-label", t(this.lang, "genDelete"));
      del.hidden = this.cards.length === 1;
      del.addEventListener("click", () => {
        if (this.cards.length === 1) return;
        this.cards = this.cards.filter((c) => c.id !== card.id);
        if (this.selectedId === card.id) this.selectedId = this.cards[0].id;
        this.persistSession();
        this.render();
        void this.tick();
      });
      const addInline = document.createElement("button");
      addInline.type = "button";
      addInline.className = "ghost-btn add-inline";
      addInline.textContent = t(this.lang, "genAdd");
      addInline.hidden = !(card.valid && this.cards.length === 1);
      addInline.addEventListener("click", () => this.addCard());
      top.append(name, this.pinButton(card, "stage-pin"), addInline, del);
      top.hidden = !card.secret.trim() && this.cards.length === 1;
      const board = document.createElement("div");
      board.className = "otp-board";
      if (card.valid) board.classList.add("has-code");
      if (!card.secret.trim()) board.classList.add("is-empty");
      const codeRow = document.createElement("div");
      codeRow.className = "code-row";
      codeRow.hidden = !card.valid;
      const codeBtn = document.createElement("button");
      codeBtn.type = "button";
      codeBtn.className = "code-display";
      codeBtn.textContent = formatDisplayCode(card.code);
      codeBtn.hidden = !card.valid;
      codeBtn.disabled = !card.valid;
      codeBtn.title = t(this.lang, "copyHint");
      codeBtn.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          void this.copy(card);
        }
      });
      const otpLeft = document.createElement("span");
      otpLeft.className = "otp-left";
      otpLeft.hidden = !card.valid;
      otpLeft.textContent = card.valid ? String(remainingSeconds(this.unixNow(), card.period)) : "";
      codeRow.append(codeBtn, otpLeft);
      const bar = document.createElement("div");
      bar.className = "otp-bar";
      bar.hidden = !card.valid;
      const fill = document.createElement("div");
      fill.className = "otp-bar-fill";
      fill.style.width = "100%";
      bar.append(fill);
      const chip = document.createElement("p");
      chip.className = "params-chip";
      chip.hidden = !card.valid;
      chip.textContent = paramsChipText(card.algorithm, card.digits, card.period);
      const nextEl = document.createElement("p");
      nextEl.className = "next-code";
      nextEl.hidden = true;
      const hint = document.createElement("span");
      hint.className = "otp-hint";
      hint.textContent = t(this.lang, "copyHint");
      hint.hidden = true;
      const copyCodeBtn = document.createElement("button");
      copyCodeBtn.type = "button";
      copyCodeBtn.className = "ghost-btn copy-code-btn";
      copyCodeBtn.textContent = t(this.lang, "copyHint");
      copyCodeBtn.hidden = !card.valid;
      copyCodeBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        void this.copy(card);
      });
      const emptyCta = document.createElement("button");
      emptyCta.type = "button";
      emptyCta.className = "primary-btn empty-cta";
      emptyCta.textContent = t(this.lang, "emptyCta");
      emptyCta.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const secretInput = this.root.querySelector(".secret-input");
        if (secretInput) void this.paste(card, secretInput);
      });
      const emptyUpload = this.scanButton(card, "scan-empty");
      emptyUpload.classList.add("secondary-btn");
      const emptyActions = document.createElement("div");
      emptyActions.className = "empty-actions";
      emptyActions.hidden = Boolean(card.secret.trim());
      emptyActions.append(emptyCta, emptyUpload);
      const dropHint = document.createElement("p");
      dropHint.className = "drop-hint";
      dropHint.textContent = t(this.lang, "pasteHint");
      dropHint.hidden = card.valid;
      board.append(codeRow, bar, chip, nextEl, hint, copyCodeBtn, emptyActions, dropHint);
      board.addEventListener("click", (ev) => {
        if (!card.valid) return;
        if (ev.target instanceof HTMLElement && ev.target.closest(".empty-cta, .copy-code-btn, .empty-actions")) return;
        void this.copy(card);
      });
      const status = document.createElement("p");
      status.className = "status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = card.status || t(this.lang, "genWaiting");
      const localClock = document.createElement("p");
      localClock.className = "local-clock";
      localClock.textContent = t(this.lang, "localClock", { time: formatLocalClock() });
      const meta = document.createElement("div");
      meta.className = "meta-row";
      meta.append(status, localClock);
      const sessionHint = document.createElement("p");
      sessionHint.className = "session-hint";
      sessionHint.textContent = t(this.lang, "sessionHint");
      const secret = document.createElement("input");
      secret.className = "secret-input";
      secret.type = this.secretVisible ? "text" : "password";
      secret.autocomplete = "off";
      secret.autocapitalize = "characters";
      secret.spellcheck = false;
      secret.placeholder = t(this.lang, "genSecretPh");
      secret.setAttribute("aria-label", t(this.lang, "genSecret"));
      secret.value = card.secret;
      secret.addEventListener("input", () => {
        applySecretInput(card, secret.value, this.lang);
        if (!card.secret.trim()) card.pinned = false;
        if (isOtpAuthUri(secret.value)) secret.value = card.secret;
        this.pendingAutoHide = true;
        this.secretVisible = true;
        secret.type = "text";
        this.persistSession();
        if (this.railNeedsRefresh()) this.render();
        void this.tick();
      });
      const row = document.createElement("div");
      row.className = "secret-row";
      const hideBtn = document.createElement("button");
      hideBtn.type = "button";
      hideBtn.className = "ghost-btn hide-secret-btn";
      hideBtn.textContent = t(this.lang, this.secretVisible ? "hideSecret" : "showSecret");
      hideBtn.hidden = !card.secret.trim();
      hideBtn.addEventListener("click", () => {
        this.secretVisible = !this.secretVisible;
        this.pendingAutoHide = false;
        secret.type = this.secretVisible ? "text" : "password";
        hideBtn.textContent = t(this.lang, this.secretVisible ? "hideSecret" : "showSecret");
      });
      const scanRow = this.scanButton(card, "scan-empty scan-row");
      scanRow.hidden = card.valid || !card.secret.trim();
      const camEmpty = this.camButton(card, "cam-empty");
      camEmpty.hidden = card.valid || !camScanSupported();
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ghost-btn clear-btn";
      clear.textContent = t(this.lang, "genClear");
      clear.hidden = !card.secret.trim();
      clear.addEventListener("click", () => {
        card.secret = "";
        card.name = "";
        card.pinned = false;
        secret.value = "";
        name.value = "";
        this.secretVisible = true;
        this.pendingAutoHide = true;
        secret.type = "text";
        const railName = this.root.querySelector(`.rail-item[data-card="${card.id}"] .rail-name`);
        if (railName) railName.textContent = this.railName(card);
        this.closeQr();
        this.stopCam();
        this.lastAutoCode = "";
        this.persistSession();
        void this.tick();
      });
      row.append(secret, hideBtn, scanRow, camEmpty, clear);
      const extra = document.createElement("details");
      extra.className = "more-actions";
      extra.hidden = false;
      const extraSum = document.createElement("summary");
      extraSum.textContent = t(this.lang, "moreActions");
      const extraBody = document.createElement("div");
      extraBody.className = "more-actions-body";
      const copyUri = document.createElement("button");
      copyUri.type = "button";
      copyUri.className = "ghost-btn copy-uri-btn";
      copyUri.textContent = t(this.lang, "copyUri");
      copyUri.hidden = !card.valid;
      copyUri.addEventListener("click", () => void this.copyUri(card));
      const showQr = document.createElement("button");
      showQr.type = "button";
      showQr.className = "ghost-btn show-qr-btn";
      showQr.textContent = t(this.lang, "showQr");
      showQr.hidden = !card.valid;
      showQr.addEventListener("click", () => void this.showQr(card));
      const scanLive = this.scanButton(card, "scan-live");
      scanLive.hidden = !card.valid;
      const camLive = this.camButton(card, "cam-live");
      camLive.hidden = !card.valid || !camScanSupported();
      const copyAll = document.createElement("button");
      copyAll.type = "button";
      copyAll.className = "ghost-btn copy-all-uri-btn";
      copyAll.textContent = t(this.lang, "copyAllUri");
      copyAll.hidden = this.filledCount() === 0;
      copyAll.addEventListener("click", () => void this.copyAllUri());
      const clearVault = document.createElement("button");
      clearVault.type = "button";
      clearVault.className = "ghost-btn clear-vault-btn";
      clearVault.textContent = t(this.lang, "clearVault");
      clearVault.hidden = this.filledCount() === 0;
      clearVault.addEventListener("click", () => this.clearDeviceRecords());
      const exportBtn = document.createElement("button");
      exportBtn.type = "button";
      exportBtn.className = "ghost-btn export-backup-btn";
      exportBtn.textContent = t(this.lang, "exportBackup");
      exportBtn.hidden = this.filledCount() === 0;
      exportBtn.addEventListener("click", () => this.exportBackup());
      const importBtn = document.createElement("button");
      importBtn.type = "button";
      importBtn.className = "ghost-btn import-backup-btn";
      importBtn.textContent = t(this.lang, "importBackup");
      importBtn.addEventListener("click", () => this.backupInput?.click());
      extraBody.append(copyUri, copyAll, showQr, scanLive, camLive, exportBtn, importBtn, clearVault);
      extra.append(extraSum, extraBody);
      const details = document.createElement("details");
      details.className = "totp-options";
      const sum = document.createElement("summary");
      sum.textContent = t(this.lang, "genOptions");
      const opts = document.createElement("div");
      opts.className = "options-grid";
      opts.append(
        this.selectField(t(this.lang, "genDigits"), "digits-input", ["6", "8"], String(card.digits), (v) => {
          card.digits = v === "8" ? 8 : 6;
          this.persistSession();
          void this.tick();
        }),
        this.periodField(card),
        this.selectField(t(this.lang, "genAlgorithm"), "alg-input", ["SHA-1", "SHA-256", "SHA-512"], card.algorithm, (v) => {
          card.algorithm = v;
          this.persistSession();
          void this.tick();
        }),
        this.clockEl()
      );
      details.append(sum, opts);
      stage.append(top, board, row, extra, meta, sessionHint, details);
      return stage;
    }
    clockEl() {
      const wrap = document.createElement("div");
      wrap.className = "clock-skew";
      const label = document.createElement("label");
      label.className = "clock-label";
      label.textContent = t(this.lang, "clockSkew");
      const range = document.createElement("input");
      range.type = "range";
      range.className = "clock-range";
      range.min = "-90";
      range.max = "90";
      range.step = "1";
      range.value = String(this.timeOffset);
      range.setAttribute("aria-label", t(this.lang, "clockSkew"));
      const num = document.createElement("input");
      num.type = "number";
      num.className = "clock-num";
      num.min = "-90";
      num.max = "90";
      num.step = "1";
      num.value = String(this.timeOffset);
      num.setAttribute("aria-label", t(this.lang, "clockSkew"));
      const unit = document.createElement("span");
      unit.className = "clock-unit";
      unit.textContent = t(this.lang, "genPeriodUnit");
      const apply = (raw) => {
        this.timeOffset = clampOffset(Number(raw));
        range.value = String(this.timeOffset);
        num.value = String(this.timeOffset);
        this.persistSession();
        void this.tick();
      };
      range.addEventListener("input", () => apply(range.value));
      num.addEventListener("change", () => apply(num.value));
      wrap.append(label, range, num, unit);
      return wrap;
    }
    bindDrop(stage, card) {
      let depth = 0;
      const enter = (ev) => {
        if (!dragHasPayload(ev)) return;
        ev.preventDefault();
        depth++;
        stage.classList.add("is-drop");
      };
      const over = (ev) => {
        if (!dragHasPayload(ev)) return;
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
        stage.classList.add("is-drop");
      };
      const leave = (ev) => {
        if (!dragHasPayload(ev)) return;
        depth = Math.max(0, depth - 1);
        if (depth === 0) stage.classList.remove("is-drop");
      };
      const drop = (ev) => {
        ev.preventDefault();
        depth = 0;
        stage.classList.remove("is-drop");
        const images = isFileDrag(ev) ? imageFilesFromList(ev.dataTransfer?.files) : [];
        if (images.length) {
          this.scanTarget = card;
          void this.onFile(images);
          return;
        }
        const text = ev.dataTransfer?.getData("text/plain") || ev.dataTransfer?.getData("text/uri-list") || "";
        if (text.trim()) {
          const input = this.root.querySelector(".secret-input");
          void this.applyPastedText(card, text, input);
        }
      };
      stage.addEventListener("dragenter", enter);
      stage.addEventListener("dragover", over);
      stage.addEventListener("dragleave", leave);
      stage.addEventListener("drop", drop);
    }
    selectField(label, cls, values, current, onChange) {
      const wrap = document.createElement("label");
      wrap.className = "field";
      wrap.append(label);
      const sel = document.createElement("select");
      sel.className = cls;
      for (const v of values) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        sel.append(o);
      }
      sel.value = current;
      sel.addEventListener("change", () => onChange(sel.value));
      wrap.append(sel);
      return wrap;
    }
    periodField(card) {
      const wrap = document.createElement("label");
      wrap.className = "field";
      wrap.append(t(this.lang, "genPeriod"));
      const row = document.createElement("span");
      row.className = "period-row";
      const input = document.createElement("input");
      input.className = "period-input";
      input.type = "number";
      input.min = "10";
      input.max = "120";
      input.step = "5";
      input.value = String(card.period);
      input.addEventListener("change", () => {
        let n = Number(input.value);
        if (!Number.isFinite(n)) n = 30;
        n = Math.min(120, Math.max(10, Math.round(n / 5) * 5));
        card.period = n;
        input.value = String(n);
        this.persistSession();
        void this.tick();
      });
      const suffix = document.createElement("span");
      suffix.textContent = t(this.lang, "genPeriodUnit");
      row.append(input, suffix);
      wrap.append(row);
      return wrap;
    }
    flashCopied() {
      const board = this.root.querySelector(".otp-board");
      const status = this.root.querySelector(".status");
      if (board) board.classList.add("is-copied");
      if (status) {
        status.classList.add("is-toast", "is-ok");
      }
      if (this.copiedTimer != null) window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => {
        board?.classList.remove("is-copied");
        this.copiedTimer = null;
      }, 1200);
    }
    async copy(card) {
      if (!card.valid) return;
      const left = remainingSeconds(this.unixNow(), card.period);
      const picked = codeToCopy(left, card.code, card.nextCode);
      try {
        await navigator.clipboard.writeText(picked.value);
        this.lastAutoCode = card.code;
        card.status = picked.isNext ? t(this.lang, "genCopiedNext", { code: picked.value }) : t(this.lang, "genCopied", { code: picked.value });
        this.flashCopied();
        this.syncOutputs(this.unixNow());
      } catch {
        card.status = t(this.lang, "genCopyFail");
        this.syncOutputs(this.unixNow());
      }
    }
    async copyUri(card) {
      if (!card.secret.trim()) return;
      try {
        await navigator.clipboard.writeText(toOtpAuthUri(card));
        card.status = t(this.lang, "genCopied", { code: "otpauth://" });
        this.syncOutputs(this.unixNow());
      } catch {
        card.status = t(this.lang, "genCopyFail");
        this.syncOutputs(this.unixNow());
      }
    }
    async copyAllUri() {
      const uris = this.cards.filter((c) => c.secret.trim()).map((c) => toOtpAuthUri(c));
      if (!uris.length) return;
      const card = this.selected();
      try {
        await navigator.clipboard.writeText(joinOtpAuthUris(uris));
        card.status = t(this.lang, "genCopied", { code: "otpauth://" });
        this.syncOutputs(this.unixNow());
      } catch {
        card.status = t(this.lang, "genCopyFail");
        this.syncOutputs(this.unixNow());
      }
    }
    closeQr() {
      this.root.querySelector(".qr-popover")?.remove();
    }
    async showQr(card) {
      const existing = this.root.querySelector(".qr-popover");
      if (existing) {
        existing.remove();
        return;
      }
      if (!card.secret.trim()) return;
      const uri = toOtpAuthUri(card);
      const pop = document.createElement("div");
      pop.className = "qr-popover";
      pop.setAttribute("role", "dialog");
      const close = document.createElement("button");
      close.type = "button";
      close.className = "ghost-btn";
      close.textContent = "×";
      close.setAttribute("aria-label", t(this.lang, "genClear"));
      close.addEventListener("click", () => pop.remove());
      try {
        const dataUrl = await toDataURL(uri, { width: 200, margin: 1, errorCorrectionLevel: "M" });
        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = uri;
        img.width = 200;
        img.height = 200;
        pop.append(img, close);
      } catch {
        const pre = document.createElement("p");
        pre.className = "qr-uri";
        pre.textContent = uri;
        pop.append(pre, close);
        try {
          await navigator.clipboard.writeText(uri);
          card.status = t(this.lang, "genCopied", { code: "otpauth://" });
          this.syncOutputs(this.unixNow());
        } catch {
          card.status = t(this.lang, "genCopyFail");
          this.syncOutputs(this.unixNow());
        }
      }
      this.root.querySelector(".stage")?.append(pop);
    }
    async applyPastedText(card, text, input) {
      const lines = secretLines(text);
      if (!lines.length) {
        card.status = t(this.lang, "genPasteEmpty");
        this.syncOutputs(this.unixNow());
        return;
      }
      applySecretInput(card, lines[0], this.lang);
      this.pendingAutoHide = true;
      if (input) input.value = isOtpAuthUri(lines[0]) ? card.secret : lines[0];
      let added = false;
      if (lines.length >= 2) {
        for (const line of lines.slice(1)) {
          if (hasDuplicateSecret(this.cards, decodedSecret(line))) continue;
          const extra = newCard(this.defaults);
          applySecretInput(extra, line, this.lang);
          this.cards.push(extra);
          added = true;
        }
      }
      this.persistSession();
      if (added || this.railNeedsRefresh()) this.render();
      await this.tick(true);
      if (card.valid) {
        this.root.querySelector(".code-display")?.focus();
        await this.copy(card);
        this.lastAutoCode = card.code;
      }
    }
    async paste(card, input) {
      try {
        if (typeof navigator.clipboard.read === "function") {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const mime = imageMimeFromTypes(item.types);
              if (!mime) continue;
              const blob = await item.getType(mime);
              const file = fileFromImageBlob(blob, mime);
              this.scanTarget = card;
              await this.onFile(file);
              return;
            }
            for (const item of items) {
              if (!item.types.includes("text/plain")) continue;
              const text2 = await (await item.getType("text/plain")).text();
              if (text2.trim()) {
                await this.applyPastedText(card, text2, input);
                return;
              }
            }
          } catch {
          }
        }
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
          card.status = t(this.lang, "genPasteEmpty");
          this.syncOutputs(this.unixNow());
          return;
        }
        await this.applyPastedText(card, text, input);
      } catch {
        card.status = t(this.lang, "genPasteNeedPerm");
        this.syncOutputs(this.unixNow());
        input.focus();
      }
    }
    async decodeQrImage(file) {
      const Detector = barcodeDetector();
      if (!Detector) throw new Error("no-api");
      const bmp = await createImageBitmap(file);
      try {
        const detector = new Detector({ formats: ["qr_code"] });
        const codes = await detector.detect(bmp);
        return codes[0]?.rawValue?.trim() || null;
      } finally {
        bmp.close();
      }
    }
    applyDecodedSecret(raw) {
      const secret = decodedSecret(raw);
      const duplicate = hasDuplicateSecret(this.cards, secret);
      const current = this.scanTarget ?? this.selected();
      const action = fillOrAddAction(Boolean(current.secret.trim()), duplicate);
      if (action === "skip") return action;
      if (action === "fill") {
        applySecretInput(current, raw, this.lang);
        return action;
      }
      const next = newCard(this.defaults);
      applySecretInput(next, raw, this.lang);
      this.cards.push(next);
      this.selectedId = next.id;
      this.scanTarget = next;
      return action;
    }
    async onFile(filesOverride) {
      const files = filesOverride ? (Array.isArray(filesOverride) ? filesOverride : [filesOverride]).filter((f) => !f.type || f.type.startsWith("image/")) : imageFilesFromList(this.fileInput?.files);
      if (this.fileInput) this.fileInput.value = "";
      const card = this.scanTarget ?? this.selected();
      if (!files.length || !card) return;
      if (!barcodeDetector()) {
        card.status = t(this.lang, "genScanNoApi");
        this.syncOutputs(this.unixNow());
        return;
      }
      let applied = 0;
      let skipped = 0;
      for (const file of files) {
        try {
          const raw = await this.decodeQrImage(file);
          if (!raw) continue;
          const action = this.applyDecodedSecret(raw);
          if (action === "skip") skipped++;
          else applied++;
        } catch {
        }
      }
      const statusCard = this.selected();
      if (!applied && !skipped) {
        statusCard.status = t(this.lang, "genScanNoCode");
        this.syncOutputs(this.unixNow());
        return;
      }
      this.pendingAutoHide = true;
      if (skipped && !applied) statusCard.status = t(this.lang, "genScanSkipped");
      else if (skipped) statusCard.status = `${t(this.lang, "genScanOk")} ${t(this.lang, "genScanSkipped")}`;
      else statusCard.status = t(this.lang, "genScanOk");
      this.persistSession();
      this.render();
      await this.tick(true);
      const selected = this.selected();
      if (selected.valid) {
        await this.copy(selected);
        this.lastAutoCode = selected.code;
      }
    }
    scanButton(card, extraClass) {
      const scan = document.createElement("button");
      scan.type = "button";
      scan.className = `ghost-btn scan-btn ${extraClass}`;
      scan.textContent = t(this.lang, extraClass.includes("scan-empty") ? "uploadQr" : "genScan");
      scan.addEventListener("click", () => {
        this.scanTarget = card;
        this.fileInput?.click();
      });
      return scan;
    }
    camButton(card, extraClass) {
      const cam = document.createElement("button");
      cam.type = "button";
      cam.className = `ghost-btn cam-btn ${extraClass}`;
      cam.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
      cam.addEventListener("click", () => void this.toggleCam(card));
      return cam;
    }
    stopCam() {
      if (this.camTimer != null) {
        window.clearInterval(this.camTimer);
        this.camTimer = null;
      }
      this.camStream?.getTracks().forEach((track) => track.stop());
      this.camStream = null;
      this.camActive = false;
      this.root.querySelector(".cam-overlay")?.remove();
      this.root.querySelectorAll(".cam-btn").forEach((btn) => {
        btn.textContent = t(this.lang, "camScan");
      });
    }
    async toggleCam(card) {
      if (this.camActive) {
        this.stopCam();
        return;
      }
      const Detector = barcodeDetector();
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        card.status = t(this.lang, "genScanNoApi");
        this.syncOutputs(this.unixNow());
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        this.camStream = stream;
        this.camActive = true;
        const overlay = document.createElement("div");
        overlay.className = "cam-overlay";
        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.srcObject = stream;
        const stop = document.createElement("button");
        stop.type = "button";
        stop.className = "ghost-btn cam-stop";
        stop.textContent = t(this.lang, "camScanStop");
        stop.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.stopCam();
        });
        overlay.append(video, stop);
        this.root.querySelector(".stage")?.append(overlay);
        this.root.querySelectorAll(".cam-btn").forEach((btn) => {
          btn.textContent = t(this.lang, "camScanStop");
        });
        await video.play().catch(() => void 0);
        const detector = new Detector({ formats: ["qr_code"] });
        this.camTimer = window.setInterval(() => {
          void this.detectCam(card, video, detector);
        }, 250);
      } catch {
        this.stopCam();
        card.status = t(this.lang, "genScanNoApi");
        this.syncOutputs(this.unixNow());
      }
    }
    async detectCam(card, video, detector) {
      if (!this.camActive || video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        const raw = codes[0]?.rawValue?.trim();
        if (!raw) return;
        this.stopCam();
        applySecretInput(card, raw, this.lang);
        this.pendingAutoHide = true;
        card.status = t(this.lang, "genScanOk");
        this.persistSession();
        this.render();
        await this.tick(true);
        if (card.valid) {
          await this.copy(card);
          this.lastAutoCode = card.code;
        }
      } catch {
      }
    }
  };

  // ../tmp/html-port/lang.ts
  function readStoredLang() {
    try {
      return localStorage.getItem(STORAGE_LANG_KEY);
    } catch {
      return null;
    }
  }
  function writeStoredLang(value) {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, value);
    } catch {
    }
  }
  function resolveLang(search) {
    const params = new URLSearchParams(search);
    const urlLang = params.get("lang");
    const stored = readStoredLang();
    if (stored && isLang(stored)) {
      return { lang: stored, selectValue: stored };
    }
    if (urlLang && isLang(urlLang)) {
      if (!stored) writeStoredLang(urlLang);
      return { lang: urlLang, selectValue: urlLang };
    }
    return { lang: detectLang(), selectValue: "zh" };
  }
  function applyLangChoice(choice) {
    const params = new URLSearchParams(location.search);
    if (isLang(choice)) {
      writeStoredLang(choice);
      params.set("lang", choice);
    }
    return params.toString();
  }

  // ../tmp/html-port/defaults.ts
  var DEFAULTS = { algorithm: "SHA-1", digits: 6, period: 30 };

  // ../tmp/html-port/url-secret.ts
  var SECRET_PARAM_KEYS = ["secret", "code", "key", "otp", "totp"];
  function pathFromLocation(pathname, baseUrl) {
    let path = pathname || "/";
    let base = baseUrl || "/";
    if (base === "./") base = "/";
    base = base.replace(/\/$/, "");
    if (base && path.startsWith(base)) {
      path = path.slice(base.length) || "/";
    }
    if (!path.startsWith("/")) path = `/${path}`;
    path = path.replace(/\/+$/, "");
    return path || "/";
  }
  function firstParam(params) {
    for (const key of SECRET_PARAM_KEYS) {
      const value = params.get(key);
      if (value) return value;
    }
    return null;
  }
  function extractUrlSecret(loc, reserved, baseUrl) {
    const hashRaw = loc.hash.startsWith("#") ? loc.hash.slice(1) : loc.hash;
    if (hashRaw) {
      if (hashRaw.includes("=")) {
        const fromHash = firstParam(new URLSearchParams(hashRaw));
        if (fromHash) return { secret: fromHash, source: "hash" };
      } else {
        try {
          const bare = decodeURIComponent(hashRaw);
          if (bare) return { secret: bare, source: "hash" };
        } catch {
          return { secret: hashRaw, source: "hash" };
        }
      }
    }
    const fromQuery = firstParam(new URLSearchParams(loc.search));
    if (fromQuery) return { secret: fromQuery, source: "query" };
    const path = pathFromLocation(loc.pathname, baseUrl);
    if (path !== "/" && !reserved.has(path)) {
      const candidate = path.slice(1);
      if (candidate && !candidate.includes("/")) {
        try {
          return { secret: decodeURIComponent(candidate), source: "path" };
        } catch {
          return { secret: candidate, source: "path" };
        }
      }
    }
    return null;
  }

  // ../tmp/html-port/main.ts
  var EMPTY_RESERVED = /* @__PURE__ */ new Set();
  var panel = null;
  function rewriteQuerySecretToHash(secret) {
    const params = new URLSearchParams(location.search);
    let changed = false;
    for (const key of ["secret", "code", "key", "otp", "totp"]) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const search = params.toString() ? "?" + params.toString() : "";
    history.replaceState({}, "", location.pathname + search + "#secret=" + encodeURIComponent(secret));
  }
  function bootstrapSecret() {
    const extracted = extractUrlSecret(location, EMPTY_RESERVED, "/");
    if (!extracted) return void 0;
    if (extracted.source !== "hash") rewriteQuerySecretToHash(extracted.secret);
    return extracted.secret;
  }
  function render() {
    const app = document.getElementById("app");
    if (!app) return;
    panel?.destroy();
    panel = null;
    const resolved = resolveLang(location.search);
    const lang = resolved.lang;
    document.documentElement.lang = lang === "zh" ? "zh" : "en";
    document.title = t(lang, "appName");
    const langOpts = LANGS.map((l) => {
      const sel = resolved.selectValue === l ? " selected" : "";
      return '<option value="' + l + '"' + sel + ">" + LANG_LABELS[l] + "</option>";
    }).join("");
    app.innerHTML = '<a class="skip" href="#content">' + t(lang, "skip") + '</a><header class="topbar"><span class="brand">' + t(lang, "appName") + '</span><label class="lang-label">' + t(lang, "lang") + '<select id="lang-select">' + langOpts + '</select></label></header><main id="content" class="has-generator is-tool"><div id="generator-root"></div></main><footer class="site-footer"><p class="privacy-note">' + t(lang, "privacyBanner") + "</p></footer>";
    document.getElementById("lang-select")?.addEventListener("change", (ev) => {
      const value = ev.target.value;
      const qs = applyLangChoice(value);
      history.replaceState({}, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
      render();
    });
    const genRoot = document.getElementById("generator-root");
    if (genRoot) {
      panel = new GeneratorPanel(genRoot, lang, DEFAULTS, bootstrapSecret());
    }
  }
  function start() {
    render();
  }
  if (typeof document !== "undefined") start();
})();
