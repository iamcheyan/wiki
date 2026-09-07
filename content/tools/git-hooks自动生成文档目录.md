---
title: 用 Git Hook 自动生成 Markdown 文档目录
date: 2026-09-07
description: 通过 pre-commit 在提交前扫描文章、更新首页目录，并理解 Git 暂存区、提交钩子与 CI 兜底之间的关系。
tags:
  - tools
  - git
  - automation
  - markdown
---

# 用 Git Hook 自动生成 Markdown 文档目录

这篇文章记录一个很实用的小自动化：知识库中的文章越来越多后，不再手动维护首页目录，而是在执行 `git commit` 时自动扫描 Markdown 文件，根据 frontmatter 生成 `content/index.md`。

## 一、最终效果

新增一篇文章：

```text
content/services/new-service.md
```

只需要正常执行：

```bash
git add content/services/new-service.md
git commit -m "新增服务文档"
```

提交前，Git 会自动执行目录生成器。最终同一个 commit 会同时包含：

```text
content/services/new-service.md
content/index.md
```

因此首页目录不会依赖记忆，也不会因为忘记手动添加链接而过期。

## 二、Git Hook 是什么

Git Hook 是 Git 在特定操作前后自动执行的脚本。常见的几个阶段如下：

| Hook | 执行时机 | 适合做什么 |
| --- | --- | --- |
| `pre-commit` | 创建 commit 之前 | 格式检查、测试、生成文件 |
| `commit-msg` | 提交信息写入之后 | 检查提交信息格式 |
| `post-commit` | commit 创建之后 | 通知、日志记录 |
| `pre-push` | 推送到远程之前 | 最后一次测试、敏感信息检查 |

这里选择 `pre-commit`，是因为目录文件需要和文章一起进入 commit。`post-commit` 执行得太晚，第一次提交里不会包含它刚刚生成的目录；`pre-push` 则距离 commit 太晚，容易让本地历史和远程构建产生差异。

## 三、这个仓库的实现

### 1. 生成器

生成器位于：

```text
scripts/generate-index.mjs
```

它会递归扫描 `content/`，排除首页，读取每篇文章 frontmatter 中的 `title` 和 `description`，再根据目录分组，最后重写 `content/index.md`。

例如：

```yaml
---
title: Immich 相册服务
description: 照片管理、媒体路径和数据库维护。
---
```

会生成：

```markdown
- [[services/immich|Immich 相册服务]]：照片管理、媒体路径和数据库维护。
```

脚本通过 `package.json` 暴露为：

```bash
npm run generate:index
```

### 2. 提交钩子

钩子位于：

```text
.githooks/pre-commit
```

核心内容是：

```bash
npm run generate:index
git add content/index.md
```

第二行很重要。生成器修改的是工作区文件，而 Git commit 默认只提交已经进入暂存区的内容。如果不执行 `git add content/index.md`，目录虽然在本地更新了，但可能不会进入这次提交。

完整流程是：

```text
git commit
    ↓
pre-commit 启动
    ↓
扫描 Markdown 文件
    ↓
改写 content/index.md
    ↓
重新暂存 content/index.md
    ↓
创建 commit
```

### 3. 为什么 Hook 文件要单独放在 `.githooks/`

Git 默认使用 `.git/hooks/`，但 `.git/` 是本地仓库元数据，不会被提交到远程仓库。因此直接把脚本放到 `.git/hooks/`，其他人 clone 仓库后拿不到。

本仓库把脚本放在可提交的目录：

```text
.githooks/pre-commit
```

然后通过下面的配置告诉 Git 使用它：

```bash
git config core.hooksPath .githooks
```

这个配置写在本机的 `.git/config` 中，不会进入 commit。所以新电脑 clone 仓库后，需要执行一次配置命令。

## 四、为什么还要在 GitHub Actions 里再生成一次

本地 Hook 不是强制性的。新电脑没有配置 Hook、使用 `git commit --no-verify`，或者自动化程序直接写入仓库时，都可能绕过它。

因此部署流程在构建前还会运行：

```yaml
- name: Generate content index
  run: npm run generate:index
```

这一步是线上兜底。它保证最终发布的网站目录是最新的，但不会自动把修改反向提交回 GitHub。真正的源文件仍然应该通过正常的 commit 保存。

## 五、这个模式还能做什么

同样的模式还可以用于：

- 扫描 `content/` 自动生成目录树；
- 根据文章 `tags` 自动生成专题页；
- 提交前检查 `[[...]]` 链接是否指向存在的文章；
- 自动格式化 Markdown，或发现格式问题时阻止提交；
- 根据 commit message 自动生成变更日志。

例如，可以把“所有 Docker 文章”自动生成到 `content/tags/docker.md`，也可以在提交前检查首页是否存在失效链接。

## 六、使用时的注意点

### 生成器应该保持确定性

同一批输入应该得到同样的输出。目录排序、分组名称和格式都要固定，不要把当前时间、随机数或本机路径写入结果，否则每次提交都会产生无意义的差异。

### 明确谁负责编辑生成文件

`content/index.md` 的目录部分由脚本负责生成。以后如果要修改首页说明文字，应修改生成器，而不是只手动修改生成结果，否则下一次提交会被覆盖。

### Hook 不是安全边界

Hook 可以被跳过，所以它适合提升开发体验，不适合承担唯一的安全检查。敏感信息检查、测试和构建验证仍然应该在 CI 中再执行一次。

自动化也不会改变公开仓库的隐私风险。密码、Token、API Key、邮箱授权码和私有地址，仍然不能写入 Markdown、脚本或提交记录。

## 七、可以记住的通用原则

这个方案背后的通用思路是：

```text
源数据 → 生成器 → 可读产物 → 提交前校验 → CI 再验证
```

只要某个文件可以从其他可靠数据自动推导出来，就可以考虑自动生成；只要某个检查不能被本地环境完全保证，就应该在 CI 中再执行一次。

对于个人知识库来说，最重要的不是把自动化做得复杂，而是让“新增文章”保持简单：写文章、提交，目录和网站自然跟上。
