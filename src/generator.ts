import { decodeBase32 } from "./base32";
import { displayNameFromOtpAuth, isOtpAuthUri, parseOtpAuth } from "./otpauth";
import { t, type Lang } from "./i18n";
import { generateTotp, remainingSeconds, type TotpAlgorithm } from "./totp";
import type { TotpDefaults } from "./routes-types";

export interface CardState {
  id: string;
  name: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
  code: string;
  valid: boolean;
  status: string;
}

const RING_R = 62;
const RING_C = 2 * Math.PI * RING_R;

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
    valid: false,
    status: "",
  };
}

function applySecretInput(card: CardState, raw: string, lang: Lang) {
  const value = raw.trim();
  if (!value) {
    card.secret = "";
    card.valid = false;
    card.code = "------";
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
    card.status = t(lang, "genWaiting");
    return;
  }
  try {
    const key = decodeBase32(card.secret);
    card.code = await generateTotp(key, {
      algorithm: card.algorithm,
      digits: card.digits,
      period: card.period,
      unixSeconds,
    });
    card.valid = true;
    const left = remainingSeconds(unixSeconds, card.period);
    card.status = `${t(lang, "genLive")} — ${t(lang, "genSeconds", { n: left })}`;
  } catch {
    card.valid = false;
    card.code = "------";
    card.status = t(lang, "genInvalid");
  }
}

export class GeneratorPanel {
  private root: HTMLElement;
  private lang: Lang;
  private defaults: TotpDefaults;
  private cards: CardState[] = [];
  private timer: number | null = null;
  private fileInput: HTMLInputElement | null = null;
  private scanTarget: CardState | null = null;

  constructor(root: HTMLElement, lang: Lang, defaults: TotpDefaults, bootstrapSecret?: string) {
    this.root = root;
    this.lang = lang;
    this.defaults = defaults;
    const first = newCard(defaults);
    if (bootstrapSecret) applySecretInput(first, bootstrapSecret, lang);
    this.cards.push(first);
    this.render();
    void this.tick();
    this.timer = window.setInterval(() => {
      void this.tick();
    }, 1000);
  }

  destroy() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    this.root.replaceChildren();
  }

  private async tick() {
    const now = Math.floor(Date.now() / 1000);
    await Promise.all(this.cards.map((c) => refreshCard(c, this.lang, now)));
    this.syncOutputs(now);
  }

  private syncOutputs(unixSeconds: number) {
    for (const card of this.cards) {
      const el = this.root.querySelector<HTMLElement>(`[data-card="${card.id}"]`);
      if (!el) continue;
      const codeBtn = el.querySelector<HTMLButtonElement>(".code-display");
      if (codeBtn) {
        codeBtn.textContent = card.code;
        codeBtn.disabled = !card.valid;
      }
      const status = el.querySelector(".status");
      if (status) status.textContent = card.status;
      const left = remainingSeconds(unixSeconds, card.period);
      const fg = el.querySelector<SVGCircleElement>(".ring-fg");
      if (fg) {
        const ratio = left / card.period;
        fg.style.strokeDasharray = String(RING_C);
        fg.style.strokeDashoffset = String(RING_C * (1 - ratio));
      }
      const label = el.querySelector(".ring-label");
      if (label) label.textContent = String(left);
      const name = el.querySelector<HTMLInputElement>(".name-input");
      if (name && name.value !== card.name) name.value = card.name;
      const secret = el.querySelector<HTMLInputElement>(".secret-input");
      if (secret && document.activeElement !== secret && secret.value !== card.secret) {
        secret.value = card.secret;
      }
      const digits = el.querySelector<HTMLSelectElement>(".digits-input");
      if (digits) digits.value = String(card.digits);
      const period = el.querySelector<HTMLInputElement>(".period-input");
      if (period && document.activeElement !== period) period.value = String(card.period);
      const alg = el.querySelector<HTMLSelectElement>(".alg-input");
      if (alg) alg.value = card.algorithm;
      const del = el.querySelector<HTMLButtonElement>(".delete-btn");
      if (del) del.hidden = this.cards.length === 1;
    }
  }

  private render() {
    this.root.innerHTML = "";
    const list = document.createElement("div");
    list.className = "generator-list";
    for (const card of this.cards) list.append(this.cardEl(card));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-btn";
    add.textContent = t(this.lang, "genAdd");
    add.addEventListener("click", () => {
      this.cards.push(newCard(this.defaults));
      this.render();
      void this.tick();
    });
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", () => void this.onFile());
    this.root.append(list, add, this.fileInput);
  }

  private cardEl(card: CardState): HTMLElement {
    const wrap = document.createElement("article");
    wrap.className = "generator-card";
    wrap.dataset.card = card.id;

    const top = document.createElement("div");
    top.className = "card-top";
    const name = document.createElement("input");
    name.className = "name-input";
    name.type = "text";
    name.autocomplete = "off";
    name.placeholder = t(this.lang, "genNamePh");
    name.setAttribute("aria-label", t(this.lang, "genName"));
    name.value = card.name;
    name.addEventListener("input", () => {
      card.name = name.value;
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
      this.render();
      void this.tick();
    });
    top.append(name, del);

    const secret = document.createElement("input");
    secret.className = "secret-input";
    secret.type = "text";
    secret.autocomplete = "off";
    secret.autocapitalize = "characters";
    secret.spellcheck = false;
    secret.placeholder = t(this.lang, "genSecretPh");
    secret.setAttribute("aria-label", t(this.lang, "genSecret"));
    secret.value = card.secret;
    secret.addEventListener("input", () => {
      applySecretInput(card, secret.value, this.lang);
      if (isOtpAuthUri(secret.value)) secret.value = card.secret;
      void this.tick();
    });

    const details = document.createElement("details");
    details.className = "totp-options";
    const sum = document.createElement("summary");
    sum.textContent = t(this.lang, "genOptions");
    const opts = document.createElement("div");
    opts.className = "options-grid";
    opts.append(
      this.selectField(t(this.lang, "genDigits"), "digits-input", ["6", "8"], String(card.digits), (v) => {
        card.digits = v === "8" ? 8 : 6;
        void this.tick();
      }),
      this.periodField(card),
      this.selectField(t(this.lang, "genAlgorithm"), "alg-input", ["SHA-1", "SHA-256", "SHA-512"], card.algorithm, (v) => {
        card.algorithm = v as TotpAlgorithm;
        void this.tick();
      }),
    );
    details.append(sum, opts);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const paste = document.createElement("button");
    paste.type = "button";
    paste.textContent = t(this.lang, "genPaste");
    paste.addEventListener("click", () => void this.paste(card, secret));
    const scan = document.createElement("button");
    scan.type = "button";
    scan.textContent = t(this.lang, "genScan");
    scan.addEventListener("click", () => {
      this.scanTarget = card;
      this.fileInput?.click();
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = t(this.lang, "genClear");
    clear.addEventListener("click", () => {
      card.secret = "";
      card.name = "";
      secret.value = "";
      void this.tick();
    });
    actions.append(paste, scan, clear);

    const display = document.createElement("div");
    display.className = "code-row";
    const codeBtn = document.createElement("button");
    codeBtn.type = "button";
    codeBtn.className = "code-display";
    codeBtn.textContent = card.code;
    codeBtn.disabled = !card.valid;
    codeBtn.title = t(this.lang, "copyHint");
    codeBtn.addEventListener("click", () => void this.copy(card));
    codeBtn.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void this.copy(card);
    });
    display.append(codeBtn, this.ringSvg());

    const status = document.createElement("p");
    status.className = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = card.status || t(this.lang, "genWaiting");

    wrap.append(top, secret, details, actions, display, status);
    return wrap;
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
      void this.tick();
    });
    const suffix = document.createElement("span");
    suffix.textContent = t(this.lang, "genPeriodUnit");
    row.append(input, suffix);
    wrap.append(row);
    return wrap;
  }

  private ringSvg(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 140 140");
    svg.setAttribute("class", "ring");
    svg.setAttribute("aria-hidden", "true");
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", "70");
    bg.setAttribute("cy", "70");
    bg.setAttribute("r", String(RING_R));
    bg.setAttribute("class", "ring-bg");
    const fg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fg.setAttribute("cx", "70");
    fg.setAttribute("cy", "70");
    fg.setAttribute("r", String(RING_R));
    fg.setAttribute("class", "ring-fg");
    fg.style.strokeDasharray = String(RING_C);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "70");
    text.setAttribute("y", "76");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "ring-label");
    text.textContent = "—";
    svg.append(bg, fg, text);
    return svg;
  }

  private async copy(card: CardState) {
    if (!card.valid) return;
    try {
      await navigator.clipboard.writeText(card.code);
      card.status = t(this.lang, "genCopied");
      this.syncOutputs(Math.floor(Date.now() / 1000));
    } catch {
      card.status = t(this.lang, "genCopyFail");
      this.syncOutputs(Math.floor(Date.now() / 1000));
    }
  }

  private async paste(card: CardState, input: HTMLInputElement) {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        card.status = t(this.lang, "genPasteEmpty");
        this.syncOutputs(Math.floor(Date.now() / 1000));
        return;
      }
      applySecretInput(card, text, this.lang);
      input.value = isOtpAuthUri(text) ? card.secret : text.trim();
      void this.tick();
    } catch {
      card.status = t(this.lang, "genPasteNeedPerm");
      this.syncOutputs(Math.floor(Date.now() / 1000));
    }
  }

  private async onFile() {
    const file = this.fileInput?.files?.[0];
    const card = this.scanTarget;
    if (this.fileInput) this.fileInput.value = "";
    if (!file || !card) return;
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector) {
      card.status = t(this.lang, "genScanNoApi");
      this.syncOutputs(Math.floor(Date.now() / 1000));
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const detector = new Detector({ formats: ["qr_code"] });
      const codes = await detector.detect(bmp);
      bmp.close();
      const raw = codes[0]?.rawValue?.trim();
      if (!raw) {
        card.status = t(this.lang, "genScanNoCode");
        this.syncOutputs(Math.floor(Date.now() / 1000));
        return;
      }
      applySecretInput(card, raw, this.lang);
      card.status = t(this.lang, "genScanOk");
      this.render();
      void this.tick();
    } catch {
      card.status = t(this.lang, "genScanNoCode");
      this.syncOutputs(Math.floor(Date.now() / 1000));
    }
  }
}
