---
title: 满足 Inua 依赖的 Wayland compositor 对比
description: 对比具备 layer-shell 与窗口管理接口的 Wayland compositor，说明 Inua 适配条件、复核方法和选型取舍。
---

# 满足 Inua 依赖的 Wayland compositor 对比

> **隐私提醒：** 本文只讨论公开的项目能力与通用验证方法，不记录主机名、内部地址、账号、密钥或本机路径。复制命令输出到公开页面前，仍应检查其中是否包含个人窗口标题、设备名或其他隐私信息。

## 1. 问题背景

Inua 是以 Go 和 GTK4 构建的 Wayland 桌面 shell，原始架构围绕 Hyprland 设计。它不只是一个顶栏：面板、dock、launcher、控制中心、overview、通知、OSD 和锁屏都需要作为桌面级界面，出现在普通应用窗口之上并按屏幕边缘、层级和输入规则定位。

要移植到另一个 compositor，首先要确认它能显示 layer-shell 表面；还要检查能否查询并控制窗口、工作区和焦点。只实现面板协议，不能自动提供窗口列表、移动窗口、切换工作区或读取快捷键等功能。窗口预览另有捕获接口要求，也不能从 layer-shell 支持推断出来。

本文将证据分为三类：**项目官方文档**说明接口设计或项目承诺；**Wayland 协议支持表**是第三方维护的版本快照；**本机实测**则必须在目标发行版、目标 compositor 的真实会话中运行命令。三者不可互相替代。协议支持表记录的是查询时页面所列版本，随上游更新而改变；它不是 Debian 包实测报告。[1][2]

## 2. Inua 到底依赖什么

源码只读核对了 Inua 的 Hyprland IPC、shell UI、快捷键、窗口管理和 overview 相关代码。主要依赖如下：

| 能力 | Inua 的用途 | 可核对的仓库相对路径 |
| --- | --- | --- |
| layer-shell 表面 | 顶栏、dock、launcher、control center、通知、OSD、锁屏等界面定位与层级 | `internal/ui/shell.go`、`internal/ui/bar.go`、`internal/ui/lock.go` |
| 状态查询 | 通过 Hyprland JSON 查询显示器、工作区、窗口与当前焦点；shell 以 compositor 状态为准，不另造一份窗口状态 | `internal/hypr/client.go`、`internal/hypr/snapshot.go` |
| 状态变化订阅 | 接收焦点、窗口打开/关闭、标题等事件并刷新界面 | `internal/hypr/events.go`、`internal/hypr/store.go` |
| 状态控制 | 通过 dispatcher 聚焦、移动或调整窗口、切换工作区、关闭窗口；Hyprland 新版还支持 Lua dispatcher 表达式 | `internal/hypr/client.go`、`internal/hypr/bring.go`、`internal/ui/shell.go` |
| 快捷键查询 | 从 compositor 查询现有 binds，展示或关联系统快捷键 | `internal/ui/shortcuts.go`、`internal/ui/overview_manage.go` |
| 窗口预览 | overview 读取窗口/屏幕捕获帧并绘制缩略图 | `internal/ui/overview.go`、`internal/capture/hyprland/` |

这意味着“能看到窗口”不等于“可管理窗口”。`wlr-foreign-toplevel-management` 可以提供 toplevel 的枚举及有限控制请求，例如激活、关闭、最大化或最小化；它不等同于完整窗口树、任意位置/尺寸控制、工作区管理、按绑定查询快捷键或逐窗口捕获接口。[2]

## 3. 判定标准

### 3.1 面板与浮层

确认 compositor 在目标版本中确实提供 `zwlr_layer_shell_v1`，并检查锚定、exclusive zone、键盘交互、多个输出和 layer 顺序是否满足 shell 的实际布局。顶栏和 dock 可能需要 exclusive zone；launcher、OSD 或锁屏则可能有不同的层级与输入需求。只看协议名称还不够，应在真实会话启动一个 layer-shell 示例应用，检查位置、遮挡、焦点和多屏表现。

### 3.2 状态查询

至少需要稳定获得输出/显示器、工作区、窗口集合、窗口标题与应用标识、焦点状态，以及能关联窗口和工作区的标识。需要考虑 compositor 推送事件还是只能轮询、事件是否可能丢失、窗口关闭后标识是否复用，以及切换工作区和多显示器时数据语义是否一致。

### 3.3 状态控制

确认接口是否允许聚焦指定窗口、在工作区间移动窗口、切换工作区、调整浮动窗口位置/大小、关闭窗口，并能返回成功或失败。每个 compositor 的命令语义、窗口选择器和工作区命名可能不同；不能把同一条 Sway 命令假定为通用 Wayland API。快捷键查询也要单独核对，许多 IPC 虽能执行动作，却未必能读取完整绑定表。

### 3.4 会话与锁屏

确认登录管理器启动方式、桌面会话环境变量、屏幕锁定协议或锁屏程序、空闲管理器，以及应用启动与退出行为。layer-shell 锁屏窗口本身不必然构成安全锁屏；必须确认会话锁定由 compositor 或可信锁屏器完成，并测试解锁前其他 shell 界面不会接收输入。

### 3.5 实现与维护成本

评估接口是否有正式文档、协议或稳定版本承诺，是否有持续维护的上游，以及发行版是否提供足够新的版本。适配器应把各 compositor 的状态模型映射为 Inua 内部接口，并明确哪些能力缺失时要禁用功能、降级显示或拒绝启动。为一个 compositor 维护私有补丁会增加跟随上游和发行版升级的成本。

## 4. 候选对比

下表的 layer-shell 项依据 Wayland Explorer 的协议支持表；IPC 项依据各项目公开文档。它们是候选筛选信息，**不是测试机实测结果**。支持程度和实现完整度可能随版本变化。[1][2]

| 候选 | layer-shell | 窗口/工作区接口 | 控制能力 | Inua 适配判断 |
| --- | --- | --- | --- | --- |
| Hyprland | 支持 | 自有 socket IPC；JSON 查询、事件订阅 | 自有 dispatcher，含窗口、工作区和显示器操作 | **当前基线，最小改动**；捕获接口仍与 Hyprland 实现绑定 |
| Sway | 支持 | Sway IPC：Unix socket、GET_TREE、GET_WORKSPACES、事件订阅 | `swaymsg` 命令可查询/聚焦/移动/切换等 | **较可行**；需写 Sway 状态与动作适配器，窗口捕获另行解决 |
| Wayfire | 支持 | 插件 IPC，socket、长度前缀 JSON、方法与事件订阅 | 取决于启用插件及方法集合 | **可行但需验证插件组合**；能力和状态模型需逐项映射 |
| niri | 支持 | Unix socket JSON IPC；Windows、Workspaces、FocusedWindow、EventStream | Action 请求可聚焦、移动窗口/工作区等 | **较可行**；滚动列模型与静态工作区概念不同，需重做交互映射 |
| Miracle WM | 支持情况应按当前发布版核对；协议表列有支持 | i3/Sway 风格 IPC，接口与命令仍在发展 | 支持范围逐版演进，部分请求/命令未实现 | **有希望但需版本验证**；需做兼容性探测，不能把兼容宣传视为全量兼容 |
| Labwc | 协议表列出支持；本机包为 0.8.3 | 官方没有 Sway/i3 IPC；以 Wayland/wlr 协议及配置为主 | 没有可直接替代 Hyprland dispatcher 的完整管理 IPC | **现状不适配**；需扩展/维护分支，或采用不同的窗口管理架构 |
| COSMIC | 支持 | COSMIC 自身组件与接口；需按目标版本确认公开 IPC 范围 | 不能假设有 Hyprland/Sway 等价接口 | **需先验证接口覆盖**；layer-shell 一项不足以决定适配可行性 |
| KWin（Plasma） | 支持 | KWin 脚本、DBus/KWin 专有接口；版本差异需核实 | 可通过脚本/专有 API 控制部分窗口和工作区 | **可适配但成本较高**；需维护 KWin 专属桥接，并单独处理捕获与绑定查询 |
| river | 支持条件与 river WM 协议实现有关 | river-window-management-v1 面向窗口管理器与 compositor 的协议，不是通用桌面 shell IPC | 主要定义窗口管理器如何管理窗口；不是 Hyprland dispatcher 替代品 | **不宜直接接入**；要确认具体 river 版本/窗口管理器，并构建额外桥接 |

## 5. 候选逐项分析

### 5.1 Hyprland：能力最完整的参考基线

Hyprland 的 IPC 使用运行会话相关的 Unix socket。`j/monitors`、`j/workspaces`、`j/clients`、`j/activewindow` 等查询提供结构化状态，事件 socket 提供状态变化；dispatcher 则负责执行窗口和工作区操作。Inua 的现有客户端和数据模型直接依赖这些语义。

优势是适配差异最少，且 Inua 已有 Hyprland 专用窗口捕获路径。代价是接口带有 Hyprland 特性，Lua dispatcher 等版本演进也需要兼容。迁移到其他 compositor 时，应以 Inua 内部抽象为边界，而不是把 Hyprland IPC 命令硬塞给其他后端。

### 5.2 Sway：成熟的查询和控制 IPC

Sway IPC 通过 Unix socket 通信，环境变量 `SWAYSOCK` 指向会话 socket。GET_TREE 可读取窗口布局树，GET_WORKSPACES 和 GET_OUTPUTS 查询工作区与输出，SUBSCRIBE 可订阅事件；RUN_COMMAND 执行 Sway 命令。`swaymsg -t get_tree`、`swaymsg -t get_workspaces` 是适合先行验证的只读查询。[3]

Sway 的 IPC 能覆盖多数状态和窗口控制需求，生态工具也广泛使用它。仍需实现 Inua 到 Sway 节点树、窗口选择器、工作区名称和命令响应的映射。快捷键查询需看目标 Sway 版本支持的请求或配置读取方式；窗口内容捕获仍是独立问题，不能仅凭 IPC 得出有兼容的实时预览能力。

### 5.3 Wayfire：插件化 IPC

Wayfire 的开发文档描述了通过 `WAYFIRE_SOCKET` 找到 IPC socket，以四字节长度前缀和 JSON 消息交换请求/回复，并支持订阅事件。具体动作由运行中的插件提供，因此同一发行版的两个 Wayfire 会话可能因插件启用情况而暴露不同能力。[4]

接入前应枚举实际启用插件及其 IPC 方法，确认窗口列表、工作区、焦点、移动、聚焦和关闭操作都可用。适配器还需处理插件缺失、版本差异和方法失败。layer-shell 和 IPC 的存在不保证支持与 Hyprland 同等的窗口捕获。

### 5.4 niri：现代滚动平铺与结构化 IPC

niri 官方 IPC 提供版本、输出、工作区、窗口、焦点窗口等查询，并提供事件流和 Action 请求。其客户端接口使用结构化消息，经会话 Unix socket 与 compositor 通信；动作包含窗口聚焦、移动等操作。[5]

它适合希望采用滚动列式平铺并愿意调整 shell 交互模型的场景。niri 的 workspace 与 monitor 语义、动态工作区和列/窗口关系，与 Hyprland 的工作区编号及窗口布局并不完全一致。适配不仅是把命令换个名字，还应重新定义 overview、窗口位置控制和工作区切换的产品行为。实时窗口缩略图能力需独立核验。

### 5.5 Miracle WM：i3/Sway 风格接口，但需锁定版本

Miracle WM 基于 Mir，项目文档介绍了 i3/Sway 风格 IPC。文档列出 Unix socket、查询请求和命令，但不同版本对请求、事件、命令及筛选器的支持有边界；兼容层并非对 Sway 全量等价。[6]

接入前应针对计划发行版的具体版本逐项验证：输出、工作区、窗口树、事件、绑定列表、焦点、移动、调整大小和关闭。IPC 返回错误也应映射到 Inua 的功能降级。项目更新较快时，版本锁定和回归验证会显著影响维护成本。

### 5.6 Labwc：layer-shell 并不等于管理 IPC

Labwc 面向轻量级、Openbox 风格工作流。其官方立场是实现 Wayland 与 wlr 协议，不承诺理解 Sway/i3 IPC；ArchWiki 也记录了这一接口边界。[7] Wayland Explorer 的 layer-shell 表列出 Labwc，但页面显示的是其记录版本，不代表每个发行版包都具有同样能力。[1]

测试环境（Debian 13 trixie）的包管理器报告 Labwc 候选版本为 **0.8.3-1**。在线协议表在核对时列出的 Labwc 版本为 **0.20.2**，两者差距很大。因此不能把在线表格的支持勾选直接套用到 trixie 包；应在目标会话用 `wayland-info` 查看协议 global，并用实际客户端验证行为。当前执行环境没有运行目标 Wayland compositor 会话，故这里**没有本机会话实测结论**。

社区曾提出增加 Sway 兼容 IPC 的实验性 Labwc PR（#3519），但该提案不是当前已合并的官方稳定接口。部署决策应重新查看 PR 状态和对应版本，不能把提案当作已发布能力。[8] 若要保留 Labwc 风格，现实路线是维护 Labwc 扩展/分支，或实现一个受支持的管理桥接，再为窗口树、工作区、事件、dispatcher、绑定查询和捕获逐项补齐。单靠 foreign-toplevel 通常只能满足部分窗口枚举与激活/关闭，覆盖不了完整依赖。

### 5.7 COSMIC：先查明目标版本公开的管理接口

COSMIC 的协议情况、Debian 包与窗口管理边界已单独核对，详见 [[tools/cosmic-desktop-evaluation|COSMIC 桌面作为 Inua 目标环境的评估]]。该评估区分官方仓库、第三方协议支持表和本机实测；当前 Debian 13 trixie 未运行 COSMIC 会话。

### 5.8 KWin（Plasma）：生态完整，桥接需要专门设计

Wayland Explorer 的快照列出 KWin layer-shell 支持。[1] KWin/Plasma 有脚本和桌面专属接口可用于扩展窗口管理，但其数据模型和控制方式并不等同于 Hyprland IPC 或 Sway IPC。接口覆盖、授权和版本稳定性应依据目标 Plasma/KWin 版本文档确认。

适配可通过 KWin 脚本或专用服务暴露一个供 Inua 使用的稳定桥接 API，负责输出、窗口、工作区、焦点、事件与动作映射。还要单独规划快捷键读取、捕获、锁屏和桌面集成。其优势是成熟桌面生态和完整会话组件；成本是持续维护 KWin 版本适配。本文未在 Plasma 会话中实测。

### 5.9 river：窗口管理协议不是 shell 管理接口

river 的架构把 compositor 与窗口管理策略分开。`river-window-management-v1` 是供外部窗口管理器接管窗口管理流程的 Wayland 协议；它不是为普通桌面 shell 查询所有状态并下发任意控制命令设计的通用 IPC。[9]

因此，即使协议可用，也要确认用户运行的具体窗口管理器是否提供另一个面向 shell 的查询/控制通道。river 与 layer-shell 的组合还受其支持协议约束；应以目标 river 版本实际发布的协议和运行配置为准。对 Inua 而言，这通常意味着另写一个管理器侧桥接，而非直接连接 river-window-management 协议。

### 5.10 跨候选的关键缺口

无论选择哪个候选，都建议把能力分成“已有接口”“需要桥接”和“可能无法实现”三类，逐项写入适配评审。以下边界容易在方案阶段被忽略：

| 能力 | layer-shell 能否提供 | foreign-toplevel 能否提供 | 还需什么 |
| --- | --- | --- | --- |
| 顶栏、通知、OSD 的表面定位 | 是，仍需检查具体行为 | 否 | 目标会话实测与 GTK layer-shell 兼容验证 |
| 枚举普通窗口 | 否 | 通常可以 | 完整窗口字段、标识和事件语义 |
| 聚焦/关闭窗口 | 否 | 有限请求 | 可靠的 compositor 管理接口及结果确认 |
| 任意移动/调整窗口大小 | 否 | 通常没有通用请求 | compositor IPC、插件或专用桥接 |
| 查询/切换工作区 | 否 | 否 | 工作区 IPC 和事件流 |
| 显示 compositor 快捷键 | 否 | 否 | 官方绑定查询接口或受支持的配置解析器 |
| overview 实时窗口预览 | 否 | 否 | screencopy、逐窗口捕获或 compositor 专用接口，以及权限/遮挡处理 |
| 安全锁屏 | 否 | 否 | compositor 锁定机制或可靠锁屏器及会话集成 |

捕获功能还要核实帧率、窗口被遮挡时是否能取帧、内容保护、GPU/缓冲格式、权限提示和捕获停止时机。一个 compositor 能运行 `grim` 截屏，不足以证明它提供 Inua overview 所需的持续逐窗口预览。

对锁屏也应区分“显示一个全屏窗口”和“锁定会话”。如果锁屏表面不是 compositor 或可信锁屏器认可的锁屏状态，其他客户端可能仍能抢焦点或输入。不要因为 layer-shell 能创建 overlay 就把它标记为安全锁屏支持。

### 5.11 建议建立的适配能力清单

在写适配代码之前，可为每项能力记录接口名称、最低版本、查询/动作、事件来源、失败行为和真实会话验证证据。以下表格可直接用作评估模板：

| 检查项 | 通过条件 | 失败时的产品处理 |
| --- | --- | --- |
| Layer surfaces | panel、dock 和 overlay 在预期输出正确绘制 | 禁止启动完整桌面 shell，或明确关闭依赖界面 |
| 窗口快照 | 稳定标识可映射到标题、应用、输出、工作区和焦点 | 隐藏窗口列表功能，不维护猜测状态 |
| 状态事件 | 开关窗口、焦点和工作区变化能及时反映 | 有界轮询并展示延迟，或提示后端不支持 |
| 窗口动作 | 对测试窗口可聚焦、移动、关闭，错误可识别 | 禁用对应菜单项并保留错误日志类别 |
| 快捷键 | 能可靠取得目标绑定及其显示文本 | 不展示未经核实的快捷键，不解析私有格式假装支持 |
| 捕获预览 | 隐私保护生效，预览可停止且资源有界 | 关闭实时预览，保留无缩略图 overview |
| 锁屏与会话 | 登录、锁定、解锁和多屏切换行为通过真实会话验证 | 不声称 shell 自带锁屏满足安全要求 |

对状态事件应测试快速连续操作和输出重连。查询快照与订阅事件之间可能存在竞态：先读取全量状态、再订阅的实现会漏掉窗口刚好在两步间发生的变化。优先采用 compositor 文档规定的同步流程；若没有原子快照/订阅机制，应设计重查和去重策略。

标识也不能想当然。Sway 的容器 ID、niri 的窗口 ID、Hyprland 地址和外部协议对象生命周期各不相同。适配层需要定义会话内稳定性、对象关闭后的失效处理，以及同一窗口移动工作区时 ID 是否保持不变。

## 6. 如何自己复核

### 6.1 检查会话实际公布的 Wayland 协议

在目标图形会话终端执行：

```sh
wayland-info | grep -E 'zwlr_layer_shell_v1|zwlr_foreign_toplevel_manager_v1|ext_foreign_toplevel_list_v1|hyprland|river_window_manager_v1'
```

看到 `zwlr_layer_shell_v1` 只能证明该会话公布了对应 global；不证明所有 layer-shell 行为都符合 shell 需求。看到 foreign-toplevel global 表示可尝试枚举 toplevel，也不代表有完整工作区管理接口。没有匹配输出时，先确认 `wayland-info` 连到了预期 Wayland 会话，检查 `WAYLAND_DISPLAY` 和 `XDG_RUNTIME_DIR` 是否由该会话正确设置；不要在另一个会话或嵌套 compositor 的输出上做结论。

建议再用实际 layer-shell 客户端测试顶边锚定、exclusive zone、键盘交互、多显示器和锁屏行为。`wayland-info` 是协议发现工具，不会替代行为测试。只有在目标发行版的真实桌面会话执行并记录版本，才可称为该环境实测。

### 6.2 验证 compositor 自带 IPC

只读查询先于控制操作。示例：

```sh
# Sway：读取窗口树、工作区、输出
swaymsg -t get_tree
swaymsg -t get_workspaces
swaymsg -t get_outputs

# niri：查看 IPC 帮助和只读状态
niri msg --help
niri msg windows
niri msg workspaces
niri msg focused-window

# Hyprland：只读查询
hyprctl -j monitors
hyprctl -j workspaces
hyprctl -j clients
hyprctl -j activewindow
```

具体命令随版本变化，应先运行相应工具的 `--help` 或查看官方文档。确认查询数据后，可在可恢复的测试窗口上做一次低风险控制，例如聚焦窗口或切换到已有工作区，再立即查询状态确认变化；避免在工作会话中测试关闭窗口、改变布局或移动正在使用的窗口。Wayfire 应先确认插件和 IPC socket；Miracle WM 则按其版本文档选择支持的请求。Labwc 若没有对应 IPC，不能用其他 compositor 的命令冒充测试。

测试记录应包含发行版、compositor 版本、会话类型、命令及去敏后的结果，并明确哪些项未测。不要把虚拟机、嵌套会话或协议模拟的结果写成物理/日常桌面会话实测。

## 7. 如果目标是不喜欢平铺的堆叠式桌面

本文的适配筛选还要结合桌面交互偏好。**平铺优先**意味着新窗口通常自动占据布局中的区域；**堆叠/浮动优先**意味着窗口可以重叠、自由摆放，窗口管理器通常提供标题栏、最小化与传统窗口切换等行为。部分桌面两种模式兼有，以下描述的是项目默认定位或可配置工作流，不代表每个发行版会话的实测结果。

按默认取向粗分：

- **平铺优先：** Hyprland、Sway、niri、Miracle WM、river 配合常见的 Rivertile 布局生成器。Hyprland 可切换浮动窗口，Miracle 支持混合浮动，但默认核心仍是平铺布局；river 的实际布局由独立窗口管理器决定。
- **堆叠/浮动优先：** Labwc、Wayfire、KWin/Plasma、Weston desktop-shell。Wayfire 可通过插件改变布局；KWin 也有可选自动平铺和脚本。COSMIC 支持自动平铺与堆叠混用，关闭当前工作区的自动平铺即可采用浮动工作流。

| 候选 | 默认行为 | 能否改成堆叠 | 代价 |
| --- | --- | --- | --- |
| Hyprland | 平铺布局（dwindle/master），窗口也可单独浮动 | 可设置规则让新窗口浮动，例如 `windowrule = float, class:.*`（配置语法依版本） | 仍需处理浮动状态、工作区和窗口排列；缺少传统桌面惯例时要自行补齐 shell 体验 |
| Sway | 平铺优先，支持单独浮动 | 可以把窗口设为 floating，组合配置也可让常见应用浮动 | 配置与管理习惯仍基于 i3 式容器/工作区；全局浮动不等于完整传统桌面 shell |
| niri | 滚动列式平铺，支持浮动窗口 | 可逐窗浮动，但整体工作流仍围绕滚动列与动态工作区 | 要接受列式布局、动态工作区等交互模型；传统最小化和任务栏语义需确认 |
| Miracle WM | 手动平铺为主，也支持混合浮动 | 可以混合浮动，最终体验取决于布局和配置 | IPC 兼容度与版本须逐项核验；不能只靠“支持浮动”推导出传统桌面完整性 |
| river + Rivertile | Rivertile 默认生成主区/副区平铺布局 | river 可采用其他布局生成器或自定义窗口管理器；是否能纯堆叠取决于实现 | compositor 与窗口管理器分离，需要另选、编写并维护堆叠管理器 |
| Labwc | Openbox 风格堆叠窗口 | 原生就是堆叠式；可配置浮动、层级与窗口规则 | 最大缺口是没有稳定的 Sway/i3 风格 IPC，Inua 所需状态和 dispatcher 需要扩展或桥接 |
| Wayfire | 浮动/堆叠式 compositor | 原生符合；可启用平铺插件或调整插件组合 | IPC 能力受插件提供的方法影响，需要锁定插件并适配其状态/动作接口 |
| KWin/Plasma | 传统堆叠窗口桌面；平铺功能可选 | 可以关闭自动平铺，不启用平铺脚本也可保持自由浮动 | 适配要依赖 KWin 专有脚本/接口，需维护版本兼容；桌面 shell 本身较完整 |
| COSMIC | 自动平铺可选，支持窗口堆叠 | 可以关闭当前工作区的 `Tile current workspace` | 用户可在不同工作区切换模式；第三方 shell 可用的稳定窗口管理 IPC 仍需确认 |
| Weston desktop-shell | 堆叠式参考桌面 shell | 原生是传统浮动窗口工作流 | layer-shell 不在其已知支持范围，且缺少 Inua 所需完整窗口管理 IPC，因此不满足整体依赖 |

“默认堆叠 + 良好 IPC + layer-shell”同时具备的候选较少，原因是生态分工不同：传统堆叠 compositor 往往把工作区和窗口状态留给桌面自身组件，未必提供面向第三方 shell 的通用管理 IPC；平铺窗口管理器则常有成熟 IPC，但默认交互正是平铺。layer-shell 又只负责 shell 表面角色，不会补出窗口管理 API。就这一组合看，**Wayfire 与 KWin/Plasma 是较现实的两个方向**：Wayfire 有可订阅的插件 IPC，KWin 有桌面专属脚本接口和完整桌面生态；两者都要以目标版本逐项验证。Labwc 保留了理想的堆叠风格，却卡在缺少稳定管理 IPC，得先解决接口层。

Hyprland 本身没有一个名为 `floating` 的全局 layout；它的 dwindle/master 等布局负责平铺，floating 是窗口状态。可以通过 `windowrule = float, class:.*` 一类规则让匹配窗口以浮动状态打开，但这不是传统堆叠窗口管理器的等价实现。**行为差异/需确认：** 用户可能还期待最小化并从任务栏恢复、每窗标题栏/系统菜单、传统虚拟桌面切换和持久窗口几何等惯例；这些功能不应仅凭“窗口可浮动”就视为具备，需在目标配置和 shell 中逐项核验。该判断是功能模型对照，不是本机桌面实测。

### 按堆叠偏好的建议顺序

1. **Wayfire：** 最值得先做 Inua 原型。它符合浮动桌面取向，也有 IPC 机制；先盘点插件，再验证窗口/工作区枚举、事件、移动/聚焦、快捷键和捕获。
2. **KWin/Plasma：** 若希望传统完整桌面组件、面板、任务栏、虚拟桌面和系统设置，优先评估 Plasma 会话，并把 Inua 作为额外 shell 或部分组件。若坚持 Inua 管理所有窗口，则需开发 KWin 桥接。
3. **Labwc：** 若 Openbox 风格是硬性偏好，可继续作为目标，但前提是接受维护 Labwc 扩展/分支或管理代理；在稳定 IPC 到位前，Inua 不能实现完整窗口管理功能。Debian trixie 的 0.8.3 尤其要实会话核验 layer-shell。
4. **COSMIC：** 关闭自动平铺后交互上更接近堆叠；先确认公开 IPC 是否覆盖 shell 所需控制和状态，再决定是否投入桥接。
5. **Hyprland：** 只有在接受规则化浮动和行为差异时才考虑。全局窗口浮动规则能避免自动平铺，但不能自动提供最小化、任务栏、标题栏或传统虚拟桌面惯例。
6. **Sway、niri、Miracle WM、river+Rivertile：** 对明确排斥平铺的用户不作为首选；即使能让部分窗口浮动或换布局，也要额外改变默认交互并确认传统桌面惯例。

## 8. 选型建议

- **希望最小改动并保留现有行为：** 使用 Hyprland。Inua 当前 IPC、dispatcher 和 overview 捕获已有专用实现。
- **希望采用成熟的平铺桌面和广泛 IPC 生态：** 优先评估 Sway。查询、事件和命令接口文档完整，但捕获与 Inua UI 语义仍需适配。
- **希望保留 Labwc 的轻量与 Openbox 风格：** 先决定是否接受维护 Labwc 扩展或专用管理桥接。仅安装 layer-shell 客户端并不能让 Inua 管理窗口；trixie 的 0.8.3 必须现场核验协议能力。
- **希望现代滚动平铺工作流：** 评估 niri，并把动态工作区、列布局、窗口移动和 overview 交互作为产品适配的一部分。
- **希望插件化桌面：** Wayfire 可作为候选，但要锁定插件集合并核对实际 IPC 方法。
- **希望基于 Mir 的 i3/Sway 风格窗口管理：** 可评估 Miracle WM，按目标版本逐条测试其 IPC 覆盖，不以兼容标签代替验收。
- **希望使用企业/完整桌面生态：** Plasma/KWin 具备成熟桌面组件，但 Inua 需要 KWin 专属桥接并承担版本维护。
- **考虑 COSMIC 或 river：** 先证明目标版本有稳定、公开且覆盖所需查询与控制的接口。协议支持 layer-shell 只是必要条件之一。

选型前建议做一个最小适配原型：启动一个顶栏和 launcher，读取窗口、工作区和焦点，订阅一次状态变化，聚焦/移动一个测试窗口，并显示一张捕获预览。任何关键能力缺失都应明确记录，再决定删减功能、增加桥接或更换 compositor。

## 9. 参考资料

1. [wlr-layer-shell 协议与 compositor 支持表（Wayland Explorer）](https://wayland.app/protocols/wlr-layer-shell-unstable-v1)
2. [wlr-foreign-toplevel-management 协议与支持表（Wayland Explorer）](https://wayland.app/protocols/wlr-foreign-toplevel-management-unstable-v1)
3. [Sway IPC 手册（sway-ipc.7）](https://manpages.debian.org/experimental/sway/sway-ipc.7.en.html)
4. [Wayfire IPC for developers](https://bluebyt.github.io/wayfire-docs/IPC-for-developers/)
5. [niri IPC 官方文档](https://github.com/niri-wm/niri/blob/main/docs/wiki/IPC.md)；[niri IPC 请求类型](https://niri-wm.github.io/niri/niri_ipc/enum.Request.html)
6. [Miracle WM 项目](https://github.com/miracle-wm-org/miracle-wm)；[Miracle WM IPC 编程文档](https://wiki.miracle-wm.org/latest/ipc/programming/)
7. [Labwc（ArchWiki）](https://wiki.archlinux.org/title/Labwc)
8. [Labwc Sway 兼容 IPC 提案 PR #3519](https://github.com/labwc/labwc/pull/3519)
9. [river-window-management-v1 协议](https://wayland.app/protocols/river-window-management-v1)；[river 项目说明](https://codeberg.org/river/river)
10. [第三方 compositor 协议兼容性矩阵（交叉参考）](https://github.com/sjourdois/wlr-utils/blob/c3d976f6e8f764a1cde4dcd48270a2d893fc0102/COMPATIBILITY.md)
11. [Hyprland Master Layout 文档](https://wiki.hypr.land/Configuring/Layouts/Master-Layout/)；[Dwindle Layout 文档](https://wiki.hypr.land/Configuring/Layouts/Dwindle-Layout/)
12. [niri 项目与工作流说明](https://github.com/niri-wm/niri)；[Miracle WM 项目说明](https://miracle-wm.org/)
13. [COSMIC 自动平铺与堆叠说明](https://system76.com/support/pop-basics/)
14. [Weston 配置手册](https://manpages.debian.org/trixie/weston/weston.ini.5.en.html)
15. [Rivertile 手册](https://man.archlinux.org/man/rivertile.1.en)；[Wayfire 项目简介](https://wayfire.org/2019/01/13/Introduction-to-Wayfire.html)

第三方兼容性矩阵和 Wayland Explorer 支持表适合发现候选，不应当代替目标发行版实测。涉及版本、协议发布和功能完整度的决定，应回到相应项目文档及实际运行会话复核。
