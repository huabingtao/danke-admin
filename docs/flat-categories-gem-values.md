# 一级多分类与钻石价值配置交付

## 结果与范围

本次按已批准计划修改 Admin 与 Core，未提交或暂存代码，保留原有用户修改。两个仓库均为 main。此前未提交的 Prisma 模型和 migration 保持原状；本次没有新增、删除或修改表结构。

- 一级分类顺序：核心、装备、特工、宠物、配件、收藏品、载具、钥匙、其他、活动货币。一个道具允许多个分类，查询仍按真实 ID 唯一展示。
- 原 general/event 分类 ID 保留，仅显示名调整；新增 core/key 字典记录及关联。旧 cores/keys viewId 和账号偏好键继续有效，匹配改为一级分类。
- Admin 已移除资源类型展示、编辑、提交、筛选和排序逻辑，资源全景无细分筛选入口。Core 仅保留旧字段及 DTO 兼容。
- 顶部分类按钮使用真实道具图标、名称 Tooltip、无障碍名称及选中边框。根节点启用 dark，修正 outline 按钮前景和主题变量，使新增/编辑弹窗及未分类按钮沿用真正暗色。
- 核心概览显示可见核心类道具种类数，不混加箱子、精华和实物。逐道具数量、行列拖动、来源筛选、合计和导出保留。
- 新增 `/gem-values`，菜单位于道具库之后；菜单依赖 items:view，写入依赖 item:create。按一级分类纵向分组，网格桌面三列、中屏两列、窄屏一列。
- 同一多分类道具可在多组出现，编辑实际只有一个实体；确认单价后所有位置同步。搜索名称和活动，价格允许零及非负小数；多个阶段价格分行维护。保存失败可修改后重试。

## 数据来源、导入与缺口

参考：[sIO Tools Gem Values](https://sio-tools.exp0.dev/gems)，快照日期 2026-11-02。抓取文本、原始价格和映射均保存在 [导入目录](data-imports/2026-11-02-gem-values)。没有将参考数据绑定到构建、启动或页面自动同步。

| 项目 | 结果 |
|---|---:|
| 原有道具 | 74 |
| 新增道具 | 62 |
| 当前道具 | 136 |
| 新增活动货币 | 33 |
| 参考估值条目 | 111 |
| 已映射并逐项核对 | 110 |
| 有估值的道具实体，含原有独立别名 | 119 |
| 未配置价格的既有道具 | 17 |
| 待核对参考条目 | 1 |

“Random Epic Pet”与现有“史诗宠物”泛称的随机/自选身份存在歧义，未新建重复实体、未强行套价。现有未配置价格的 17 项见 [缺口清单](data-imports/2026-11-02-gem-values/unconfigured-values.json)，显示“未配置”，不默认计为零。

没有可靠中文名的新条目暂保留原英文名称和活动名，并显示“中文名待核对”。名称、随机/自选及品质逐项对应，不根据相同图标自动合并。精油协同前/后共用原道具 ID，两个估值方案分别保留。纯收藏品不因价值接近而归核心；核心和芯片箱可同时归核心及适用体系。

导入新增 62 项、更新 60 项定义附加信息，原有名称、图标、描述、type、ID、创建时间保持不变。分类清单中，常规矿洞/特别行动券从旧“活动资源”转为“其他”，与活动货币区分。没有新增或修改任何来源和产出，没有重置显示列选择。

下载并解码验证了 104 个不同参考图片 URL，转换为 PNG 后存于 Core `/uploads/item-icons/reference-gems/`；分类图标在 `/uploads/item-icons/categories/`。全部静态 URL 已 HTTP 检查，页面展示不访问第三方图片地址。只部署到当前本地 Core，未发布远端服务器。

## 接口与存储

- `GET /item-classifications` 为分类及维度增量提供 icon，返回 10 类及包括 all 的 11 个视图。保留旧 resourceTypes 字段供旧客户端兼容，Admin 不再读取。
- `GET /items`、`GET /items/:id` 增量返回 `gemValuation`，含 prices、参考来源、快照日期和人工修改状态。
- `PATCH /items/:id` 增量接受 `gemValuation: { prices: [{ id, value }] }`，不接受客户端覆盖参考 URL、参考价或人工标志。
- 每个现有估值方案的 ID 集合必须保持一致；未配置条目设置 default 方案。负数、非数字、重复方案、变更/删除已有方案被拒绝。
- 底层复用 `Item.stats._gemValuation`。价格与普通 stats 更新在事务内读取当前值并合并，保留其他属性和参考元数据；禁止经原始 stats 接口伪造该命名空间。
- 沿用 JWT 与 item:create 服务端守卫。Core 写入后设置 manuallyModified，保留 referenceValue。所有页面、接口和权限原路径继续兼容。

主要新增/修改组：Admin 根布局和主题、共享分类和图标按钮、道具编辑/批量分类/穿梭框、资源全景、GemValueEditor、新估值页面及对应测试；Core 分类定义、道具 DTO/服务、估值校验及测试；一次性准备与导入脚本。未修改 Web/Creator 业务代码。

## 校验与运行版本

| 检查 | 结果 | 测量耗时 |
|---|---|---:|
| Admin 单元/组件测试 | 18 文件、89 项通过 | 27.46 秒 |
| Core 服务测试 | 24 套、155 项通过 | 2.35 秒 |
| Admin/Core 类型检查 | 通过 | 2.87 / 2.20 秒 |
| Admin/Core 相关 lint | 无错误；Admin 10 条既有未使用/原生 img 警告 | 3.74 / 2.39 秒 |
| Admin 隔离静态构建 | 通过，包含 gem-values | 20.44 秒 |
| Core 隔离编译 | 通过 | 2.18 秒 |
| 副本 HTTP 及正式导入 | 通过 | 0.26 / 0.10 秒 |
| 上述校验累计 | 不含下载、编写与文档 | 约 64 秒 |

[副本 HTTP 验证](data-imports/2026-11-02-gem-values/copy-http-verification.json)覆盖真实登录、401/403、价格小数/零值、方案及字段校验、事务保留 atk 属性、人工价格标记、菜单 profile 与维度成员验证。副本重复导入新增/更新均为 0；人工改价后的再次导入也保留改价和其他属性。

[正式核对结果](data-imports/2026-11-02-gem-values/live-verification.json)确认 35 个来源、234 条历史产出数值及属性、数据库结构和原账号偏好未变；136 项原有字段保护及 110 条参考价对账通过。Admin 三个相关路径 HTTP200，SSR 根节点 dark 类已核对。

浏览器控制仍报 `sandboxCwd is not a local file URI`。没有完成桌面/窄屏真实浏览器操作验收；组件测试、静态构建与 HTTP 检查不能代替它。

Core 当前本地端口 3001，隔离运行产物：`/home/guagua/workspace/.runtime/danke-core/flat-gems-20261102/dist/src/main.js`，日志位于同级 server.log。Admin 原 8004 开发服务继续运行；重新加载后台可刷新菜单。构建副本在 `/tmp/danke-admin-flat-gems-build`，未覆盖项目 .next/out 或 Core dist。

## 复现与回滚

准备脚本为 Admin `scripts/prepare-gem-reference.py`，使用 `/usr/bin/python3` 的 requests/Pillow 读取已经保存的参考快照与基线，产生显式映射和经过解码的实体图片；人工映射保留在脚本及 manifest。它是本次迁移辅助工具，不接入站点运行。

Core `scripts/import-gem-reference.py` 默认只读演练，明确 `--apply` 才写入；参数必须传数据库、manifest 和报告路径。每次写入前在线备份并验证完整性，事务内拒绝覆盖刚读取后发生的道具编辑；已有价格和后续人工分类不自动覆写。原始快照的已删除 ID 不会被重新创建。

正式写入的即时备份及逐项旧值见 [导入报告](data-imports/2026-11-02-gem-values/live-import.json)，任务开始备份见 backup.json。报告记录旧 stats、分类和菜单，全部新增 ID 可追溯。

回滚先撤回本次界面/API适配，Core 可切回之前的 resource-views-20261102 隔离版本。数据库不需要结构回滚：恢复旧分类/属性前必须对照报告检查之后的人工修改。新增道具若已有产出引用则保留，不直接删除。不得 reset、重放初始 migration 或覆盖正在运行的 SQLite 数据库。

按声明的暗黑 OKLCH 变量计算，正文/背景对比度为18.96、次要文字/卡片为8.95、主按钮为7.06，均超过4.5；这是变量计算，不代替真实浏览器检查，见导入目录theme-contrast.json。

本轮从在线备份开始的墙钟耗时约 27 分钟（含编写、下载、调试与文档）；关键检查耗时单列于上表。

## 本次业务文件清单

- Admin 页面与主题：app/layout.tsx、app/globals.css、app/items/page.tsx、app/yields/page.tsx、新增 app/gem-values/page.tsx。
- Admin 组件：ClassificationControls、ItemEditorDialog、ItemClassificationDialog、MatrixItemTransfer、ResourceViewTabs、GemValueEditor，以及 ui/button.tsx、ui/tooltip.tsx。
- Admin 数据辅助：lib/item-classifications.ts、lib/gem-valuation.ts、lib/yield-columns.ts；scripts/prepare-gem-reference.py 与 docs/data-imports 下本次快照、映射和证据。
- Core：src/item-classifications/resource-views.ts、item-classifications.service.ts；src/items/dto 下 create/update/gem-valuation DTO、items.service.ts、gem-valuation.ts；scripts/import-gem-reference.py。
- 测试：既有分类、道具编辑、穿梭框、账号偏好、资源视图及列顺序测试随一级分类契约更新；新增 Admin gem-values.test.tsx 和 Core gem-valuation.spec.ts，扩展 items.service.spec.ts，保留全部测试。
- 静态资源：Core public/uploads/item-icons/reference-gems 和 categories；没有覆盖原有道具的图标文件或地址。
