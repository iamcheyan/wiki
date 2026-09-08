---
title: Cheyan 知识库
description: Cheyan 的技术、工具与家庭服务知识库目录。
---

# Cheyan 知识库

这里记录技术实践、家庭服务、工具配置与日常运维。选择下面的文章开始阅读。

<!-- 目录由 scripts/generate-index.mjs 自动生成，请勿手动编辑此标记之后的内容。 -->

## 服务

- [[services/docker-backups|Docker 服务备份与恢复手册]]
- [[services/docker-overview|本机 Docker 服务总览]]
- [[services/immich|Immich 相册服务]]
- [[services/opencode2api|OpenCode2API（未运行）]]
- [[services/paperless|Paperless-ngx 文档管理服务]]
- [[services/webmail|NAS 邮件客户端 Snappymail 部署与多邮箱配置]]
- [[services/xserver-japan-initial-architecture|日本 Xserver 初期架构：先把边界搭对，再考虑扩容]]：面向日本用户的 Xserver VPS 初期部署架构，包含入口层、应用层、数据层、备份、安全边界和后续演进路线。

## 工具

- [[tools/音乐库整理与联网元数据匹配流程|音乐库整理与联网元数据匹配流程]]：从 SMB 音乐共享盘开始，安全整理目录、识别异常文件、补全标签并匹配专辑封面。
- [[tools/git-hooks自动生成文档目录|用 Git Hook 自动生成 Markdown 文档目录]]：通过 pre-commit 在提交前扫描文章、更新首页目录，并理解 Git 暂存区、提交钩子与 CI 兜底之间的关系。

## 项目

- [[projects/index|个人项目]]：正在构思、验证或持续开发的个人项目。
- [[projects/miyako|Miyako：原生 Android NAS 音乐播放器]]：将 NAS 音乐同步到 Android 本地音乐库，并基于成熟原生播放器继续开发。
- [[projects/miyako-sync-research|Miyako：Android NAS 同步底座调研]]：现成 Android SMB/NAS 同步项目的候选底座、技术路线和 Fork 评估。
- [[projects/sambalite-nas-download|SambaLite：把 NAS 音乐下载到 Android 手机]]：在 FiiO JM21 上使用 SambaLite 连接 SMB 音乐共享，并把 NAS 文件递归下载到手机 Music 目录的完整操作记录。

## AI Agent

- [[ai-agent/为什么值得订阅-ai-agent|为什么值得订阅 AI Agent：从聊天工具到真正的工作伙伴]]：AI Agent 和普通聊天机器人的区别、适合订阅的场景、成本判断，以及如何用一个小任务开始。

## Hermes Agent

- [[hermes-agent/工作约定|Hermes Agent 工作约定]]：Hermes Agent 与用户之间目前确认的公开协作规则与术语。
- [[hermes-agent/使用指南|Hermes Agent 使用指南]]：Hermes Agent 的核心能力、常见任务方式和结果验收原则。
- [[hermes-agent/隐私与公开知识库边界|Hermes Agent 隐私与公开知识库边界]]：面向公开网站的内容脱敏规则，以及 Hermes 记忆、技能和知识库的边界。
- [[hermes-agent/index|Hermes Agent]]：Hermes Agent 的公开使用说明、工作约定与隐私边界。
