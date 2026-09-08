---
title: 本机 Syncthing 文件同步服务
date: 2026-09-08
tags:
  - syncthing
  - file-sync
  - services
  - operations
---

# 本机 Syncthing 文件同步服务

本文记录当前机器上的 **Syncthing** 服务是什么、有什么用途、当前实际配置、如何使用，以及出现同步问题时如何排查。

> 本文中的“当前状态”依据 2026-09-08 在本机读取到的 systemd、Syncthing REST API、监听端口和日志。Syncthing 的共享设备、文件数量和连接状态会随时间变化，操作前应以 Web 管理界面显示为准。

## 一句话结论

Syncthing 是一个**点对点、持续运行、端到端加密的文件同步服务**。它不是云盘，也不是传统的定时备份工具：它会让多个设备上的同一个文件夹保持一致，并在设备之间直接传输文件；设备无法直连时，也可以尝试通过官方中继连接。

当前服务正在运行，主要用于把本机的 `~/Sync` 与另一台名为 `macbook-asahi` 的设备同步。

## 当前机器上的实际状态

| 项目 | 当前值 |
| --- | --- |
| 服务类型 | systemd **用户服务**，不是系统级服务 |
| 单元 | `syncthing.service` |
| 状态 | 运行中，开机后随用户会话启动 |
| 版本 | Syncthing `v1.29.5` |
| 主进程 | `/usr/bin/syncthing serve --no-browser --no-restart --logflags=0` |
| 配置目录 | `~/.local/state/syncthing/` |
| 主配置文件 | `~/.local/state/syncthing/config.xml` |
| 文件索引数据库 | `~/.local/state/syncthing/index-v0.14.0.db` |
| Web 管理界面 | `http://127.0.0.1:8384/`（当前实际监听在所有接口的 `8384` 端口） |
| 同步协议 | TCP/QUIC `22000` |
| 局域网设备发现 | UDP `21027` |
| 默认同步目录 | `~/Sync` |

当前服务已连续运行数周，内存占用约 50 MB。服务由用户级 systemd 管理，因此使用 `systemctl --user`，不使用 `sudo systemctl`。

## Syncthing 能做什么

### 1. 多设备保持同一份目录

例如在 Debian 主机和 MacBook 上都配置同一个共享文件夹：

```text
Debian:  ~/Sync/project/
MacBook: ~/Sync/project/
```

在任一设备创建、修改或删除文件，变化会被检测并同步到其他共享设备。

### 2. 不依赖中心云盘

Syncthing 的主要传输路径是设备到设备：

```text
本机  <──── 加密同步连接 ────>  MacBook
```

它不把文件默认上传到某个中心云盘。设备之间无法直接连接时，发现服务和中继服务只负责帮助设备找到彼此或转发加密后的数据，不能替代文件存储。

### 3. 支持局域网和跨网络同步

- 同一局域网内，通常通过局域网发现和直接 TCP/QUIC 连接。
- 不同网络之间，可以使用全局发现、NAT 穿透或中继。
- 当前配置启用了局域网发现、全局发现、中继和 NAT 探测。

### 4. 文件版本保护

当前 `dev-sync` 文件夹启用了 **staggered versioning**，版本保留上限为 30 天；这可以在修改或删除后找回旧版本，但它不是完整备份，不能替代独立备份。

## 当前配置详解

### 同步文件夹

当前配置中有两个 Syncthing 文件夹，它们都指向同一个宿主路径 `~/Sync`：

| ID | 标签 | 路径 | 类型 | 共享对象 | 文件系统监视 | 版本保护 |
| --- | --- | --- | --- | --- | --- | --- |
| `default` | `Default Folder` | `~/Sync` | `sendreceive` | 仅本机 | 开启 | 无 |
| `dev-sync` | `dev-sync` | `~/Sync` | `sendreceive` | 本机 + `macbook-asahi` | 关闭，按 3600 秒重新扫描 | staggered，最长 30 天 |

这里有一个重要的配置风险：**两个 Syncthing 文件夹使用了同一个实际目录**。`default` 是本机单独使用的索引，`dev-sync` 才是与 MacBook 共享的索引。这样做容易造成重复索引、重复扫描、删除和版本行为难以理解，也不利于判断哪个文件夹真正负责同步。

当前两个文件夹都处于 `idle`，本机各有 1 个文件、65 字节，未报告错误；`dev-sync` 的远端设备当前没有建立连接。因此，当前“服务正常运行”不等于“MacBook 当前已在线同步”。

建议后续在确认用途后，保留一个指向 `~/Sync` 的文件夹：

- 如果 `~/Sync` 就是与 MacBook 同步的目录，通常保留 `dev-sync`，删除或停用 `default`。
- 如果 `default` 只是测试文件夹，应先确认其中是否有需要保留的内容，再在 Web 界面中停用或删除。
- 修改前先确认 MacBook 端是否有未同步文件，并保留必要的独立备份。

本文只记录问题，**没有自动修改现有 Syncthing 配置**。

### 设备

当前已登记的设备：

- 本机：设备名 `debian`
- 远端：设备名 `macbook-asahi`

设备之间通过设备 ID 进行身份验证。设备 ID 是公开交换用的身份标识，不等同于密码；添加设备时应通过可信渠道核对完整 ID，避免误加陌生设备。

### 网络和端口

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| `8384` | TCP/HTTP | Web 管理界面和 REST API |
| `22000` | TCP | 同步数据传输 |
| `22000` | UDP | QUIC 同步传输 |
| `21027` | UDP | 局域网发现 |

当前 Web 界面配置为 `0.0.0.0:8384`，即监听所有网络接口；当前配置没有设置 GUI 用户名和密码，只依赖浏览器/API 访问机制。这种设置不适合直接暴露在不可信网络或公网。

建议：

1. 优先把 GUI 改为只监听 `127.0.0.1:8384`；或
2. 仅通过 SSH 隧道访问 GUI；或
3. 如果确实需要局域网访问，至少限制防火墙来源，并设置 GUI 登录认证和 HTTPS。

不要把 `8384` 端口直接做公网端口转发。同步数据端口 `22000` 与发现端口 `21027` 也应按实际网络需求配置防火墙。

## 如何打开和使用

### 打开 Web 管理界面

在本机浏览器打开：

```text
http://127.0.0.1:8384/
```

如果从另一台可信机器通过 SSH 访问，可以使用端口转发：

```bash
ssh -L 9999:127.0.0.1:8384 <本机登录用户>@<本机地址>
```

然后在本地浏览器打开：

```text
http://127.0.0.1:9999/
```

SSH 隧道比直接把管理界面暴露到局域网或公网更安全。

### 查看当前文件夹

进入 GUI 后，左侧的 **Folders** 会列出文件夹：

- `Default Folder`：当前只登记本机，不要误以为它会自动同步到 MacBook。
- `dev-sync`：配置为与 `macbook-asahi` 共享。

点击文件夹可以查看：

- 文件夹路径；
- 当前状态（Up to Date、Syncing、Out of Sync、Stopped 等）；
- 已同步文件数量和大小；
- 需要下载或上传的文件；
- 忽略规则；
- 文件版本和旧版本目录。

### 添加一台新设备

以把新电脑加入同步为例：

1. 在新电脑安装并启动 Syncthing。
2. 在新电脑的 GUI 中打开 **Actions → Show ID**，复制完整设备 ID。
3. 在本机 GUI 中点击 **Add Remote Device**。
4. 填写设备 ID 和设备名称。
5. 在需要共享的文件夹中勾选这台新设备。
6. 保存本机配置。
7. 在新电脑上接受设备邀请和文件夹共享。
8. 确认两端文件夹路径、同步模式和忽略规则。
9. 等待状态变为 `Up to Date`，再抽样检查文件内容和权限。

设备 ID 必须完整匹配。不要只根据设备名称判断身份，因为名称可以重复或被修改。

### 添加一个新的同步文件夹

在 GUI 中：

1. 点击 **Add Folder**。
2. 设置唯一的 Folder ID 和容易识别的 Label。
3. 设置本机路径，例如 `~/Sync/notes`。
4. 选择文件夹类型：
   - `Send & Receive`：双向同步；
   - `Send Only`：本机只发送，不接受远端修改；
   - `Receive Only`：本机只接收，适合只读副本。
5. 选择要共享的远端设备。
6. 必要时设置忽略规则和文件版本保护。
7. 保存，然后观察同步状态。

每个 Syncthing 文件夹都应使用**独立且不重叠的路径**。不要把两个文件夹配置到同一个目录，也不要让一个文件夹嵌套在另一个文件夹里面。

### 修改文件时的注意事项

Syncthing 是实时同步，不是“点击上传”：

- 保存文件后，另一台设备可能很快收到修改。
- 删除操作也会同步删除，除非远端使用了 Receive Only、忽略删除或版本保护等机制。
- 同时在两台设备编辑同一文件，可能产生冲突文件，通常带有 `.sync-conflict-` 后缀。
- 大型目录第一次同步可能需要较长时间和大量磁盘空间。
- 数据库、虚拟机磁盘、浏览器 profile 等频繁变化或被程序锁定的目录不适合直接同步。

## 常用管理命令

### 查看服务状态

```bash
systemctl --user status syncthing.service --no-pager
```

### 启动、停止、重启

```bash
systemctl --user start syncthing.service
systemctl --user stop syncthing.service
systemctl --user restart syncthing.service
```

重启只重启同步服务，不会删除同步文件；但正在传输的任务会中断，恢复后会继续检查和同步。

### 设置用户登录后自动启动

```bash
systemctl --user enable syncthing.service
```

当前服务已启用。若希望用户未登录时也运行，需要额外配置 user lingering；除非明确需要，不建议为了同步服务随意修改系统登录生命周期。

### 查看版本

```bash
syncthing --version
```

### 查看日志

```bash
journalctl --user -u syncthing.service -n 100 --no-pager
journalctl --user -u syncthing.service -f
```

### 检查端口

```bash
ss -lntup | grep -E '(:8384|:22000|:21027)'
```

### 检查同步目录

```bash
ls -la ~/Sync
du -sh ~/Sync
```

不要手动删除 `~/.local/state/syncthing/index-v0.14.0.db` 或直接编辑 `config.xml`。配置优先通过 Web GUI 修改；若必须手工处理，先停止服务并备份配置文件。

## 故障排查

### Web 界面打不开

按以下顺序检查：

```bash
systemctl --user status syncthing.service --no-pager
ss -lntp | grep ':8384'
curl -I http://127.0.0.1:8384/
```

如果服务未运行：

```bash
systemctl --user start syncthing.service
journalctl --user -u syncthing.service -n 100 --no-pager
```

### 远端设备显示 Disconnected

检查：

1. 远端 Syncthing 是否正在运行；
2. 两端设备 ID 是否填写正确；
3. 两端是否都接受了设备和文件夹共享；
4. 防火墙是否允许 TCP/UDP `22000`；
5. 局域网发现是否允许 UDP `21027`；
6. 是否处于不同 NAT、VPN 或隔离网络；
7. GUI 的设备页面是否显示最近连接错误。

当前机器日志中反复出现 NAT-PMP 获取端口映射失败。这表示路由器没有提供 NAT-PMP，不一定会阻止同步：局域网直连、其他 NAT 穿透方式或中继仍可能工作。但中继通常比直连慢。

### 状态长期不是 Up to Date

在文件夹详情中查看 `Need` 数量，并检查：

- 目标磁盘空间是否足够；
- 文件权限和所有权是否允许 Syncthing 读写；
- 路径是否存在且已挂载；
- 是否启用了错误的 Send Only / Receive Only 模式；
- 是否被 `.stignore` 忽略；
- 是否存在冲突文件；
- 日志中是否有 `pull error`、`permission denied` 或 `folder path` 错误。

### 修改没有立即被发现

当前 `dev-sync` 的文件系统监视是关闭的，配置为每 3600 秒扫描一次；因此文件保存后不一定立即触发同步。可以在 GUI 中对文件夹执行 **Rescan**，或把 **Watch for Changes** 打开后观察 CPU 和磁盘开销。

### 误同步或误删除

立即在 GUI 中暂停相关文件夹，避免错误继续传播；不要先删除冲突文件或版本目录。随后：

1. 确认哪台设备上的内容是正确版本；
2. 复制正确版本到独立的临时目录；
3. 检查 `dev-sync` 的版本保护目录是否存在可恢复版本；
4. 恢复后再解除暂停；
5. 最后确认两端状态和文件内容。

## Syncthing 与备份的区别

| 能力 | Syncthing | 独立备份 |
| --- | --- | --- |
| 多设备实时复制 | 强 | 通常较弱或按计划执行 |
| 设备离线后追赶同步 | 支持 | 视备份系统而定 |
| 误删后的保护 | 默认较弱 | 可通过不可变/多版本备份增强 |
| 防勒索软件传播 | 默认不能保证 | 可通过离线、只读、不可变备份增强 |
| 防硬盘故障 | 只有在其他设备仍完好时有效 | 通常更适合 |
| 中央云服务依赖 | 不需要 | 视方案而定 |

重要文件至少应有另一份独立备份，最好满足“不同设备、不同介质、不同时间点”中的至少两项。不要把所有副本都放在同一台主机或同一个可写同步目录中。

## 当前建议

1. **先处理重复路径配置**：确认 `default` 和 `dev-sync` 的用途，避免两个 Syncthing 文件夹同时管理 `~/Sync`。
2. **确认 MacBook 是否需要同步**：当前 `macbook-asahi` 已登记，但当前检查时没有活动连接。
3. **考虑开启 `dev-sync` 的文件系统监视**：如果需要接近实时同步，可在 GUI 中开启 Watch for Changes。
4. **限制 Web GUI 暴露范围**：当前管理端口监听所有接口，建议改为本机监听、SSH 隧道，或加防火墙和认证。
5. **不要把 Syncthing 当作唯一备份**：保留独立备份，尤其是代码、照片、文档和数据库。
6. **涉及配置变更前先备份**：至少复制 `~/.local/state/syncthing/config.xml`，并确保远端设备没有未同步修改。

## 官方参考

- [Syncthing Getting Started](https://docs.syncthing.net/intro/getting-started.html)
- [Syncthing Firewall Setup](https://docs.syncthing.net/users/firewall.html)
- [Syncthing Configuration](https://docs.syncthing.net/users/config.html)
- [Syncthing 官方文档](https://docs.syncthing.net/)
