---
title: COSMIC 桌面作为 Inua 目标环境的评估
description: 核对 COSMIC Epoch 1.11、Debian 13 可用性、Wayland 协议、窗口管理接口与逐窗捕获，判断 Inua 接入条件。
---

# COSMIC 桌面作为 Inua 目标环境的评估

> **隐私提醒：** 本文不记录主机名、内部地址、账号、密钥或本机绝对路径；测试环境只写“Debian 13 trixie”。本机未运行 COSMIC 会话，所有会话行为均明确标为未实测。

## 1. 问题与判定标准

Inua 是 Go + GTK4 的自研 Wayland 桌面 shell。目标是让顶栏、dock、launcher、控制中心、通知、OSD、锁屏作为 layer surface 工作，并从 compositor 获取窗口和工作区状态、执行窗口管理操作、展示逐窗预览。

本文将证据分为三层：

1. **官方文档/仓库源码**：System76/COSMIC 官方说明、GitHub release、协议 XML 和 cosmic-comp 源码。适用于说明项目设计、已发布版本及实现边界。
2. **第三方协议支持表**：Wayland Explorer 对协议 XML 和 compositor 版本的快照。它不代表 Debian 包状态，也不能替代运行时验证。
3. **本机实测**：Debian 13 trixie 的只读包查询。当前机器不能运行 COSMIC 桌面会话，协议行为没有本机会话实测。

必须分别核对 layer-shell、窗口与工作区查询/控制、逐窗捕获、会话锁、交互模型以及 Debian 安装来源。单独支持 layer-shell 不等同于提供窗口管理接口。

## 2. COSMIC 现状与版本

### 2.1 当前稳定版本

截至 2026 年 11 月，COSMIC 已进入 Epoch 1.x 稳定发布系列。`cosmic-comp` 的 Epoch 1.11.0 release 标注于 2026-10-20 发布；此前 1.5.0 在 2026-07-29 发布。版本号与发布节奏应以各组件 release 为准：COSMIC 是多个仓库组成的桌面，不能假设所有组件在同一天、同一补丁号发布。[1][2]

官方 COSMIC 页面将其描述为可用于多种发行版的桌面，下载页列出 Pop!_OS、Fedora、CachyOS、NixOS、Arch、openSUSE 等渠道。列表会随时间变化；这表示项目并非只能在 Pop!_OS 使用，但不能推出 Debian stable 有官方包。[3]

### 2.2 技术栈

`cosmic-comp` 是 COSMIC 的 Wayland compositor，使用 Rust 实现，并基于 Smithay 的 compositor 构件。它不是 wlroots compositor。协议相似或同名并不意味着它与 wlroots 的内部接口、插件系统或 IPC 兼容。[4]

COSMIC 采用模块化组件：compositor、会话、设置、面板和应用分别维护。COSMIC 自有协议仓库明确标注为额外 Wayland 协议及 Rust 绑定，且处于持续演进状态；协议名称带 `unstable`，对第三方集成意味着需要跟随版本和协议变更。[5]

## 3. Debian 13 可用性

### 3.1 本机包查询

在 Debian 13 trixie 上只读执行：

```sh
apt-cache policy cosmic-session cosmic-comp cosmic-randr cosmic-term
```

命令没有输出，表示当前 APT 索引中这些包均没有可查询的候选版本。该结果只描述本机配置的仓库与索引，不能证明互联网中不存在第三方包。查询属于**本机实测**，未安装、更新索引或改变系统。[6]

Debian 官方包搜索也应按发行版与包名复查；COSMIC 官方下载页当前没有列出 Debian 安装渠道。因而，Debian 13 官方仓库不是这次评估中已确认的可安装路径。[3][7]

### 3.2 可选渠道与风险

当前存在面向 Debian 13 的社区打包仓库，例如 cosmic-trixie，提供从源码构建的 Debian 包；它不是 System76 官方发行仓库，也不是 Debian 官方归档。该仓库说明其包面向 trixie，并需添加第三方 APT 源和签名密钥。其 README 同时提醒它与 System76 无隶属关系。[8]

另一条路线是源码构建。`cosmic-comp` 官方仓库提供构建说明，但完整 COSMIC 会话涉及多个 Rust 组件、协议生成、系统依赖、登录会话和图形栈；不能简化成“编译一个 compositor 即可”。[4][5]

不建议把 Pop!_OS 或 Ubuntu 的二进制仓库直接混入 Debian stable：基础库版本、依赖版本、升级策略和包元数据可能不同，混源会造成依赖冲突或意外升级。社区仓库虽提供 trixie 目标包，仍意味着把该维护者的签名包纳入系统信任范围；应评估维护者、更新频率、源码构建方式、包签名和回滚方案。

**安装门槛判断：部分满足。** Debian 13 有社区维护的 apt 包路线，但本机官方仓库无包、System76 未列 Debian 为官方渠道。若“可安装”要求官方仓库或官方支持，则不满足；若接受第三方 trixie 仓库，技术上有可行路径，但需要承担第三方供应链和维护风险。此评估未添加仓库或安装包。

## 4. 默认交互与特效

### 4.1 堆叠与自动平铺

COSMIC 同时支持堆叠窗口和自动平铺。自动平铺可通过设置界面的当前工作区控制，常见操作名称为 **Tile current workspace**；关闭后该工作区采用自由浮动窗口行为。项目配置源码还定义 `autotile` 与 `autotile_behavior`，行为选项包括 `Global` 和 `PerWorkspace`。`PerWorkspace` 的语义是自动平铺设置作用于工作区，新建窗口/工作区遵循相应设置；这是配置模型，不应误写成每个工作区都必然有独立、永久保存的开关。[9][10]

关闭自动平铺后，窗口可重叠并自由摆放，也支持最大化、最小化等传统操作。COSMIC 有桌面面板和窗口装饰，因此交互上符合本用户的堆叠偏好。具体设置名称可能随版本翻译或界面调整，本文未在 COSMIC 会话实测。[9][10]

### 4.2 动画、圆角与模糊

COSMIC 源码包含窗口移动、最小化等动画时长配置/常量；官方配置和组件版本需要逐项确认。公开资料中可查到圆角相关 COSMIC 协议及视觉设置线索，但不能据此宣称所有动画、模糊和圆角均有一个统一“关闭全部特效”开关。[5][11]

用户不需要 3D 特效，而 COSMIC 的主要风险不是强制 3D 场景效果；它是现代 2D 合成桌面，存在窗口过渡动画等视觉效果。倾向朴素使用时，可先关闭/减少可见动画和圆角等设置（若目标版本提供），不启用额外视觉扩展，并在实际显卡环境检查性能。不能在未验证设置项前承诺所有特效都能完全关闭。对“不要 3D 类特效”而言，整体可接受；对“所有动画与模糊必须可彻底关闭”则证据不足，属于部分满足。

## 5. 协议与逐窗捕获

### 5.1 第三方协议支持表快照

Wayland Explorer 查询时列出 COSMIC 对以下协议的支持记录，表中 compositor 版本标识为 `1.0.0~beta.8`，不是当前 1.11.0 的 Debian 实测版本：[12]

| 协议 | 表中版本 | 用途及限制 |
| --- | --- | --- |
| `zwlr_layer_shell_v1` | 5 | 顶栏、dock、launcher、OSD 等 layer surfaces；第三方快照列支持 |
| `ext_session_lock_v1` | 1 | 会话锁定协议；第三方快照列支持 |
| `ext_workspace` | 按协议页快照 | 标准工作区管理协议；需核对 compositor 实际公布版本和请求覆盖 |
| `ext_foreign_toplevel_list_v1` | 按协议页快照 | 枚举外部 toplevel 的基础状态，不提供完整窗口管理 |
| `ext_image_copy_capture_v1` | 1 | 复制捕获指定图像源；能否捕获窗口取决于图像源协议 |

这些数据是**第三方协议支持表**而非 COSMIC 官方兼容承诺。实际协议版本应通过运行时 `wayland-info` 检查，功能应通过客户端操作验证。

### 5.2 COSMIC 自有协议

COSMIC 协议仓库包含以下不稳定协议 XML。版本号是协议接口版本，不是 COSMIC Epoch 版本。[5]

这些 XML 的版本号可直接从仓库协议接口声明核验：workspace v1 与 v2 分属两个 XML；toplevel-info 为 v3；toplevel-management 与 image-capture-source 各为 v1。协议更新可能在不改变桌面 Epoch 主版本表达的情况下进行，因此客户端应按 registry 公布版本协商，不能只根据桌面 About 页面版本做硬编码判断。[5]

| 协议 | XML 接口版本 | 主要用途 |
| --- | --- | --- |
| `cosmic-toplevel-info-unstable-v1` | 3 | 在 `ext-foreign-toplevel-list` 基础上提供窗口列表与额外属性，例如 title、app_id、状态和动作信息 |
| `cosmic-toplevel-management-unstable-v1` | 1 | 对 COSMIC toplevel 发出管理请求，包括激活、关闭、最大化/最小化、移动到工作区等协议动作 |
| `cosmic-workspace-unstable-v1` | 2 | COSMIC 命名空间下查询/管理工作区；与通用 `ext-workspace` 语义相关但不是可互换保证 |
| `cosmic-image-capture-source-unstable-v1` | 1 | 将 COSMIC 图像源接到 `ext-image-copy-capture`，可表达 compositor 自有图像源，包括 toplevel 类来源 |

协议存在不等于任意普通客户端都能绑定，也不代表管理动作完整等价于 Hyprland IPC。`cosmic-toplevel-info` 的定位偏 taskbar/dock 窗口列表；管理协议对特定 toplevel 提供有限动作，XML 没有通用“设定任意浮动几何 x/y/w/h”的请求。工作区移动与任意浮动窗口位置/尺寸必须分别核对协议版本和 compositor 实现，不能从窗口列表协议推导出来。[5][13]

### 5.3 捕获能力与限制

第三方协议快照将 COSMIC 列为支持 `ext-image-copy-capture`；COSMIC 自有 image-capture-source 协议用于提供捕获来源。组合起来有实现逐窗捕获的协议路径：捕获客户端请求指定 COSMIC toplevel 图像源，再按 image-copy-capture 约束获取帧。[12][5]

因此，**逐窗捕获在协议设计层面可行**，并优于只有整屏 screencopy 的方案。但这不是 Inua 已经可用的稳定通用 API：源协议仍属 COSMIC 私有/不稳定命名空间，第三方客户端是否获准绑定、被遮挡窗口帧行为、缓冲格式、持续帧率、内容保护及版本兼容都需目标版本实测。当前 Debian 13 trixie 环境没有 COSMIC 会话，以上全部未实测。

## 6. 管理接口与第三方 shell 接入

### 6.1 没有通用 Sway/Hyprland IPC

COSMIC 公开能力不应被描述为已经具有通用 `swaymsg` 或 `hyprctl` 等价 IPC。2026 年 5 月的 cosmic-comp issue 仍以 feature request 形式要求脚本化接口，覆盖窗口/工作区/输出 JSON 查询、事件、窗口几何与工作区移动等。该 issue 是项目讨论证据，不是官方路线承诺；但足以说明不能假定存在完整通用 socket IPC。[14]

常规应用的 D-Bus 或 COSMIC 桌面组件间服务也不自动构成 compositor 管理 API。没有找到一份官方通用 D-Bus 接口可覆盖所需的窗口快照、事件、任意几何控制和绑定表读取。合理接入方向是 Wayland 协议，而不是假定可从桌面应用 D-Bus 远程操控 compositor。[5][14]

### 6.2 协议权限与授权

COSMIC toplevel 信息/管理协议面向 shell 类客户端，但它们涉及跨客户端窗口信息和操作，不能把协议 XML 中的接口当成任意客户端总能绑定的公共接口。compositor 可依据客户端身份、启动环境、会话策略或内部授权机制限制 global 的公布/访问；Flatpak 沙箱也可能看不到相关 Wayland globals。COSMIC issue 中有第三方窗口切换器在沙箱内缺少 toplevel、management 与 layer-shell globals 的案例，显示运行环境的协议可见性是独立门槛。[15]

公开资料和协议定义本身没有给出一套稳定、面向任意第三方 shell 的通用授权配置合同。接入前需检查目标 cosmic-comp 版本的 global 注册/过滤源码、会话启动时的授权路径，并在非沙箱和实际打包环境分别跑 `wayland-info`。不能通过假设“协议是 Wayland global 就默认开放”来设计 Inua。

### 6.3 Inua 要写什么

如目标会话允许绑定，Inua 需新增 COSMIC Wayland 后端：

1. 绑定 layer-shell 并实现锚定、exclusive zone、输出重连和键盘交互。
2. 绑定 `ext-foreign-toplevel-list` 与 `cosmic-toplevel-info`，维护窗口对象生命周期、title/app_id/state，并订阅变化。
3. 绑定 workspace 协议获取输出/工作区及当前工作区关系，并实现工作区切换/创建与窗口移动（以目标 XML 实际支持动作为限）。
4. 绑定 `cosmic-toplevel-management` 实现协议提供的聚焦/关闭/窗口状态动作，处理协议错误与异步结果。
5. 对没有协议动作的浮动窗口自由几何，评估是否需要向上游提出扩展或开发 compositor 侧桥接；不能从标准 toplevel protocol 推断任意 `move/resize`。
6. 实现 COSMIC image-capture-source 与 image-copy-capture 客户端，验证逐窗捕获和资源生命周期。
7. 单独处理 ext-session-lock 接入与真正的锁定会话流程。

COSMIC 没有通用 IPC 时，Inua 的适配层将直接面对多个 unstable Wayland 协议及版本。读取快捷键绑定表也没有在上述管理协议中获得通用保证；若没有专门接口，只能另行评估配置解析或要求用户在 Inua 配置快捷键，不能宣称完整查询支持。

## 7. 对 Inua 的逐项判断

| Inua 依赖 | 判断 | 理由 |
| --- | --- | --- |
| Layer-shell | **支持（协议层）** | 第三方表列 COSMIC 支持 v5；当前会话行为未实测 |
| 输出、工作区、窗口、焦点状态 | **部分** | foreign-toplevel + COSMIC toplevel-info/workspace 协议存在；状态字段、对象关系和授权需接入验证 |
| 聚焦、关闭、移动工作区 | **部分** | COSMIC toplevel-management 提供受限管理请求；具体范围依版本与授权，缺少通用 IPC |
| 浮动窗口任意几何与成功回执 | **缺失/需桥接** | 协议没有 Hyprland 式任意坐标尺寸控制的通用请求；缺少通用脚本 IPC |
| 快捷键绑定表 | **缺失** | 未发现公开稳定的通用 compositor 查询接口 |
| 逐窗捕获 | **部分（协议路径存在）** | ext-image-copy-capture + COSMIC image-capture-source 可形成路径；权限和实时行为未实测 |
| 会话锁 | **协议层支持** | 第三方协议表列 ext-session-lock；锁屏流程未实测 |
| Debian 可安装 | **部分** | apt 官方索引无候选；有社区 Debian 13 包源，但不是官方包 |
| 堆叠桌面偏好 | **支持** | 可关闭当前工作区自动平铺，支持重叠浮动和传统窗口操作 |

### 7.1 适配工作量与主要风险

相较于已有 Hyprland 后端，工作量为**中到高**：增加 Wayland 协议客户端、窗口/工作区状态映射、事件一致性处理、捕获通路与会话锁适配。若目标 cosmic-comp 允许所有相关 globals 且协议覆盖符合预期，状态展示和基础窗口动作可实现；若管理 global 受限或缺少浮动几何控制，则需要上游授权机制、协议扩展或 compositor 侧桥接，工作量会升至高且产生版本维护负担。

主要风险是 unstable COSMIC 协议演进、第三方客户端授权/沙箱可见性、管理动作边界、捕获性能与被遮挡窗口语义，以及第三方 Debian 包的升级和依赖维护。协议支持表只能用于筛选，无法消除这些风险。

## 8. 与 Wayfire、Labwc、KWin 对比

| 候选 | 堆叠取向 | Layer-shell | 管理接口 | 逐窗捕获 | Debian 13 结论 |
| --- | --- | --- | --- | --- | --- |
| COSMIC | 堆叠可用，自动平铺可关 | 协议表支持 | COSMIC unstable 协议，缺通用 IPC；几何控制不充分 | 协议路径存在，需授权/实测 | 官方索引无候选；社区源可用但非官方 |
| Wayfire | 原生浮动/堆叠 | 支持 | 插件化 JSON IPC | Debian trixie 的 0.9.0/wlroots 0.18 仅整屏 screencopy，不能逐窗捕获 | 官方包可安装，需核插件 |
| Labwc | 原生堆叠 | 需按版本/发行版验证 | 缺通用窗口管理 IPC | 无完整逐窗路径保证 | trixie 有包，缺口在 IPC |
| KWin/Plasma | 传统堆叠桌面 | 支持 | KWin 专有脚本/接口与 D-Bus 集成 | 依目标版本和捕获接口核验 | Debian 官方仓库可安装 Plasma，Inua 需专属桥接 |

Wayfire 和 Labwc 的边界沿用既有 Inua 评估：Wayfire 插件 IPC 能提供窗口动作，但 trixie 版本不能满足逐窗实时预览；Labwc 的堆叠体验合适，却缺通用窗口管理 IPC。KWin 有成熟桌面生态但需专属适配。COSMIC 的优势是堆叠交互、layer-shell 与自有 toplevel/capture 协议组合；短板是 Debian 官方可用性和第三方 shell 管理接口成熟度。[12][14]

## 9. 结论与建议

**COSMIC 目前不能完整满足这组要求。** 堆叠交互满足；layer-shell 和会话锁在协议层有支持记录；逐窗捕获在协议设计上有 COSMIC 图像源路径。但最关键的窗口管理层缺少通用、稳定、面向第三方 shell 的脚本 IPC，COSMIC 自有 unstable 协议也没有证明覆盖任意浮动几何、绑定表查询与跨版本授权。Debian 13 官方仓库没有目标包候选，只有社区打包路线。

若“可安装”接受经过审查的第三方 Debian 13 apt 源，且愿意为 cosmic-comp 版本锁定并维护 unstable 协议适配，COSMIC 值得做原型；原型首先要验证 globals 授权、窗口/工作区事件、窗口移工作区、浮动几何、逐窗帧捕获及沙箱策略。若硬性要求是 Debian 官方仓库可装、通用且完整的窗口/工作区控制 IPC、任意浮动窗口几何和可靠逐窗预览，当前答案是**不满足**，卡在发行版官方包与 compositor 管理接口两层。

后续条件是：Debian 官方提供并维护 COSMIC 包，或用户接受可信第三方源；COSMIC 上游公开稳定的 shell 管理授权与接口，补齐浮动几何/绑定查询或由 Inua 提供受支持桥接；并在目标 COSMIC 版本完成真实会话捕获与控制验收。

### 9.1 原型验收顺序

为避免把协议枚举误当成完整功能，COSMIC 原型应按下面顺序推进，并为每一步记录 compositor 版本与返回结果：

1. 在普通非沙箱进程中枚举 `wl_registry`，核对 layer-shell、session-lock、toplevel-info、toplevel-management、workspace 与 capture source globals 的存在及公布版本。
2. 订阅窗口初始快照与后续事件，测试新建、标题变化、焦点切换、窗口关闭及输出热插拔；确认对象销毁与快照同步没有竞态。
3. 在可恢复的测试窗口上尝试激活、关闭和移动工作区，区分请求被接受、状态实际改变和窗口最终呈现三种结果。
4. 使用浮动测试窗口确认是否有任意几何控制；若只能执行预设状态动作，将该能力标记为缺失，不能由 UI 侧保存一份假窗口状态替代 compositor 状态。
5. 用捕获协议请求单个窗口源，测量连续帧、被遮挡窗口、最小化窗口和受保护内容行为；并验证停止捕获后缓冲与协议对象释放。
6. 在计划的 Flatpak/原生打包方式下重复协议枚举，确认 sandbox policy 与 compositor 授权没有隐藏所需 globals。

验收应覆盖成功与失败路径：对未知或已销毁的窗口对象发请求时，compositor 应返回可处理错误且会话继续运行；不应只验证 happy path。若目标版本的协议 XML 与实现源码不同步，应以运行中的版本、生成协议和实际行为共同判定，不把 `master` 分支源码当成已发布版本承诺。当前 Debian 13 trixie 本机未运行 COSMIC，以上不是实测结果。

## 10. 参考资料

1. [cosmic-comp Epoch 1.11.0 Release](https://github.com/pop-os/cosmic-comp/releases/tag/epoch-1.11.0)
2. [cosmic-comp Epoch 1.5.0 Release](https://github.com/pop-os/cosmic-comp/releases/tag/epoch-1.5.0)
3. [System76 COSMIC 下载与发行版列表](https://system76.com/cosmic/download)
4. [cosmic-comp 官方仓库与构建说明](https://github.com/pop-os/cosmic-comp)
5. [COSMIC 官方 Wayland 协议仓库](https://github.com/pop-os/cosmic-protocols/tree/main/unstable)
6. [Debian `apt-cache policy` 手册](https://manpages.debian.org/trixie/apt/apt-cache.8.en.html)
7. [Debian Packages 搜索](https://packages.debian.org/)
8. [Debian 13 社区 COSMIC 包仓库说明（非 System76 官方）](https://codeberg.org/justaguylinux/cosmic-trixie)
9. [System76：COSMIC 自动平铺与堆叠说明](https://system76.com/support/pop-basics/)
10. [cosmic-comp 自动平铺配置源码](https://github.com/pop-os/cosmic-comp/blob/master/cosmic-comp-config/src/lib.rs)
11. [cosmic-comp 布局动画源码](https://github.com/pop-os/cosmic-comp/blob/master/src/shell/layout/tiling/mod.rs)
12. [Wayland Explorer：layer-shell、session-lock、image-copy-capture 支持表](https://wayland.app/protocols/wlr-layer-shell-unstable-v1)；[session-lock](https://wayland.app/protocols/ext-session-lock-v1)；[image-copy-capture](https://wayland.app/protocols/ext-image-copy-capture-v1)
13. [COSMIC toplevel-info 支持页（Wayland Explorer）](https://wayland.app/protocols/cosmic-toplevel-info-unstable-v1)
14. [cosmic-comp：通用窗口状态 IPC 功能请求 #2391](https://github.com/pop-os/cosmic-comp/issues/2391)
15. [cosmic-comp：沙箱第三方窗口切换器协议可见性讨论 #2734](https://github.com/pop-os/cosmic-comp/issues/2734)

本文将官方仓库/文档、第三方协议支持表和本机包查询分开引用。第三方协议表不是官方认证；Debian 本机查询只代表当前 APT 索引；COSMIC 图形会话与逐窗捕获未实测。
