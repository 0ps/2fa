import type { Lang } from "./i18n";
import type { TotpAlgorithm } from "./totp";

export type RouteKind = "home" | "tool" | "guide" | "meta";

export interface FaqItem {
  q: string;
  a: string;
}

export interface TotpDefaults {
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number;
}

export interface RouteDef {
  path: string;
  kind: RouteKind;
  titles: Partial<Record<Lang, string>> & { en: string; zh: string };
  descriptions: { en: string; zh: string };
  h1: { en: string; zh: string };
  intro: { en: string; zh: string };
  body?: { en: string; zh: string };
  faq: { en: FaqItem[]; zh: FaqItem[] };
  defaults?: TotpDefaults;
  showGenerator?: boolean;
  showMatrix?: boolean;
}

export const SHA1_6: TotpDefaults = { algorithm: "SHA-1", digits: 6, period: 30 };
export const SHA1_8: TotpDefaults = { algorithm: "SHA-1", digits: 8, period: 30 };
export const SHA256_6: TotpDefaults = { algorithm: "SHA-256", digits: 6, period: 30 };
export const SHA512_6: TotpDefaults = { algorithm: "SHA-512", digits: 6, period: 30 };

export function faq(en: FaqItem[], zh: FaqItem[]) {
  return { en, zh };
}

export function pickText(lang: Lang, map: { en: string; zh: string } & Partial<Record<Lang, string>>): string {
  if (lang === "zh-tw") return map["zh-tw"] || map.zh || map.en;
  return map[lang] || map.en;
}

export function pickFaq(lang: Lang, faqMap: { en: FaqItem[]; zh: FaqItem[] }): FaqItem[] {
  if (lang === "zh" || lang === "zh-tw") return faqMap.zh;
  return faqMap.en;
}

export const EXTRA_RESERVED = [
  "/robots.txt",
  "/llms.txt",
  "/sitemap-index.xml",
  "/sitemap.xml",
  "/sitemap-pages.xml",
  "/sitemap-tools.xml",
  "/favicon",
  "/favicon.svg",
  "/icon",
  "/icon.svg",
  "/og",
  "/og.svg",
  "/manifest.webmanifest",
  "/rfc6238-test-vectors.json",
  "/assets",
];
