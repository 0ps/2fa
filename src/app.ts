import { GeneratorPanel } from "./generator";
import { dirFor, LANG_LABELS, LANGS, t, type Lang } from "./i18n";
import { applyLangChoice, resolveLang } from "./lang";
import { SUPPORT_MATRIX } from "./matrix";
import { allRoutes, findRoute, reservedPathSet, pickFaq, pickText, type RouteDef } from "./routes";
import { extractUrlSecret, pathFromLocation } from "./url-secret";
import { decodeBase32 } from "./base32";

const RING_RESERVED = reservedPathSet();
let panel: GeneratorPanel | null = null;

function baseUrl(): string {
  return import.meta.env.BASE_URL || "/";
}

function joinBase(path: string): string {
  const b = baseUrl();
  if (b === "/" || b === "./") return path;
  return `${b.replace(/\/$/, "")}${path}`;
}

function navigate(path: string, search = location.search, hash = location.hash) {
  const url = joinBase(path) + search + hash;
  history.pushState({}, "", url);
  render();
}

function currentPath(): string {
  return pathFromLocation(location.pathname, baseUrl());
}

function rewriteSecretToHash(secret: string, source: "hash" | "query" | "path") {
  if (source === "hash") return;
  const params = new URLSearchParams(location.search);
  for (const key of ["secret", "code", "key", "otp", "totp"]) params.delete(key);
  const search = params.toString() ? `?${params.toString()}` : "";
  const path = source === "path" ? "/" : currentPath();
  const next = joinBase(path) + search + `#secret=${encodeURIComponent(secret)}`;
  history.replaceState({}, "", next);
}

function jsonLd(route: RouteDef, lang: Lang): string {
  const faqs = pickFaq(lang, route.faq).map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  }));
  return JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs });
}

function linkList(routes: RouteDef[], lang: Lang): string {
  return `<ul class="link-list">${routes
    .map((r) => `<li><a href="${joinBase(r.path)}">${pickText(lang, r.titles)}</a></li>`)
    .join("")}</ul>`;
}

function renderMatrix(): string {
  const [head, ...rows] = SUPPORT_MATRIX;
  return `<table class="matrix"><caption></caption><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function sitemapHtml(lang: Lang): string {
  const routes = allRoutes();
  const groups: Array<["home" | "meta" | "guide" | "tool", string]> = [
    ["home", t(lang, "navHome")],
    ["meta", t(lang, "navSitemap")],
    ["guide", t(lang, "navGuides")],
    ["tool", t(lang, "navTools")],
  ];
  return groups
    .map(([kind, label]) => {
      const items = routes.filter((r) => (kind === "home" ? r.path === "/" : r.kind === kind && r.path !== "/"));
      if (!items.length) return "";
      return `<h2>${label}</h2>${linkList(items, lang)}`;
    })
    .join("");
}

export function render() {
  const app = document.getElementById("app");
  if (!app) return;
  panel?.destroy();
  panel = null;

  const resolved = resolveLang(location.search);
  if (resolved.redirectSearch != null && resolved.redirectSearch !== location.search.replace(/^\?/, "")) {
    const qs = resolved.redirectSearch ? `?${resolved.redirectSearch}` : "";
    history.replaceState({}, "", joinBase(currentPath()) + qs + location.hash);
  }
  const lang: Lang = resolved.lang;
  document.documentElement.lang = lang === "zh-tw" ? "zh-Hant" : lang;
  document.documentElement.dir = dirFor(lang);

  const path = currentPath();
  let route = findRoute(path);
  const extracted = extractUrlSecret(location, RING_RESERVED, baseUrl());

  if (!route && extracted?.source === "path") {
    try {
      decodeBase32(extracted.secret);
      rewriteSecretToHash(extracted.secret, "path");
      route = findRoute("/");
    } catch {
      route = undefined;
    }
  } else if (extracted && extracted.source !== "hash") {
    rewriteSecretToHash(extracted.secret, extracted.source);
  }

  const bootstrap = extractUrlSecret(location, RING_RESERVED, baseUrl())?.secret;

  if (!route) {
    document.body.classList.remove("is-tool");
    document.title = t(lang, "notFound");
    app.innerHTML = shell(lang, resolved.selectValue, null, `<div class="docs"><div class="page-head"><h1 tabindex="-1">${t(lang, "notFound")}</h1><p class="intro">${t(lang, "notFoundBody")}</p></div><p><a href="${joinBase("/")}">${t(lang, "ctaTools")}</a></p></div>`);
    bindChrome(lang);
    return;
  }

  document.body.classList.toggle("is-tool", Boolean(route.showGenerator));
  document.title = pickText(lang, route.titles);
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", pickText(lang, route.descriptions));

  const faqs = pickFaq(lang, route.faq);
  const faqHtml = `<section><h2>${t(lang, "faqTitle")}</h2><dl class="faq">${faqs.map((f) => `<dt>${f.q}</dt><dd>${f.a}</dd>`).join("")}</dl></section>`;
  const tools = allRoutes().filter((r) => r.kind === "tool").slice(0, 8);
  const guides = allRoutes().filter((r) => r.kind === "guide").slice(0, 8);
  const related = `<div class="related"><section><h2>${t(lang, "relatedTools")}</h2>${linkList(tools, lang)}</section><section><h2>${t(lang, "relatedGuides")}</h2>${linkList(guides, lang)}</section></div>`;
  const matrix = route.showMatrix
    ? `<section><h2>${t(lang, "matrixTitle")}</h2><p>${t(lang, "matrixCaption")}</p>${renderMatrix()}</section>`
    : "";
  const map = route.path === "/site-map" ? sitemapHtml(lang) : "";
  const pageHead = `<div class="page-head"><h1 tabindex="-1">${pickText(lang, route.h1)}</h1><p class="intro">${pickText(lang, route.intro)}</p></div>`;
  const docsInner = `${route.body ? pickText(lang, route.body) : ""}${map}${matrix}${faqHtml}${related}`;
  const main = route.showGenerator
    ? `${pageHead}<div id="generator-root"></div><details class="more-docs"><summary>${t(lang, "moreDocs")}</summary><div class="docs">${docsInner}</div></details>`
    : `<div class="docs">${pageHead}${docsInner}</div>`;

  app.innerHTML = shell(lang, resolved.selectValue, route, main, route.showGenerator);
  bindChrome(lang);
  const genRoot = document.getElementById("generator-root");
  if (genRoot && route.showGenerator) {
    panel = new GeneratorPanel(genRoot, lang, route.defaults ?? { algorithm: "SHA-1", digits: 6, period: 30 }, bootstrap);
  }
  if (route.kind === "tool" || route.kind === "home") {
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = jsonLd(route, lang);
    document.getElementById("content")?.append(ld);
  }
  if (!route.showGenerator) document.querySelector("h1")?.focus();
}

function chromeNav(lang: Lang, compact: boolean): string {
  const anchors = [
    `<a href="${joinBase("/")}">${t(lang, "navHome")}</a>`,
    `<a href="${joinBase("/totp-generator")}">${t(lang, "navTools")}</a>`,
    `<a href="${joinBase("/what-is-totp")}">${t(lang, "navGuides")}</a>`,
    `<a href="${joinBase("/site-map")}">${t(lang, "navSitemap")}</a>`,
    `<a href="${joinBase("/privacy")}">${t(lang, "navPrivacy")}</a>`,
    `<a href="${joinBase("/about")}">${t(lang, "navAbout")}</a>`,
  ].join("");
  if (compact) {
    return `<details class="more-nav"><summary>${t(lang, "moreNav")}</summary><div class="more-nav-panel">${anchors}</div></details>`;
  }
  return `<nav aria-label="${t(lang, "navHome")}">${anchors}</nav>`;
}

function shell(lang: Lang, selectValue: string, _route: RouteDef | null, main: string, withGenerator = false): string {
  const langOpts = [`<option value="auto">${t(lang, "langAuto")}</option>`]
    .concat(LANGS.map((l) => `<option value="${l}"${selectValue === l ? " selected" : ""}>${LANG_LABELS[l]}</option>`))
    .join("");
  const selectedAuto = selectValue === "auto" ? " selected" : "";
  const opts = langOpts.replace('<option value="auto">', `<option value="auto"${selectedAuto}>`);
  const mainClass = withGenerator ? ' class="has-generator is-tool"' : "";
  const footerClass = withGenerator ? "site-footer is-tool-footer" : "site-footer";
  return `
<a class="skip" href="#content">${t(lang, "skip")}</a>
<header class="topbar">
  <a class="brand" href="${joinBase("/")}">${t(lang, "appName")}</a>
  ${chromeNav(lang, withGenerator)}
  <label class="lang-label">${t(lang, "lang")}
    <select id="lang-select">${opts}</select>
  </label>
</header>
<main id="content"${mainClass}>${main}</main>
<footer class="${footerClass}">
  <p class="privacy-note">${t(lang, "privacyBanner")}</p>
  <p>${t(lang, "footerNote")}</p>
  <p>
    <a href="https://www.rfc-editor.org/rfc/rfc6238" rel="noopener">${t(lang, "footerRfc6238")}</a>
    · <a href="https://www.rfc-editor.org/rfc/rfc4226" rel="noopener">${t(lang, "footerRfc4226")}</a>
    · <a href="https://github.com/google/google-authenticator/wiki/Key-Uri-Format" rel="noopener">${t(lang, "footerKeyUri")}</a>
    · <a href="https://pages.nist.gov/800-63-3/sp800-63b.html" rel="noopener">${t(lang, "footerNist")}</a>
  </p>
</footer>`;
}

function bindChrome(lang: Lang) {
  document.getElementById("lang-select")?.addEventListener("change", (ev) => {
    const value = (ev.target as HTMLSelectElement).value;
    const qs = applyLangChoice(value, location.search);
    history.replaceState({}, "", joinBase(currentPath()) + (qs ? `?${qs}` : "") + location.hash);
    render();
  });
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href.startsWith(joinBase("/")) && !href.startsWith("/")) return;
    a.addEventListener("click", (ev) => {
      const url = new URL((a as HTMLAnchorElement).href);
      if (url.origin !== location.origin) return;
      ev.preventDefault();
      const path = pathFromLocation(url.pathname, baseUrl());
      navigate(path, url.search, url.hash);
    });
  });
  void lang;
}

export function start() {
  window.addEventListener("popstate", () => render());
  render();
}
