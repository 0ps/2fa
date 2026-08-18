import { expandPage } from "./page-factory";

export const ABOUT_ROUTE = expandPage({
  path: "/about",
  kind: "meta",
  titleEn: "About Local TOTP",
  titleZh: "关于本地 TOTP",
  titles: { "zh-tw": "關於本機 TOTP", es: "Acerca de TOTP local", ja: "ローカル TOTP について", de: "Über Local TOTP", fr: "À propos de TOTP local", ko: "로컬 TOTP 소개" },
  descEn: "Why this static TOTP site exists and how it relates to RFC 6238.",
  descZh: "这个静态 TOTP 站点为何存在，以及它与 RFC 6238 的关系。",
  h1En: "About this static TOTP site",
  h1Zh: "关于这个静态 TOTP 站点",
  introEn: "Local TOTP is an original, local-first implementation of RFC 6238 for people who already have a setup key and need a code without installing another mobile app.",
  introZh: "本地 TOTP 是 RFC 6238 的原创、本地优先实现，面向已经持有设置密钥、又不想再装一个手机应用的人。",
  bodyEn: "<p>The generator is vanilla TypeScript. Tests replay the eight-digit Appendix B vectors from RFC 6238 with injected unix times so they do not depend on Date.now.</p>",
  bodyZh: "<p>生成器是原生 TypeScript。测试使用注入的 unix 时间重放 RFC 6238 附录 B 的 8 位向量，因此不依赖 Date.now。</p>",
  faqEn: [
    ["Is the crypto audited?", "The code follows the RFCs and must pass the published Appendix B vectors."],
    ["Can I self-host?", "Yes. It is a Vite static build. See the README."],
  ],
  faqZh: [
    ["密码学经过审计吗？", "实现遵循 RFC，并且必须通过附录 B 公布的测试向量。"],
    ["可以自行托管吗？", "可以。这是 Vite 静态构建。详见 README。"],
  ],
});
