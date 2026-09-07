---
title: Miyako：原生 Android NAS 音乐播放器
date: 2026-09-07
description: 将 NAS 音乐同步到 Android 本地音乐库，并基于成熟原生播放器继续开发。
tags:
  - projects
  - miyako
  - android
  - music
  - nas
  - smb
---

# Miyako：原生 Android NAS 音乐播放器

## 一句话定位

Miyako 是一个面向个人使用的 Android 原生音乐播放器：从 NAS 通过 SMB 同步音乐到手机本地音乐库，再利用成熟播放器完成流畅播放、后台播放、锁屏控制、耳机控制和播放队列等能力。

核心价值不是重新造一个播放器，而是让 NAS 上的音乐可以自然地进入 Android 的本地音乐体验。

```text
NAS 音乐库
    │
    │ SMB / 增量扫描 / 断点续传
    ▼
Android 本地 Music 目录
    │
    │ MediaStore 扫描
    ▼
成熟 Android 音乐播放器底座
    │
    ▼
Media3 / ExoPlayer / MediaSession
    │
    ▼
后台播放、通知栏、锁屏、蓝牙和 Android Auto
```

## 背景：旧版 Miyako

旧版 `nas-music-sync` 分支采用的是：

- Tauri 2
- React
- TypeScript
- Rust
- Android WebView / Tauri bridge
- HTML5 Audio 播放

已有设计覆盖了较完整的链路，包括：

- SMB 连接 NAS
- 递归扫描远程音乐目录
- 增量同步
- 下载和断点续传
- 本地音乐库
- 播放队列
- MediaSession
- 播放历史
- 同步状态持久化

旧版最大的教训是：跨平台前端方案可以较快搭出界面，但在 Android 上做长期使用的音乐播放器时，播放流畅度、后台行为、系统媒体控制、通知栏和锁屏体验都需要大量额外桥接。HTML5 Audio 和 Tauri Android bridge 也会让本来属于 Android 平台的能力变得间接。

旧版分支：

<https://github.com/iamcheyan/miyako/tree/ralph/nas-music-sync>

这条分支应作为需求、流程和已有实现的参考，而不是新版本必须继续沿用的技术底座。

## 新版目标

新版 Miyako 的目标不是“从零实现音乐播放器”，而是：

1. 使用成熟的 Android 原生音乐播放器作为底座。
2. 保留成熟底座已有的播放、媒体会话和本地音乐库能力。
3. 把 Miyako 的特色集中在 NAS 连接、扫描、同步和下载。
4. 同步完成后，让音乐进入 Android 本地 Music 目录和 MediaStore。
5. 尽量不改动底层播放器的核心播放链路。
6. 让 Agent 可以在清晰的模块边界内继续添加功能。

## 不应该重新开发的部分

以下能力已经有成熟实现，除非底座确实不满足需求，否则不应该从头写：

- Media3 / ExoPlayer 播放
- MediaSession 和 `MediaLibraryService`
- 音频焦点处理
- 耳机拔出暂停
- 蓝牙媒体控制
- 锁屏控制和通知栏
- 播放队列
- 后台播放
- 本地音乐扫描
- 专辑、艺术家和歌曲列表
- ReplayGain、无缝播放等音频细节
- Android Auto
- 歌词、播放历史和歌单基础能力

Miyako 真正需要长期维护的部分应该是：

- NAS 设置
- SMB 认证和连接
- 远程目录扫描
- 远程文件元数据和指纹
- 本地同步清单
- 增量比较
- 下载队列
- 断点续传
- 并发控制和错误重试
- 同步状态展示
- 下载完成后的 MediaStore 刷新

## 候选 Android 底座

以下是目前值得优先研究的项目。这里的排序不是单纯按 Stars，而是考虑“fork 后加入 NAS 同步”的难度。

| 项目 | 技术路线 | 优势 | 对 Miyako 的意义 |
| --- | --- | --- | --- |
| [[#gramophone|Gramophone]] | Kotlin、Media3、Material 3 | 原生体验现代，功能基础完整 | 适合作为成熟播放器底座 |
| [[#spica-music-android|SPICa Music Android]] | Kotlin、Compose、Material 3、Media3、Room、多模块 | 架构清晰，扩展模块边界友好 | 适合大量 Agent 参与二次开发 |
| [[#auxio|Auxio]] | Kotlin、Media3、本地音乐 | 播放器能力扎实，音乐库认真 | 适合深入研究播放和本地库实现 |
| [[#symphony|Symphony]] | Kotlin、Jetpack Compose、Material You | 代码和 UI 方向较现代 | 适合大幅度重做界面 |
| [[#archive-tune|ArchiveTune]] | Kotlin、Compose、Material 3、本地+在线 | 同时考虑本地和网络音乐 | 适合未来扩展在线音乐源 |
| [[#retro-music-player|Retro Music Player]] | Kotlin、MVVM、功能完整 | 功能非常多，生态和案例多 | 适合从完整产品开始魔改，但历史包袱较重 |

## 当前推荐

当前最值得实际 clone、构建和阅读的两个项目是：

1. **Gramophone**：偏成熟可靠，适合先验证“NAS 下载到本地后能否自然接入现有音乐库”。
2. **SPICa Music Android**：偏现代架构，Compose 和多模块结构更适合后续拆出 NAS / Sync 功能。

如果只选一个先开始，我会先研究 Gramophone；如果验证后发现它的扩展边界不够清晰，再转向 SPICa。

这里推荐 Gramophone，并不是因为它一定拥有最好看的 UI，而是因为 Miyako 不应该重新实现播放器基础设施。底座越成熟，Miyako 的开发时间越能集中在 NAS 同步这个真正有特色的功能上。

## Gramophone

Gramophone 的优势：

- Kotlin + Android 原生
- AndroidX Media3
- Material 3
- MediaStore 本地音乐库
- 文件夹浏览
- 歌单
- ReplayGain
- Equalizer
- LRC / TTML / SRT 歌词
- 逐词、逐音节的 Karaoke 歌词能力

它对 Miyako 最有吸引力的地方是：NAS 同步完成后，可以把文件交给 Android MediaStore，而不是重写整个播放器的 Library、队列和 MediaSession。

需要重点确认：

- 音乐文件必须放在哪里才能被扫描；
- MediaStore 刷新是自动的还是需要显式触发；
- 删除远程文件时，本地是否需要同步删除；
- 文件修改后，如何更新歌曲元数据和封面；
- 自定义同步页面应该放在哪个模块；
- 项目是否允许以 fork 方式长期维护自己的产品版本。

## SPICa Music Android

SPICa 的技术结构值得重点研究：

- Kotlin
- Jetpack Compose
- Material 3
- Media3 ExoPlayer
- MediaSession / MediaLibraryService
- Room
- DataStore
- Retrofit + OkHttp
- Koin
- Coil
- 多模块架构

如果它的模块边界保持清晰，可以考虑增加：

```text
feature-nas-domain
feature-nas-data
feature-sync-domain
feature-sync-data
feature-sync-ui
```

它更适合这样的目标：除了本地音乐，未来还可能增加 SMB、WebDAV、SFTP、Jellyfin 或 Navidrome 等音乐来源，并统一进入一个本地 Library。

## Auxio

Auxio 的播放器和本地音乐管理能力很强，适合研究以下部分：

- 音乐元数据模型
- 艺术家、专辑和歌曲组织方式
- ReplayGain
- Media3 播放链路
- 本地文件扫描
- Android 系统媒体集成

它的主要顾虑是构建和底层定制相对复杂，包含自定义 Media3 patch、TagLib、NDK/CMake 和 submodule 等内容。对于“fork 后交给 Agent 持续扩展”的路线，构建复杂度会增加日常维护成本。

因此，Auxio 适合作为优秀实现参考，也可以作为候选底座，但第一选择仍然要先评估构建和扩展成本。

## Symphony

Symphony 的方向是 Kotlin + Jetpack Compose + Material You，适合希望大量重做 UI 的路线。它可以作为：

- Compose 页面设计参考；
- 播放队列和本地库实现参考；
- Agent 修改 UI 的实验底座。

如果产品外观和交互是 Miyako 最重要的部分，Symphony 的优先级可以上升；如果优先目标是尽快获得稳定播放器，则应先看 Gramophone。

## ArchiveTune

ArchiveTune 比较适合未来需要本地音乐和在线音乐源并存的方向。它值得关注，但项目较新，应该先验证：

- 架构是否稳定；
- 网络音乐和本地音乐是否真正统一；
- 下载、缓存和播放权限是否容易拆出；
- 许可证是否符合 Miyako 的分发计划；
- 项目当前维护状态是否适合长期 fork。

## Retro Music Player

Retro Music Player 功能非常完整，适合希望从“大而全”的音乐播放器开始修改的情况。它的优点是功能覆盖广，缺点是项目历史更长、代码量更大、理解成本更高。

如果 Miyako 的目标是快速获得完整产品，可以研究它；如果目标是让 Agent 长期维护清晰的 NAS 同步模块，应该先比较它与 Gramophone / SPICa 的模块边界。

## 不再优先考虑 OuterTune 原版

OuterTune 曾经是本地+在线音乐方向的重要参考，但原版已经明确停止 active development，并建议用户转向其他项目。因此不把原版 OuterTune 作为新项目的第一底座。

它仍然可以作为产品功能和在线音乐架构的参考，但不应默认它是一个适合长期 fork 的活跃基础。

## 推荐架构

新版 Miyako 可以分成三层：

```text
Miyako
├── Player Core
│   └── 选定的 Android 原生播放器 / Media3
│
├── Local Library
│   ├── Songs
│   ├── Albums
│   ├── Artists
│   └── Playlists
│
└── Miyako NAS Sync
    ├── NAS Settings
    ├── SMB Connection
    ├── Remote Scanner
    ├── Sync Manifest
    ├── Incremental Diff
    ├── Download Manager
    ├── Retry / Resume
    └── MediaStore Integration
```

### 第一阶段：只做同步，不改播放器核心

第一版尽量不改动底座的播放器页面和播放服务，只增加：

- NAS 设置页；
- SMB 连接测试；
- 远程音乐目录选择；
- 首次全量扫描；
- 本地同步状态；
- 新文件下载；
- 下载完成后刷新 MediaStore。

这样可以尽快验证最重要的用户路径：

```text
配置 NAS → 扫描远程音乐 → 下载 → 打开播放器 → 正常播放
```

### 第二阶段：增量同步

增加本地 manifest，至少记录：

- 远程路径；
- 文件大小；
- 修改时间；
- 可选文件 hash；
- 本地路径；
- 下载状态；
- 最后错误信息；
- 最后同步时间。

比较时按成本从低到高进行：

1. 远程路径；
2. 文件大小；
3. 修改时间；
4. 只有必要时计算 hash。

### 第三阶段：同步策略

需要明确几种策略：

- NAS 新增文件：下载到本地；
- NAS 文件修改：重新下载或保留两个版本；
- NAS 文件删除：默认不自动删除手机文件；
- 手机本地多出的文件：不上传 NAS；
- 下载中断：保留临时文件并支持续传；
- 空间不足：暂停任务并给出明确提示；
- Wi-Fi / 移动网络：默认只允许 Wi-Fi 同步；
- 充电状态：可选仅充电时执行大量同步。

## 第一版明确不做

为了避免重蹈旧版“功能范围过大”的问题，第一版不做：

- 在线音乐搜索；
- YouTube Music；
- WebDAV / SFTP / Jellyfin 多来源；
- 手机向 NAS 上传；
- 云端账号同步；
- 自定义完整播放器 UI；
- 自定义音频引擎；
- AI 音乐分类。

这些功能可以作为后续路线，但不能影响“SMB 同步到本地并流畅播放”这个最小闭环。

## Agent 二次开发约定

如果让 Agent 参与开发，应该把工作拆成边界清晰的 story：

1. 构建并运行底座，不改功能。
2. 画出现有播放器模块和数据流。
3. 增加 NAS 设置数据模型。
4. 增加 SMB 连接测试。
5. 实现远程目录扫描。
6. 实现同步 manifest。
7. 实现单文件下载。
8. 实现断点续传和重试。
9. 实现同步队列和取消。
10. 实现 MediaStore 刷新。
11. 增加同步历史和错误展示。
12. 增加完整的离线场景测试。

每个 story 都应该保持可构建、可测试、可回滚，不要让 Agent 同时重构播放器、改首页和加入 NAS。

## 下一步

当前最合理的下一步不是立即 fork 并大改，而是完成一次底座验证：

1. Clone Gramophone 和 SPICa Music Android。
2. 在本机或 Android 模拟器中成功构建并运行。
3. 记录两者的模块结构、许可证、最低 Android 版本和构建依赖。
4. 找到本地音乐扫描、MediaStore、播放服务和播放队列的入口。
5. 用一个最小实验把一首 SMB 文件下载到 Music 目录并触发扫描。
6. 比较“添加一个 NAS 设置页”的改动范围。
7. 再决定正式 fork 哪一个作为 Miyako 底座。

最终选择标准不是 Stars 数量，而是：

- 能否稳定构建；
- 播放体验是否流畅；
- 播放核心是否可以少改；
- NAS 同步模块能否独立；
- Agent 是否容易理解和修改；
- 许可证是否允许你的使用和分发方式；
- 上游维护是否足够稳定。
