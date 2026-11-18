# Mac 版获取说明 / Mac companion

[简体中文](#简体中文) · [English](#english)

合并到 `main` 之后，iOS App 里的 Mac 版入口打开：

<https://github.com/simonwar119-wq/dsh-pocket/blob/main/docs/DOWNLOAD.md>

不要打开 `searwith.me`。那个主机不是本项目。

## 简体中文

Mac 版是菜单栏配套 App：菜单栏常驻，可以打开设置页，也可以开机启动。它和本仓库里的桥接源码不是同一个文件。本仓库的 git 树里没有这份菜单栏 App，不能据此说这个功能不存在。签名、公证和公开下载另行处理。

### 什么时候能从这里下载

本页只链接**已经附在本仓库 GitHub Releases 上的安装包**。没有这样的附件时，下面的列表就是空的，本页不另给一个下载地址，也不提供未签名的磁盘映像。

已发布的安装包以这里为准：<https://github.com/simonwar119-wq/dsh-pocket/releases>

### 已发布的安装包

- 安装包：[DSH-Pocket-1.1-macOS-AppleSilicon.dmg](https://github.com/simonwar119-wq/dsh-pocket/releases/download/v1.1/DSH-Pocket-1.1-macOS-AppleSilicon.dmg)（GitHub Release [v1.1](https://github.com/simonwar119-wq/dsh-pocket/releases/tag/v1.1)，已用 Developer ID 签名并经 Apple 公证）
- 系统要求：Apple 芯片（M 系列）Mac，macOS 13 或更高版本。此安装包不支持 Intel Mac。
- SHA-256：`8aab0e4e30fd50da675d6b06766675805cd492a55c2ee1e43c7dd7415c2a9f1a`
- 校验和文件：[SHA256SUMS-1.1-notarized.txt](https://github.com/simonwar119-wq/dsh-pocket/releases/download/v1.1/SHA256SUMS-1.1-notarized.txt)

### 本仓库里的桥接源码

[README.md](../README.md) 里的 `启动 DSH 随身.command` 是在你自己的 Mac 上从源码运行桥接服务。那是源码运行方式，不是上面的菜单栏安装包，也不能代替一个已经签名的 Release。

iOS 里的「DSH 随身 Pro」（`com.sear.agentdesk.pocket.lifetime`，一次性，不是订阅）解锁保存多于一台 Mac，以及 App 里的这个入口。价格以 App Store 显示为准。截至 2026-11-17，美国店为 1.99 美元，中国店为 9.90 元人民币。见 [TERMS.md](../TERMS.md)。恢复购买只用于 iPhone 和 iPad。

## English

The Mac companion is a menu-bar app: it stays in the menu bar, can open the setup page, and can launch at login. It is not the same file as the bridge source in this repository. That app is not in this git tree, and that does not mean the feature does not exist. Signing, notarization, and the public download are handled separately.

### When a download appears here

This page links an installer only when that file is **already attached to a GitHub Release of this repository**. When there is no such asset, the list below stays empty. This page does not add another download URL, and it does not offer an unsigned disk image.

Published assets are listed at <https://github.com/simonwar119-wq/dsh-pocket/releases>.

### Published installers

- Installer: [DSH-Pocket-1.1-macOS-AppleSilicon.dmg](https://github.com/simonwar119-wq/dsh-pocket/releases/download/v1.1/DSH-Pocket-1.1-macOS-AppleSilicon.dmg) (GitHub Release [v1.1](https://github.com/simonwar119-wq/dsh-pocket/releases/tag/v1.1); Developer ID signed and Apple notarized)
- Requirements: Apple silicon (M-series) Mac, macOS 13 or later. This build does not support Intel Macs.
- SHA-256: `8aab0e4e30fd50da675d6b06766675805cd492a55c2ee1e43c7dd7415c2a9f1a`
- Checksums: [SHA256SUMS-1.1-notarized.txt](https://github.com/simonwar119-wq/dsh-pocket/releases/download/v1.1/SHA256SUMS-1.1-notarized.txt)

### Bridge source in this repository

`启动 DSH 随身.command` in [README.md](../README.md) runs the bridge from source on your own Mac. That is a source run. It is not the menu-bar installer above, and it does not stand in for a signed Release.

DSH Pocket Pro in the iOS app (`com.sear.agentdesk.pocket.lifetime`, one time, not a subscription) unlocks saving more than one Mac and this entry in the app. The App Store price is what is charged. As of 2026-11-17 that is US $1.99 and CNY 9.90. See [TERMS.md](../TERMS.md). Restore Purchases is for iPhone and iPad.
