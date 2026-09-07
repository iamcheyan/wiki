---
title: Docker 服务备份与恢复手册
date: 2026-09-07
tags:
  - docker
  - backup
  - restore
  - homelab
---

# Docker 服务备份与恢复手册

本文档集中记录本机 Docker 服务需要备份什么、当前已经有什么备份、哪些仍然缺失，以及故障时的恢复顺序。

## 先记住一件事

Docker 容器不是备份。删除容器后，只要数据在宿主机挂载目录中，通常可以重新创建容器；但如果挂载目录、数据库或 NAS 数据丢失，仅靠镜像无法找回业务数据。

真正需要备份的是：

| 类型 | 例子 | 是否必须 |
| --- | --- | --- |
| Compose 文件 | `docker-compose.yml` | 必须，最好进入 Git |
| 环境文件 | `.env` | 必须，但要加密保存，不能公开 |
| 数据库 | PostgreSQL dump | 必须 |
| 业务文件 | 文档、照片、邮件配置 | 必须 |
| 缓存 | Redis、机器学习模型缓存 | 通常可重建 |
| 镜像 | Docker image | 通常可重新拉取，版本信息更重要 |

## 服务备份矩阵

| 服务 | 数据库 | 业务文件 | 当前自动备份 | 当前风险 |
| --- | --- | --- | --- | --- |
| SnappyMail | 无独立数据库 | `~/services/webmail/data` | 未发现 | 目前没有自动备份 |
| Paperless | `/data/paperless/postgres` | `/data/NAS/paperless/media`、`data`、`export`、`consume` | 已有数据库脚本，但目前手动-only | 数据库备份和业务文件备份不完整；备份目标与源在同一 NAS |
| Immich | `~/immich/postgres` | `/data/immich`、`/data/Photos` | 未发现 | 没有已配置的自动备份 |

## 当前已知的 Paperless 备份

脚本位置：

```text
~/paperless/backup-paperless-db-to-nas.sh
```

手动执行：

```bash
PAPERLESS_MANUAL_BACKUP=1 \
  ~/paperless/backup-paperless-db-to-nas.sh
```

目标目录：

```text
/data/NAS/paperless/backups/
```

历史日志显示该脚本曾按每天约 03:15 生成数据库 dump，但脚本后来改为手动-only；2026-09-06 的一次执行因目标 NAS 暂时不可用失败。不要把这个目录当作异地备份，因为它与 Paperless 的部分源数据位于同一个 NAS。

## SnappyMail 备份建议

SnappyMail 的持久化目录是：

```text
~/services/webmail/data
```

该目录包含服务配置、域名设置、用户设置和可能的敏感信息。当前未发现自动备份脚本。手动备份时可以先停止容器，再打包目录：

```bash
docker compose -f ~/services/webmail/docker-compose.yml stop
tar -C ~/services/webmail -czf \
  /path/to/backup/snappymail-data-$(date +%Y%m%d-%H%M%S).tar.gz data
docker compose -f ~/services/webmail/docker-compose.yml start
```

`/path/to/backup/` 应替换为另一块磁盘或另一台机器上的受保护目录，不要放到 Git 仓库或公开 Web 目录。

恢复时先停止容器，把备份解压回 `~/services/webmail/data`，确认属主和权限，再启动容器：

```bash
docker compose -f ~/services/webmail/docker-compose.yml stop
tar -C ~/services/webmail -xzf /path/to/backup/snappymail-data-YYYYMMDD-HHMMSS.tar.gz
docker compose -f ~/services/webmail/docker-compose.yml up -d
```

## Paperless 备份建议

完整备份至少需要：

```text
/data/NAS/paperless/data
/data/NAS/paperless/media
/data/NAS/paperless/export
/data/NAS/paperless/consume
/data/paperless/postgres 的逻辑 dump
~/paperless/docker-compose.yml
~/paperless/.env
```

Redis 数据通常可以重建，不是优先备份对象；OCR 语言包应保存来源或单独复制。

恢复时要同时恢复数据库和文件目录。只恢复 SQL，或者只恢复 `media`，都会产生不完整的文档库。数据库恢复命令请参考 [[services/paperless|Paperless-ngx 文档管理服务]]，执行前必须确认目标库状态，避免覆盖当前数据。

## Immich 备份建议

完整备份至少需要：

```text
/data/immich
/data/Photos
~/immich/postgres 的 PostgreSQL 逻辑 dump
~/immich/docker-compose.yml
~/immich/.env
```

`immich_model-cache` 是模型缓存，丢失后通常可以重新下载，不是第一优先级。`immich_redis` 同样主要用于队列和缓存。

数据库 dump 应使用容器内的 PostgreSQL 工具完成，并从 `.env` 读取真实数据库参数；不要把密码直接写进 shell 历史或公开文档。恢复前先停应用容器，恢复数据库和媒体目录后再按 [[services/immich|Immich 相册服务]] 中的依赖顺序启动。

## 备份检查清单

定期检查以下项目：

- [ ] 备份目标不是同一块磁盘或同一个 NAS 故障域
- [ ] Compose 文件和 `.env` 都已保存，`.env` 已加密
- [ ] 数据库 dump 能通过 `gzip -t` 或对应工具校验
- [ ] 备份文件不是 0 字节，且最近一次生成时间正常
- [ ] Paperless 的 `media` 和 Immich 的照片/视频也在备份范围内
- [ ] 至少实际测试过一次恢复，而不是只看备份文件存在
- [ ] 恢复前记录当前容器镜像版本和配置

## 故障排查顺序

```text
1. 检查 NAS / /data 挂载是否正常
2. docker ps -a 查看容器状态
3. 查看对应应用容器日志
4. 检查数据库容器是否 healthy
5. 检查宿主机挂载路径和权限
6. 最后才考虑恢复数据库或文件
```

不要因为网页打不开就立刻删除容器或数据库。先区分是反向代理、端口、NAS 挂载、应用配置，还是数据库问题。
