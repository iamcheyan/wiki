# Cheyan 的知识库

这是 [Cheyan 的个人知识库](https://wiki.iamcheyan.com/) 的 Quartz 源代码仓库。

本仓库主要用于编写和管理 Markdown 文章。文章推送到 GitHub 的 `main` 分支后，GitHub Actions 会自动使用 Quartz 构建并发布网站。无需在本地运行 Quartz，也无需在本地部署网站。

## 文章位置

所有文章位于 `content/` 目录下，按照主题分类。例如：

```text
content/services/webmail.md
```

编辑 Markdown 文件后，提交并推送到 GitHub 即可。

## 服务文档

本机 Docker 服务的详细说明放在 `content/services/` 中：

- `docker-overview.md`：本机 Docker 服务、端口、数据目录和服务关系总览
- `webmail.md`：SnappyMail 的部署、邮箱配置和迁移说明
- `paperless.md`：Paperless-ngx 的使用、数据目录和备份说明
- `immich.md`：Immich 的服务组成、媒体目录和备份说明
- `docker-backups.md`：各服务的备份与恢复手册
- `opencode2api.md`：已配置但当前未运行的 OpenCode2API 项目

## 日常工作流

```bash
cd ~/wiki

# 编辑文章
# 例如：content/services/webmail.md

git add content/
git commit -m "更新文章"
git push origin main
```

推送完成后，GitHub Actions 会自动构建并发布。发布结果可在以下地址查看：

<https://wiki.iamcheyan.com/>

## 目录说明

- `content/`：知识库文章，日常主要编辑这里
- `content/projects/`：个人项目构想、技术路线和开发记录
- `quartz/`：Quartz 站点生成器源码
- `quartz.config.default.yaml`：Quartz 默认配置参考
- `.github/workflows/deploy.yml`：推送到 `main` 后自动部署到 GitHub Pages 的配置
- `package.json`、`package-lock.json`：GitHub Actions 构建 Quartz 时使用的依赖配置

## 注意事项

- 本地不需要安装 Node.js，也不需要执行 `npm install` 或启动本地服务。
- 只修改文章时，通常只需要提交 `content/` 目录中的文件。
- 不要删除 Quartz 源码、GitHub Actions 配置或依赖文件，否则线上自动构建可能会失败。
