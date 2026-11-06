---
title: Cindy 在 Debian 上的运行与凭据故障恢复
description: 记录 Cindy 桌面端与 cindy-host 在 Debian 测试机上的运行方式，以及 2026-11-06 因 safeStorage 主密钥被重建导致的「模型无法选择、发消息没有反应」的排查、修复与长期防护。
tags:
  - projects
  - cindy
  - linux
  - 故障排查
---

# Cindy 在 Debian 上的运行与凭据故障恢复

## 一句话定位

Cindy 在一台 Debian 测试机上同时有两种形态：已安装的 Electron 桌面客户端（`/usr/lib/cindy`），以及从开发分支跑起来的后台运行时 `cindy-host`。两者共用同一个用户 profile。本文记录它们的运行方式，以及一次典型的「应用看起来完全没反应」的故障——根因不在应用逻辑，而在操作系统密钥环里的加密主密钥被换掉。

## 运行方式

- 桌面客户端由 systemd 用户单元 `cindy-desktop.service` 管理，作为原生 Wayland 客户端启动，`Restart=on-failure`。
- 该机器当前的桌面会话是 Hyprland（socket `wayland-1`），不是早期的 Wayfire 会话；单元里的 `ExecStartPre` 会等待这个 socket。
- 用户 profile 由 `XDG_CONFIG_HOME` 指向一个隔离目录，实际数据仍在 `~/.config/CindyGlobal`。
- 本地模型网关 `magpie` 由 `magpie.service` 常驻（`127.0.0.1:3426`），Cindy 通过自定义供应商 `magpie-debian` 使用它的模型。
- `cindy-host` 是开发分支的后台运行时，会写 `host-endpoint.json` 让客户端自动发现；**它与已安装客户端共用同一个数据库文件**，因此两者的 migration 版本必须一致。

## 2026-11-06 的故障现象

- 输入框里选不了模型，只显示无法解析的模型信息。
- 发消息完全没有反应，任务不启动、也没有报错弹窗。

## 根因

Cindy 所有本地凭据（供应商密钥、登录态、IM 凭据）都写在 `safe-storage/*.enc`，加密主密钥来自系统密钥环里的一个条目：

```
application=Cindy
xdg:schema=chrome_libsecret_os_crypt_password_v2
label = "Chromium Safe Storage"
```

Chromium 用这个 secret 做 PBKDF2（1 轮，salt `saltysalt`）派生 AES-128-CBC 密钥。

实测该条目的创建时间是某天 12:42，说明那一刻密钥环被整体重建。**Chromium 找不到旧条目时不会报错，而是静默生成一个新的随机 secret**。结果：更早写入的密文全部解不开。

于是出现连锁反应：

1. 自定义供应商 `magpie-debian` 的密钥解不开 → 该供应商被跳过。
2. 所有会话都用 `magpie-debian` + 某个 `group/*` 模型 → 发送时拒绝执行，也不会回退到云端网关。
3. 模型目录里缺少这个供应商的模型 → 选择器解析不出模型。

日志里的三个关键行（概括）：

```
[providerSecretStore] { providerId: 'magpie-debian', agent: 'pi',
  err: 'Error while decrypting the ciphertext provided to safeStorage.decryptString.' }
[pi-host] resolvePiNativeProviders: skipped custom provider { id: 'magpie-debian',
  reason: 'apiKey provider missing pi key and custom headers' }
[maker-input-coordinator] send not dispatched ... code: 'LAZY_CREATE_FAILED'
```

## 怎么确认是「密钥换了」而不是别的

逐个文件做解密审计，比看日志更快定位：

- 能解开的：最近写入的记录（登录态、网关 key、供应商密钥中较新的那批）。
- 解不开的：更早写入的记录，统一报 `bad decrypt`。
- 再用密钥环里所有候选 secret 逐个尝试解密旧文件，全部失败 → 原主密钥确实已经丢失，不是路径或权限问题。

结论：这是密钥轮换导致的历史密文失效，而不是网络、数据库或应用逻辑问题。

## 修复步骤

1. **取回供应商真实密钥**：本地网关自己的配置里保存着可用的调用密钥。先用网关的 `/v1/models` 端点验证哪个 key 有效（能返回模型列表即有效）。
2. **用当前主密钥重新加密写回**：按应用使用的同一套路径与格式重写供应商密钥记录，并保留原文件备份。
3. **清理无法恢复的旧记录**：确认已失效且应用能自行重建的记录（例如 IM 的轮询偏移、所有者用户 ID），备份后移走，让应用重新生成。
4. **重启客户端并验证**：日志中解密失败归零、供应商被合并进模型目录、发送不再报 `LAZY_CREATE_FAILED`。

## 长期防护：不让主密钥再被「重建」

只修一次没有意义——只要密钥环再被重建一次，所有密文又会失效。现在做了三层：

1. **保存当前主密钥**到一个仅本人可读的文件（`0600`），与 profile 分开存放。
2. **守卫脚本**：启动前检查密钥环条目。
   - 条目丢失 → 用保存的值**恢复**，而不是让 Chromium 生成新的；
   - 条目变化 → 只告警，把新值另存为 `.drift-<时间>`，不覆盖原值（覆盖等于放弃旧数据）。
3. **接入启动链**：桌面客户端的 `ExecStartPre` 先跑守卫；看门狗每分钟再跑一次兜底。

使用约束：

- 用 systemd 单元启动客户端，或先手动跑一次守卫；否则应用可能抢在守卫之前生成新密钥。
- 不要随意重建密钥环（`keyring replace` / `import`）。确实要重建，重建后立刻跑一次守卫恢复主密钥。
- 保存的主密钥是明文（依赖文件权限）。它和它保护的密文在同一台机器上，因此这层保护只防「密钥被换掉」，不防「机器被拿走」。

## 与 cindy-host 共用同一份数据（进行中）

目标是「网页端和桌面端是同一个运行时、同一份数据」：会话、消息、设置、模型配置只有一份，两端实时一致。

- 已完成：宿主侧读取与写入都指向桌面端的同一批设置文件（外观、布局、统计同意、快捷键、侧栏、语音），账号资料从已采用的登录态解析，网页不再显示内部 owner id。
- 阻塞点：开发分支的数据库 migration 比已安装客户端新。让开发分支的宿主打开同一个 profile，会把 schema 推到新版本，已安装客户端随后拒绝启动（`MIGRATE_FAILED`）。因此现在把宿主停用，等用同一份代码构建的客户端就绪后再接管。
- 恢复方式：用宿主迁移前自动生成的备份恢复数据库，并清理属于被迁移状态的 `-wal` / `-shm`。

## 未解决项

- 一条 worktree 引用的数据形状比已安装客户端新，读取时报 `unsupported task reference schema`；属于数据层面问题，未擅自改库。
- 应用版本号显示为 `0.0.0`，属安装包元数据问题，需要重新打包。
- 远端设备（另一台笔记本）离线、relay 未连接，属外部状态。

## 可复用的经验

- 「应用没反应」先看**发送路径**的日志，而不是先怀疑 UI 或网络。
- 本地凭据全部依赖操作系统密钥环时，密钥环重建是**静默的灾难**：应用不报错，只是所有密文失效。
- 任何依赖系统密钥环的应用，都值得保存一份主密钥副本 + 启动前恢复守卫。
- 同一个 profile 被两个不同版本的程序读写时，先对齐 migration 版本，再谈「共用数据」。
