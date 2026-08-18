import { expandPage, type CompactPage } from "./page-factory";
import type { Lang } from "./i18n";
import type { RouteDef, TotpDefaults } from "./routes-types";
import { SHA1_6 } from "./routes-types";

export function tool(opts: {
  path: string;
  titleEn: string;
  titleZh: string;
  titles?: Partial<Record<Lang, string>>;
  descEn: string;
  descZh: string;
  h1En: string;
  h1Zh: string;
  introEn: string;
  introZh: string;
  bodyEn: string;
  bodyZh: string;
  q1e: string; a1e: string; q2e: string; a2e: string; q3e: string; a3e: string;
  q1z: string; a1z: string; q2z: string; a2z: string; q3z: string; a3z: string;
  defaults?: TotpDefaults;
  showMatrix?: boolean;
}): RouteDef {
  const page: CompactPage = {
    path: opts.path,
    kind: "tool",
    titleEn: opts.titleEn,
    titleZh: opts.titleZh,
    titles: opts.titles,
    descEn: opts.descEn,
    descZh: opts.descZh,
    h1En: opts.h1En,
    h1Zh: opts.h1Zh,
    introEn: opts.introEn,
    introZh: opts.introZh,
    bodyEn: opts.bodyEn,
    bodyZh: opts.bodyZh,
    faqEn: [[opts.q1e, opts.a1e], [opts.q2e, opts.a2e], [opts.q3e, opts.a3e]],
    faqZh: [[opts.q1z, opts.a1z], [opts.q2z, opts.a2z], [opts.q3z, opts.a3z]],
    defaults: opts.defaults ?? SHA1_6,
    showGenerator: true,
    showMatrix: opts.showMatrix,
  };
  return expandPage(page);
}
