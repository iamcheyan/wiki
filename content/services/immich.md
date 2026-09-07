---
title: Immich 相册服务
date: 2026-09-07
tags:
  - docker
  - immich
  - photos
  - backup
---

# Immich 相册服务

Immich 用于管理照片和视频、生成缩略图、搜索媒体，并通过机器学习进行人脸或内容识别。当前 Compose 项目位于 `~/immich`。

## 访问

宿主机端口：`2283`。

```text
http://<主机IP>:2283
```

当前 Docker 映射是 `2283:2283`。是否通过域名和 HTTPS 访问，取决于主机外部的反向代理配置，Compose 文件本身没有声明 80/443。

## 容器组成

```text
immich_server :2283
  ├── immich_postgres          (PostgreSQL + 向量扩展)
  ├── immich_redis             (Valkey)
  └── immich_machine_learning  (机器学习任务)
```

| 容器 | 作用 | 宿主机持久化位置 |
| --- | --- | --- |
| `immich_server` | Web/API、上传、媒体处理调度 | `/data/immich`，并只读挂载 `/data/Photos` |
| `immich_postgres` | 用户、相册、资产元数据、搜索相关数据 | `~/immich/postgres` |
| `immich_redis` | 队列和缓存 | 无显式宿主机目录 |
| `immich_machine_learning` | 人脸、分类等机器学习任务 | Docker volume `immich_model-cache` |

## 媒体和数据目录

| 位置 | 作用 | 重要性 |
| --- | --- | --- |
| `/data/immich` | Immich 的上传目录，由 `.env` 的 `UPLOAD_LOCATION` 控制 | 必须备份 |
| `/data/Photos` | 以只读方式提供给 Immich 的外部照片库 | 原始照片必须单独备份 |
| `~/immich/postgres` | Immich PostgreSQL 数据库 | 必须备份 |
| Docker volume `immich_model-cache` | 模型缓存 | 可重建，通常不必备份 |

重要区别：Immich 数据库只保存照片的索引、相册、用户和元数据；照片/视频文件本身位于上传目录或外部照片库。只备份 PostgreSQL 不能恢复媒体文件。

## 当前版本和配置

当前运行的是 Immich `v2` 系列镜像，具体版本由 `~/immich/.env` 中的 `IMMICH_VERSION` 控制；数据库和 Valkey 镜像使用 Compose 文件中固定的镜像标签/摘要。

密码、数据库用户名和路径均来自 `~/immich/.env`。该文件含敏感配置，不应提交 Git 或复制到公开页面。

## 当前备份状态

目前在 `~/immich` 项目目录中没有发现 Immich 的备份脚本或自动备份任务。当前数据库位于本机 `~/immich/postgres`，上传内容位于 `/data/immich`，所以这只是“正在运行的数据”，不是备份。

建议建立至少两部分备份：

1. PostgreSQL 逻辑备份；
2. `/data/immich` 和 `/data/Photos` 的文件级备份。

数据库文件目录不应在数据库运行时直接复制。需要做一致性备份时，优先使用 `pg_dump`；如果做完整文件级快照，应先停止相关服务或使用底层存储的可靠快照机制。

## 维护命令

```bash
cd ~/immich
docker compose ps
docker compose logs --tail 200 immich-server
docker compose up -d
```

如果机器重启或 NAS 挂载异常，先确认以下路径可用，再启动 Immich：

```text
/data/immich
/data/Photos
~/immich/postgres
```

不要删除 `~/immich/postgres`，也不要对正在运行的数据库目录执行 `rm`、`mv` 或普通 `rsync`。

## 恢复时的依赖顺序

```text
恢复数据库 + 媒体目录
        ↓
启动 immich_postgres 和 immich_redis
        ↓
启动 immich_server
        ↓
启动/等待 immich_machine_learning
        ↓
检查媒体路径、相册和缩略图状态
```

恢复后应登录 Web 界面检查用户、资产数量、相册和随机照片，而不是只看容器显示 `Up`。
