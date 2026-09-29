---
title: Magpie 模型网关使用指南
description: 安全管理本机 AI 模型供应商、模型目录和 Agent 路由的实用手册。
---

# Magpie 模型网关使用指南

Magpie 是一个本机模型目录与兼容 API 网关：把不同供应商的模型放在一个列表里，再由 Agent 通过统一入口调用。它可以维护供应商、刷新模型目录、测试连接、管理路由组，并为多种 Agent 写入适配配置。

> **隐私提醒：** 本文是公开知识库页面，不记录任何人的真实 API Key、Token、账号、模型清单、内部地址、主机信息或私有配置路径。示例中的密钥和地址均为无效占位符。不要把本机的 `.env`、配置文件、日志、截图或请求头复制到公开页面、聊天或 issue。

## 1. 核心概念

- **供应商（Provider）**：一个 API 服务或订阅账号，保存连接方式、认证信息和可用模型。
- **模型 ID**：供应商侧用于调用模型的准确标识。区分大小写、冒号和斜杠；不要自行改写。
- **本机网关（Gateway）**：Agent 请求 Magpie，Magpie 再转发到相应供应商；通常只应监听 loopback（本机回环接口）。
- **路由组（Group）**：把多个模型组合成一个入口，按顺序、轮换、用量或可用额度策略选择后端。
- **Agent 接线**：Magpie 可以修改某个 Agent 的模型/provider 设置。添加供应商不会自动等于切换 Agent；变更 Agent 前先确认目标与回滚方式。

## 2. 启动与状态检查

在已经安装 Magpie 的用户会话中：

```sh
magpie --help
magpie providers
magpie models
magpie agents
```

若 Magpie 被配置为用户级 systemd 服务，可用以下命令检查或控制它（服务单元名称以本机实际配置为准）：

```sh
systemctl --user status magpie
systemctl --user restart magpie
systemctl --user stop magpie
```

也可以运行 `magpie serve` 在前台启动网关。不要同时启动多个服务实例；若启动失败，先检查已有进程与端口占用，再看脱敏后的服务日志。

## 3. 添加供应商与模型

先查看 Magpie 内置的供应商预设：

```sh
magpie presets
```

最安全的做法是通过 Magpie 的本地界面添加预设并在受信任的本机输入密钥。CLI 也支持添加预设：

```sh
magpie provider add <预设名称> <密钥>
```

不要把真实密钥直接粘进 shell 命令、脚本、终端录屏或聊天记录：命令行参数可能短暂出现在进程列表或 shell 历史中。也不要把密钥写进仓库、Wiki、`.env.example` 或公开 issue。

对于 OpenAI 兼容的自定义服务，形式如下；示例域名为保留的无效域名，不能用于真实请求：

```sh
magpie provider add "示例服务" \
  url=https://api.example.invalid/v1 \
  key=REDACTED_NOT_A_REAL_KEY \
  models=example-model
```

供应商添加后，打开 Magpie 的 Providers 页面，或执行：

```sh
magpie providers
magpie provider <供应商 ID>
magpie provider models <供应商 ID>
magpie models
```

`provider models` 可刷新供应商目录，或通过给定模型 ID 控制暴露哪些模型。若要向 Agent 提供该供应商的全部模型，应在 Magpie 的模型列表中明确选择全部；有些预设会默认只展示精选模型。刷新模型列表本身一般只读取目录接口，而 `provider test` 会发送真实模型请求，可能消耗额度或产生费用。

本机的 Ollama 类服务需确认服务已启动、仅在预期网络范围内可达，并使用正确的本地地址；云端服务则应使用对应的云端预设。不要把本机服务地址公开到 Wiki。

## 4. 将模型用于 Agent

先确认模型已经出现在 `magpie models` 中，并使用输出里的完整 `provider/model` ID。Magpie 支持用类似下面的命令为某个 Agent 设置模型：

```sh
magpie <agent> <provider>/<model-id>
```

具体 Agent 名称和支持字段用以下命令确认：

```sh
magpie agents
magpie <agent>
```

**设置 Agent 会修改其本地配置。** 先记录当前模型与 provider，再只改目标 Agent；确认新模型可用后，按 Magpie 的帮助信息或把该 Agent 恢复为默认设置进行回滚。运行中的 Agent 通常要重新启动后才读取新配置。本文不包含任何实际 Agent 的当前模型或私有路由。

对于 Hermes 等已有专用配置管理流程的 Agent，不要为了试用 Magpie 直接覆盖当前模型。先检查其原配置和 Magpie 对该版本的支持情况，最好在单独的测试会话中验证后再决定是否切换。

## 5. 常用命令速查

```sh
magpie providers                         # 供应商概览
magpie presets                           # 可用供应商预设
magpie provider <id>                     # 单个供应商详情
magpie provider models <id>               # 刷新模型目录
magpie provider models <id> <模型 ID…>    # 选择暴露的模型
magpie provider test <id>                 # 真实请求测试，可能产生费用
magpie models                            # Agent 可见模型目录
magpie models <agent>                    # 指定 Agent 的模型与可见性
magpie groups                            # 路由组
magpie usage 7d                          # 近期用量摘要
magpie sync                              # 刷新目录
magpie save <名称>                       # 保存本机配置档案
magpie use <名称>                        # 应用配置档案
magpie backup --no-keys <备份文件>        # 不含供应商密钥的加密备份
```

执行重要改动前先看 `magpie <子命令>` 的帮助。`magpie backup` 默认可能包含供应商密钥；备份文件和口令都必须保存在受控位置，不应上传公开仓库或发送给他人。跨机器恢复时先阅读 `magpie restore` 说明，并避免覆盖目标机器已有 Agent 配置。

## 6. 网关安全边界

- 网关应只绑定本机 loopback。除非已经设计好认证、TLS、防火墙和访问控制，不要绑定所有网络接口、启用 LAN 暴露或配置公网反向代理。
- 网关兼容 API 的访问密钥不一定能替代网络边界；不要假设“有 API Key 就可以安全开放端口”。
- 不要公开 `/v1/models` 输出、供应商列表截图、日志、配置 JSON、`.env` 或请求头。模型名称及供应商组合也可能是私有信息。
- 使用 Magpie Web 界面进行远程访问时，启用访问密钥并避免把 URL、临时密钥或浏览器会话分享出去；优先通过 SSH 隧道等受控通道。
- 供应商凭据只保存在本机 Magpie 配置或受信任的密钥管理工具中；确认配置文件权限严格，备份要加密。
- 修改供应商、路由组或 Agent 模型后，先做最小范围验证；切勿用真实的生产请求验证不必要的功能。

## 7. 排错顺序

1. `magpie providers`：确认供应商是否存在、是否启用、模型是否已暴露；不要把密钥字段复制到工单。
2. `magpie provider models <id>`：刷新目录；若失败，检查服务状态、网络和供应商状态，不要直接反复提交密钥。
3. `magpie models`：确认模型完整 ID、可见性以及路由组名称。
4. `systemctl --user status magpie`：检查网关服务；从日志中只摘录错误类别，先删除 Token、请求体、URL 查询参数和用户标识。
5. 如确需调用测试，使用 `magpie provider test` 并意识到请求可能计费；只对一个目标模型发最小测试。
6. 若 Agent 仍使用旧模型，重启对应 Agent 并重新检查它自己的本地配置；不要因此修改其他 Agent。

## 8. 学习顺序

建议第一次使用时按顺序练习：查看 `magpie --help` → 查看供应商和模型列表 → 阅读一个供应商详情 → 刷新模型目录 → 只在确认不会改动生产 Agent 后尝试界面操作 → 学会回滚与不含密钥的备份。不要在学习阶段添加真实密钥到命令历史，也不要切换正在使用的默认 Agent。

## 9. 官方资料

- [Magpie 项目与完整 README](https://github.com/yetone/magpie)
- [Magpie 官方网站](https://usemagpie.ai/)

命令选项可能随版本变化，遇到差异时以已安装版本的 `magpie --help` 和上游 README 为准。把报错贴到公开 issue 前，先检查并移除密钥、模型 ID、私有 URL、请求内容和账号信息。
