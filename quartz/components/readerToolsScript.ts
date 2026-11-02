const readerToolsScript = `
(() => {
  const install = () => {
    if (document.getElementById("reader-tools")) return
    const toolbar = document.createElement("div")
    toolbar.id = "reader-tools"
    toolbar.innerHTML = '<button class="reader-tools__toggle" type="button" aria-pressed="false"><span>阅读模式</span></button><button class="reader-tools__copy" type="button"><span>复制全文 Markdown</span></button><span class="reader-tools__status" role="status" aria-live="polite"></span>'
    document.body.append(toolbar)
    const root = document.documentElement
    const toggle = toolbar.querySelector(".reader-tools__toggle")
    const copy = toolbar.querySelector(".reader-tools__copy")
    const status = toolbar.querySelector(".reader-tools__status")
    const sync = () => {
      const enabled = root.getAttribute("reader-mode") === "on"
      toggle.setAttribute("aria-pressed", String(enabled))
      toggle.firstElementChild.textContent = enabled ? "退出阅读模式" : "阅读模式"
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
        if (!response.ok) throw new Error("无法读取文章索引")
        const index = await response.json()
        const markdown = index[slug]?.content
        if (typeof markdown !== "string") throw new Error("未找到当前文章的 Markdown 内容")
        if (!navigator.clipboard?.writeText) throw new Error("当前浏览器不允许访问剪贴板，请使用 HTTPS")
        await navigator.clipboard.writeText(markdown)
        status.textContent = "全文 Markdown 已复制"
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "复制失败"
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
