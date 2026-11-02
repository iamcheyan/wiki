---
title: Windows 11 + WSL Ubuntu 24.04 开发环境部署记录
description: 记录 PVE 上 Windows 11 虚拟机、远程桌面接入、WSL 与 dotfiles/chezmoi/Neovim 配置同步的当前进度、已核实事实和后续资料需求。
date: 2026-11-02
tags:
  - Windows
  - WSL
  - Neovim
  - PVE
---

# Windows 11 + WSL Ubuntu 24.04 开发环境部署记录

## 目标

在 PVE 上启动现有 Windows 11 虚拟机，在 Windows 中启用远程管理/SSH、安装 WSL 2 与 Ubuntu 24.04，然后同步个人 `dotfiles`、`chezmoi` 和 Neovim 配置，以便后续测试 Neovim 在各平台的表现。

需求跟踪：`iamcheyan/chezmoi` GitHub issue [#123](https://github.com/iamcheyan/chezmoi/issues/123)。

## 当前进度（2026-11-02）

- 已通过现有 SSH 管理入口连接 PVE 主机，并确认 Windows 11 虚拟机 VMID 为 `101`，名称为 `Windows11`。
- 虚拟机此前处于 `stopped`；已执行启动，PVE 回报状态 `running`。
- PVE 配置没有 QEMU Guest Agent，因此不能通过 guest agent 读取 Windows 客体 IP 或执行命令。
- 虚拟机配置中的备注地址为 `192.168.3.65`。从当前 Debian 管理机探测时，SSH（22）、RDP（3389）、WinRM（5985）均未开放；这只说明当前端口探测没有连通，不能证明 Windows 内部服务状态。
- PVE Web 管理页面可达，但使用自签名证书。浏览器已进入 PVE 登录页，当前没有可用的已登录会话。
- 当前浏览器凭据库没有保存的 PVE 登录项；Bitwarden 在此会话中显示锁定且无法调用解锁流程。没有在聊天或公开资料中记录密码。
- PVE 启动输出提示 EFI Secure Boot 2023 证书未完全登记，并提示 UEFI 2011 证书将于 2026 年 6 月到期。启动已成功；本次没有修改 EFI/证书设置，也没有进行 BitLocker 操作。
- 尚未进入 Windows 桌面；Windows SSH、WSL、Ubuntu 24.04、三套配置同步都尚未实施或验证。

## 继续操作需要的接入方式

优先选择以下任一方式，不要通过聊天发送密码：

1. **当前会话解锁 Bitwarden**：让本会话可调用已保存的 PVE 登录项；我再登录 PVE Web UI，通过 VM 101 的 Console（noVNC）进入 Windows 桌面。
2. **用户先登录 PVE 并打开 VM Console**：在 Windows 登录完成并到达桌面后告知我，我继续使用现有远程桌面会话协作设置。
3. **预先启用 Windows OpenSSH Server**：若已有管理员方式能在 Windows 内执行命令，可启用 OpenSSH Server 并确认该虚拟机实际 IP，之后我再通过 SSH 自动化配置。

目前没有在该浏览器会话中登录 PVE，也没有保存的 PVE 凭据；因此不能从这里直接创建或使用已认证的 PVE Console 链接。

## 进入 Windows 后的实施顺序

1. 确认 Windows 主机名、版本、登录用户、网络地址和管理员权限。
2. 开启并验证 Windows OpenSSH Server（或保留 PVE Console 作为备用），限定为家庭网络可用；记录实际防火墙和连接结果。
3. 安装 WSL 2 与 Ubuntu 24.04，首次启动完成 Linux 用户初始化。
4. 在 WSL 中分别获取公开 `dotfiles`、私有 `chezmoi` 和独立 Neovim 配置仓库。检查各仓库当前分支与说明后，按其安装流程部署；公开 `dotfiles`、私有 `chezmoi`、`nvim` 的仓库边界保持独立。
5. 私有仓库恢复若需要 age 密钥或其他凭据，使用安全的凭据恢复/传输路径；绝不把密钥放入公开 Wiki、issue、命令日志或聊天。先确认 Windows/WSL 上是否已有安全恢复路径，再执行。
6. 验证 WSL Ubuntu 版本、`nvim --version`、配置实际加载路径、插件/treesitter 状态，并进行 Windows Terminal/WSL 的交互体验检查。
7. 将命令结果、版本、配置提交和实际验证逐项记录到本页；只有 issue 验收条件完成并远端读回验证后再关闭 issue #123。

## 仍需确认

- PVE Web 登录能否通过当前会话解锁的 Bitwarden 项提供，或由用户先行登录并打开 VM Console。
- Windows 是否需要先输入登录凭据/BitLocker 恢复信息；当前未检查，也未尝试绕过。
- Windows 内管理员权限是否可用，以及是否已安装 OpenSSH、WSL 或 Ubuntu。
- 私有 chezmoi 仓库在 WSL 的认证和 age 解密密钥恢复方式。
- 首轮同步是否仅使用仓库公开配置和不含秘密的部分，还是需要安全恢复私有加密配置。

## 安全与范围

- 不在本页保存 PVE/Windows 密码、BitLocker 恢复密钥、SSH 私钥、GitHub Token、Cookie 或 age 私钥。
- 本页是公开 Wiki 页面，只记录部署进度和通用步骤，不记录具体 LAN/Tailscale 地址、PVE 主机名、账户名或访问 URL。
- PVE 启动告警中的 EFI 证书登记建议暂不处理；若后续确需更新，应先确认 BitLocker 状态和恢复密钥可用性，再安排维护操作。
