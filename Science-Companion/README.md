# Science 中文与外部打开 1.1.0（通用 Windows 安装版）

这是可选的 Edge 浏览器扩展，不会随 CSSwitch 自动启用，也不修改 Science 程序。

1. 双击本文件夹中的 Install-or-Update.cmd。
2. 首次安装默认复制到当前用户的 `%LOCALAPPDATA%\CSSwitch\Science-Companion`，不要求 G 盘。已经安装过同一插件时沿用原安装目录。
3. 在 Edge 地址栏输入 `edge://extensions`，开启“开发人员模式”，点击“加载解压缩的扩展”，选择安装脚本显示的 `extension` 文件夹。
4. 在 Edge 打开本机 Claude Science 网页并刷新。官方 Science 独立窗口不加载 Edge 扩展。

只需要中文界面：也可以直接加载本包的 extension 文件夹，并保留整个目录；无需运行本地组件安装脚本。
需要“用默认应用打开”“选择其他应用打开”“在文件资源管理器中显示”：必须完成第 1 步注册本地组件。

原理与范围：1,865 条本地词条，针对 Science 0.1.60；不翻译科研正文、代码或输入内容。模型名、技术诊断和以后新增界面可能仍保留英文。
Markdown 打开的是导出副本，外部修改不自动同步回 Science。副本保存到实际安装目录的 Exports，卸载不删除这些文件。
支持 localhost/127.0.0.1 的 8990、8765、8000 端口；需要通过 Edge 使用 Science。

更新：再次运行 Install-or-Update.cmd，然后在 Edge 扩展页面点击重新加载。
卸载：在 Edge 移除扩展，再运行安装目录下的 Unregister.ps1，仅注销当前用户本地组件；保留导出文件。
自选路径：用 PowerShell 运行 `./Install.ps1 -InstallRoot "D:\Tools\Science-Companion"`。已有另一位置的注册不会被强行覆盖。

这个文件夹不含账号、API key、SSH 私钥或研究数据。浏览器扩展的加载由用户自行完成。
