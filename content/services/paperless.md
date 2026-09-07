---
title: Paperless-ngx 文档管理服务
date: 2026-09-07
tags:
  - docker
  - paperless
  - documents
  - backup
---

# Paperless-ngx 文档管理服务

Paperless-ngx 用来导入、OCR、归档和检索 PDF、扫描件及其他个人文档。当前 Compose 项目位于 `~/paperless`。

## 访问

宿主机端口：`8777`。

```text
http://<主机IP>:8777
```

如果通过主机上的反向代理提供域名访问，应优先使用域名；Compose 文件本身只负责 `8777:8000`，没有声明域名或 HTTPS。

## 容器组成

```text
paperless_webserver :8777
  ├── paperless_postgres  (数据库，容器内 5432)
  └── paperless_broker    (Redis，容器内 6379)
```

| 容器 | 作用 | 宿主机持久化位置 |
| --- | --- | --- |
| `paperless_webserver` | Web 界面、任务处理、OCR | `/data/NAS/paperless/data`、`media`、`export`、`consume` |
| `paperless_postgres` | 元数据、用户、标签和文档索引相关数据库 | `/data/paperless/postgres` |
| `paperless_broker` | Redis 队列和缓存 | `/data/paperless/redis` |

Paperless 的业务数据不是只在数据库里。`media` 中的文件、`consume` 中待导入文件、`export` 中导出文件同样重要；只备份 PostgreSQL 不能完整恢复 Paperless。

## 数据目录

| 目录 | 用途 | 备份建议 |
| --- | --- | --- |
| `/data/NAS/paperless/data` | Paperless 应用数据 | 必须备份 |
| `/data/NAS/paperless/media` | 已归档文档和缩略图等媒体 | 必须备份 |
| `/data/NAS/paperless/export` | 导出文件 | 按需备份，重要导出应保留 |
| `/data/NAS/paperless/consume` | 自动导入目录 | 按需备份；导入后文件可能被移动 |
| `/data/paperless/postgres` | PostgreSQL 数据库 | 必须备份，优先使用逻辑 dump |
| `/data/paperless/redis` | Redis 数据 | 通常不是核心备份对象，可重建 |
| `/data/NAS/paperless/tessdata` | 中文、日文 OCR 语言包 | 建议备份或记录来源 |

## 导入文档

可以把待归档文件放到：

```text
/data/NAS/paperless/consume/
```

Paperless 会自动读取该目录并处理。若导入失败，先查看 Web 界面的任务状态，再查看日志：

```bash
docker logs --tail 200 paperless_webserver
```

不要直接删除 `media` 或数据库目录来“清理空间”；这会破坏 Paperless 的文档关联。

## 当前备份状态

仓库里有备份脚本：

```text
~/paperless/backup-paperless-db-to-nas.sh
```

脚本执行的是 PostgreSQL 逻辑备份，并把压缩文件写到：

```text
/data/NAS/paperless/backups/paperless-db-YYYYMMDD-HHMMSS.sql.gz
```

这个脚本现在被明确设置为“手动执行”，需要显式设置环境变量：

```bash
PAPERLESS_MANUAL_BACKUP=1 \
  ~/paperless/backup-paperless-db-to-nas.sh
```

当前记录显示，2026-09-05 仍有成功生成的数据库备份；2026-09-06 的一次执行因 NAS 目标暂时不可用而失败。这个备份目录和 Paperless 源数据在同一个 NAS 上，因此不能视为抗 NAS 故障的异地备份。

## 恢复思路

恢复前必须先确认备份文件完整、目标数据库版本兼容，并暂停 Web 容器，避免恢复过程中继续写入。下面是操作骨架，不要未经确认直接执行破坏性数据库命令：

```bash
docker compose -f ~/paperless/docker-compose.yml stop webserver

# 先把备份文件复制到安全位置并检查 gzip：
gzip -t /data/NAS/paperless/backups/paperless-db-YYYYMMDD-HHMMSS.sql.gz

# 确认数据库为空或已经按 Paperless 官方恢复流程准备好后，再导入：
gunzip -c /data/NAS/paperless/backups/paperless-db-YYYYMMDD-HHMMSS.sql.gz \
  | docker exec -i paperless_postgres psql -U paperless -d paperless

docker compose -f ~/paperless/docker-compose.yml start webserver
```

完整恢复还需要同时恢复 `/data/NAS/paperless/media` 等文件目录。仅导入 SQL 会得到不完整的文档库。

## 维护命令

```bash
cd ~/paperless
docker compose ps
docker compose logs --tail 200 webserver
docker compose up -d
```

升级前应先做数据库和业务数据备份，并记录当前镜像版本。不要盲目使用 `latest` 更新后立即删除旧镜像。
