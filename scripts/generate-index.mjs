#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const contentDir = path.join(root, "content")
const indexPath = path.join(contentDir, "index.md")

const sectionNames = {
  "hermes-agent": "Hermes Agent",
  projects: "项目",
  services: "服务",
}

function readFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, "utf8")
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)
  const values = {}

  for (const line of frontmatter?.[1]?.split("\n") ?? []) {
    const match = line.match(/^(title|description):\s*(.*)$/)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
  }

  return values
}

function collectArticles(directory, relativeDirectory = "") {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name)
      const relativePath = path.join(relativeDirectory, entry.name)

      if (entry.isDirectory()) return collectArticles(absolutePath, relativePath)
      if (!entry.isFile() || !entry.name.endsWith(".md")) return []
      if (relativePath === "index.md") return []

      const metadata = readFrontmatter(absolutePath)
      const slug = relativePath.slice(0, -3).split(path.sep).join("/")
      const section = relativeDirectory ? sectionNames[relativeDirectory] ?? relativeDirectory : "文章"

      return [{ description: metadata.description, section, slug, title: metadata.title ?? relativePath }]
    })
}

const articles = collectArticles(contentDir).sort((a, b) => a.slug.localeCompare(b.slug))
const grouped = Map.groupBy(articles, (article) => article.section)
const sections = [...grouped.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
  .map(([section, sectionArticles]) => {
    const entries = sectionArticles
      .map(({ description, slug, title }) => `- [[${slug}|${title}]]${description ? `：${description}` : ""}`)
      .join("\n")
    return `## ${section}\n\n${entries}`
  })
  .join("\n\n")

const output = `---
title: Cheyan 知识库
description: Cheyan 的技术、工具与家庭服务知识库目录。
---

# Cheyan 知识库

这里记录技术实践、家庭服务、工具配置与日常运维。选择下面的文章开始阅读。

<!-- 目录由 scripts/generate-index.mjs 自动生成，请勿手动编辑此标记之后的内容。 -->

${sections}
`

fs.writeFileSync(indexPath, output)
console.log(`Generated ${path.relative(root, indexPath)} (${articles.length} articles)`)
