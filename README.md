# 白日梦 · Daydream

> 把现实漏出来的三分钟，做成一场可以走进去的梦。

一个**纯前端、离线可用**的沉浸式白日梦 App，也是一份可以直接上架的产品：

- **网页端**：任意静态托管（Vercel / Netlify / GitHub Pages / 国内 OSS）直接部署。
- **应用商店**：标准 PWA，可通过 PWABuilder 打包上架 Microsoft Store、Google Play；套 Capacitor 壳可上国内安卓商店与 Apple App Store。

产品规则源自《白日梦引擎》：第二人称、现在时；场景漂移不解释；每拍至多一件不可能的事且人人当它平常；醒来带走一件"醒物"；梦境档案跨会话连续——旧梦的角色会在新梦里路过。

---

## 目录结构

```
daydream-app/
├── index.html              # 单页应用
├── style.css               # 暮色梦面 / 衬线排版 / 玻璃层
├── engine.js               # 本地梦境引擎（全部素材离线内置）
├── app.js                  # 状态机 / 背景 / 环境音 / 档案 / 梦卡 / AI 模式
├── manifest.webmanifest    # PWA 清单
├── sw.js                   # Service Worker（离线缓存）
├── favicon.svg
└── icons/                  # 192 / 512 / maskable / apple-touch
```

## 本地预览

```bash
cd daydream-app
python3 -m http.server 8765
# 打开 http://localhost:8765
```

直接双击 `index.html` 也能玩（localStorage 档案可用，仅 Service Worker 需要 http/https 环境）。

## 网页端部署

| 平台 | 做法 |
|---|---|
| Vercel | `npx vercel`（或控制台拖拽目录），零配置 |
| Netlify | 控制台拖拽整个文件夹 |
| GitHub Pages | 仓库设置里把 Pages 指向该目录 |
| 国内 OSS/COS | 开静态网站托管 + 绑定已备案域名（PWA 与 TWA 上架都要求 HTTPS） |

**PWA 体验**：部署后手机浏览器打开 → "添加到主屏幕"，即得全屏独立 App；支持离线。

## 上架应用商店

先决条件：把上面部署好的 **HTTPS 域名**准备好，各商店都从它打包。

### Microsoft Store（推荐首选，成本最低）
1. 打开 [pwabuilder.org](https://www.pwabuilder.org)，输入你的网址。
2. 下载 **Windows** 包（MSIX）。
3. 微软开发者中心（一次性 $19）提交，审核后上架。

### Google Play
1. PWABuilder 下载 **Android** 包（TWA / AAB）。
2. 需要在网站根目录放 `assetlinks.json`（PWABuilder 会生成），绑定域名与签名。
3. Google Play 开发者账号（一次性 $25）提交 AAB。

### Apple App Store
1. PWABuilder 下载 **iOS** 包（WKWebView 工程），或用 Capacitor：
   ```bash
   npm i -D @capacitor/cli @capacitor/core @capacitor/android
   npx cap init 白日梦 app.daydream.meng --web-dir=.
   npx cap add ios && npx cap add android
   npx cap open ios   # Xcode 签名 → Archive → 上传 App Store Connect
   ```
2. 需要 Apple Developer 账号（$99/年）+ macOS + Xcode。

### 国内安卓商店（华为 / 小米 / OPPO…）
国内商店基本不收 PWA/TWA，用 Capacitor 或 HBuilderX 云打包出 APK/AAB 后按各家后台要求提交（软著等材料按商店要求准备）。

## 商店文案（可直接粘贴）

- **应用名**：白日梦
- **副标题**：把现实漏出来的三分钟，做成一场可以走进去的梦
- **一句话简介**：一个会做梦的 App。丢进一个词，或什么都不给——它读你此刻的时间与周几，把你放进一场第二人称、现在时的白日梦。
- **完整描述**：
  白日梦引擎规则：场景会漂移，从不解释；每一段至多一件不可能的事，所有人当它很平常；时间是软的，一瞬间可以很长。梦里你说"我要飞"，梦会照办——但要付一点代价。醒来时手心里多一件没用、舍不得扔的"醒物"；梦境档案让旧梦的意象与角色在新梦里悄悄路过。全部数据只存在你的设备上，无账号、无追踪、离线可用。想接入大模型造梦？在设置里填你自己的 API Key 即可（可选）。
- **关键词**：白日梦,放空,助眠,解压,冥想,睡前,幻想,文字,情绪,逃离
- **截图建议（5 张）**：首页（现实渗入提示）/ 梦中一拍 / 转清醒时刻 / 醒物卡片 / 梦境档案列表
- **隐私政策要点**：不收集任何数据；梦境档案仅存于本机 localStorage；AI 模式下 API Key 仅存本机、仅发往用户自行填写的接口。

## AI 模式（可选增强）

内置本地引擎不依赖任何网络。若想要大模型按同一套"梦的物理"造梦：设置 → 打开"AI 入梦"→ 填 API Key（默认对接智谱开放平台 `glm-4-flash`，可改任意 OpenAI 兼容接口与模型）。AI 失败时自动回落本地引擎，梦不会断。

## 技术说明

- 零依赖、零构建：四个文本文件 + 图标，改完刷新即生效。
- 梦境档案：`localStorage`（`daydream.journal.v1`），上限 50 场。
- 背景：Canvas 漂移色块 + 星点 + 胶片颗粒；遵循 `prefers-reduced-motion`。
- 声音：Web Audio 合成的铺底 pad 与风声，默认关闭，醒时一声钟。
