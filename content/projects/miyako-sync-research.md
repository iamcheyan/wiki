---
title: Miyako：Android NAS 同步底座调研
date: 2026-09-07
description: 现成 Android SMB/NAS 同步项目的候选底座、技术路线和 Fork 评估。
tags:
  - projects
  - miyako
  - android
  - nas
  - smb
  - research
---

# Miyako：Android NAS 同步底座调研

## 调研结论

Miyako 不一定需要自己从零实现 NAS 同步器。现在已经有多个 Android 开源项目覆盖了 SMB、目录比较、自动同步、后台任务、凭据保存和多协议访问。

因此，Miyako 的路线可以从：

```text
自己开发播放器 + 自己开发同步器
```

调整为：

```text
研究或 Fork 一个成熟的 Android 同步项目
        ↓
保留 SMB / 同步 / 后台任务能力
        ↓
把目标目录和流程收敛到 Android Music / MediaStore
        ↓
接入 Gramophone、Auxio 或其他成熟播放器
```

这会让 Miyako 的特色集中在“音乐库同步体验”，而不是重复实现通用文件同步软件。

## 候选项目概览

| 项目 | SMB | 自动同步 | Android 原生 | 现代程度 | 初步判断 |
| --- | --- | --- | --- | --- | --- |
| [SambaLite](https://github.com/egdels/SambaLite) | 支持 | 支持 | 支持 | 很新 | 最值得先研究和试用 |
| [Android Mirror](https://github.com/He11PC/android-mirror) | 支持 | 支持 | 支持 | 新 | 很接近纯同步工具定位 |
| [SMBSync3](https://github.com/Sentaroh/SMBSync3) | 支持 | 支持 | 支持 | 较传统 | 功能和历史经验很丰富 |
| [OpenSync](https://github.com/thedickestrick/opensync) | 支持 | 支持 | 支持 | 很新 | 架构值得参考，成熟度待验证 |
| SMB Sync | 支持 | 主要手动 | 支持 | 新 | 可作为补充参考 |
| BasicSync | 间接 | 支持 | 支持 | 活跃 | 更偏通用同步，不是 SMB 专项底座 |

这里的“适合 Fork”不是单纯看 Stars，而是要结合许可证、近期提交、Issue、设备测试、代码边界和后台任务稳定性判断。

## 1. SambaLite

项目地址：

<https://github.com/egdels/SambaLite>

SambaLite 与 Miyako 的需求非常接近，已经覆盖：

- SMB 文件浏览；
- 上传和下载；
- 多个 NAS 连接；
- 加密保存密码；
- Folder Sync；
- 后台自动同步。

它的 Folder Sync 文档也明确采用：

```text
Android local folder
        ↕
      SMB NAS
```

这意味着它可能已经处理了 Miyako 最麻烦的一批基础问题：Android 存储权限、SMB 连接、目录比较、同步方向、后台执行和凭据保存。

### 对 Miyako 的价值

如果 SambaLite 的代码边界清晰，最理想的改造方式是：

```text
SambaLite 的 SMB / Sync 核心
              ↓
        Miyako 音乐同步界面
              ↓
    Android Music / MediaStore
              ↓
       外部 Android 播放器
```

第一阶段甚至可以不内置播放器，而是先把音乐可靠同步到手机本地，再用 Gramophone 或 Auxio 验证播放体验。

需要重点检查：

- Folder Sync 的代码入口和数据模型；
- SMB 使用的具体库和 SMB 版本；
- 是否使用 WorkManager；
- 同步冲突和删除传播规则；
- 断点续传和失败重试；
- Android 11+ 的 SAF / MediaStore 处理；
- 密码是否真正保存在 Android Keystore；
- License 是否允许改名、Fork 和再分发。

## 2. Android Mirror

项目地址：

<https://github.com/He11PC/android-mirror>

Android Mirror 的定位甚至比 SambaLite 更接近“纯同步工具”：配置 source → destination，比较两个目录并进行镜像或备份。

它支持的协议方向包括：

- Local；
- NFS；
- SMB；
- FTP / FTPS；
- SFTP；
- WebDAV。

它值得研究的能力包括：

- 多协议抽象；
- 目录比较；
- 自动 schedule；
- Room 状态持久化；
- Android KeyStore + AES-GCM 凭据保护；
- 后台同步任务。

### 对 Miyako 的价值

Android Mirror 更像一个可以抽取“同步引擎”的候选：

```text
Android Mirror
├── Provider 抽象
├── Source / Destination
├── Directory Comparator
├── Sync Job
├── Schedule
└── Credential Storage
```

Miyako 可以只保留 SMB 和 Local 两种 Provider，把目标路径固定或默认指向音乐目录，再把音乐文件筛选、封面处理和 MediaStore 刷新加在同步完成之后。

需要重点检查：

- 多协议抽象是否足够解耦；
- 是否可以只启用 SMB，不带入不需要的协议；
- 镜像删除行为是否安全；
- 任务是否能在 Android 后台稳定完成；
- 大文件和大量小文件的性能；
- 断点续传是否按文件粒度实现；
- Android Doze、省电和网络变化时的恢复行为。

## 3. SMBSync3

项目地址：

<https://github.com/Sentaroh/SMBSync3>

SMBSync 是这个领域的老牌项目，专门用于 Android 与 PC/NAS 之间的 SMB 文件同步。它的历史价值很高，适合用来理解一个长期存在的 SMB 同步工具需要哪些功能。

典型同步模式包括：

- Mirror；
- Move；
- Copy；
- Archive；
- Schedule。

它还覆盖 Internal Storage、SD Card、USB OTG 和 SMB 等多种来源/目标组合。

### 对 Miyako 的价值

SMBSync3 不一定是最适合直接 Fork 的现代底座，但适合参考：

- SMB 同步任务的完整选项；
- 同步方向和删除策略；
- 计划任务；
- 错误处理；
- 大规模文件同步中的边界情况；
- 长期维护中暴露出来的 Android 兼容问题。

它的主要风险是 UI 和代码组织可能比较传统，直接把整个项目改造成 Miyako 的现代 Compose 产品，成本可能高于只抽取同步思路。

## 4. OpenSync

项目地址：

<https://github.com/thedickestrick/opensync>

OpenSync 的定位是现代、开源、无广告的文件管理和文件夹同步应用，支持：

- SMB；
- FTP / FTPS；
- SFTP；
- WebDAV。

同步方向包括：

- Upload；
- Download；
- Two-way；
- 冲突规则；
- Include / exclude；
- 删除传播；
- WorkManager schedule；
- 仅 Wi-Fi；
- 仅充电；
- 进度通知；
- 同步日志。

技术路线也很符合 Miyako 的目标：

- Android Native；
- Kotlin；
- Jetpack Compose；
- Material 3；
- Room；
- WorkManager；
- Android Keystore。

代码结构看起来也适合 Agent 理解：

```text
provider/
    Local
    SMB
    FTP
    SFTP
    WebDAV

sync/
    SyncEngine
    SyncFilter
    SyncManager
    SyncWorker

ui/
    Compose screens
```

### 主要风险

OpenSync 的架构方向很吸引人，但项目规模和真实设备验证程度需要谨慎评估。README 已经提示过设备测试矩阵仍不完整，因此不应该仅凭架构漂亮就直接把它当生产底座。

更适合的使用方式是：

1. 阅读其同步引擎和 WorkManager 实现；
2. 在真实 Android 设备上测试 SMB、大文件、锁屏和网络切换；
3. 检查 License 和依赖；
4. 再决定是 Fork、抽取思路，还是只借鉴模块组织。

## 5. SMB Sync 和 BasicSync

这两个项目可以作为补充参考，但当前优先级低于 SambaLite、Android Mirror、SMBSync3 和 OpenSync。

SMB Sync 更适合研究手动 SMB 同步流程；BasicSync 更偏通用的后台同步用途，不一定直接适合作为 Miyako 的 SMB 专项底座。

## Miyako 的新架构选择

现阶段可以考虑三种路线。

### 路线 A：同步应用 + 外部播放器

```text
SambaLite / Android Mirror / OpenSync
              ↓
      同步到 Android Music
              ↓
      Gramophone / Auxio 播放
```

优点是改动最少、风险最低，也能最快验证 NAS 同步是否好用。缺点是同步和播放器是两个 App，体验不完全统一。

### 路线 B：Fork 同步应用，加入 Miyako 音乐库

```text
现成 Sync App
      ├── SMB / 后台任务 / 同步引擎
      └── Miyako 音乐目录和 MediaStore 集成
```

这是当前最现实的中间路线。播放器继续使用系统或外部成熟播放器，Miyako 只负责音乐同步体验。

### 路线 C：同步引擎 + 原生播放器合并

```text
Sync Engine
      ↓
MediaStore / Local Library
      ↓
Gramophone / Auxio / SPICa 播放核心
```

这是完整 Miyako 产品的最终方向，但不应该作为第一步。必须先分别验证同步底座和播放器底座，确认两者的 License、数据模型和模块边界后再合并。

## 推荐调查顺序

当前建议按以下顺序实际 clone 和测试：

1. SambaLite：最接近“SMB + Folder Sync + Android 音乐目录”。
2. Android Mirror：研究多协议 Provider、目录比较和后台镜像。
3. OpenSync：研究现代 Compose、WorkManager 和同步引擎结构。
4. SMBSync3：研究成熟 SMB 同步场景和历史边界问题。
5. 再与 Gramophone、Auxio 或 SPICa 的本地音乐库接入方式比较。

## 必须记录的评估项

每个候选项目都要用同一张表评估，避免只凭第一印象选择：

| 评估项 | 要回答的问题 |
| --- | --- |
| License | 能否 Fork、修改、闭源分发或公开发布改版？ |
| 最近 commit | 是否仍在维护？提交是否只是依赖升级？ |
| Issue 状态 | 是否有人处理 SMB、后台和存储相关问题？ |
| 构建难度 | 能否在干净环境和 Android Studio 中构建？ |
| 最低 Android 版本 | 是否覆盖自己的手机和未来设备？ |
| Compose 使用程度 | UI 是否容易交给 Agent 修改？ |
| SMB 库 | 使用 jcifs-ng、SMBJ 或自研实现？支持 SMB2/3 吗？ |
| 同步算法 | 比较依据是什么？是否支持删除、冲突和断点？ |
| WorkManager | 后台任务在锁屏、Doze、重启后是否可靠？ |
| Storage / SAF | Android 现代存储权限是否处理正确？ |
| 凭据保护 | 是否使用 Android Keystore，密码是否会落盘明文？ |
| 测试 | 是否有同步、网络中断、大文件和权限测试？ |
| 可扩展性 | 能否独立加入 Music Provider 和 MediaStore 集成？ |

## 当前结论

目前不急着从零写 Miyako Sync，也不急着把同步器和播放器强行合并。

更稳妥的路线是：

```text
先验证 SambaLite / Android Mirror / OpenSync
              ↓
确认一个可构建、可运行、License 合适的同步底座
              ↓
先做 SMB → Android Music 的同步闭环
              ↓
接入 MediaStore
              ↓
再决定是否整合 Gramophone / Auxio / SPICa
```

最终 Miyako 的特色应该是：

> 让 NAS 音乐像本地音乐一样自然地出现在 Android 播放器里。

而不是再做一个功能重复、播放体验不如原生播放器的通用文件同步 App。
