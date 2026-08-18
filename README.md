# 本地 TOTP / 2FA 生成器

浏览器本地计算 RFC 6238 一次性验证码。

HMAC 走 Web Crypto，没有账号、没有广告，密钥不会离开这台设备。

截图使用 RFC 6238 附录 B 的公开演示密钥，不是真实账号。

## 界面预览

首页生成器：粘贴 Base32 或 otpauth，当前验证码和倒计时环会实时刷新。

![首页：中文界面与正在跳动的验证码](docs/screenshots/home.png)

同一个页面可以加多个互不干扰的生成器，适合同时看几个账号。

![多账号生成器](docs/screenshots/multi.png)

SHA-256 落地页默认算法就是 SHA-256，高级选项里可以改位数、周期和算法。

![SHA-256 页面，已展开 TOTP 选项](docs/screenshots/sha256.png)

用公开测试向量核对实现是否和 RFC 6238 一致。

![TOTP 测试向量页](docs/screenshots/test-vectors.png)

全部工具页和指南的 HTML 站点地图。

![中文网站地图](docs/screenshots/sitemap.png)

隐私说明：密钥不写磁盘、不进 Cookie、不上传服务器。

![隐私页](docs/screenshots/privacy.png)

## 功能

- 首页和每一张工具落地页都带同一套生成器
- SHA-1 / SHA-256 / SHA-512，6 或 8 位，周期 10-120 秒
- 多账号卡片：新增、删除、粘贴、清除、一键复制
- 识别 otpauth 链接（自动读 secret、算法、位数、周期、issuer）
- 本地识别二维码图片，不上传
- URL 快捷填入：优先 hash fragment，也支持 query 和非保留路径
- 21 种语言（含简体/繁体中文），阿拉伯语 RTL
- 指南、FAQ、兼容性矩阵、robots、llms.txt、sitemap、PWA manifest
- SHA-256、SHA-512、8 位等页面有各自的默认参数

## 隐私模型

- 设置密钥、otpauth、验证码、卡片名称只留在当前标签页内存里
- 应用写入的唯一 localStorage 键是语言偏好 totpPreferredLanguage
- 分享临时链接请用 hash fragment，不要把密钥放进会进访问日志的 query
- 二维码图片只在浏览器本地解码

## 本地开发

安装依赖后启动开发服务器，打开终端打印的本地地址。中文界面在 URL 上加 lang=zh。scripts 见 package.json。

## 测试和构建

测试套件覆盖 Base32、otpauth 解析，以及 RFC 6238 附录 B 全部 8 位向量（注入 unix 时间，不依赖系统时钟）。向量文件在 public/rfc6238-test-vectors.json。

## GitHub Pages

推送到 main 后，工作流会安装、测试、构建并发布 dist。在仓库 Settings 的 Pages 里选 GitHub Actions 即可上线。
