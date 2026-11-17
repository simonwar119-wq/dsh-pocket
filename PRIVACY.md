# DSH 随身 · 隐私政策 / DSH Pocket Privacy Policy

最后更新 / Last updated：2026-11-17

[简体中文](#简体中文) · [English](#english)

本页同时提供简体中文和 English。App Store 与 App 内的隐私链接都应使用合并到 `main` 之后的这个地址：

<https://github.com/simonwar119-wq/dsh-pocket/blob/main/PRIVACY.md>

不要使用 `searwith.me` 上的任何地址。那个主机不是本项目的隐私政策。

## 简体中文

DSH 随身（英文名 DSH Pocket）是第三方工具，与 DeepSeek 官方无关。本政策说明两件已经分开检查过的东西：

1. iOS App 源码快照（版本 1.1，日期 2026-11-17）。快照里没有开发者服务器、广告 SDK 或分析 SDK。
2. 本仓库里的 Mac 桥接源码。它跑在你自己的 Mac 上。

本政策不声称「任何情况下都没有任何数据离开你的设备」。下面把本机 App、你的 Mac，以及你自己选择的其他服务分开写。没有在源码里见到的行为，写为未知，而不是写成保证。

### 1. 这个 iOS App 做什么

App 用你扫描的二维码、你从照片里选择的二维码，或你手动输入的地址，在本机用系统网页视图打开你指定的 Mac 服务。已检查的源码没有写死的开发者后端，也没有把会话内容上传到开发者服务器的代码。

网页视图可以加载你输入的 `http` 或 `https` 页面（Info.plist 允许本地网络，并允许网页内容加载非 HTTPS）。页面打开之后再向哪里发请求，由那个页面和你的 Mac 决定，不由本政策替它保证。

### 2. 已检查的 iOS 源码在本机处理什么

| 数据 | 已看到的处理方式 |
| --- | --- |
| 已配对 Mac 的地址和名称 | 保存在这台设备的 UserDefaults。移除一台 Mac、移除全部，或删除 App 后，这份本地记录会去掉。 |
| 网页 Cookie 和网站数据 | 由系统网页视图按你打开的地址保存。移除对应 Mac 时，源码会尝试删掉该主机的 Cookie 和网站数据；移除全部或删除 App 会清掉这份网页数据。 |
| 相机 | 只在你扫描配对二维码时使用。源码没有录像功能。 |
| 你选中的一张照片 | 只在你主动从照片里识别二维码时读取，并在本机识别。源码没有把这张图片上传到开发者服务器的代码。不读取你的整个照片图库。 |
| 本地网络 | 用来连接你提供的局域网地址。源码没有扫描局域网或上传其他设备清单的代码。 |
| 购买状态 | 见下一节。解锁标记会缓存在本机 UserDefaults。 |

隐私清单 `PrivacyInfo.xcprivacy` 将 `NSPrivacyTracking` 设为 false，收集的数据类型列表为空，并声明因 App 功能访问 UserDefaults（原因 `CA92.1`）。源码 import 里没有广告 SDK 或分析 SDK。这只描述该快照，不能证明以后的安装包或你 Mac 上的其他软件也是这样。

### 3. 购买

「DSH 随身 Pro」是一次性非消耗型项目，商品 ID 为 `com.sear.agentdesk.pocket.lifetime`。它不是订阅，不会自动续费。

付款由 Apple App Store 和 StoreKit 处理。已检查的源码在本机校验交易，没有把银行卡信息发给开发者的代码。开发者看不到你的支付卡信息。

截至 2026-11-17，该商品在美国店的价格为 1.99 美元，在中国店的价格为 9.90 元人民币。实际扣款以你购买时 App Store 显示的价格为准。

### 4. 你的 Mac，以及本仓库的桥接服务

iOS App 只打开你指定的地址。下面是本仓库 Mac 桥接源码里能够确认的行为；如果你运行的不是这份源码，以你实际运行的软件为准。

- 桥接服务读你 Mac 上的 `~/.dsh/.credentials.yaml`，在本机内存里签发 DSH Cookie，再用它访问本机的 DeepSeek Harness（代码里的上游是本机 `127.0.0.1`）。
- 手机拿到的是桥接服务自己的设备 Cookie（`dshpocket_session`，HttpOnly，SameSite=Strict，Max-Age 为 365 天）。DSH 登录 Cookie 不会放进发给手机的响应。
- 配对设备记录写在你 Mac 上的 `.pocket/config.json`（可用 `DSH_POCKET_DATA` 改位置）。源码保存的是设备令牌的 SHA-256，不是令牌原文。记录会留到你在 Mac 上移除设备或删除该文件。源码没有写一个对外承诺的服务器保留天数。
- 配对码默认 10 分钟有效，并且默认只用一次。
- 运行日志在你的 Mac 上，路径见 [README.md](README.md)。日志留在你的电脑里，由你删除。

DeepSeek Harness 是 DeepSeek 的产品。它在收到本机请求之后是否还会把内容发给 DeepSeek 或其他服务，不在本 iOS 快照和本仓库桥接源码的保证范围内。这是未知项，不是「零共享」承诺。

### 5. 其他可能接触数据的一方

这些都不是本 App 源码里集成的追踪 SDK：

- **Apple**：分发 App，并用 StoreKit 处理购买和恢复购买。
- **你打开的 Mac 页面**：它可以再访问该页面自己的地址。本 App 不阻止这种后续请求。
- **Tailscale 或其他隧道**：只在说明里作为你自行安装的远程访问例子。iOS 源码没有集成它们的 SDK。它们有各自的隐私政策。
- **GitHub**：只有当你主动到本仓库提交 Issue 或安全报告时，你写进去的内容才由 GitHub 处理。不要在公开 Issue 里粘贴配对码、设备令牌、Cookie、真实主机名、局域网地址或会话内容。

本仓库和已检查的 iOS 源码都没有写单独的隐私邮箱、公司登记地址或数据保留热线。联系方式只有 [SUPPORT.md](SUPPORT.md) 里的 GitHub Issues，以及 [SECURITY.md](SECURITY.md) 里的漏洞报告流程。

### 6. 本政策不承诺的事

- 不承诺开发者服务器上的删除时限，因为已检查的 iOS 源码没有开发者账号系统或开发者服务器。
- 不承诺每一个未来安装包、你自行修改的 Mac 服务，或 DeepSeek Harness 的后续版本都与本快照一致。
- 不把「没有在这份源码里看到追踪 SDK」写成「宇宙范围内零数据共享」。

## English

DSH Pocket is a third-party tool and is not affiliated with DeepSeek. This policy covers two things that were inspected separately:

1. The iOS app source snapshot (version 1.1, dated 2026-11-17). That snapshot has no developer server, advertising SDK, or analytics SDK.
2. The Mac bridge source in this repository. It runs on your own Mac.

This policy does not say that data never leaves your devices. The native app, your Mac, and services you choose are described separately. Behavior that was not present in the inspected source is marked unknown rather than promised.

### 1. What the iOS app does

The app opens the Mac service you choose. You supply the address by scanning a QR code, picking a photo that contains a QR code, or typing the address. The system web view on your device loads that address. The inspected source has no hard-coded developer backend and no code that uploads session content to a developer server.

The web view may load the `http` or `https` page you enter. The app’s Info.plist allows local networking and allows web content to load non-HTTPS pages. Requests the page makes after it loads are made by that page and by your Mac. This policy does not promise otherwise.

### 2. What the inspected iOS source handles on device

| Data | Handling found in the source |
| --- | --- |
| Address and name of a paired Mac | Stored in UserDefaults on that device. Removing one Mac, removing all Macs, or deleting the app removes this local record. |
| Web cookies and website data | Stored by the system web view for the addresses you open. Removing a Mac attempts to delete cookies and website data for that host. Removing all Macs, or deleting the app, clears this website data. |
| Camera | Used only while you scan a pairing QR code. The source has no video recording feature. |
| One photo you pick | Read only when you choose a photo for QR decoding, and decoded on device. The source has no code that uploads that image to a developer server. It does not read your whole photo library. |
| Local network | Used to reach the local address you provide. The source has no code that scans the LAN or uploads an inventory of other devices. |
| Purchase status | See the next section. An unlock flag is cached in UserDefaults on device. |

The privacy manifest `PrivacyInfo.xcprivacy` sets `NSPrivacyTracking` to false, leaves the collected-data types empty, and declares UserDefaults access for app functionality (reason `CA92.1`). The source imports do not include an advertising or analytics SDK. That describes this snapshot. It does not prove the same for later binaries or for other software on your Mac.

### 3. Purchases

DSH Pocket Pro is a one-time non-consumable, product ID `com.sear.agentdesk.pocket.lifetime`. It is not a subscription and it does not renew.

Apple’s App Store and StoreKit handle payment. The inspected source verifies the transaction on device and has no code that sends your card details to the developer. The developer does not see your payment card.

As of 2026-11-17, the price of this product is US $1.99 on the United States storefront and CNY 9.90 on the China storefront. The amount charged is the price the App Store displays at the time you buy.

### 4. Your Mac, and the bridge in this repository

The iOS app only opens the address you supply. The following is what the Mac bridge source in this repository does. If you run different Mac software, that software applies instead.

- The bridge reads `~/.dsh/.credentials.yaml` on your Mac, signs a DSH cookie in local memory, and uses it to reach DeepSeek Harness on that Mac (the upstream in code is local `127.0.0.1`).
- The phone receives the bridge’s own device cookie (`dshpocket_session`, HttpOnly, SameSite=Strict, Max-Age 365 days). The DSH sign-in cookie is not placed on the response sent to the phone.
- Paired-device records are written on your Mac in `.pocket/config.json` (override with `DSH_POCKET_DATA`). The source stores a SHA-256 of the device token, not the raw token. Records remain until you remove the device on the Mac or delete that file. The source does not publish a server-side retention period.
- A pairing code lasts 10 minutes by default and is single-use by default.
- Runtime logs stay on your Mac. Paths are in [README.md](README.md). You delete them.

DeepSeek Harness is a DeepSeek product. Whether it sends content onward to DeepSeek or to anyone else, after it receives a local request, is outside what this iOS snapshot and this bridge can promise. That item is unknown. It is not a “zero sharing” promise.

### 5. Others that may handle data

None of these are tracking SDKs bundled in the inspected app source:

- **Apple** distributes the app and handles purchase and restore through StoreKit.
- **The Mac page you open** may contact whatever hosts that page contacts. The app does not block those later requests.
- **Tailscale or another tunnel** appears only as an example of remote access you install yourself. The iOS source does not embed their SDKs. Those services have their own privacy policies.
- **GitHub** handles the text you submit only if you choose to open an Issue or a security report on this repository. Do not put pairing codes, device tokens, cookies, real hostnames, LAN addresses, or session content in a public Issue.

This repository and the inspected iOS source do not list a separate privacy email, a registered postal address, or a retention hotline. The contact path is GitHub Issues, as described in [SUPPORT.md](SUPPORT.md), and the vulnerability process in [SECURITY.md](SECURITY.md).

### 6. What this policy does not promise

- It does not promise a deletion deadline on a developer server. The inspected iOS source has no developer account system and no developer server.
- It does not promise that every future binary, every Mac service you modify, or every later DeepSeek Harness release matches this snapshot.
- It does not turn “no tracking SDK was found in this source” into a universal claim that no data is ever shared.
