# DSH 随身 · 支持 / DSH Pocket Support

最后更新 / Last updated：2026-11-17

[简体中文](#简体中文) · [English](#english)

合并到 `main` 之后的地址：

<https://github.com/simonwar119-wq/dsh-pocket/blob/main/SUPPORT.md>

不要使用 `searwith.me`。那个主机不是本项目的支持页面。

本页不承诺回复时限。已检查的仓库和 iOS 源码里没有单独的支持邮箱。

## 简体中文

### 联系

- 产品问题请开 [GitHub Issue](https://github.com/simonwar119-wq/dsh-pocket/issues)。写上 iOS 版本、macOS 版本、DSH 随身或 DeepSeek Harness 的版本，以及完整的错误提示。
- 不要在公开 Issue 里粘贴配对码、设备令牌、Cookie、真实主机名、局域网地址、Tailscale 主机名或会话内容。
- 安全漏洞用仓库的 [Security](https://github.com/simonwar119-wq/dsh-pocket/security) 流程，说明见 [SECURITY.md](SECURITY.md)。

### 购买

当前 App 免费下载，免费时可以保存一台 Mac。

「DSH 随身 Pro」是一次性非消耗型项目 `com.sear.agentdesk.pocket.lifetime`。它不是订阅，不会自动续费。它解锁 App 内的 Mac 获取说明入口，以及保存多于一台 Mac。

截至 2026-11-17，美国店价格为 1.99 美元，中国店价格为 9.90 元人民币。其他店面以 App Store 显示的价格为准。

恢复购买：打开 App → 设置 → 恢复购买。需要使用购买时的同一个 Apple 账户。

这个版本没有可以在 App 内取消的订阅。如果 Apple 账户页面里仍显示一份旧订阅，那是 Apple 账户里的记录，不是本版本正在销售的商品；请以 Apple 显示的内容为准：<https://apps.apple.com/account/subscriptions>。退款按 Apple 的退款政策处理。

### 连接失败

1. 确认 Mac 上的 DSH 随身桥接正在运行，并且 DeepSeek Harness 已经打开。
2. 确认手机和 Mac 在同一局域网，或都连着你自己的私有网络（例如 Tailscale）。Tailscale 不是这个 iOS App 里的 SDK。
3. 在 App 里打开设置，对当前 Mac 选择重新配对。
4. 配对码默认 10 分钟有效，并且默认只能用一次。过期后在 Mac 的设置页刷新再试。
5. 本仓库的桥接最多保存 12 台已配对手机。满了之后需要先在 Mac 上移除旧设备。这是桥接源码里的限制，不是 iOS「多台 Mac」购买项的上限。

更多排错步骤见 [README.md](README.md) 的「故障排查」。

### Mac 版

App 里的「下载 Mac 版」打开 [docs/DOWNLOAD.md](docs/DOWNLOAD.md)。截至 2026-11-17，没有已签名、已公证的安装包可以下载。可以从本仓库源码在你自己的 Mac 上运行桥接服务。那不是已公证的菜单栏安装包。

### 相关页面

- 隐私政策：[PRIVACY.md](PRIVACY.md)
- 使用条款：[TERMS.md](TERMS.md)
- Apple 标准 EULA：<https://www.apple.com/legal/internet-services/itunes/dev/stdeula/>
- Mac 获取说明：[docs/DOWNLOAD.md](docs/DOWNLOAD.md)

## English

### Contact

- For product issues, open a [GitHub Issue](https://github.com/simonwar119-wq/dsh-pocket/issues). Include the iOS version, macOS version, DSH Pocket or DeepSeek Harness version, and the full error text.
- Do not paste pairing codes, device tokens, cookies, real hostnames, LAN addresses, Tailscale hostnames, or session content into a public Issue.
- For vulnerabilities, use this repository’s [Security](https://github.com/simonwar119-wq/dsh-pocket/security) flow, described in [SECURITY.md](SECURITY.md).

There is no support email in the inspected repository or iOS source. This page does not promise a response time.

### Purchases

The current app is free to download and can save one Mac for free.

DSH Pocket Pro is the non-consumable `com.sear.agentdesk.pocket.lifetime`. It is not a subscription and it does not renew. It unlocks the in-app Mac download guidance entry and saving more than one Mac.

As of 2026-11-17, the price is US $1.99 on the United States storefront and CNY 9.90 on the China storefront. Other storefronts use the price the App Store displays.

Restore Purchases: open the app → Settings → Restore Purchases. Use the same Apple Account that bought it.

This version has no subscription to cancel inside the app. If Apple still shows an older subscription on the account, that is a record in the Apple Account, not the product this version sells. Use what Apple displays: <https://apps.apple.com/account/subscriptions>. Refunds follow Apple’s refund policy.

### Connection problems

1. Confirm the DSH Pocket bridge is running on the Mac and that DeepSeek Harness is open.
2. Confirm the phone and the Mac are on the same LAN, or on a private network you control (for example Tailscale). Tailscale is not an SDK inside this iOS app.
3. In the app, open Settings and repair the current Mac.
4. A pairing code lasts 10 minutes by default and is single-use by default. After it expires, refresh the Mac setup page and try again.
5. The bridge in this repository stores at most 12 paired phones. When that list is full, remove an old device on the Mac. That limit is in the bridge source. It is not the cap on the iOS “more than one Mac” purchase.

More checks are in the troubleshooting section of [README.md](README.md).

### Mac app

“Download the Mac app” in the iOS app opens [docs/DOWNLOAD.md](docs/DOWNLOAD.md). As of 2026-11-17 there is no signed, notarized installer to download. You can run the bridge from this repository’s source on your own Mac. That is not a notarized menu-bar installer.

### Related pages

- Privacy policy: [PRIVACY.md](PRIVACY.md)
- Terms: [TERMS.md](TERMS.md)
- Apple standard EULA: <https://www.apple.com/legal/internet-services/itunes/dev/stdeula/>
- Mac download guidance: [docs/DOWNLOAD.md](docs/DOWNLOAD.md)
