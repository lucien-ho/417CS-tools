# 417CS-tools

实验室工具与规范分享。

## 内容

| 目录 | 说明 |
|---|---|
| `lab-project-layout/` | 课题组文件生成规范 skill（Claude/Devin 等 AI 助手用）：`/ceph/<用户名>/project/` 目录结构、`NN.分类`、`xxx.list + xxx.log` 命令留痕、`_vN` 版本归档、本地 md 报告与图表规范 |
| `Science-Companion/` | Claude Science 中文界面 + 外部打开插件（Edge 扩展 + 本地组件，v1.2.2）。支持直接定位实际磁盘文件，安装见其中 `README.md` |
| `CSSwitch-Windows-Share-20261013/` | CSSwitch Windows 2026-10-20 依赖修复版（安装器 0.8.4.1020）：内置 Git Bash、启动前依赖检查和 Science-Companion 1.2.2，保留窗口关闭/WebView2 释放修复 |

## Science-Companion 最新安装包

[下载 Science-Companion 1.2.2](downloads/Science-Companion-1.2.2.zip?raw=true) · [SHA256 校验](downloads/Science-Companion-1.2.2-SHA256.txt) · [安装与使用说明](Science-Companion/README.md)

2026-10-18 同步：修复对话文件卡片、正文文件链接和图片右键菜单的目标识别；补齐 PDF 等成果预览中的默认应用打开、选择其他应用和资源管理器定位；补充 Windows 沙箱设置提示的中文。

本机文件直接使用 Science 提供的实际存储路径，按选中版本定位，不下载副本。完整解压后运行 `Install-or-Update.cmd`，再到 `edge://extensions` 重新加载扩展并刷新 Science 网页；首次使用按安装说明加载 `extension` 子目录。此次未修改 Claude Science 程序。

验证包括隔离 Edge 中的实际菜单组件、31 次文件打开请求及 0 次下载，以及 20 类界面中文回归；系统打开调用用记录替代，未代表在所有用户电脑或实际外部应用中验收。详细范围见插件说明和 `evidence/`。

下方 CSSwitch 安装器已内附 Science-Companion 1.2.2。浏览器扩展仍需自行运行其安装脚本，并在 Edge 中加载或重新加载。

## CSSwitch 最新安装包

[下载 2026-10-20 修复版（约 97 MB）](CSSwitch-Windows-Share-20261013/CSSwitch-0.8.4-Windows-x64-20261013-Setup.exe?raw=true) · [SHA256 校验](CSSwitch-Windows-Share-20261013/SHA256SUMS.txt) · [升级说明](CSSwitch-Windows-Share-20261013/先看这里.txt) · [修复说明](CSSwitch-Windows-Share-20261013/修复说明.md)

下载地址保留原文件名，内容已更新。覆盖安装前请在 CSSwitch 内选择完整退出；仅关闭设置窗口会继续保留后台。

本版补齐之前分享包遗漏的 Git Bash 和必需工具，目标电脑无需预先安装 Git；启动前检查依赖，不修改系统 PATH。保留 2026-10-17 的 desktop、gateway 和脚本，未修改 Claude Science。18 项隔离检查通过，包括旧版升级、缺失依赖、启动参数、端口护栏及卸载保留用户文件；尚未在另一台电脑验证完整 Science/模型服务启动。
