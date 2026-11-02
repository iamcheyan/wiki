---
title: WSL 中 Neovim 分屏独立搜索无效排查
description: 检查 WSL 实际加载的 Neovim 配置、Git 与子模块版本，并用最小复现区分配置未更新和运行时行为问题。
date: 2026-11-02
---

# WSL 中 Neovim 分屏独立搜索无效排查

当左右分屏分别搜索不同关键词，但两边仍显示同一组搜索高亮时，先确认 WSL 正在加载哪份配置，再检查文件版本和搜索事件是否进入窗口局部逻辑。不要只根据另一台机器或 headless 单元测试推断 WSL 的状态。

## 1. 确认 WSL 与 Neovim 配置路径

在出现问题的 WSL shell 执行：

```bash
printf 'WSL: '; grep -qi microsoft /proc/version && echo yes || echo no
printf 'Neovim: '; nvim --version | head -1
printf '配置链接: '; readlink -f "${XDG_CONFIG_HOME:-$HOME/.config}/nvim"
```

配置可能直接链接到 `~/nvim`，也可能使用 dotfiles 仓库内的 `config/nvim` 子模块。应以 `readlink -f` 的结果为准，不能假设运行的就是刚 pull 的目录。

## 2. 检查源码与子模块是否都更新

```bash
# 独立 nvim 仓库（如果存在）
git -C ~/nvim status --short --branch
git -C ~/nvim rev-parse --short HEAD

# dotfiles 主仓库及其记录的 nvim 子模块版本
git -C ~/dotfiles status --short --branch
git -C ~/dotfiles rev-parse --short HEAD
git -C ~/dotfiles submodule status config/nvim
```

如果实际配置路径在 `~/dotfiles/config/nvim`，普通 `git pull` 只更新主仓库记录的 gitlink，不一定检出子模块内容。同步主仓库后还要运行：

```bash
git -C ~/dotfiles submodule update --init --recursive
```

若配置链接指向 `~/nvim`，则单独确认该仓库的分支与提交：

```bash
git -C ~/nvim pull --ff-only
```

## 3. 确认独立搜索实现文件已部署

```bash
cfg="$(readlink -f "${XDG_CONFIG_HOME:-$HOME/.config}/nvim")"
test -f "$cfg/lua/config/win_search.lua" && echo 'window-local search module: present' || echo 'window-local search module: missing'
rg -n 'win_search|hlsearch' "$cfg/lua/config/options.lua" "$cfg/lua/config/keymaps-defaults.lua" "$cfg/lua/config/autocmds.lua"
```

预期能找到 `config.win_search` 的加载处、`hlsearch = false`，以及按窗口保存搜索状态的调用。若文件缺失或加载处不存在，说明当前配置版本不包含这项功能。

## 4. 检查 Neovim 是否成功启动并加载模块

在问题环境运行：

```bash
nvim --headless \
  -c 'lua print("colorscheme", vim.g.colors_name)' \
  -c 'lua print("hlsearch", vim.o.hlsearch)' \
  -c 'lua print("search module", pcall(require, "config.win_search"))' \
  -c 'qa!'
```

查看输出中是否有启动错误。如果 `require` 失败，或启动过程因其他配置错误中断，先处理对应错误；文件存在不代表运行时已加载。

## 5. 验证实际 `/` 搜索事件是否进入窗口局部逻辑

先检查 `:messages` 是否有 Lua 错误，再在两边分别用普通搜索命令输入不同词，例如左边 `/apple`、右边 `/banana`。切回左边后按 `n`，应继续在左边搜索 `apple`；右边按 `n` 应继续搜索 `banana`。当前窗口按 `<Esc>` 清理搜索时，另一侧的高亮应保留。

若配置模块已加载但交互仍共享搜索，逐项检查：

- 是否通过 Neovim 普通 `/` 或 `?` 搜索，而不是插件 picker 的过滤框；
- 插件或个人映射是否覆盖 `/`、`n`、`N`、`<Esc>`；
- `:verbose set hlsearch?` 与 `:verbose nmap /`、`:verbose nmap n` 是否显示其他配置来源；
- `:messages` 中是否出现 `CmdlineLeave` 回调或 `matchadd` 的错误。

记录上述命令输出和 `:messages`，即可区分“源码未更新”“配置未加载”“按键被覆盖”与“运行时实现缺陷”。

## 验证范围

窗口局部逻辑的 headless 验证可以确认两个窗口保存不同搜索词、各自拥有独立匹配，并且清除一侧不会清除另一侧。它不能代替在目标 WSL 终端里确认实际配置链接、提交版本、启动错误和键位交互。最终结论应以发生问题的 WSL 环境为准。
