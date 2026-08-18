import { expandPage } from "./page-factory";

export const PRIVACY_ROUTE = expandPage({
  path: "/privacy",
  kind: "meta",
  titleEn: "Privacy model",
  titleZh: "隐私模型",
  titles: { "zh-tw": "隱私模型", es: "Modelo de privacidad", ja: "プライバシーモデル", de: "Datenschutzmodell", fr: "Modèle de confidentialité", ko: "개인정보 모델", ru: "Модель конфиденциальности", pt: "Modelo de privacidade", ar: "نموذج الخصوصية", hi: "गोपनीयता मॉडल" },
  descEn: "How Local TOTP handles secrets, storage, and network requests.",
  descZh: "本地 TOTP 如何处理密钥、存储与网络请求。",
  h1En: "Privacy: secrets never persist",
  h1Zh: "隐私：密钥永不落盘",
  introEn: "This project is a static bundle. After the HTML, CSS, and JavaScript are downloaded, TOTP math does not need a backend. The generator is designed so a secret cannot accidentally be written to localStorage.",
  introZh: "本项目是静态打包结果。下载 HTML、CSS 和 JavaScript 之后，TOTP 计算不需要后端。生成器的设计避免密钥被意外写入 localStorage。",
  bodyEn: "<p>The only localStorage key used is <code>totpPreferredLanguage</code>. Card names, setup keys, otpauth URIs, and generated codes live in memory for the lifetime of the tab.</p><p>Query strings and path segments that contain a secret can appear in server access logs if you load this site from a host. Prefer <code>#secret=</code> fragments, which browsers do not send to the server. This UI may rewrite a query or path secret into a fragment after load.</p><p>QR scanning uses the browser BarcodeDetector API on a file you pick. The image is not uploaded.</p>",
  bodyZh: "<p>使用的唯一 localStorage 键是 <code>totpPreferredLanguage</code>。卡片名称、设置密钥、otpauth 链接和生成的验证码只存在于标签页的内存中。</p><p>如果站点托管在服务器上，查询字符串和路径中的密钥可能出现在访问日志里。请优先使用浏览器不会发给服务器的 <code>#secret=</code> 片段。页面加载后可能把查询或路径中的密钥改写到片段里。</p><p>扫描二维码使用浏览器 BarcodeDetector，处理你选择的本地文件，图片不会上传。</p>",
  faqEn: [
    ["Do you set cookies?", "No first-party cookies are used for the generator. GitHub Pages or your host may add their own logs; that is outside this bundle."],
    ["Is analytics included?", "No analytics, ads, or third-party fonts. The layout uses system fonts so a font CDN never sees your IP as part of this app."],
  ],
  faqZh: [
    ["会设置 Cookie 吗？", "生成器不使用第一方 Cookie。GitHub Pages 或你的托管方可能有自己的日志，那不属于本打包文件。"],
    ["包含统计脚本吗？", "没有统计、广告或第三方字体。版面使用系统字体，字体 CDN 不会因为本应用看到你的 IP。"],
  ],
});
