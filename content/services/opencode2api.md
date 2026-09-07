---
title: OpenCode2API（未运行）
date: 2026-09-07
tags:
  - docker
  - opencode2api
  - inactive
---

# OpenCode2API（未运行）

`~/opencode2api` 是一个已经准备好 Docker Compose 文件的项目，但在本次盘点中没有发现名为 `opencode2api` 的运行中或停止中的容器，因此它目前不属于正在提供服务的 Docker 项目。

## 配置位置

```text
~/opencode2api/docker-compose.yml
~/opencode2api/.env.example
```

当前没有发现 `~/opencode2api/.env`。Compose 默认使用宿主机端口 `10000`，但只有执行 `docker compose up -d` 后才会真正监听该端口。

项目使用两个 Docker named volume 保存 OpenCode 数据和配置：

```text
opencode-data
opencode-config
```

## 不要误认为它正在运行

检查方式：

```bash
docker compose -f ~/opencode2api/docker-compose.yml ps
docker ps --filter name=opencode2api
```

如果以后要启用它，应先阅读项目自身的 `README.md` 和 `docs/`，准备 `.env`，确认端口和访问控制，再手动启动。它涉及 API key 和服务密码，不应在未配置认证的情况下直接暴露到公网。
