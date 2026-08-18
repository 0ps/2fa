import { expandPage, type CompactPage } from "./page-factory";

const guides: CompactPage[] = [
  {
    path: "/what-is-totp",
    kind: "guide",
    titleEn: "What is TOTP?",
    titleZh: "什么是 TOTP？",
    titles: { "zh-tw": "什麼是 TOTP？", es: "¿Qué es TOTP?", hi: "TOTP क्या है?", ar: "ما هو TOTP؟", bn: "TOTP কী?", pt: "O que é TOTP?", ru: "Что такое TOTP?", ja: "TOTP とは", de: "Was ist TOTP?", fr: "Qu’est-ce que TOTP ?", ko: "TOTP란?", it: "Che cos’è TOTP?", tr: "TOTP nedir?", vi: "TOTP là gì?", id: "Apa itu TOTP?", th: "TOTP คืออะไร", nl: "Wat is TOTP?", pl: "Co to jest TOTP?", uk: "Що таке TOTP?" },
    descEn: "Time-based one-time passwords explained without requiring a vendor app.",
    descZh: "不依赖厂商应用，说明基于时间的一次性密码。",
    h1En: "TOTP is a shared secret plus a clock",
    h1Zh: "TOTP 就是共享密钥加上时钟",
    introEn: "A time-based one-time password is a short code derived from a shared setup key and the current unix time sliced into periods, usually 30 seconds.",
    introZh: "基于时间的一次性密码是由共享设置密钥和按周期（通常 30 秒）切片的当前 unix 时间计算出来的短码。",
    bodyEn: "<p>RFC 6238 builds on HOTP (RFC 4226). Instead of a counter you increment, TOTP uses floor(unixSeconds / period). Both sides must agree on the secret, digits, period, and hash algorithm. This site computes that locally with Web Crypto HMAC.</p>",
    bodyZh: "<p>RFC 6238 建立在 HOTP（RFC 4226）之上。TOTP 不用递增计数器，而用 floor(unixSeconds / period)。双方必须约定密钥、位数、周期和哈希算法。本站用 Web Crypto HMAC 在本地计算。</p>",
    faqEn: [
      ["Is TOTP the same as SMS 2FA?", "No. SMS delivers a code the issuer generated. TOTP lets both the issuer and you compute the same code from a shared key."],
      ["What happens if my clock is wrong?", "Codes drift. Most verifiers allow one extra time step. Sync the device clock if codes are rejected."],
    ],
    faqZh: [
      ["TOTP 和短信 2FA 一样吗？", "不一样。短信是发行方生成后发给你的。TOTP 让发行方和你用同一把密钥各自算出相同的码。"],
      ["时钟不准会怎样？", "验证码会偏移。多数校验方允许相邻一个时间步。如果总被拒绝，请同步设备时钟。"],
    ],
  },
];

export const GUIDE_ROUTES = guides.map(expandPage);
