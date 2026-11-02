const readerToolsScript = `
(() => {
  const install = () => {
    if (document.getElementById("reader-tools")) return
    const toolbar = document.createElement("div")
    toolbar.id = "reader-tools"
    toolbar.innerHTML = '<button class="reader-tools__toggle" type="button" aria-pressed="false"><span>読書モード</span></button><button class="reader-tools__copy" type="button"><span>本文を Markdown でコピー</span></button><span class="reader-tools__status" role="status" aria-live="polite"></span>'
    document.body.append(toolbar)
    const root = document.documentElement
    const toggle = toolbar.querySelector(".reader-tools__toggle")
    const copy = toolbar.querySelector(".reader-tools__copy")
    const status = toolbar.querySelector(".reader-tools__status")
    const sync = () => {
      const enabled = root.getAttribute("reader-mode") === "on"
      toggle.setAttribute("aria-pressed", String(enabled))
      toggle.firstElementChild.textContent = enabled ? "読書モードを終了" : "読書モード"
    }
    toggle.addEventListener("click", () => {
      const enabled = root.getAttribute("reader-mode") !== "on"
      root.setAttribute("reader-mode", enabled ? "on" : "off")
      document.dispatchEvent(new CustomEvent("readermodechange", { detail: { mode: enabled ? "on" : "off" } }))
      sync()
    })
    document.addEventListener("readermodechange", sync)
    document.addEventListener("nav", sync)
    document.addEventListener("render", sync)
    sync()
    copy.addEventListener("click", async () => {
      try {
        const base = document.body.dataset.contentIndex || "static/contentIndex.json"
        const slug = document.body.dataset.slug
        const response = await fetch(base)
        if (!response.ok) throw new Error("記事インデックスを読み取れません")
        const index = await response.json()
        const markdown = index[slug]?.content
        if (typeof markdown !== "string") throw new Error("本文の Markdown が見つかりません")
        const markdownWithUrls = markdown.replace(/(?<![\\[(])https?:\\/\\/[^\\s)>]+/g, (url) => url)
        if (!navigator.clipboard?.writeText) throw new Error("クリップボードを利用するには HTTPS が必要です")
        await navigator.clipboard.writeText(markdownWithUrls)
        status.textContent = "Markdown（本文の URL を含む）をコピーしました"
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "コピーに失敗しました"
      }
      status.dataset.visible = "true"
      setTimeout(() => { status.dataset.visible = "false" }, 2200)
    })
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true })
  else install()
  document.addEventListener("nav", install)
})()
`
export { readerToolsScript }
