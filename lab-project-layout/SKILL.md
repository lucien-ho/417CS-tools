---
name: lab-project-layout
description: 课题组服务器 (/ceph/<用户名>) 与本地 OneDrive/Project(windows 在E盘) 镜像的文件生成硬规范。在创建、命名、写入、移动、归档任何文件或文件夹之前必须加载并严格遵守 —— 无论是服务器上的 /ceph/<用户名>/project/项目名 还是本地 OneDrive/Project/项目名。覆盖 NN.分类 项目结构、软件安装路径 (opt/biosoft, opt/sysoft)、xxx.list + xxx.log 命令留痕、AI_code 存放位置、_v1 版本归档、每个分析的 md 报告、统一配色模板。Lab file and directory conventions for the /ceph HPC and the local project mirror; load before writing any file. Triggers 建目录, 放哪里, 目录规范, 项目结构, 文件命名, 归档, 重跑, call_snp_v1, AI_code, xxx.list, 命令留痕, 分析报告, md 报告, 配色模板, project layout, where to put outputs, file naming, rerun archiving.
---
# 课题组文件生成规范 (lab-project-layout)

## 本集群连接规则（用户指定，2026-10-07）

连接服务器前先读取 [SSH 双入口规则](references/ssh-routing.md)。必须优先 node12–node20 的内网别名，内网不可达时改用同一节点的 -alt 外网别名；外网跳板为 ssh.417lab.top:52922。node11 / node11-alt 仅作为 ProxyJump 跳板：禁止直接登录或打开交互终端、禁止创建 ssh:node11 / ssh:node11-alt 计算环境，禁止在 node11 上执行任务或操作项目文件。SSH 转发必需的后台认证和转发可以进行；会话终点必须是 node12–node20。

本 skill 只有一个作用：**约束文件写在哪里、叫什么名字、附带什么留痕**。
它不决定用什么方法做分析，但**任何落盘动作都必须先过这里的规则**。

> 最高原则：**一个不懂 AI 的人打开目录，5 秒内就能看懂这是什么分析、命令是什么、结果在哪、结论是什么。**
> 达不到这一点的目录结构，就是错的，必须改，不能留。

---

## 0. 铁律 (违反即返工)

1. **绝不写入 `/home/<用户名>`**。服务器根目录是 `/ceph/<用户名>`。
   `/home/<用户名>/project/...` 与 `/ceph/<用户名>/project/...` 可能指向同一处，**但一律只写 `/ceph/` 形式的绝对路径**（`/home` 分区小、且存在被截断的 0 字节文件与符号链接）。
2. **严禁孤立零散的文件或文件夹**。任何文件都必须落在一个语义明确的分析目录里；任何目录都必须有归属的 `NN.分类`。宁可先建正确的目录，也不许"先扔在这里"。
3. **严禁在项目根目录堆 AI 运行时垃圾**。禁止出现 `artifacts/`、`runtime/`、`staging/`、`workspaces/`、`tool-results/`、`compaction-history/`、`skills/`、`web/`、`*.db`、`preferences.json`、`install-id` 这类东西（`/ceph/<用户名>/project/t2t` 已被这样污染，是反面教材，不要模仿，也不要再增加）。
4. **AI 生成/AI 自用的一切中间文件，只能放在最小分析目录下的 `AI_code/`**。摆在外面的每一个文件都必须是人类直接要看的。
5. **每次运行都要留 `xxx.list`（完整命令）+ `xxx.log`（日志）**，见 §4。看不到命令的分析等于没做。
6. **每个分析都必须在本地对应项目文件夹写一份 md**，见 §7。简短、可复现，不许长篇大论。
7. **不带后缀的名字永远是最新版**；旧版加 `_v1`、`_v2`，见 §6。
8. 图表**必须**是 Arial、宽 90 mm、字号 ≥7 pt、**图内不许有标题**，配色只能用项目根目录的 `project_colour_template.md`，见 §8。
9. **生信软件的参数必须先弹确认框给用户逐条确认**，确认后才能投递；只有“影响很小的工具 + 全默认参数”免确认，见 §5。

---

## 1. 服务器路径地图

| 用途 | 路径 | 权限 |
|---|---|---|
| 个人根目录 | `/ceph/<用户名>` | 读写，**所有产出都在这里** |
| 家目录 | `/home/<用户名>` | **不要写** |
| 生信软件 | `/ceph/<用户名>/opt/biosoft/` | 读写，**新装生信软件放这里** |
| 通用/系统类软件 | `/ceph/<用户名>/opt/sysoft/` | 读写，**新装其他软件放这里**（含 `miniconda3/envs/`、`Python-3.9/`） |
| 公共生信软件 | `/opt/biosoft/` | **只读，只能用，不能装、不能改** |
| 自写脚本/包装器 | `/ceph/<用户名>/bin/`（如 `sge_parafly`） | 读写 |
| 项目 | `/ceph/<用户名>/project/<项目名>/` | 读写 |

- 装新软件：**只允许**装到 `/ceph/<用户名>/opt/biosoft/`（生信）或 `/ceph/<用户名>/opt/sysoft/`（其他）。不许装进项目目录、不许装进家目录、不许往 `/opt/biosoft` 写。
- conda 环境：`/ceph/<用户名>/opt/sysoft/miniconda3/envs/<env>`。
- Python：默认 `python` 是 Python 2 且无 matplotlib，脚本里写全路径 `/ceph/<用户名>/opt/sysoft/Python-3.9/bin/python3`。

---

## 2. 项目目录结构

```
/ceph/<用户名>/project/<项目名>/          # 项目名：小写英文/拼音，如 t2t, pangenome, qiushu
├── project_colour_template.md            # 全项目统一配色（唯一允许的根级说明文件之一）
├── 01.assemble/                          # NN.大分类，两位数字 + "." + 英文小写名
├── 02.annotation/
├── 03.centromere/
│   ├── TRASH2/                           # 具体分析：软件名 或 分析内容名
│   ├── hicat/
│   ├── satellite_turnover_vs_CENH3/      # 内容名（软件不足以说明意图时用）
│   └── pipeline/                         # 本分类通用脚本（.pl/.sh/.R/.py）
├── 05.TE/
└── data/  ref/  script/                  # 仅当全项目共享时才允许的根级目录
```

**规则**

1. **除极特殊情况，所有东西都要进某个 `NN.分类`**。根目录只允许：`NN.分类/`、`project_colour_template.md`、以及确实全项目共享的 `data/`、`ref/`、`script/`。别的一律不许出现在根目录。
2. `NN.` 编号按**人类思维的分析顺序**排（数据 → 组装 → 注释 → 各专题 → 比较 → 群体 …），不是按时间。新增专题接着最大编号往后排；插不进去就用 `011.` 这种（pangenome 里已有先例），不要重排已有编号。
3. 分类下一层是**具体分析**，命名二选一，谁更好懂用谁：
   - **软件名**：`gatk`、`sniffles`、`minimap2`、`syri`、`orthofinder`、`TRASH2`
   - **分析内容名**：`switch_err`、`hotregion`、`inserttime`、`satellite_turnover_vs_CENH3`
4. **体现继承关系**：下游分析要么放在上游分析目录内部（如 `call_snp/gatk`、`LTR/inserttime`），要么与上游同级并在 md 里写明"输入来自 …"。不许出现看不出来源的分析目录。
5. 同一分析要分样本/染色体展开时，**下一层用样本名或染色体名**（`sniffles/CY`、`sniffles/AJ`），不要把样本名拼进目录名。
6. 目录名不用空格、不用中文、不用日期戳（日期写在 md 里）。

---

## 3. 最小分析目录里放什么

以 `.../05.SV/sniffles/` 为例，一个分析目录里应当有且只有这些类型：

```
05.SV/
├── sniffles.list             # 本步骤的全部命令（一行一条，绝对路径）
├── sniffles.log              # 运行日志
├── sniffles.list.completed   # 运行器自动生成，不要删
├── sniffles.list.tmp/        # 运行器自动生成，不要删
├── pipeline/sniffles.pl      # 被 list 调用的脚本
└── sniffles/                 # 结果，按样本展开
    ├── CY/CY.sniffles.vcf
    └── AJ/AJ.sniffles.vcf
```

再加上（如果该步产生了它们）：

- `AI_code/` —— AI 写的脚本、AI 读的中间表、AI 的临时产物**全部**在这里（见 §4）。
- `figure/` 或 `fig/` —— 出图。图必须能在本地 md 里被引用。
- `old/` —— 明确废弃但暂时不删的东西（不是版本归档，版本归档看 §6）。

**结果文件命名**：`<样本或对象>.<步骤/软件>.<内容>.<后缀>`，例如 `CY.ngmlr.sort.bam`、`MB-T2T.pri.fa_repeats.gff`。同一批文件前缀必须一致，方便通配。

---

## 4. 命令留痕：`xxx.list` + `xxx.log`（强制）

**每一个实际跑过的步骤，都必须在该分析目录留下一个可直接重放的命令清单。**

- 清单文件：`<步骤名>.list`，一行一条完整命令，**用绝对路径**，不依赖临时 shell 变量。
- 日志文件：`<步骤名>.log`。
- 运行器（二选一，会自动生成 `.list.completed` 和 `.list.tmp/`，**都不要删**）：

```bash
cd /ceph/<用户名>/project/<项目>/NN.分类/          # 在 list 所在目录运行
# SGE 集群并行（首选）
nohup /ceph/<用户名>/bin/sge_parafly --queue all.q \
      --hosts node12,node13,node14,node15,node16,node17,node18,node19,node20 \
      --CPU 20 --name_prefix <短标签> <步骤名>.list > <步骤名>.log 2>&1 &
# 单机并行
nohup ParaFly -c <步骤名>.list -CPU 8 > <步骤名>.log 2>&1 &
```

- 命令太长/太复杂时，把逻辑写成 `pipeline/<步骤名>.pl|sh|R|py`，`.list` 里每行调用它并带上参数（pangenome 全项目都是这么做的，照抄这个风格）。
- **哪怕只有一条命令，也要写成 `.list` 并留 `.log`。** 不允许"我在终端敲了一下"这种无痕操作。
- 中途失败：修好后重新用同一条 `sge_parafly` 命令续跑（`.list.completed` 会跳过已完成的）；不要另起一个名字。

**可用节点（2026-09-12 实测 `qstat -f`）**：`all.q` 里真正可投的是 **node12–node20，共 9 个节点，每节点 144 slots**。
`node11` 只有 1 slot（别往上投），`node1`/`node2` 处于 `au`（alarm+unreachable）状态、不可用，`node3`–`node10` 不在 `all.q` 里。
投递前用这几个现成脚本确认，不要照抄历史命令里的节点名：

```bash
/opt/sysoft/sge/bin/lx-amd64/qstat -f | grep 'all\.q@'   # 全部队列实例与状态（au 的跳过）
/opt/sysoft/sge/bin/idle-nodes                            # 空闲节点
/opt/sysoft/sge/bin/busy-nodes                            # 繁忙节点
/opt/sysoft/sge/bin/dead-nodes                            # 掉线节点
```

---

## 5. 生信软件参数确认（运行前强制弹确认框）

**任何生信软件，在写进 `.list` 并投递之前，必须先用 `ask_user` 把完整命令和全部参数弹给用户确认，逐个说明参数意义，用户点头之后才能跑。**

确认框里必须给出：

1. 软件名 + 版本 + 可执行文件绝对路径（`/ceph/<用户名>/opt/biosoft/...` 或 `/opt/biosoft/...` 或 conda env）
2. 一条代表性的完整命令（绝对路径，就是将要写进 `.list` 的那条）
3. 参数说明表，一个参数一行：

   | 参数 | 取值 | 一句话意义 | 是否默认 | 对结论的影响 |
   |---|---|---|---|---|
   | `--min-support` | 5 | 支持一个 SV 所需的最少 reads | 非默认（默认 3） | 提高 → 假阳降低、低频 SV 漏检 |

4. 预计资源与时长（节点数 / CPU / 内存 / 大致跑多久）
5. 选项至少给三个：**按此参数运行** / **改用某个替代取值**（把你认为合理的备选值写出来） / **全部用默认**

**唯一的免确认例外：影响很小的工具 + 完全使用默认参数。**
例如 `samtools index|faidx|sort`、`bgzip`、`tabix`、`gzip`、`md5sum`、`seqkit stats`、`bedtools getfasta` 这类格式转换 / 建索引 / 计数统计。

只要命中下面任意一条，**一律必须弹框**，不算例外：

- 改动了任何一个默认参数（哪怕只是线程数以外的一个小开关）
- 产出的是下游要用的主结果：变异检测、组装、注释、比对、聚类、建树、统计检验、富集
- 带过滤 / 阈值 / 显著性 / 模型选择类参数（`--min*`、`--max*`、`-q`、`-p`、`--evalue`、`-k` …）
- 带随机性（`--seed`）或迭代次数（`-B`、`--bootstrap`、`--iter`）
- 单次运行预计超过约 30 min，或内存超过约 100 GB，或要占用 3 个以上节点

其余要求：

- 小样本试跑同样要先确认，只需在确认框里注明这是 N 个样本的试跑。**禁止“先跑一下看看再问”。**
- 确认结果要落到两处：`.list`（真实命令）与本地 md 的“软件与版本 / 命令”两节，非默认参数必须写明**为什么这么设**。
- 用户说过“这个软件以后都按这套参数跑”时可以复用，但确认框里要注明“沿用 YYYY-MM-DD 已确认的参数”并把参数表重列一遍，**不许静默套用**。
- 参数改了就是新一次运行：按 §6 归档旧版为 `_vN`，不要在原目录里覆盖。

---

## 6. 重跑与版本归档 `_vN`

**不带后缀的名字永远指向最新版本。** 重跑时把旧的改名，新的占用原名。

- 整个分析重做：`call_snp` → 改名 `call_snp_v1`，新结果仍叫 `call_snp`。
- 只重跑其中一步：**只动那一层**。`call_snp/gatk` → `call_snp/gatk_v1`，新的仍是 `call_snp/gatk`；`call_snp` 本身不动。
- 再重做一次：现存的 `X` → `X_v2`（`_vN` 里 N 最大的是最近一次归档的旧版，`_v1` 最老）。
- 归档只改名，**不许删除**旧版；也不许用 `call_snp_new`、`call_snp_final`、`call_snp_20260903` 这类命名。
- 本地 md 同步归档：`gatk.md` → `gatk_v1.md`，并在新的 `gatk.md` 里用一行写明"替代 gatk_v1，原因：…"。

---

## 7. 本地 md 报告（强制，人类可读性的主入口）

**服务器跑的每一个分析，都要在本地对应项目文件夹里有一份 md。**

### 路径映射

```
/ceph/<用户名>/project/qiushu/08.landscape/          →  OneDrive/Project/楸树/08.landscape/
/ceph/<用户名>/project/t2t/03.centromere/            →  OneDrive/Project/T2T/03.centromere/
```

- 本地根（两套都保留，根据当前宿主系统选择）：
  - Windows：`E:\OneDrive\Project\`
  - macOS：`/Users/<用户名>/Library/CloudStorage/OneDrive-个人/Project/`
  - 服务器：`/ceph/<用户名>/project/`，不随本地系统改变。
- 先确认实际宿主系统、已授权路径和已有项目目录，再选择该系统的本地根。不要在 Windows 新建 `/Users/...`，不要在 Mac 新建 `E:\...`；不能因另一平台路径不存在而删除其配置，也不要把远程 Linux 内核误判为本地宿主系统。
- 两套本地根映射到同一逻辑项目（如 `qiushu` → `楸树`、`t2t` → `T2T`），不代表两台电脑已自动同步；跨电脑继续工作前核实文件版本和 OneDrive 同步状态。
- 本地目录按项目授权，原始输入尽量只读，分析输出读写；不为解决单个项目问题扩大到整个 OneDrive。
- 项目名：服务器是小写英文/拼音，本地用中文或惯用名（`qiushu`→`楸树`、`t2t`→`T2T`）。
  **先看本地已存在哪个文件夹再决定，不许另建一个平行命名的新文件夹**；本地确实还没有、也无法确定叫什么时，问用户。
- `NN.分类` 文件夹名与服务器**逐字一致**（服务器写错拼写时以服务器为准，别在本地"纠正"成另一个名字）。
- 落盘前用 `list_host_grants` 确认本地路径已授权；没授权就 `request_host_access`，不要绕。

### 文件组织

```
OneDrive/Project/楸树/08.landscape/
├── 08.landscape.md          # 分类总览：本分类做了哪些分析、各自结论一句话、目前用哪一版
├── gwas.md                  # 一个分析一个 md，文件名 = 服务器上的分析目录名
├── gwas.fig1.manhattan.png  # 图与引用它的 md 同目录、同前缀
└── call_snp/                # 分析内部还有下一层分析时，本地建同名文件夹
    ├── call_snp.md
    ├── gatk.md
    └── gatk_v1.md           # 归档版
```

### md 模板

见 `templates/analysis_md_template.md`（照它写，别自由发挥）。要点：
**目的 → 输入 → 软件与版本 → 命令(指向 `.list`) → 输出 → 关键结果 → 结论/下一步**，
控制在 1 屏到 1.5 屏之内。要求是"人类能照着复现"，不是"把日志抄一遍"。
不要贴大段代码、不要贴完整参数手册、不要写心得体会。

---

## 8. 图表规范（字体 / 尺寸 / 配色）

**所有出图一律遵守下面 4 条硬指标，没有例外条款可谈。**

| 项目 | 要求 |
|---|---|
| 字体 | **Arial**（全图统一：坐标轴、刻度、图例、注释、公式文本） |
| 宽度 | **90 mm**（= 3.543 in，单栏图宽），**固定不变** |
| 高度 | 不限，按内容需要给，但要收紧留白，不要为了"好看"拉高 |
| 字号 | **≥7 pt**；确实排不下时**最小 5 pt**，且只允许用在次要标注（刻度小标签、误差说明），主轴标签与图例不得低于 7 pt |
| 图内标题 | **禁止**。图里不要 title、不要 suptitle、不要"Figure 1 …"字样。标题写在本地 md 的图注里 |

补充：

- 面板编号（a/b/c）不算标题，允许放在面板左上角，用 Arial 加粗、8 pt。
- 多面板拼图整体宽度仍是 90 mm（不是每个面板 90 mm）。确实需要双栏时先问用户，不要自己改成 180 mm。
- 服务器/本地没有 Arial 时，按 `Arial → Helvetica → Liberation Sans → Nimbus Sans` 顺序退化，并在 md 备注里写明实际用了哪个；不允许静默退回 DejaVu Sans（默认字体一眼就能看出来）。
- 导出 PDF/SVG 时保证文字可编辑（矢量文字而非描边），见下面 rcParams。

### matplotlib

```python
import matplotlib as mpl
import matplotlib.pyplot as plt

MM = 1 / 25.4
mpl.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "Liberation Sans", "Nimbus Sans"],
    "pdf.fonttype": 42, "ps.fonttype": 42,   # 文字保持可编辑
    "font.size": 7, "axes.labelsize": 7, "axes.titlesize": 7,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7,
    "axes.linewidth": 0.5, "xtick.major.width": 0.5, "ytick.major.width": 0.5,
})

fig, ax = plt.subplots(figsize=(90 * MM, 60 * MM))   # 宽固定 90 mm，高按需
# ax.set_title(...)  ← 禁止
fig.tight_layout(pad=0.2)
fig.savefig("xxx.fig1.<描述>.pdf")   # 同时存一份 .png (dpi=600) 供 md 引用
```

### ggplot2 / R

```r
library(ggplot2)
theme_lab <- theme_bw(base_size = 7, base_family = "Arial") +
  theme(plot.title = element_blank(),          # 禁止图内标题
        legend.title = element_text(size = 7),
        axis.text = element_text(size = 7),
        panel.grid.minor = element_blank())
ggsave("xxx.fig1.<描述>.pdf", plot = p + theme_lab,
       width = 90, height = 60, units = "mm", device = cairo_pdf)
```

### 配色

- 每个大项目根目录有唯一的 `project_colour_template.md`（如 `/ceph/<用户名>/project/t2t/project_colour_template.md`，内含 `palette16`、`palette30`、`other_unknown` 及要素配色映射）。
- 该项目的**所有**图都从这个文件取色，**不许**临时自己挑色、不许用 matplotlib/ggplot 默认色板。
- 颜色不够时按模板里的说明从 `palette30` 插值扩展，保持同样的低饱和风格。
- 项目根目录还没有这个文件时：先问用户要配色，再建到项目根目录，然后才出图。

---

## 9. 落盘前检查清单

写第一个文件之前，先把这几项答清楚（答不出就问用户，不要猜一个路径先写）：

1. 哪个项目？服务器路径 `/ceph/<用户名>/project/<项目>` 和本地 `OneDrive/Project/<项目>` 分别是什么？
2. 属于哪个 `NN.分类`？（已有的哪个？确实没有 → 该不该新建、编号多少）
3. 分析目录叫什么？用软件名还是内容名？上游输入是哪个目录（继承关系写清楚）？
4. 是新分析还是重跑？重跑要归档哪一层为 `_vN`？
5. 命令写进哪个 `.list`、日志写哪个 `.log`、脚本放哪个 `pipeline/`？
6. **参数是否已弹确认框并获用户确认？**（或确实属于“轻量工具 + 全默认”免确认情形）
7. AI 自用文件是否全部进 `AI_code/`？
8. 本地 md 写到哪个路径、分类总览 md 要不要同步更新？
9. 出图 → 是否 Arial + 宽 90 mm + 字号 ≥7 pt + 图内无标题 + 配色取自 `project_colour_template.md`？

## 10. 收尾自检（每次任务结束前逐条确认）

- [ ] 服务器上没有新增孤立文件/目录，没有在项目根堆运行时垃圾
- [ ] 每个新步骤都有 `.list` + `.log`，命令是绝对路径、可直接重放
- [ ] 每个生信软件的参数都经用户确认（或属免确认情形），非默认参数已在 md 里写明原因
- [ ] AI 中间产物全在 `AI_code/`，外面每个文件人类都要看
- [ ] 重跑的旧版已按 `_vN` 归档（改名而非删除）
- [ ] 本地 md 已写/已更新，路径与服务器镜像一致，分类总览已同步
- [ ] 图：Arial、宽 90 mm、字号 ≥7 pt（特殊小标注不低于 5 pt）、**图内无标题**、配色来自项目模板
- [ ] 用一句话说出"人类第一次打开这个目录会看到什么"，说不顺就回去改结构

---

## 参考

- `templates/analysis_md_template.md` —— 本地 md 模板。

[LAB_RESEARCH_WORKFLOW_V1_BEGIN]
开始生信分析、作图、论文或审稿回复前，读取 [科研证据规范](references/research-workflow.md)。SGE 与双入口规则详见 [SSH 双入口规则](references/ssh-routing.md)。
[LAB_RESEARCH_WORKFLOW_V1_END]