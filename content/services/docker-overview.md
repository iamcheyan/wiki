---
title: 本机 Docker 服务总览
date: 2026-09-07
tags:
  - docker
  - homelab
  - nas
  - operations
---

# 本机 Docker 服务总览

本文档记录这台机器上当前 Docker 服务的用途、组成、端口、配置位置和相互关系。

这台机器上的 Docker 主要承载三类个人服务：

1. **Webmail**：通过 SnappyMail 访问多个邮箱。
2. **Paperless-ngx**：保存、OCR、检索个人文档。
3. **Immich**：管理照片和视频。

此外，`~/opencode2api/docker-compose.yml` 是一个已经准备好的 Compose 项目，但目前没有运行中的容器，详见 [[services/opencode2api|OpenCode2API（未运行）]]。

## 当前运行状态

以下状态依据 2026-09-07 在本机执行的 Docker 盘点记录。`Up` 表示容器正在运行；健康状态以 Docker 的 healthcheck 为准。

| 服务 | Compose 项目 | 容器 | 状态 | 宿主机端口 |
| --- | --- | --- | --- | --- |
| [[services/webmail\|SnappyMail]] | `webmail` | `snappymail` | 运行中 | `8089` |
| [[services/paperless\|Paperless-ngx]] | `paperless` | `paperless_webserver` | 运行中，healthy | `8777` |
| Paperless 数据库 | `paperless` | `paperless_postgres` | 运行中 | 仅容器网络 `5432` |
| Paperless Redis | `paperless` | `paperless_broker` | 运行中 | 仅容器网络 `6379` |
| [[services/immich\|Immich]] | `immich` | `immich_server` | 运行中，healthy | `2283` |
| Immich 数据库 | `immich` | `immich_postgres` | 运行中，healthy | 仅容器网络 `5432` |
| Immich Valkey | `immich` | `immich_redis` | 运行中，healthy | 仅容器网络 `6379` |
| Immich 机器学习 | `immich` | `immich_machine_learning` | 运行中，healthy | 无宿主机端口 |
| OpenCode2API | `opencode2api` | 无 | 未运行 | 配置默认 `10000` |

## 服务关系

```text
浏览器
  ├── :8089 ──> SnappyMail ──> 外部邮箱的 IMAP / SMTP 服务
  ├── :8777 ──> Paperless Web ──> paperless_postgres
  │                              └─> paperless_broker (Redis)
  └── :2283 ──> Immich Server ──> immich_postgres
                                ├─> immich_redis (Valkey)
                                └─> immich_machine_learning

宿主机数据目录
  ├── ~/services/webmail/data       ──> SnappyMail 配置和数据
  ├── /data/NAS/paperless/*         ──> Paperless 文档、媒体、导入目录
  ├── /data/paperless/postgres      ──> Paperless 数据库
  ├── /data/paperless/redis         ──> Paperless Redis 数据
  ├── /data/immich                  ──> Immich 上传内容
  ├── /data/Photos                  ──> Immich 只读照片库
  └── ~/immich/postgres             ──> Immich 数据库
```

数据库和 Redis 不对宿主机发布端口，只通过各自的 Compose 网络供应用容器访问。这比把数据库直接暴露到局域网更安全。

## 配置文件位置

| 项目 | Compose 文件 | 环境文件 | 数据位置 |
| --- | --- | --- | --- |
| Webmail | `~/services/webmail/docker-compose.yml` | 无 | `~/services/webmail/data` |
| Paperless | `~/paperless/docker-compose.yml` | `~/paperless/.env` | `/data/NAS/paperless`、`/data/paperless` |
| Immich | `~/immich/docker-compose.yml` | `~/immich/.env` | `/data/immich`、`/data/Photos`、`~/immich/postgres` |
| OpenCode2API | `~/opencode2api/docker-compose.yml` | `~/opencode2api/.env`（当前不存在） | Docker named volumes，未使用 |

`.env` 文件可能包含密码、密钥和令牌，不能提交到 Git，也不要复制到公开文档中。备份配置时应单独保护这些文件。

## 常用管理命令

查看所有容器：

```bash
docker ps -a
```

查看某个项目的状态：

```bash
docker compose -f ~/services/webmail/docker-compose.yml ps
docker compose -f ~/paperless/docker-compose.yml ps
docker compose -f ~/immich/docker-compose.yml ps
```

查看日志：

```bash
docker logs --tail 100 snappymail
docker logs --tail 100 paperless_webserver
docker logs --tail 100 immich_server
```

重启单个 Compose 项目时，先确认 NAS 和 `/data` 挂载正常，再执行：

```bash
docker compose -f ~/services/webmail/docker-compose.yml up -d
docker compose -f ~/paperless/docker-compose.yml up -d
docker compose -f ~/immich/docker-compose.yml up -d
```

不要随意使用 `docker compose down -v`，其中的 `-v` 可能删除项目关联的 Docker volume。数据库和照片服务操作前应先阅读对应服务文档。

## 外部访问和反向代理

Docker 当前直接监听的端口是 `8089`、`8777` 和 `2283`。主机还监听了 `80` 和 `443`，但这三个 Docker Compose 文件本身没有声明 80/443 映射，因此域名访问是否经过反向代理，需要查看主机上的 Web 服务器或代理配置，不能仅凭 Compose 文件判断。

直接在局域网访问时，通常使用：

```text
http://<主机IP>:8089   SnappyMail
http://<主机IP>:8777   Paperless-ngx
http://<主机IP>:2283   Immich
```

## 备份总原则

容器镜像、容器本身和 Docker Compose 文件都不是业务数据的备份。真正需要保护的是：

- 应用配置和密钥；
- 数据库；
- 上传文件、文档、照片和媒体；
- 需要时的插件、模型或索引缓存。

各服务的详细备份与恢复方法见 [[services/docker-backups|Docker 服务备份与恢复手册]]。
