import { expandPage } from "./page-factory";

export const SITEMAP_ROUTE = expandPage({
  path: "/site-map",
  kind: "meta",
  titleEn: "Site map",
  titleZh: "网站地图",
  titles: { "zh-tw": "網站地圖", es: "Mapa del sitio", ja: "サイトマップ", de: "Sitemap", fr: "Plan du site", ko: "사이트맵", ru: "Карта сайта", pt: "Mapa do site", ar: "خريطة الموقع", hi: "साइट मैप", it: "Mappa del sito", tr: "Site haritası", vi: "Sơ đồ trang", id: "Peta situs", th: "แผนผังเว็บ", nl: "Sitemap", pl: "Mapa witryny", uk: "Мапа сайту", bn: "সাইট ম্যাপ" },
  descEn: "HTML index of every Local TOTP page, tool, and guide.",
  descZh: "本地 TOTP 全部页面、工具与指南的 HTML 索引。",
  h1En: "HTML site map",
  h1Zh: "HTML 网站地图",
  introEn: "Every public path on this static site is listed below, grouped the same way as the XML sitemaps. Reserved names such as robots.txt and rfc6238-test-vectors.json are not treated as Base32 secrets.",
  introZh: "本静态站点的全部公开路径按与 XML 站点地图相同的分组列在下方。robots.txt、rfc6238-test-vectors.json 等保留名不会被当成 Base32 密钥。",
  faqEn: [
    ["Is this the same as sitemap.xml?", "The XML files are for crawlers. This page is a human-readable index with the same paths."],
    ["Why are some paths reserved?", "A setup key pasted into the address bar should not collide with robots.txt, assets, or a documented tool URL."],
  ],
  faqZh: [
    ["这和 sitemap.xml 一样吗？", "XML 文件给爬虫用。本页是相同路径的可读索引。"],
    ["为什么有些路径被保留？", "地址栏里粘贴的设置密钥不应与 robots.txt、静态资源或已有工具地址冲突。"],
  ],
});
