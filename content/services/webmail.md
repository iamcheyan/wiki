---
title: NAS 邮件客户端 Snappymail 部署与多邮箱配置
date: 2026-09-07
tags:
  - nas
  - docker
  - email
  - homelab
  - guide
---

# NAS 自建 Web 邮件客户端 (Snappymail)

本文档记录了在个人 NAS 上部署基于 Docker 的轻量级 Webmail 客户端（Snappymail）的完整方案，包括多邮箱聚合切换、常见企业邮箱与主流公共邮箱（QQ/163/Gmail/Outlook）配置以及底层避坑实践。

---

## 1. 架构与部署

### 1.1 Docker Compose 编排
服务部署于 NAS 的 `~/services/webmail` 目录：

```yaml
services:
  snappymail:
    image: djmaze/snappymail:latest
    container_name: snappymail
    restart: unless-stopped
    ports:
      - "8089:8888"
    volumes:
      - ./data:/var/lib/snappymail
```

* **Web 访问入口**：`http://<NAS_IP>:8089`
* **管理后台入口**：`http://<NAS_IP>:8089/?admin`
* **持久化数据**：统一持久化于宿主机 `./data/`（挂载容器内 `/var/lib/snappymail`），包含域名模板、系统加密密钥、多用户绑定关联表与用户设置。

---

## 2. 常见邮箱服务器配置与避坑指南

### 2.1 企业邮箱 (以标准企业邮为例)
* **收件服务器 (IMAP)**: `sv*****.xbiz.ne.jp` | 端口 `993` | 加密 `SSL/TLS`
* **发件服务器 (SMTP)**: `sv*****.xbiz.ne.jp` | 端口 `465` | 加密 `SSL/TLS`

### 2.2 QQ 邮箱 (`qq.com`)
* **密码要求**：禁止使用 QQ 登录密码，必须使用 QQ 邮箱生成的 **16位授权码**（在 QQ 邮箱网页端「设置 -> 账户 -> POP3/IMAP服务」中生成）。
* **配置参数**：
  * **IMAP**: `imap.qq.com:993` (SSL)
  * **SMTP**: `smtp.qq.com:465` (SSL)

### 2.3 网易邮箱 (`163.com` / `126.com` / `yeah.net`)
* **密码要求**：必须使用网易「客户端授权密码」。
* **避坑要点 (IMAP ID 检查)**：
  网易服务器强制检查客户端标识（RFC 2971），若未发送 ID 标识，在读取邮件时会被服务端直接拦截并返回 `SELECT Unsafe Login. Please contact kefu@188.com for help`。
  * **解决方案**：在 Snappymail 的 IMAP 认证成功后主动向服务端发送客户端身份握手：
    ```text
    ID ("name" "Thunderbird" "version" "115.0")
    ```

### 2.4 Google 邮箱 (`gmail.com`)
* **密码要求**：开启 Google 两步验证后，生成 **16 位应用专用密码 (App Password)**。
* **配置参数**：
  * **IMAP**: `imap.gmail.com:993` (SSL)
  * **SMTP**: `smtp.gmail.com:465` (SSL)

### 2.5 微软邮箱 (`outlook.com` / `hotmail.com`)
* **配置参数**：
  * **IMAP**: `outlook.office365.com:993` (SSL)
  * **SMTP**: `smtp.office365.com:587` (STARTTLS)

---

## 3. 多邮箱无缝切换机制

Snappymail 支持「主账户 + 附加子账户」模式：
1. **主账号绑定**：使用主账号登录后，在右上角菜单选择 **「添加账户」**，将常用邮箱依次关联。
2. **多账号切换**：所有关联账户的加密凭证保存在主账号的 `additionalaccounts` 中。日常使用只需登录主账号，即可在右上角下拉菜单中秒切换到任意邮箱，无需逐个输入密码。
3. **免密驻留**：个人家庭网络环境下，用完直接关闭浏览器标签页即可保持登录，下次直接打开即用。

---

## 4. 运维与备份迁移

### 4.1 数据一键备份
```bash
tar -czvf ~/snappymail_backup_$(date +%Y%m%d).tar.gz -C ~/services/webmail data docker-compose.yml
```

### 4.2 迁移还原
在新机器上解压备份包至 `~/services/webmail` 后执行：
```bash
cd ~/services/webmail && docker compose up -d
```

### 4.3 当前运行状态

当前容器名为 `snappymail`，宿主机端口为 `8089`，Compose 项目文件位于 `~/services/webmail/docker-compose.yml`：

```bash
docker compose -f ~/services/webmail/docker-compose.yml ps
docker logs --tail 100 snappymail
```

SnappyMail 不依赖本机的 PostgreSQL 或 Redis；它通过 IMAP/SMTP 直接连接外部邮箱服务。邮件正文和邮箱服务器上的文件夹仍以邮箱服务商为准，本机主要保存 SnappyMail 的配置、用户设置和凭证关联信息。

当前未发现自动备份任务。备份包含敏感配置，应保存到另一块磁盘或另一台机器，不要提交到 GitHub，也不要放进 Quartz 的 `content/` 目录。Docker 服务的整体备份策略见 [[services/docker-backups|Docker 服务备份与恢复手册]]。
