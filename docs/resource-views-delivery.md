# 游戏维度资源管理交付记录

## 改动原因与基线

此前道具库与资源表需要分别操作完整分类；账号只有整表显示列偏好，来源筛选后的合计及导出没有共享同一来源集合。本次按已批准计划，将道具定义维护和资源获取查询连接到 Core 提供的统一快捷维度。

两仓均在 main，保留全部原有暂存、未提交修改，未提交或暂存本次代码。初始数据及在线备份见 [基线目录](data-imports/2026-11-02-resource-views)。在线 SQLite 备份（包含 WAL 中已提交数据）：`/home/guagua/workspace/backups/danke-core/before-resource-views-20261101-233942.db`，备份完整性已核对。

当前基线为 74 个道具、35 个来源、234 条产出。本次未新增、删除、合并或改分类任何正式业务记录。先前已完成的分类表及偏好表直接复用，**无需数据库迁移**。

## 最终行为

- 两页共用 Core 的“全部、装备、特工、配件、收藏品、载具、宠物、钥匙、所有核心”。游戏体系匹配多选 categoryIds，钥匙/核心按单选 resourceTypeId 跨体系匹配，始终保留真实道具 ID。
- 道具库提供名称搜索、未分类筛选及批量勾选。名称、图标、适用体系和类型放入一个编辑弹窗，先展示新旧值，再确认一次请求保存；错误保留输入。
- 批量维护显式区分保持、设置、清空，未操作的字段不发送，避免无意清除原分类。删除沿用二次确认，并先下载道具及全部关联产出的 JSON 备份。
- 资源表快捷维度默认显示，完整分类收进细分筛选。系统维度继续筛类型，钥匙/核心继续筛体系，全部支持体系 OR 与类型 AND。
- `/yields?view=agent` 等链接可直接选中维度；未知参数显示全部。切换维度清除细分条件、来源搜索和数量排序，并关闭未保存的穿梭框。
- 每个账号、每个维度独立选择列。首次使用保留既有默认隐藏/已核实别名规则；已保存后新增道具仅进入候选。穿梭框只包含目标维度正式道具；清空选择有明确空状态，取消不保存。
- 默认仅展示当前可见道具有非零产出的来源，可切换全部。表头、数值、合计、钥匙/核心分单位汇总和 Markdown 导出共享相同列及来源。来源搜索后合计/导出同步变化。
- 行列拖动仍在浏览器本地保存；数值编辑、数量排序、来源和道具名称确认编辑保留。旧路径及 Core 写入权限不变。

## 文件范围

| 项目 | 主要文件 | 用途 |
|---|---|---|
| Core | src/item-classifications/resource-views.ts | 唯一快捷维度定义、匹配条件、兼容偏好键 |
| Core | src/item-classifications/classifications.dto.ts | 可选 viewId 校验 |
| Core | src/item-classifications/item-classifications.controller.ts | GET query / PUT body 传递 viewId |
| Core | src/item-classifications/item-classifications.service.ts | 返回维度、账号分维度存取及成员校验 |
| Core | src/item-classifications/item-classifications.service.spec.ts | 兼容键及过滤保护回归 |
| Admin | lib/item-classifications.ts、components/ResourceViewTabs.tsx | 两页统一定义消费与匹配 |
| Admin | components/ItemEditorDialog.tsx、ItemClassificationDialog.tsx、ClassificationControls.tsx | 单项统一编辑、批量意图和细分控件 |
| Admin | app/items/page.tsx | 快捷维度、搜索、统一编辑和删除备份 |
| Admin | app/yields/page.tsx | 分维度偏好、URL、来源、合计、导出及现有编辑拖动接入 |
| Admin | __tests__/item-editor.test.tsx、resource-view-flow.test.tsx，以及相关既有测试 | 提交确认、保持字段、偏好隔离、查询及导出回归 |

Core 的 Prisma schema 及此前 migration 在任务开始时已有未提交修改，本次没有修改它们。未修改 Web、Creator、现有 API 路径或产出数量。

## 数据分类核对

[逐条分类清单](data-imports/2026-11-02-resource-views/classification-review.json)记录全部道具 ID、现有标签和类型。本次不根据名称中的“自选”推断适用全部体系。以下 4 个条目有分类待确认：洗炼精华、核心自选宝箱精华、核心自选宝箱、自选核心。它们保留原定义，并可从道具库“未分类”入口维护；已有核心类型的条目仍可出现在“所有核心”。

现有体系数量有重叠：装备 11、特工 9、配件 9、收藏品 13、载具 8、宠物 14；钥匙 10、核心 9。数量不能跨维度相加。已核实的别名仅用于首次默认显示，不合并实体、不搬产出；两条别名都有非零记录时保留供核对。

## 验证结果

| 检查 | 结果 | 测量耗时 |
|---|---|---|
| Admin 全量单元/组件测试 | 17 文件、86 项通过 | 15.96 秒 |
| Core 全量服务测试 | 23 套、147 项通过 | 2.91 秒 |
| Admin / Core 类型检查 | 均通过 | 2.99 / 2.35 秒 |
| Admin / Core 相关 ESLint | 无错误；Admin 有 10 条既有未使用/原生 img 警告 | 3.07 / 2.77 秒 |
| Admin 静态导出隔离构建 | Next.js webpack 构建通过，10 个静态页面生成 | 18.40 秒 |
| Core 隔离编译 | 通过，未写项目 dist | 2.24 秒 |
| 数据库副本真实 HTTP 集成 | 全部通过 | 0.35 秒 |
| 上述验证累计 | 不含代码编写、等待及文档 | 约 51 秒 |

副本 HTTP 覆盖真实登录、两账号隔离、旧 all 键、空选择、独立维度、成员校验、未知维度、匿名 401、无权 403、改名保留分类、移出体系后读取过滤、产出完全不变。[接口验证结果](data-imports/2026-11-02-resource-views/http-verification.json)。测试账号和写入仅存在于 `/tmp/danke-resource-views-test.db`。

[运行态核对](data-imports/2026-11-02-resource-views/live-verification.json)确认正式业务数据、数据库结构、原偏好完全不变；Admin `/items`、`/yields?view=agent`、`/yields?view=cores` 均 HTTP 200。

浏览器控制工具仍返回 `sandboxCwd is not a local file URI`，无法执行桌面/窄屏真实浏览器操作。组件测试与静态构建已通过，但不将它们当作实机视觉验收。

## 运行与回滚

- Admin 仍使用原 8004 开发服务；隔离构建在 `/tmp/danke-admin-resource-views-build`，没有覆盖项目 `.next`、`out`。
- Core 本地 3001 已加载 `/home/guagua/workspace/.runtime/danke-core/resource-views-20261102/dist/src/main.js`；日志在同级 `server.log`，项目 dist 保留。之前运行版本在 `/home/guagua/workspace/.runtime/danke-core/classifications-20261101`。
- 未部署远端服务器。数据库副本测试服务在完成核对后停止。
- 回滚按本次文件差异撤回新界面和 viewId 读取，保留其他用户修改。先前 all 配置仍在 `yield-matrix`；新维度配置是 `yield-matrix:<viewId>`，可保留，不需要删表或迁移。
- 如需回滚本地 Core，核实监听 3001 的确切进程后停止该版本，在 Core 工作目录用既有 Node 24 运行之前隔离版本。此次没有正式数据修改，无需恢复数据库备份；不得 reset 或覆盖运行中的数据库。
