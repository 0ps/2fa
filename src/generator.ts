import { decodeBase32 } from "./base32";
import { displayNameFromOtpAuth, isOtpAuthUri, parseOtpAuth, toOtpAuthUri } from "./otpauth";
import { t, type Lang } from "./i18n";
import { generateTotp, remainingSeconds, type TotpAlgorithm } from "./totp";
import type { TotpDefaults } from "./routes-types";
import { toDataURL as qrToDataUrl } from "qrcode";
import {
  SESSION_KEY,
  VAULT_KEY,
  clampOffset,
  fillOrAddAction,
  hasDuplicateSecret,
  loadVault,
  pickStoredPayload,
  saveVault,
  type PersistedCard,
  type StorageLike,
} from "./vault";

export interface CardState {
  id: string;
  name: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
  code: string;
  nextCode: string;
  valid: boolean;
  status: string;
}

function formatDisplayCode(code: string): string {
  if (/^\d{6}$/.test(code)) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (/^\d{8}$/.test(code)) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

export function formatLocalClock(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function codeToCopy(remaining: number, code: string, nextCode: string): { value: string; isNext: boolean } {
  if (remaining <= 2 && nextCode && nextCode !== "------") {
    return { value: nextCode, isNext: true };
  }
  return { value: code, isNext: false };
}

export function paramsChipText(algorithm: string, digits: number, period: number): string {
  return `${algorithm} · ${digits} · ${period}s`;
}

export function imageMimeFromTypes(types: readonly string[]): string | undefined {
  return types.find((type) => type.startsWith("image/"));
}

export function imageFilesFromList(files: ArrayLike<File> | null | undefined): File[] {
  if (!files?.length) return [];
  return Array.from(files).filter((file) => file.type.startsWith("image/"));
}

function decodedSecret(raw: string): string {
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

function browserStorage(which: "local" | "session"): StorageLike | null {
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

export function fileFromImageBlob(blob: Blob, mime: string): File {
  return new File([blob], "clipboard-image", { type: mime });
}

export type PasteDataLike = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<{ type: string; getAsFile: () => File | null }> | null;
};

export function imageFileFromPasteData(data: PasteDataLike | null | undefined): File | undefined {
  if (!data) return undefined;
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
  return undefined;
}

export function shouldAutoCopyCode(lastAutoCode: string, code: string, valid: boolean): boolean {
  return valid && code !== lastAutoCode;
}

export function joinOtpAuthUris(uris: string[]): string {
  return uris.join("\n");
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function barcodeDetector(): BarcodeDetectorCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

export function camScanSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(barcodeDetector());
}

let seq = 1;

function newCard(defaults: TotpDefaults): CardState {
  return {
    id: `card-${seq++}`,
    name: "",
    secret: "",
    algorithm: defaults.algorithm,
    digits: defaults.digits,
    period: defaults.period,
    code: "------",
    nextCode: "------",
    valid: false,
    status: "",
  };
}

function isAlgorithm(value: unknown): value is TotpAlgorithm {
  return value === "SHA-1" || value === "SHA-256" || value === "SHA-512";
}

function cardFromPersisted(raw: PersistedCard, defaults: TotpDefaults): CardState {
  const card = newCard(defaults);
  card.name = typeof raw.name === "string" ? raw.name : "";
  card.secret = typeof raw.secret === "string" ? raw.secret : "";
  if (isAlgorithm(raw.algorithm)) card.algorithm = raw.algorithm;
  if (raw.digits === 6 || raw.digits === 8) card.digits = raw.digits;
  if (typeof raw.period === "number" && Number.isFinite(raw.period)) {
    card.period = Math.min(120, Math.max(10, Math.round(raw.period)));
  }
  return card;
}

function applySecretInput(card: CardState, raw: string, lang: Lang) {
  const value = raw.trim();
  if (!value) {
    card.secret = "";
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

async function refreshCard(card: CardState, lang: Lang, unixSeconds: number) {
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
      generateTotp(key, { ...opts, unixSeconds: unixSeconds + left }),
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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function dragHasPayload(ev: DragEvent): boolean {
  const types = ev.dataTransfer?.types;
  if (!types) return false;
  const list = [...types];
  return list.includes("Files") || list.includes("text/plain") || list.includes("text/uri-list");
}

function isFileDrag(ev: DragEvent): boolean {
  return Boolean(ev.dataTransfer?.types && [...ev.dataTransfer.types].includes("Files"));
}

function secretLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export class GeneratorPanel {
  private root: HTMLElement;
  private lang: Lang;
  private defaults: TotpDefaults;
  private cards: CardState[] = [];
  private selectedId = "";
  private timer: number | null = null;
  private copiedTimer: number | null = null;
  private fileInput: HTMLInputElement | null = null;
  private scanTarget: CardState | null = null;
  private timeOffset = 0;
  private secretVisible = true;
  private pendingAutoHide = true;
  private camStream: MediaStream | null = null;
  private camTimer: number | null = null;
  private camActive = false;
  private lastAutoCode = "";

  constructor(root: HTMLElement, lang: Lang, defaults: TotpDefaults, bootstrapSecret?: string) {
    this.root = root;
    this.lang = lang;
    this.defaults = defaults;
    const local = loadVault(browserStorage("local"), VAULT_KEY);
    const session = loadVault(browserStorage("session"), SESSION_KEY);
    const stored = pickStoredPayload(local, session);
    if (stored) this.timeOffset = stored.payload.timeOffset;
    if (bootstrapSecret) {
      const first = newCard(defaults);
      applySecretInput(first, bootstrapSecret, lang);
      this.cards.push(first);
    } else if (stored) {
      this.cards = stored.payload.cards.map((c) => cardFromPersisted(c, defaults));
      if (stored.from === "local") {
        try {
          saveVault(browserStorage("session"), SESSION_KEY, stored.payload.cards, stored.payload.timeOffset);
        } catch {
          /* private mode / quota */
        }
      }
    }
    if (!this.cards.length) this.cards.push(newCard(defaults));
    this.selectedId = this.cards[0].id;
    this.render();
    void this.tick();
    this.timer = window.setInterval(() => {
      void this.tick();
    }, 1000);
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

  private unixNow(): number {
    return Math.floor(Date.now() / 1000) + this.timeOffset;
  }

  private snapshotCards(): PersistedCard[] {
    return this.cards.map((c) => ({
      name: c.name,
      secret: c.secret,
      algorithm: c.algorithm,
      digits: c.digits,
      period: c.period,
    }));
  }

  private persistSession() {
    const cards = this.snapshotCards();
    try {
      saveVault(browserStorage("session"), SESSION_KEY, cards, this.timeOffset);
    } catch {
      /* private mode / quota */
    }
    try {
      saveVault(browserStorage("local"), VAULT_KEY, cards, this.timeOffset);
    } catch {
      /* private mode / quota */
    }
  }

  private clearDeviceRecords() {
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

  private selected(): CardState {
    return this.cards.find((c) => c.id === this.selectedId) ?? this.cards[0];
  }

  private selectCard(id: string) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.render();
    void this.tick();
  }

  private addCard() {
    const next = newCard(this.defaults);
    this.cards.push(next);
    this.selectedId = next.id;
    this.persistSession();
    this.render();
    void this.tick();
  }

  private async tick(skipAutoCopy = false) {
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

  private railName(card: CardState): string {
    return card.name.trim() || t(this.lang, "genNamePh");
  }

  private leftLabel(card: CardState, unixSeconds: number): string {
    return `${remainingSeconds(unixSeconds, card.period)}${t(this.lang, "genPeriodUnit")}`;
  }

  private syncOutputs(unixSeconds: number) {
    const workspace = this.root.querySelector<HTMLElement>(".workspace");
    if (workspace) workspace.classList.toggle("workspace--solo", this.cards.length === 1);

    for (const card of this.cards) {
      const item = this.root.querySelector<HTMLElement>(`.rail-item[data-card="${card.id}"]`);
      if (!item) continue;
      const name = item.querySelector(".rail-name");
      if (name) name.textContent = this.railName(card);
      const code = item.querySelector(".rail-code");
      if (code) code.textContent = formatDisplayCode(card.code);
      const left = item.querySelector(".rail-left");
      if (left) left.textContent = this.leftLabel(card, unixSeconds);
      if (card.id === this.selectedId) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    }

    const card = this.selected();
    if (!card) return;
    const stage = this.root.querySelector<HTMLElement>(".stage");
    if (!stage) return;

    const left = remainingSeconds(unixSeconds, card.period);
    const urgent = card.valid && left <= 5;
    const showNext = card.valid && (left <= 10 || urgent);
    const noSecret = !card.secret.trim();
    if (card.valid && this.pendingAutoHide) {
      this.secretVisible = false;
      this.pendingAutoHide = false;
    }

    const cardTop = stage.querySelector<HTMLElement>(".card-top");
    if (cardTop) cardTop.hidden = noSecret && this.cards.length === 1;
    const nameInput = stage.querySelector<HTMLInputElement>(".name-input");
    if (nameInput) nameInput.placeholder = t(this.lang, "genNameQuiet");

    const codeRow = stage.querySelector<HTMLElement>(".code-row");
    if (codeRow) codeRow.hidden = !card.valid;
    const codeBtn = stage.querySelector<HTMLButtonElement>(".code-display");
    if (codeBtn) {
      codeBtn.hidden = !card.valid;
      codeBtn.textContent = formatDisplayCode(card.code);
      codeBtn.disabled = !card.valid;
      codeBtn.classList.toggle("is-urgent", urgent);
    }
    const otpLeft = stage.querySelector<HTMLElement>(".otp-left");
    if (otpLeft) {
      otpLeft.hidden = !card.valid;
      otpLeft.textContent = card.valid ? String(left) : "";
      otpLeft.setAttribute("aria-label", t(this.lang, "genSeconds", { n: left }));
    }
    const copyCodeBtn = stage.querySelector<HTMLButtonElement>(".copy-code-btn");
    if (copyCodeBtn) copyCodeBtn.hidden = !card.valid;
    const board = stage.querySelector<HTMLElement>(".otp-board");
    if (board) {
      board.classList.toggle("has-code", card.valid);
      board.classList.toggle("is-urgent", urgent);
      board.classList.toggle("is-empty", noSecret);
    }
    const bar = stage.querySelector<HTMLElement>(".otp-bar");
    if (bar) bar.hidden = !card.valid;
    const fill = stage.querySelector<HTMLElement>(".otp-bar-fill");
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, (left / card.period) * 100))}%`;
    const chip = stage.querySelector<HTMLElement>(".params-chip");
    if (chip) {
      chip.hidden = !card.valid;
      if (card.valid) chip.textContent = paramsChipText(card.algorithm, card.digits, card.period);
    }
    const nextEl = stage.querySelector<HTMLElement>(".next-code");
    if (nextEl) {
      nextEl.hidden = !showNext;
      nextEl.classList.toggle("is-urgent", urgent);
      if (showNext) nextEl.textContent = t(this.lang, "nextCode", { code: formatDisplayCode(card.nextCode) });
    }
    const hint = stage.querySelector<HTMLElement>(".otp-hint");
    if (hint) hint.hidden = true;
    const emptyActions = stage.querySelector<HTMLElement>(".empty-actions");
    if (emptyActions) emptyActions.hidden = !noSecret;
    const emptyCta = stage.querySelector<HTMLButtonElement>(".empty-cta");
    if (emptyCta) emptyCta.hidden = !noSecret;
    const dropHint = stage.querySelector<HTMLElement>(".drop-hint");
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
    const name = stage.querySelector<HTMLInputElement>(".name-input");
    if (name && name.value !== card.name) name.value = card.name;
    const secret = stage.querySelector<HTMLInputElement>(".secret-input");
    if (secret && document.activeElement !== secret && secret.value !== card.secret) {
      secret.value = card.secret;
    }
    if (secret) secret.type = this.secretVisible ? "text" : "password";
    const hideBtn = stage.querySelector<HTMLButtonElement>(".hide-secret-btn");
    if (hideBtn) {
      hideBtn.hidden = noSecret;
      hideBtn.textContent = t(this.lang, this.secretVisible ? "hideSecret" : "showSecret");
    }
    const pasteBtn = stage.querySelector<HTMLButtonElement>(".paste-btn");
    if (pasteBtn) pasteBtn.hidden = true;
    const clearBtn = stage.querySelector<HTMLButtonElement>(".clear-btn");
    if (clearBtn) clearBtn.hidden = noSecret;
    const canCam = camScanSupported();
    stage.querySelectorAll<HTMLButtonElement>(".scan-empty").forEach((btn) => {
      if (btn.classList.contains("scan-row")) {
        btn.hidden = card.valid || noSecret;
      } else {
        btn.hidden = card.valid;
      }
    });
    stage.querySelectorAll<HTMLButtonElement>(".cam-empty").forEach((btn) => {
      btn.hidden = card.valid || !canCam;
      btn.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
    });
    stage.querySelectorAll<HTMLButtonElement>(".scan-live").forEach((btn) => {
      btn.hidden = !card.valid;
    });
    stage.querySelectorAll<HTMLButtonElement>(".cam-live").forEach((btn) => {
      btn.hidden = !card.valid || !canCam;
      btn.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
    });
    const digits = stage.querySelector<HTMLSelectElement>(".digits-input");
    if (digits) digits.value = String(card.digits);
    const period = stage.querySelector<HTMLInputElement>(".period-input");
    if (period && document.activeElement !== period) period.value = String(card.period);
    const alg = stage.querySelector<HTMLSelectElement>(".alg-input");
    if (alg) alg.value = card.algorithm;
    const del = stage.querySelector<HTMLButtonElement>(".delete-btn");
    if (del) del.hidden = this.cards.length === 1;
    const addInline = stage.querySelector<HTMLButtonElement>(".add-inline");
    if (addInline) addInline.hidden = !(card.valid && this.cards.length === 1);
    const extra = stage.querySelector<HTMLElement>(".more-actions");
    if (extra) extra.hidden = !card.valid;
    const clockRange = stage.querySelector<HTMLInputElement>(".clock-range");
    const clockNum = stage.querySelector<HTMLInputElement>(".clock-num");
    if (clockRange && document.activeElement !== clockRange) clockRange.value = String(this.timeOffset);
    if (clockNum && document.activeElement !== clockNum) clockNum.value = String(this.timeOffset);
  }

  private render() {
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
    for (const card of this.cards) list.append(this.railItem(card));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-btn";
    add.textContent = t(this.lang, "genAdd");
    add.addEventListener("click", () => this.addCard());
    rail.append(railLabel, list, add);

    const stage = this.stageEl(selected);

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.multiple = true;
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", () => void this.onFile());

    workspace.append(rail, stage, this.fileInput);
    this.root.append(workspace);

    if (!selected.secret.trim()) {
      this.root.querySelector<HTMLInputElement>(".secret-input")?.focus();
    }
  }

  private railItem(card: CardState): HTMLButtonElement {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "rail-item";
    item.dataset.card = card.id;
    if (card.id === this.selectedId) item.setAttribute("aria-current", "true");
    const name = document.createElement("span");
    name.className = "rail-name";
    name.textContent = this.railName(card);
    const code = document.createElement("span");
    code.className = "rail-code";
    code.textContent = formatDisplayCode(card.code);
    const left = document.createElement("span");
    left.className = "rail-left";
    left.textContent = this.leftLabel(card, this.unixNow());
    item.append(name, code, left);
    item.addEventListener("click", () => this.selectCard(card.id));
    return item;
  }

  private stageEl(card: CardState): HTMLElement {
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
    top.append(name, addInline, del);
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
      const secretInput = this.root.querySelector<HTMLInputElement>(".secret-input");
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
      if (isOtpAuthUri(secret.value)) secret.value = card.secret;
      this.pendingAutoHide = true;
      this.secretVisible = true;
      secret.type = "text";
      this.persistSession();
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
    // Empty state already shows Upload QR in .empty-actions; keep a row button for invalid secrets.
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
    extra.hidden = !card.valid;
    const extraSum = document.createElement("summary");
    extraSum.textContent = t(this.lang, "moreActions");
    const extraBody = document.createElement("div");
    extraBody.className = "more-actions-body";
    const copyUri = document.createElement("button");
    copyUri.type = "button";
    copyUri.className = "ghost-btn copy-uri-btn";
    copyUri.textContent = t(this.lang, "copyUri");
    copyUri.addEventListener("click", () => void this.copyUri(card));
    const showQr = document.createElement("button");
    showQr.type = "button";
    showQr.className = "ghost-btn show-qr-btn";
    showQr.textContent = t(this.lang, "showQr");
    showQr.addEventListener("click", () => void this.showQr(card));
    const scanLive = this.scanButton(card, "scan-live");
    scanLive.hidden = !card.valid;
    const camLive = this.camButton(card, "cam-live");
    camLive.hidden = !card.valid || !camScanSupported();
    const copyAll = document.createElement("button");
    copyAll.type = "button";
    copyAll.className = "ghost-btn copy-all-uri-btn";
    copyAll.textContent = t(this.lang, "copyAllUri");
    copyAll.addEventListener("click", () => void this.copyAllUri());
    const clearVault = document.createElement("button");
    clearVault.type = "button";
    clearVault.className = "ghost-btn clear-vault-btn";
    clearVault.textContent = t(this.lang, "clearVault");
    clearVault.addEventListener("click", () => this.clearDeviceRecords());
    extraBody.append(copyUri, copyAll, showQr, scanLive, camLive, clearVault);
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
        card.algorithm = v as TotpAlgorithm;
        this.persistSession();
        void this.tick();
      }),
      this.clockEl(),
    );
    details.append(sum, opts);

    stage.append(top, board, row, extra, meta, sessionHint, details);
    return stage;
  }

  private clockEl(): HTMLElement {
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
    const apply = (raw: string) => {
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

  private bindDrop(stage: HTMLElement, card: CardState) {
    let depth = 0;
    const enter = (ev: DragEvent) => {
      if (!dragHasPayload(ev)) return;
      ev.preventDefault();
      depth++;
      stage.classList.add("is-drop");
    };
    const over = (ev: DragEvent) => {
      if (!dragHasPayload(ev)) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
      stage.classList.add("is-drop");
    };
    const leave = (ev: DragEvent) => {
      if (!dragHasPayload(ev)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) stage.classList.remove("is-drop");
    };
    const drop = (ev: DragEvent) => {
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
        const input = this.root.querySelector<HTMLInputElement>(".secret-input");
        void this.applyPastedText(card, text, input);
      }
    };
    stage.addEventListener("dragenter", enter);
    stage.addEventListener("dragover", over);
    stage.addEventListener("dragleave", leave);
    stage.addEventListener("drop", drop);
  }

  private selectField(
    label: string,
    cls: string,
    values: string[],
    current: string,
    onChange: (v: string) => void,
  ): HTMLElement {
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

  private periodField(card: CardState): HTMLElement {
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

  private flashCopied() {
    const board = this.root.querySelector<HTMLElement>(".otp-board");
    const status = this.root.querySelector<HTMLElement>(".status");
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

  private async copy(card: CardState) {
    if (!card.valid) return;
    const left = remainingSeconds(this.unixNow(), card.period);
    const picked = codeToCopy(left, card.code, card.nextCode);
    try {
      await navigator.clipboard.writeText(picked.value);
      this.lastAutoCode = card.code;
      card.status = picked.isNext
        ? t(this.lang, "genCopiedNext", { code: picked.value })
        : t(this.lang, "genCopied", { code: picked.value });
      this.flashCopied();
      this.syncOutputs(this.unixNow());
    } catch {
      card.status = t(this.lang, "genCopyFail");
      this.syncOutputs(this.unixNow());
    }
  }

  private async copyUri(card: CardState) {
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

  private async copyAllUri() {
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

  private closeQr() {
    this.root.querySelector(".qr-popover")?.remove();
  }

  private async showQr(card: CardState) {
    const existing = this.root.querySelector(".qr-popover");
    if (existing) {
      existing.remove();
      return;
    }
    if (!card.secret.trim()) return;
    try {
      const uri = toOtpAuthUri(card);
      const dataUrl = await qrToDataUrl(uri, { width: 200, margin: 1, errorCorrectionLevel: "M" });
      const pop = document.createElement("div");
      pop.className = "qr-popover";
      pop.setAttribute("role", "dialog");
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = uri;
      img.width = 200;
      img.height = 200;
      const close = document.createElement("button");
      close.type = "button";
      close.className = "ghost-btn";
      close.textContent = "×";
      close.setAttribute("aria-label", t(this.lang, "genClear"));
      close.addEventListener("click", () => pop.remove());
      pop.append(img, close);
      this.root.querySelector(".stage")?.append(pop);
    } catch {
      card.status = t(this.lang, "genCopyFail");
      this.syncOutputs(this.unixNow());
    }
  }

  private async applyPastedText(card: CardState, text: string, input?: HTMLInputElement | null) {
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
    if (added) this.render();
    await this.tick(true);
    if (card.valid) {
      this.root.querySelector<HTMLButtonElement>(".code-display")?.focus();
      await this.copy(card);
      this.lastAutoCode = card.code;
    }
  }

  private async paste(card: CardState, input: HTMLInputElement) {
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
            const text = await (await item.getType("text/plain")).text();
            if (text.trim()) {
              await this.applyPastedText(card, text, input);
              return;
            }
          }
        } catch {
          /* fall through to readText */
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

  private onPaste = (ev: ClipboardEvent) => {
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
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    if (isTypingTarget(ev.target)) return;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    const pasteCombo = (ev.metaKey || ev.ctrlKey) && !ev.altKey && key === "v";
    const pasteBare = !ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.shiftKey && key === "v";
    if (pasteCombo || pasteBare) {
      ev.preventDefault();
      const card = this.selected();
      const input = this.root.querySelector<HTMLInputElement>(".secret-input");
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
    }
  };

  private async decodeQrImage(file: File): Promise<string | null> {
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

  private applyDecodedSecret(raw: string): "fill" | "add" | "skip" {
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

  private async onFile(filesOverride?: File | File[]) {
    const files = filesOverride
      ? (Array.isArray(filesOverride) ? filesOverride : [filesOverride]).filter((f) => !f.type || f.type.startsWith("image/"))
      : imageFilesFromList(this.fileInput?.files);
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
        /* unreadable image */
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

  private scanButton(card: CardState, extraClass: string): HTMLButtonElement {
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

  private camButton(card: CardState, extraClass: string): HTMLButtonElement {
    const cam = document.createElement("button");
    cam.type = "button";
    cam.className = `ghost-btn cam-btn ${extraClass}`;
    cam.textContent = t(this.lang, this.camActive ? "camScanStop" : "camScan");
    cam.addEventListener("click", () => void this.toggleCam(card));
    return cam;
  }

  private stopCam() {
    if (this.camTimer != null) {
      window.clearInterval(this.camTimer);
      this.camTimer = null;
    }
    this.camStream?.getTracks().forEach((track) => track.stop());
    this.camStream = null;
    this.camActive = false;
    this.root.querySelector(".cam-overlay")?.remove();
    this.root.querySelectorAll<HTMLButtonElement>(".cam-btn").forEach((btn) => {
      btn.textContent = t(this.lang, "camScan");
    });
  }

  private async toggleCam(card: CardState) {
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
        audio: false,
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
      this.root.querySelectorAll<HTMLButtonElement>(".cam-btn").forEach((btn) => {
        btn.textContent = t(this.lang, "camScanStop");
      });
      await video.play().catch(() => undefined);
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

  private async detectCam(
    card: CardState,
    video: HTMLVideoElement,
    detector: { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> },
  ) {
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
      /* keep scanning */
    }
  }
}
