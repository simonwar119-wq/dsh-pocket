# Mac 版获取说明 / How to get the Mac companion

状态日期 / Status date：2026-11-17

[简体中文](#简体中文) · [English](#english)

合并到 `main` 之后，iOS App 里的「下载 Mac 版」应打开：

<https://github.com/simonwar119-wq/dsh-pocket/blob/main/docs/DOWNLOAD.md>

不要打开 `https://searwith.me/dsh/download`，也不要使用 `searwith.me` 上的隐私或支持链接。那个主机不是本项目，证书和页面内容都不属于 DSH 随身。不要从那里下载文件。

## 简体中文

### 现在没有已签名的安装包

2026-11-17 检查了这个公开仓库：

- GitHub Releases 没有条目，也没有任何安装包附件。
- 仓库文件里没有已签名或已公证的 `.dmg`、`.pkg` 或 Mac 应用。`.gitignore` 忽略 `*.dmg`，因此安装盘本来就不会出现在 git 历史里。
- `bin/` 只有占位文件。本机编译出来的输入辅助工具不会作为二进制随仓库发布。
- 没有 GitHub Pages 站点可以托管下载。

结论：现在不能提供正式的、已签名并已公证的 Mac 安装包。本页不会放上未签名的安装文件，也不会把源码压缩包称作已经公证的 App。

iOS 购买项「DSH 随身 Pro」（`com.sear.agentdesk.pocket.lifetime`，一次性，不是订阅）会解锁 App 里的这个入口，并允许保存多于一台 Mac。购买不会在安装包尚未发布时交付一个安装包。价格以 App Store 显示为准；截至 2026-11-17，美国店为 1.99 美元，中国店为 9.90 元人民币。见 [TERMS.md](../TERMS.md)。

### 现在可以用的途径

本仓库是 Mac 桥接服务的源代码，不是菜单栏安装包。你可以在自己的 Mac 上按 [README.md](../README.md) 从源码运行：

1. 确认 DeepSeek Harness 已经打开。
2. 双击仓库里的 `启动 DSH 随身.command`，或按 README 用 Node 启动 `server/index.mjs`。
3. 用浏览器打开电脑设置页 `http://127.0.0.1:8797/setup`，用手机扫描那里的二维码。

这是在你的 Mac 上运行源码。它没有经过 Apple 公证，也不是 iOS 文案里「菜单栏常驻」的已发布安装包。已检查的公开仓库里没有这样的菜单栏 App。在签名且公证的版本被发布到本仓库的 Release 之前，不要把其他网站上的安装文件当成 DSH 随身的正式下载。

开机自启脚本 `安装为开机启动.command` 也在仓库里，同样是源码安装方式，不是已公证的应用。

### 发布之后会怎样

如果以后有签名且公证的安装包，它应该出现在本仓库的 GitHub Releases，并且本页会写明文件名、版本和校验值。在那之前，本页的「当前没有安装包」仍然有效。

## English

### There is no signed installer today

Checked on 2026-11-17 against this public repository:

- GitHub Releases has no entries and no installer assets.
- The repository files do not include a signed or notarized `.dmg`, `.pkg`, or Mac app. `.gitignore` ignores `*.dmg`, so a disk image is not in git history.
- `bin/` contains only a placeholder. The input helper compiled on a machine is not published as a binary from this repository.
- There is no GitHub Pages site hosting a download.

Result: a production, signed, and notarized Mac installer is not available. This page does not host an unsigned installer, and it does not call a source archive a notarized app.

The iOS purchase DSH Pocket Pro (`com.sear.agentdesk.pocket.lifetime`, one time, not a subscription) unlocks this entry in the app and allows saving more than one Mac. The purchase does not deliver an installer that has not been published. The price is whatever the App Store displays. As of 2026-11-17 that is US $1.99 and CNY 9.90. See [TERMS.md](../TERMS.md).

### What you can use now

This repository is the source of the Mac bridge, not a menu-bar installer. On your own Mac, follow [README.md](../README.md):

1. Open DeepSeek Harness.
2. Double-click `启动 DSH 随身.command` in the repository, or start `server/index.mjs` with Node as the README describes.
3. Open the computer setup page at `http://127.0.0.1:8797/setup` and scan its QR code with the phone.

That runs source code on your Mac. It is not notarized by Apple, and it is not a published “menu-bar resident” installer. No such menu-bar app is in the inspected public repository. Until a signed and notarized build is attached to a Release of this repository, do not treat an installer from another site as the official DSH Pocket download.

The launch-at-login script `安装为开机启动.command` is also source in this repository. It is not a notarized application.

### If a build is published later

A signed and notarized installer, if one is published, should be attached to GitHub Releases for this repository, and this page should name the file, version, and checksum. Until then, “no installer is published” remains the status.
