import type { Lang } from "./i18n";
import { faq, type RouteDef, type RouteKind, type TotpDefaults, SHA1_6 } from "./routes-types";

export type CompactPage = {
  path: string;
  kind: RouteKind;
  titleEn: string;
  titleZh: string;
  titles?: Partial<Record<Lang, string>>;
  descEn: string;
  descZh: string;
  h1En: string;
  h1Zh: string;
  introEn: string;
  introZh: string;
  bodyEn?: string;
  bodyZh?: string;
  faqEn: Array<[string, string]>;
  faqZh: Array<[string, string]>;
  defaults?: TotpDefaults;
  showGenerator?: boolean;
  showMatrix?: boolean;
};

export function expandPage(p: CompactPage): RouteDef {
  const showGenerator = p.showGenerator ?? (p.kind === "tool" || p.kind === "home");
  return {
    path: p.path,
    kind: p.kind,
    titles: { en: p.titleEn, zh: p.titleZh, ...p.titles },
    descriptions: { en: p.descEn, zh: p.descZh },
    h1: { en: p.h1En, zh: p.h1Zh },
    intro: { en: p.introEn, zh: p.introZh },
    body: p.bodyEn && p.bodyZh ? { en: p.bodyEn, zh: p.bodyZh } : undefined,
    faq: faq(
      p.faqEn.map(([q, a]) => ({ q, a })),
      p.faqZh.map(([q, a]) => ({ q, a })),
    ),
    defaults: p.defaults ?? (showGenerator ? SHA1_6 : undefined),
    showGenerator,
    showMatrix: p.showMatrix,
  };
}
