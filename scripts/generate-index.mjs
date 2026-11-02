#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const contentDir = path.join(root, "content")
const indexPath = path.join(contentDir, "index.md")

const sectionNames = {
  "ai-agent": "AI Agent",
  "hermes-agent": "Hermes Agent",
  projects: "プロジェクト",
  services: "サービス",
  tools: "ツール",
}

function readFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, "utf8")
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)
  const values = {}

  for (const line of frontmatter?.[1]?.split("\n") ?? []) {
    const match = line.match(/^(title|description|date):\s*(.*)$/)
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
      const section = relativeDirectory ? sectionNames[relativeDirectory] ?? relativeDirectory : "記事"

      return [{ date: metadata.date ?? "", description: metadata.description, section, slug, title: metadata.title ?? relativePath }]
    })
}

const articles = collectArticles(contentDir).sort((a, b) => {
  const dateOrder = (b.date || "0000-00-00").localeCompare(a.date || "0000-00-00")
  return dateOrder || a.slug.localeCompare(b.slug)
})
const grouped = Map.groupBy(articles, (article) => article.section)
const sections = [...grouped.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "ja"))
  .map(([section, sectionArticles]) => {
    const entries = sectionArticles
      .map(({ description, slug, title }) => `- [[${slug}|${title}]]${description ? `：${description}` : ""}`)
      .join("\n")
    return `## ${section}\n\n${entries}`
  })
  .join("\n\n")

const output = `---
title: ナレッジベース
description: 技術、ツール、サービスに関する記事一覧。
---

# ナレッジベース

技術の実践、ツールの設定、サービスの運用に関する記事をまとめています。

<!-- この下の一覧は scripts/generate-index.mjs が自動生成します。 -->

${sections}
`

fs.writeFileSync(indexPath, output)
console.log(`Generated ${path.relative(root, indexPath)} (${articles.length} articles)`)
