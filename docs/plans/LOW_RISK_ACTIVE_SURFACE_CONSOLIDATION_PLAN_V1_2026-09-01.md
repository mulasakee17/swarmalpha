# SwarmAlpha 活动面低风险收敛计划 V1

日期：2026-09-01
状态：**CLOSED AFTER G1a / A–D, E0–E1, G1a EXECUTED / STAGE F AND G1b+ DEFERRED**
执行对象：低性能模型在明确边界内执行；高风险阶段必须由项目所有者或强模型复核后另行授权。

## 0. 计划目的

本计划只解决仓库活动面过宽、历史 V6 阶段与当前主线混杂、默认搜索和命令入口认知负担过高的问题。它不改变研究问题、测量定义、实验结果或证据解释。

当前主线在本计划中指：discussion thermometer / natural-dynamics observation 路径及其直接依赖。当前即时科学权限仍是 monitoring-only。

### 0.1 目标

1. 先恢复可信工程基线，再进行任何整理。
2. 把“当前实验”“共享稳定依赖”“冻结回放”“历史只读”“产品原型”明确分开。
3. 缩小默认阅读、搜索和命令发现面，但保留全部历史证据及回放能力。
4. 阻止当前代码继续无意依赖已声明冻结的执行路径。
5. 让低性能模型能在较小上下文中完成机械工作，并在需要研究判断时停止。

### 0.2 非目标

- 不拆分仓库。
- 不删除任何源码、文档、测试或结果。
- 不重写 Git 历史，不执行 `git reset --hard`、`git clean`、批量 checkout 或 stash。
- 不改写已有实验结果，不合并不完整运行，不补造缺失 terminal。
- 不执行任何 provider 调用，不读取或修改密钥。
- 不借整理工作改变科学 claim ceiling。
- 不把旧 V6 测试失败解释为测试应被删除。
- 不在第一轮移动 V6 文件或大规模重命名 npm scripts。

## 1. 已核实基线

以下为当前工作树的事实快照；执行者必须在开始时重新核实，发现不一致即停止并报告。

### 1.1 仓库体量

| 区域 | 已跟踪文件 | 近似文本行数 | 当前判断 |
|---|---:|---:|---|
| 全仓库 | 1731 | 770028 | 含数据与 JSON，不能等同于源码复杂度 |
| `legacy/experiments/v2/` + `legacy/experiments/lunar_survival/` | 587 | 275666 | `LEGACY_READ_ONLY`，体量大但近期无活动 |
| `src/lib/{epistemic,governance,experimentation}/` | 61 | 17499 | 当前共享 kernel |
| 已跟踪 `experiments/campaign/v6/` | 169 | 54013 | 同时容纳多代实验，活动面过宽 |
| `experiments/campaign/measurement/` | 9 | 3639 | 当前、较小 |
| `docs/` 非 archive | 108 | 15644 | 当前文档较多 |
| `legacy/docs/archive/` | 147 | 29252 | 已归档但仍在 checkout |
| `test/` | 152 | 38666 | 含当前、共享和少量旧路径测试 |

### 1.2 当前未提交状态

执行前已观察到：

- 5 个已跟踪文件有修改；
- 21 个 natural-dynamics V6 源文件未跟踪，约 2798 行；
- 7 个直接测试未跟踪；
- 多个 natural-dynamics、transport、literature-canary 结果目录未跟踪；
- 这些修改和未跟踪文件均视为项目所有者已有工作，禁止覆盖、删除或擅自归档。

### 1.3 冻结程度

**FACT**：`legacy/experiments/v2/`、`legacy/experiments/lunar_survival/` 和 `legacy/src/runtime/` 有局部 `AGENTS.md` 边界；2026-08-24 以来未观察到 legacy 路径提交；当前 V6/measurement 未直接引用 v2 或 lunar 路径。

**FACT**：当前 natural-dynamics 源码直接依赖多个较早 V6 模块，包括 `collectiveDynamicsV1`、`collectiveDynamicsPromptSensitivityCanaryV1`、`discussionThermometerL4PreflightV1`、state-space runner、`productionVerticalSlice` 和 `providerAdapters`。

**INFERENCE**：v2/lunar 已接近功能性软冻结；V6 内部历代阶段未真实冻结，因为当前路径仍复用其模块和共享执行层。

### 1.4 当前工程阻断

第一轮执行前记录为 2033 pass、20 fail、12 skip。第一轮已将
`providerAdapters.ts` 中 categorical choice-message 指令改为仅在对应
response contract 分支求值。修复后 targeted 失败簇 91/91 通过；全量为
152 个测试文件通过、6 个跳过，2053 个测试通过、12 个跳过；TypeScript
和 build 通过。该结果支持单点回归解释和当前工程基线恢复，不构成任何
新增科学证据。

## 2. 权威分类目标

整理后使用以下五类。分类描述的是工程权限，不赋予科学有效性。

### 2.1 `ACTIVE_EXPERIMENT`

当前自然动力学观测主线：

- natural-dynamics plan、manifest、task bank、runner、analyzer、evaluator、preflight；
- 当前 literature canary 的 plan/preflight/runner/evaluator，但在完成执行前仅为 implemented/preflight，不是结果；
- 当前 transport retirement 记录；正式 transport runner 不获得执行权限；
- 直接测试。

### 2.2 `SHARED_STABLE`

当前主线会实际导入的共享依赖，例如：

- epistemic kernel；
- `productionVerticalSlice.ts`；
- `providerAdapters.ts`；
- provider diagnostics / single-attempt invoker；
- HiddenBench task adapter；
- 当前仍被 natural-dynamics 导入的 state-space、L4 preflight 或 collective-dynamics 类型与执行辅助。

规则：只要 ACTIVE 仍导入某模块，该模块就不能标成 frozen。修改 `SHARED_STABLE` 必须运行共享回归测试。

### 2.3 `FROZEN_REPLAY`

已完成、失败、否决或退役，但仍需要复现历史 artifact 的 V6 实验：fork、verdict、source-disclosure、mechanism、M1/M2/D1/L4 等。

规则：

- 默认只读；
- 允许 analyzer/replay 验证；
- 禁止新增 provider 运行来强化旧故事；
- 不得作为当前自然动力学的新证据；
- 如果仍被 ACTIVE 导入，则先归入 `SHARED_STABLE`，不能移动。

### 2.4 `LEGACY_READ_ONLY`

- `legacy/experiments/v2/`；
- `legacy/experiments/lunar_survival/`；
- E12 历史脚本；
-旧 discussion/runtime/thermodynamic execution 路径。

维持现状，不纳入第一轮修改。

### 2.5 `DEMO_OR_PRODUCT_PROTOTYPE`

- `src/app/`；
- `legacy/src/runtime/`；
- demo adapters。

它们不属于当前论文证据链。第一轮只在导航文档中保持明确，不移动。

## 3. 总体执行规则

低性能模型每次只执行一个阶段。完成阶段后必须报告：

1. 修改文件列表；
2. 实际运行的验证命令；
3. pass/fail/skip 数量；
4. 是否发现与本计划不一致的事实；
5. 是否触发停止条件。

不得以“顺手修复”为由扩大范围。任何测试失败都先定位，不得立即修改测试期望。

### 3.1 全局停止条件

出现以下任一情况，立即停止，不继续修改：

- 当前工作树与第 1.2 节相比出现无法归属的新改动；
- 需要删除、覆盖、重写或移动未跟踪结果；
- 修复单点 adapter 回归后仍有无法由该回归解释的失败；
- 需要改变 schema、ClaimContract、SensorContract 或测量定义；
- 需要判断实验结果是否构成 transport、稳定性、治理或正确性证据；
- 需要执行 provider、安装依赖或访问网络；
- 单个整理批次需要修改超过 10 个文件；
- 移动后需要修改实现逻辑，而不只是 import/path；
- 发现 active 文档或 artifact 引用了准备移动的精确路径；
- 发现 Git 中存在 merge/rebase/cherry-pick 未完成状态。

## 4. 第一轮：允许低性能模型执行

第一轮仅包含阶段 A–D。A–D 完成并由强模型复核前，不得进入第 5 节。

## 阶段 A：只读基线复核

### A1. 检查

依次执行：

```powershell
git status --short --untracked-files=all
git branch --show-current
git log -3 --oneline
git diff --check
```

然后核实：

- `docs/ACTIVE_RESEARCH_SURFACE.md` 仍是导航权威；
- `docs/REASONING_PROTOCOL.md` 未被修改；
- 未跟踪 natural-dynamics 文件和结果仍存在；
- 没有 provider 执行进程；
- 不运行任何 `dynamics:*run` 命令，即使其声称支持 `--plan`。

### A2. 允许修改

无。

### A3. 验收

- 输出状态摘要；
- 明确声明未修改文件；
- 若状态与计划不一致，停止。

## 阶段 B：修复 P0 共享适配器回归

这是整理前置修复，必须形成独立小 diff。

### B1. 精确范围

允许修改：

- `experiments/campaign/v6/providerAdapters.ts`
- 仅当现有测试无法表达二元不触发 categorical 校验这一回归时，允许增加一个最小测试到 `test/v6-provider-adapters.test.ts`。

禁止修改：

- Claim/schema 定义；
- binary fixture；
- 其他失败测试的期望；
- provider metadata 当前未提交改动。

### B2. 目标行为

- `belief_json_v1` + binary claim 不构造、不验证 choice-message instruction；
- `choice_message_json_v1` 仅接受 categorical claim，并继续保持 fail-closed；
- 不改变最终 elicitation 路径；
- 不改变 provider metadata 传播。

推荐最小实现：把当前 eager IIFE 改成仅在 `choice_message_json_v1` 分支调用的局部函数，或者在该分支内构造字符串。不要添加新抽象层。

### B3. 验证顺序

先运行：

```powershell
npx vitest run test/v6-provider-adapters.test.ts --no-file-parallelism
```

再运行先前失败簇：

```powershell
npx vitest run test/v6-authority-adversarial.test.ts test/v6-calibration-matrix.test.ts test/v6-calibration.test.ts test/v6-categorical-authority.test.ts test/v6-detection-validation.test.ts test/v6-measurement-development.test.ts test/v6-provider-adapters.test.ts test/v6-smoke-cli.test.ts --no-file-parallelism
```

最后运行：

```powershell
npx tsc --noEmit
npx vitest run --no-file-parallelism
npm run build
```

### B4. 验收

- targeted provider-adapter 测试通过；
- 先前 20 个失败全部消失；
- 完整测试无失败；已有 skip 可以保留，但不得增加；
- build 通过；
- diff 只包含惰性校验和必要回归测试；
- 不提交 commit，等待复核。

若仍有失败，停止并提交失败列表；不要继续阶段 C。

## 阶段 C：收窄规范活动面，不移动文件

### C1. 允许修改

- `docs/ACTIVE_RESEARCH_SURFACE.md`
- 新增 `experiments/campaign/v6/AGENTS.md`

不得修改研究结果文档、计划证据内容或 claim ceiling。

### C2. 修改 `ACTIVE_RESEARCH_SURFACE.md`

只进行导航级修改：

1. 将 `experiments/campaign/v6/` 整体 CURRENT 改为五类精确说明；
2. 明确 natural-dynamics 为 `ACTIVE_EXPERIMENT`；
3. 明确当前被它导入的旧模块属于 `SHARED_STABLE`，不是 frozen；
4. 将已完成/否决的旧 V6 families 标为 `FROZEN_REPLAY`；
5. 保留 v2/lunar/runtime 的既有分类；
6. 将 supported commands 分成：
   - zero-provider current；
   - provider-capable but non-authorizing；
   - frozen replay；
   - legacy；
7. 修正“zero-provider defaults”下列出 `--execute-public` / `--execute-sensor` 的矛盾；
8. 不删除该文档中的科学状态，只消除重复导航叙述；若压缩会改变科学含义，停止而不是自行改写。

### C3. 新增局部 `AGENTS.md`

该文件只表达操作边界，不重复科学叙述。至少包含：

- 修改前必须读根目录 `AGENTS.md` 和 `docs/ACTIVE_RESEARCH_SURFACE.md`；
- ACTIVE / SHARED_STABLE / FROZEN_REPLAY 的定义；
- 任何 provider 执行必须有用户本轮明确授权；
- frozen runner/analyzer 默认只读；
- 不得从 frozen path 向 active path 新增 import；
- 如果 active 已依赖候选 frozen 文件，先报告，不能移动；
- 结果 artifact 不得被重写；
- 当前自然动力学的证据上限不因工程分类改变。

### C4. 验证

```powershell
rg -n "CURRENT|SHARED_STABLE|FROZEN_REPLAY|LEGACY_READ_ONLY|execute-public|execute-sensor" docs/ACTIVE_RESEARCH_SURFACE.md experiments/campaign/v6/AGENTS.md
git diff --check
```

人工检查：

- `--execute-public` 和 `--execute-sensor` 不再出现在 zero-provider 小节；
- 没有把 batch2 升级为 transport 或稳定性证据；
- 没有把 literature canary 写成已完成结果；
- 没有把被 active 导入的模块写成只读 frozen。

### C5. 验收

- 当前开发者无需阅读整个 V6 目录即可知道默认范围；
- 不发生文件移动；
- 不改变代码行为；
- 不修改结果；
- 文档符合 `REASONING_PROTOCOL.md`。

## 阶段 D：降低默认搜索噪声

### D1. 允许修改

- `SwarmAlpha-Current-Research.code-workspace`

### D2. 仅增加 `search.exclude`

建议增加：

```json
"results/**": true,
"experiments/campaign/scratch/**": true,
"experiments/campaign/output/**": true,
"experiments/campaign/pilot_output/**": true
```

如果已有同项则不重复。第一轮不隐藏整个 `experiments/campaign/v6/`，也不隐藏 `SHARED_STABLE` 依赖。

### D3. 验证

- JSON 能正常解析；
- `folders` 配置不变；
- 原有 v2/lunar/docs archive 排除项保留；
- 只影响编辑器搜索，不改变 build/test/runtime。

可使用：

```powershell
Get-Content SwarmAlpha-Current-Research.code-workspace -Raw | ConvertFrom-Json | Out-Null
git diff --check
```

### D4. 第一轮结束门

完成 A–D 后立即停止，交给强模型复核。不要自行进入物理归档、命令重命名或 Git 提交。

第一轮预期最多修改：

- `providerAdapters.ts`；
- 可选的一个 provider-adapter 测试；
- `ACTIVE_RESEARCH_SURFACE.md`；
- `experiments/campaign/v6/AGENTS.md`；
- current-research workspace。

如果修改文件数超过 5，停止并说明原因。

## 5. 第二轮：仅在强模型复核后执行

本节不是低性能模型的默认授权。第一轮通过后，项目所有者应明确指定允许执行哪个批次。

## 阶段 E：生成 V6 文件级分类清单

### E1. 原则

- 清单先于移动；
- 一文件一分类；
- 分类依据必须包含 import、命令、测试、文档和 artifact 引用；
- 文件名包含 `analyze` 或 `run` 不能单独作为冻结依据；
- 未跟踪文件不能进入移动清单。

### E2. 每个候选文件必须核查

1. 静态 import/importer；
2. dynamic `require` / 字符串路径；
3. `package.json` script；
4. test import；
5. active docs 精确路径引用；
6. manifest/result 精确路径引用；
7. 当前未提交 diff 是否重叠；
8. 是否被 natural-dynamics 直接或间接导入。

### E3. 输出方式

优先把文件级表加入本计划的附录或更新 `ACTIVE_RESEARCH_SURFACE.md`，不要新建叙事性状态报告。表中字段：

```text
path | proposed_class | active_importers | tests | commands | artifact_refs | move_allowed | reason
```

### E4. 验收

- 每个 `move_allowed=yes` 文件都有零 active importer；
- 每个 artifact-bound analyzer 保留 replay 路径；
- 所有不确定项标为 `UNKNOWN / KEEP_IN_PLACE`。

## 阶段 F：命令入口分层

### F1. 先分类，不先删除

目标命名空间：

- 当前：`measurement:*`、`verify:replay`、`test:*`、当前 natural-dynamics 的 plan/preflight/mock/analyze/evaluate；
- provider-capable：保留显式 gate，不得位于 zero-provider 文档段；
- 冻结回放：`frozen:*` 或等价明确前缀；
- 历史：保留 `legacy:*`；
- 已退休 provider runner：默认命令应阻断，而不是继续作为普通 `dynamics:*` 暴露。

### F2. 风险控制

- 每批最多改 5 个 script；
- 每次改名前先 `rg` 全仓引用；
- 同批更新直接文档引用；
- 不改底层 runner；
- 不创建通用动态命令分发器；
- 不用兼容层掩盖命令含义。

### F3. 验证

- `package.json` 可解析；
- 所有 current 命令可执行其 zero-provider plan/preflight 路径；
- retired 命令不会启动 provider；
- full test/build 通过。

## 阶段 G：小批次物理隔离

### G1. 第一候选批次

只考虑经 E 阶段确认零 active importer、零 artifact replay 必需引用的 `probe_*` 或明确 scratch 脚本。不得从 fork、mechanism、collective-dynamics 或 thermometer 主体开始。

### G2. 移动规则

- tracked 文件只用 `git mv`；
- 未跟踪文件不移动；
- 每批最多 10 个文件；
- 目标优先使用现有 `experiments/campaign/scratch/`；
- 若文件仍有历史文档引用，保持原位；
- 移动只允许修正路径/import，不允许重构逻辑。

### G3. 每批验证

```powershell
npx tsc --noEmit
npx vitest run --no-file-parallelism
npm run build
git diff --check
```

另外执行全仓旧路径搜索。存在未更新引用则该批次失败，应恢复该批次的移动；禁止通过删除引用解决。

### G4. 暂不移动的区域

- 所有未跟踪 natural-dynamics 文件和结果；
- `productionVerticalSlice.ts`、`providerAdapters.ts`；
- natural-dynamics 当前导入的任何 collective/state-space/L4 文件；
- replay verifier；
- 绑定论文 artifact 的 analyzer；
- v2/lunar/runtime。

## 6. Git 与提交策略

低性能模型默认不执行 `git add` 或 `git commit`。项目所有者授权后，建议按以下顺序形成独立、可逆提交：

1. `fix: make categorical choice instruction lazy`
2. `docs: narrow active V6 authority surface`
3. `chore: reduce current-workspace search noise`
4. 后续每个物理隔离批次单独一个 commit

禁止把以下内容混入同一提交：

- adapter bug 修复与结果 artifact；
- 文档分类与实验结果；
- 多个历史 family 的移动；
- 未完成 literature attempts 与 batch2 正式证据；
- current 代码与 legacy 清理。

每次提交前保存 `git status --short`、验证命令和测试计数。不得 amend 已冻结证据 commit。

## 7. 结果与失败运行处理边界

### 7.1 batch2

保留原始目录和文件字节。它支持的仍是 same-task、post-development observation-resource replication，不得因仓库整理升级解释。

### 7.2 transport

保留 retirement 记录。正式 provider 调用仍为 0；不得把 mock 结果改名为 transport evidence。

### 7.3 literature canary

旧 seed/retry 目录是未完成开发执行，没有完整科学结果。第一轮不得移动、拼接、修补或删除。后续 closeout 需要强模型核对 started/terminal ledger 后另行批准。

## 8. 完成定义

本计划只有在以下条件同时满足时才算完成：

- 完整测试无失败，build 通过；
- CURRENT 不再等同于整个 V6 目录；
- active 模块没有新增对 frozen/legacy 的 import；
- 被 current 导入的旧模块已正确标为 `SHARED_STABLE`；
- zero-provider 命令与 provider-capable 命令在文档中分离；
- workspace 默认搜索排除 results/archive/scratch 噪声；
- 没有删除文件或重写 artifact；
- 每次物理移动都有零引用审计和独立验证；
- 当前科学 claim ceiling 未改变；
- 强模型完成最终 diff 与证据链复核。

## 9. 低性能模型交付模板

每阶段结束按以下格式报告：

```text
阶段：A/B/C/D
状态：PASS / FAIL / STOPPED
修改文件：
- ...

验证：
- command -> result

测试计数：
- files: pass/fail/skip
- tests: pass/fail/skip

发现的不一致：
- 无 / ...

未执行：
- provider 调用
- 文件删除
- 文件移动
- git commit

下一步：等待复核 / 可进入下一阶段
```

执行者不得把“计划步骤已写出”表述为“冻结已完成”。

## 10. 第一轮强模型复核与下一批次计划（2026-09-01）

本节记录第一轮 A–D 的强模型复核，并覆盖第 5 节中“立即执行 Stage E”
的默认顺序。下一批次只允许执行 E0–E1；不得进入命令重命名或物理移动。

### 10.1 复核结论

#### PASS — adapter 修复

`providerAdapters.ts` 的 choice-message instruction 现在只在
`choice_message_json_v1` 分支求值。binary `belief_json_v1` 不再触发
categorical claim 校验；categorical choice-message 仍保持 fail-closed。
已有 provider metadata 传播未被覆盖。targeted、full test、TypeScript 和
build 均通过。

#### PARTIAL PASS — 活动面文档

新增的 `ACTIVE_EXPERIMENT`、`SHARED_STABLE`、`FROZEN_REPLAY` 定义方向
正确，且没有扩大科学 claim ceiling。但尚有三处导航问题：

1. `peer-bundle-*`、`matched-sham-*`、`trajectory-analyze` 和
   `cross-channel-review` 仍列在 `Current zero-provider commands`，与其
   frozen replay 定位不一致；
2. `--freeze-sensor` 没有调用 `gate()`。它是零 provider、会写 artifact、
   有输入验证和 no-overwrite guard 的模式，不应被描述为 execution
   phase-gated；
3. `*NaturalDynamics*` / `*natural_dynamics*` 的宽 glob 同时匹配当前核心、
   literature canary 和 retired transport 文件，不能作为最终文件级权威
   分类。

#### PASS WITH CAVEAT — workspace 搜索降噪

workspace JSON 有效，且只改变编辑器默认搜索。`results/**` 被排除不会
改变 Codex 的 `rg`、测试、build 或 replay；涉及证据审计时，执行者仍必须
显式搜索/读取 `results/`，不能把 workspace 搜索结果当作全仓证据。

### 10.2 已核实的当前静态闭包

对 21 个 natural-dynamics 命名源文件进行相对 import 静态递归，得到
38 个 V6 文件的闭包和 10 个 V6 外本地依赖。该结果是静态 import
inventory，不证明不存在 dynamic path；未列出的 V6 文件默认仍是
`UNKNOWN / KEEP_IN_PLACE`。

#### ACTIVE_EXPERIMENT_CORE roots（9）

```text
analyze_v6_discussion_thermometer_natural_dynamics_v1.ts
analyzeDiscussionThermometerNaturalDynamicsV1.ts
discussionThermometerNaturalDynamicsManifestV1.ts
discussionThermometerNaturalDynamicsPlanV1.ts
evaluate_v6_discussion_thermometer_natural_dynamics_replication_v1.ts
evaluateDiscussionThermometerNaturalDynamicsReplicationV1.ts
run_v6_discussion_thermometer_natural_dynamics_preflight_v1.ts
run_v6_discussion_thermometer_natural_dynamics_v1.ts
runDiscussionThermometerNaturalDynamicsV1.ts
```

直接核心测试：

```text
test/v6-discussion-thermometer-natural-dynamics-plan.test.ts
test/v6-discussion-thermometer-natural-dynamics-preflight.test.ts
test/v6-discussion-thermometer-natural-dynamics-replication-evaluation.test.ts
test/v6-discussion-thermometer-natural-dynamics-run.test.ts
test/v6-discussion-thermometer-natural-dynamics.test.ts
```

#### ACTIVE_PREPARATORY_CANARY roots（6）

这些文件已实现或完成 preflight，但没有完整 scientific result：

```text
discussionThermometerNaturalDynamicsLiteratureCanaryManifestV1.ts
discussionThermometerNaturalDynamicsLiteratureCanaryPlanV1.ts
discussionThermometerNaturalDynamicsLiteratureCanaryTaskBankV1.ts
evaluateDiscussionThermometerNaturalDynamicsLiteratureCanaryV1.ts
run_v6_discussion_thermometer_natural_dynamics_literature_canary_preflight_v1.ts
run_v6_discussion_thermometer_natural_dynamics_literature_canary_v1.ts
```

直接测试：

```text
test/v6-discussion-thermometer-natural-dynamics-literature-canary.test.ts
```

#### RETIRED_TRANSPORT roots（6）

这些实现可用于 mock/preflight/replay，但正式 provider execution 已退休，
provider calls 为 0：

```text
discussionThermometerNaturalDynamicsTransportManifestV1.ts
discussionThermometerNaturalDynamicsTransportPlanV1.ts
discussionThermometerNaturalDynamicsTransportTaskBankV1.ts
evaluateDiscussionThermometerNaturalDynamicsTransportV1.ts
run_v6_discussion_thermometer_natural_dynamics_transport_preflight_v1.ts
run_v6_discussion_thermometer_natural_dynamics_transport_v1.ts
```

直接测试：

```text
test/v6-discussion-thermometer-natural-dynamics-transport.test.ts
```

#### SHARED_STABLE V6 closure（17）

```text
collectiveDynamicsPromptSensitivityCanaryV1.ts
collectiveDynamicsV1.ts
crossEvidenceExchangeSelectorsV1.ts
discussionThermometerL4PreflightV1.ts
discussionThermometerStateSpaceCalibrationPlanV1.ts
discussionThermometerStateSpaceCoveragePlanV1.ts
discussionThermometerStateSpaceTaskBankV1.ts
hiddenBenchTaskAdapter.ts
monitoringDesign.ts
productionVerticalSlice.ts
providerAdapters.ts
providerDiagnostics.ts
runDiscussionThermometerStateSpaceCalibrationV1.ts
taskAdapters.ts
taskBank.ts
v6TaskManifest.ts
zhipuSingleAttemptInvoker.ts
```

#### V6 外本地依赖（10）

```text
experiments/campaign/primaryAssignedRun.ts
experiments/campaign/replayVerifier.ts
experiments/campaign/types.ts
src/lib/epistemic/collectiveState.ts
src/lib/epistemic/index.ts
src/lib/epistemic/types.ts
src/lib/experimentation/finalOutcome.ts
src/lib/experimentation/index.ts
src/lib/governance/index.ts
src/lib/llm/providers.ts
```

### 10.3 下一批次 E0：文档纠偏

#### 允许修改

- `docs/ACTIVE_RESEARCH_SURFACE.md`
- 本计划文件（只记录实际复核结果，不新增叙事报告）

不得修改 `package.json`、代码、测试、结果或 workspace。

#### E0.1 命令分组

将 supported commands 改成四组：

1. current zero-provider：measurement plan/mock、replay、tests、state-space
   audit/preflight/mock、natural-dynamics plan/preflight/mock/analyze/evaluate；
2. frozen replay：peer-bundle freeze/analyze、matched-sham freeze、trajectory
   analyze、cross-channel review；
3. artifact-producing zero-provider：`--freeze-sensor`，明确它不调用
   `gate()`，但验证输入并拒绝覆盖已有 sensor freeze；
4. provider-capable non-authorizing：`--execute-public`、`--execute-sensor`，
   明确其 environment gates 和 provider key 要求。

只移动文档中的命令行，不改 npm script 名称或底层 runner。

#### E0.2 文件级权威描述

删除会混合三种状态的宽 glob 行。使用本节的四组清单描述：

- `ACTIVE_EXPERIMENT_CORE`；
- `ACTIVE_PREPARATORY_CANARY`；
- `RETIRED_TRANSPORT`；
- `SHARED_STABLE`。

所有未列出的 V6 文件统一保持 `UNKNOWN / KEEP_IN_PLACE` 或已审核的
`FROZEN_REPLAY`，不得根据文件名前缀自动移动。

#### E0.3 验收

- current zero-provider 小节不含 frozen replay 命令；
- `--freeze-sensor` 不再被称为调用 execution gate；
- provider-capable 小节只含可以实际调用 provider 的模式；
- literature canary 仍标为无完整 scientific result；
- transport provider authority 仍为 retired；
- `git diff --check` 无内容错误。

### 10.4 下一批次 E1：首批候选只读审计

E1 只生成候选结论，不移动文件。候选仅限以下 7 个 tracked probe：

```text
experiments/campaign/v6/probe_glm_fork_fixed.ts
experiments/campaign/v6/probe_glm_fork_task14.ts
experiments/campaign/v6/probe_glm_fork_timing.ts
experiments/campaign/v6/probe_glm_model.ts
experiments/campaign/v6/probe_glm_round1.ts
experiments/campaign/v6/probe_zhipu_connectivity.ts
experiments/campaign/v6/probe_zhipu_rate_limit.ts
```

对每个文件检查：

1. 是否属于上述 38 文件静态闭包；
2. 全仓静态 importer；
3. dynamic require/path 字符串；
4. `package.json` command；
5. current test 引用；
6. active docs 精确路径引用；
7. result/manifest 精确路径引用；
8. 未提交 diff 重叠。

把结果追加到本节末尾，字段固定为：

```text
path | active_closure | importers | commands | tests | active_docs | artifacts | dirty | proposed_class | move_allowed
```

分类规则：

- 任一检查非零或不确定：`UNKNOWN / KEEP_IN_PLACE`，`move_allowed=no`；
- 全部为零且不在当前闭包：可标 `SCRATCH_CANDIDATE`，但本批次仍为
  `move_allowed=pending_strong_review`；
- 不得执行这些 probe；不得读取 provider key。

### 10.5 下一批次停止条件与验证

出现以下任一情况立即停止：

- 需要修改超过 2 个文件；
- 需要改代码、测试、package 或结果；
- 任一候选属于 38 文件闭包；
- 需要运行 provider-capable 命令；
- 发现静态脚本不能识别的 dynamic loader，且无法保守标为 UNKNOWN；
- 工作树出现新的非本批次改动。

验证命令限于 read-only 搜索、workspace JSON 解析和：

```powershell
git diff --check
npx vitest run test/v6-provider-adapters.test.ts --no-file-parallelism
```

provider-adapter 测试用于确认文档阶段没有伴随代码漂移；不需要重复完整
459 秒测试。E0–E1 完成后停止，交强模型复核，仍不得进入 Stage F/G。

### 10.6 E1 审计结果

以下结果来自当前工作树的只读静态检查。搜索结果包含本计划自身的候选
路径清单；该引用不算 active documentation、command、test 或 artifact
引用。7 个文件均为 tracked、clean，且均不在 38 文件 natural-dynamics
静态闭包中。

| path | active_closure | importers | commands | tests | active_docs | artifacts | dirty | proposed_class | move_allowed |
|---|---|---|---|---|---|---|---|---|---|
| `experiments/campaign/v6/probe_glm_fork_fixed.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（provider-capable historical probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_glm_fork_task14.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（provider-capable historical probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_glm_fork_timing.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（provider-capable historical probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_glm_model.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（direct provider probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_glm_round1.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（direct provider probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_zhipu_connectivity.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（direct provider probe） | `pending_strong_review` |
| `experiments/campaign/v6/probe_zhipu_rate_limit.ts` | no | none | none | none | none | none | no | `SCRATCH_CANDIDATE`（direct provider probe） | `pending_strong_review` |

补充审计事实：

- 7 个候选的精确文件名在当前源码、tests、package、docs、experiments 和
  results 搜索中，除本计划清单外均无引用；未发现精确候选路径的 dynamic
  require/path 引用；
- `probe_glm_fork_*` 依赖历史 `run_v6_fork` 和 zhipu invoker；
- `probe_glm_model.ts`、`probe_glm_round1.ts`、`probe_zhipu_connectivity.ts`
  和 `probe_zhipu_rate_limit.ts` 直接调用 provider，并在源码中读取
  `.env.local` 配置；
- 因为它们具备 provider-capable 行为，本轮只证明“无当前引用”，不证明
  可以安全执行或立即物理移动；
- 未执行任何候选 probe，未读取 provider key，未改动候选文件。

E1 结论：7 个文件可进入后续 scratch candidate 审查，但全部保持
`move_allowed=pending_strong_review`。下一阶段若获批准，只能先做单批次
零引用复核和路径变更预演，不能把 provider-capable probe 恢复为当前命令。

### 10.7 G1a 执行结果

经强模型复核和项目所有者明确授权，第一批只移动了 3 个不依赖 V6
同目录模块的 tracked direct-provider probe：

```text
experiments/campaign/v6/probe_glm_model.ts
  -> experiments/campaign/scratch/probe_glm_model.ts
experiments/campaign/v6/probe_zhipu_connectivity.ts
  -> experiments/campaign/scratch/probe_zhipu_connectivity.ts
experiments/campaign/v6/probe_zhipu_rate_limit.ts
  -> experiments/campaign/scratch/probe_zhipu_rate_limit.ts
```

移动使用 `git mv`。没有修改脚本内容、provider 行为、测试、package、
workspace 或结果，也没有运行 probe、调用 provider、输出或使用 provider key，
或执行 commit。
其余 4 个候选保持原位；Stage F 和 G1b+ 均未获授权。

### 10.8 主动收尾决定

2026-09-02 强模型复核后，项目所有者决定在 G1a 后主动结束本轮收敛。
当前文件级权威分类、命令分层、workspace 降噪和首批物理隔离已足以降低
日常导航负担。继续修改命令入口或移动需要相对 import 调整的 probe，当前
没有足以抵消风险的实际研究收益，因此不是未完成的默认工作。

当前处置如下：

| files | current disposition |
|---|---|
| `probe_glm_model.ts`, `probe_zhipu_connectivity.ts`, `probe_zhipu_rate_limit.ts` | moved to `experiments/campaign/scratch/` in G1a; historical provider-capable diagnostics only |
| `probe_glm_fork_fixed.ts`, `probe_glm_fork_task14.ts`, `probe_glm_fork_timing.ts`, `probe_glm_round1.ts` | audited `SCRATCH_CANDIDATE / KEEP_IN_PLACE`; remain under V6; no current authority |
| Stage F | deferred; existing command names remain unchanged |
| G1b+ | deferred; no additional physical isolation authorized |

G1a 验收结果：`npx tsc --noEmit` 通过；完整测试为 152 files passed、
6 skipped，2053 tests passed、12 skipped、0 failed；`npm run build` 通过；
旧路径和外部 basename 搜索无引用；3 个 rename 均为 100% 内容一致；
`git diff --check` 与 staged diff check 无内容错误。验证没有改变科学 claim
ceiling，也不证明其余 V6 已物理冻结。

本计划至此关闭。除非出现新的具体导航、运行安全或维护需求，否则不恢复
Stage F 或 G1b+。任何恢复都需要新的明确授权和独立批次验证。
