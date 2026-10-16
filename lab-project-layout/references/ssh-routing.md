# Ceph 集群的内外网连接规则

用户指定（2026-10-07）：node12 至 node20 都可以使用。node11 / node11-alt 只作 ProxyJump 跳板，禁止直接登录或打开交互终端，禁止创建它们的计算环境、运行任务或操作项目文件。仅允许跳转必需的后台 SSH 认证和连接转发；会话终点只能是 node12–node20。

- 内网优先：node11 使用 172.25.11.60:22；计算环境使用 ssh:node12 至 ssh:node20。
- 外网备用：node11-alt 使用 ssh.417lab.top:52922；计算环境使用 ssh:node12-alt 至 ssh:node20-alt。
- 同一个节点的普通别名和 -alt 别名代表同一台计算节点，两条跳板路径互为替代，不能串成多级跳转。
- 先尝试内网。若连接超时、内网跳板不可达或连接中断，改用对应的外网别名；外网成功后本次操作沿用该路径。新的独立会话重新优先检测内网。
- 连接到计算节点后先运行 hostname 和 id，确认目标节点和登录用户名（<用户名>），再执行其他操作。从 node12–node20 按任务需要选择节点，不固定某一节点。
- 网络、配置或主机密钥问题不属于密码错误；不要重复索要密码，也不要关闭主机密钥检查。
- Claude Science 的 SSH 配置位于对应 HOME 下的 .ssh/config。当前 Windows 实例保存于 G 盘；从本机终端连接时必须显式传入对应的 -F 配置路径。
- Science 使用 host.compute.create("ssh:node20") 选择内网，内网不可达时改用 host.compute.create("ssh:node20-alt")。OpenSSH 的 ProxyJump 本身不自动切换别名，代理必须遵守上述回退顺序。
- 大文件、工作目录和计算 scratch 使用 /ceph/<用户名> 下的位置，避免向节点本地 /home 写大文件。

[LAB_SGE_V1_BEGIN]
## Science 远程执行与 SGE（2026-10-13）

- 本集群使用 SGE，按现有 `/ceph/<用户名>/bin/sge_parafly`、`all.q` 流程提交，限定 node12–node20，并在提交前核实当前队列状态与可用资源。历史 slots 数不能当成当前空闲配额。
- Science 的 SSH 入口不等于已获得计算资源。不要因未发现 Slurm/sbatch 就把重型分析作为普通后台进程直接运行，也不要改写为 Slurm 命令。
- 批处理资源必须写清 CPU、内存、预计时长和任务数量；连接并发上限不是 SGE 作业或 CPU 配额。单机 ParaFly 仅用于已获分配且允许直接运行的资源。
- SSH/Science 连接超时不等于 SGE 作业失败。先检查作业编号、队列和日志，再决定续跑；不得因 UI 重试而重复提交。
- 连接或提交从 node12–node20 的获准入口进行；node11/node11-alt 只转发，不作为执行环境或项目文件操作端点。
[LAB_SGE_V1_END]