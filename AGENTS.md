# AGENTS.md

## 仓库定位

`~/wiki` 是 Cheyan 个人知识库的 Quartz 源代码仓库，对应远程仓库：

```text
https://github.com/iamcheyan/wiki.git
```

它不是本地运行的应用，也不是本机 Docker 服务的部署目录。主要用途是编写、整理和保存 Markdown 知识库文章。

线上网站是：

```text
https://wiki.iamcheyan.com/
```

网站页面由本仓库的 `content/` 内容生成。推送到 `main` 分支后，GitHub Actions 会自动使用 Quartz 构建并发布 GitHub Pages。

关系如下：

```text
~/wiki/content/*.md
        │
        │ git commit + git push origin main
        ▼
GitHub 仓库 iamcheyan/wiki
        │
        │ GitHub Actions 自动构建
        ▼
https://wiki.iamcheyan.com/
```

## 修改后的强制工作流

本仓库的内容是为了在线阅读，因此每次完成修改后，必须主动推送，不要只停留在本地工作区。

```bash
cd ~/wiki

# 1. 编辑 Markdown 或配置

# 2. 检查修改
git status
git diff --check
git diff

# 3. 提交
git add <修改的文件>
git commit -m "说明这次修改"

# 4. 主动推送到线上构建分支
git push origin main
```

推送完成后，到 GitHub Actions 页面确认构建任务成功，再访问：

```text
https://wiki.iamcheyan.com/
```

如果只是修改文章，优先使用：

```bash
git add content/
```

但提交前仍要确认没有把不应提交的文件放进暂存区。

## 内容规则

- 日常文章放在 `content/` 目录中。
- 首页是 `content/index.md`。
- 服务文档放在 `content/services/`，目前包括 Webmail、Docker、Paperless-ngx、Immich 等内容。
- 文章使用中文为主，标题、描述和目录名称要面向最终网站读者，而不是面向 Quartz 开发者。
- 不要在对外页面使用模板遗留的 `Quartz 5`、`Digital Garden` 等品牌文字；Quartz 只是后台生成工具。
- 记录本机服务时，优先写清用途、访问端口、配置文件、数据目录、依赖关系、备份状态和恢复注意事项。
- 对尚未确认的信息明确写“未发现”“待确认”或“当前未运行”，不要把推测写成事实。

## 本地环境规则

- 不要求在本地安装 Node.js、安装依赖、启动 Quartz 或部署网站。
- 本机 Docker 服务属于独立运行环境；本仓库中的 Docker 文档只用于记录和查询，不要因为编辑文章而停止、重启或修改 Docker 服务。
- `package.json`、`package-lock.json`、`quartz/` 和 `.github/workflows/deploy.yml` 是线上构建所需文件，不要因为本地不部署就删除。
- `.env`、密码、API key、授权码、数据库密钥和其他敏感信息不得写入 Markdown、README、提交记录或公开仓库。

## 站点配置

- 对外站点名称：`Cheyan 知识库`
- 对外域名：`wiki.iamcheyan.com`
- Quartz 配置：`quartz.config.default.yaml`
- 自定义样式：`quartz/styles/custom.scss`
- 自定义域名声明：`content/CNAME`
- GitHub Actions：`.github/workflows/deploy.yml`

修改站点标题、域名、首页、配色或布局时，要同时检查页面标题、首页内容、页脚、README 和本文件是否仍然一致。

## 提交前检查

至少完成以下检查：

```bash
git diff --check
git status --short
```

确认：

- 修改内容没有包含密钥或私密数据；
- 首页链接没有指向不存在的文章；
- Markdown 代码块和表格没有明显格式错误；
- 不相关的本地文件没有被提交；
- 修改已经提交并推送到 `origin/main`。

除非用户明确要求，否则不要执行删除数据、停止服务、重置工作区或覆盖远程历史等破坏性操作。
