# 本地 TOTP / 2FA 生成器

浏览器里用的一次性验证码工作台。RFC 6238 TOTP，HMAC 走 Web Crypto，没有账号、没有广告。密钥不会离开这台设备。

打开就能 `Ctrl+V` 粘贴 Base32 或 `otpauth://`，也可以把二维码图片拖进来。验证码很大，点一下就复制。

截图用的是 RFC 6238 附录 B 的公开演示密钥，不是真实账号。

## 界面预览

空状态：贴密钥或拖二维码，卡片跟着内容走，不会撑满一屏。

![空状态：粘贴密钥](docs/screenshots/empty.png)

贴上之后，验证码是主角。密钥自动隐藏。点验证码或「点击复制」写入剪贴板。

![有验证码的工作台](docs/screenshots/home.png)

同一个页面可以加多个互不干扰的生成器。

![多账号](docs/screenshots/multi.png)

SHA-256 落地页默认就是 SHA-256。位数、周期、算法、时间校准收在「TOTP 选项」里。最后几秒会预告下一组码。

![SHA-256 页面，已展开 TOTP 选项](docs/screenshots/sha256.png)

用公开测试向量核对实现是否和 RFC 6238 一致。

![TOTP 测试向量页](docs/screenshots/test-vectors.png)

全部工具页和指南的 HTML 站点地图。

![中文网站地图](docs/screenshots/sitemap.png)

隐私说明：密钥不写磁盘、不进 Cookie、不上传服务器。

![隐私页](docs/screenshots/privacy.png)

## 用法

- 打开页面即可粘贴。`Ctrl+V` / `Cmd+V`，或点「粘贴设置密钥」
- 点大号验证码复制；状态会显示「已复制 123456」
- 剩余 5 秒时预告下一组；剩余 2 秒时复制的是下一组，避免贴过去已经过期
- 密钥贴上后自动隐藏，可点「显示」
- 验证码对不上时，在「TOTP 选项」里校准时间（±90 秒）。右下角有本机时钟可对照手机
- 「更多操作」里可以复制 otpauth 链接、显示给手机扫的二维码、用摄像头扫码（浏览器支持时）
- 多行粘贴会一次加上多个账号
- 刷新当前标签页还在；关掉标签页密钥即消失

## 功能

- SHA-1 / SHA-256 / SHA-512，6 或 8 位，周期 10–120 秒
- SHA-256、SHA-512、8 位等落地页有各自的默认参数
- 识别 otpauth 链接（自动读 secret、算法、位数、周期、issuer）
- 本地识别二维码图片和摄像头扫码，不上传
- URL 快捷填入：优先 `#secret=`，也支持 query 和非保留路径
- 21 种语言（含简体/繁体中文），阿拉伯语 RTL
- 指南、FAQ、兼容性矩阵收在生成器页的「使用说明」里
- robots、llms.txt、sitemap、PWA manifest

## 隐私

- 设置密钥、otpauth、验证码、卡片名称只留在当前标签页（`sessionStorage`），关掉即没
- 应用写入的唯一 `localStorage` 键是语言偏好 `totpPreferredLanguage`
- 分享临时链接请用 hash fragment，不要把密钥放进会进访问日志的 query
- 二维码只在浏览器本地解码

## 本地开发

```bash
npm install
npm run dev
```

中文界面：在 URL 上加 `?lang=zh`。

## 测试和构建

```bash
npm test
npm run build
```

测试覆盖 Base32、otpauth、RFC 6238 附录 B 全部 8 位向量（注入 unix 时间，不依赖系统时钟）。向量文件在 `public/rfc6238-test-vectors.json`。

## GitHub Pages

推送到 `main` 后，`.github/workflows/pages.yml` 会安装、测试、构建并发布 `dist`。仓库 Settings → Pages 里选 GitHub Actions 即可上线。
