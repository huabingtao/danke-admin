# 来源改名、道具多分类与账号显示列交付

## 已交付行为

- 来源双击与编辑按钮进入同一 shadcn 弹窗：输入→新旧名对照→确认。失焦不触发提交。Core拒绝空白名称并去除首尾空格，名称冲突返回409，权限/过期状态沿用JWT。来源ID、分类及关联产出保持不变。
- 道具库提供单个“设置分类”和勾选后的“批量分类”，一级多选、二级单选，保存前二次确认。筛选后的批量勾选不丢弃其他已选道具。
- 大表一级体系按OR、二级类型按AND筛选，改名不影响分类；核心与钥匙统计读取资源类型ID。一个多体系道具仍只渲染/累计一次。
- “管理显示道具”穿梭框提供全库正式道具、图标、完整名称、分类、搜索、当前结果批量勾选、移入/移出及提交前摘要。候选保留此前默认隐藏的石头和独立别名，可主动选入。选择按真实ID，不将自选/随机箱自动合并。
- 首次未保存配置沿用已有去重和隐藏默认；保存后只显示账号选定ID，新道具留在候选区。空选择有专门提示。移出不调用DELETE，不改产出。
- 已选列、单元格、合计与MD导出共享顺序；账号切换不沿用其他账号的已选集合。读取配置失败时禁止保存并提示重试，不能将错误当作空配置。现有行列拖动仍保留本浏览器规则。

## Core接口与兼容性

| 接口 | 权限与行为 |
| --- | --- |
| GET /item-classifications | 返回categories和resourceTypes字典；稳定ID与显示名称分离 |
| POST/PATCH /items、GET /items及/:id | 增量支持categoryIds数组、resourceTypeId；返回categoryIds、categories、resourceType；原type、ID和旧字段保留 |
| POST /item-classifications/bulk | JWT + item:create；itemIds/categoryIds/resourceTypeId；整批事务，未知ID拒绝，空数组可清空一级分类，null可清空资源类型 |
| GET /me/preferences/yield-matrix | JWT；无配置返回selectedItemIds:null，已保存空配置返回[]；忽略已删除ID |
| PUT /me/preferences/yield-matrix | JWT；仅保存当前用户selectedItemIds；拒绝注入userId等未知字段，不允许未知道具ID |
| PATCH /sources/:id | 原路径与权限不变；空名称400、冲突409、无效Token401 |

新增ItemCategory、ResourceType、ItemCategoryLink（多对多唯一键）、UserViewPreference（用户/视图唯一键）及Item可空resourceTypeId。原Item.type不复用为新分类。字典初始8个体系、9种资源类型；本次未扩展为独立字典CRUD页面。

## 数据与迁移

正式数据备份：`/home/guagua/workspace/backups/danke-core/classification-migration-20261101-224018.db`，在线backup包含WAL已提交内容，通过integrity_check。

原数据库没有_prisma_migrations，不能直接运行migrate deploy，否则会尝试执行已有业务表的初始迁移。本次先在独立副本应用并验证SQL，再通过Core维护脚本 `scripts/apply-item-classifications.py` 仅执行 `prisma/migrations/20261102000000_item_classifications/migration.sql`。脚本先在线备份，事务内应用并核对旧表，失败回滚；已有新结构时停止，不reset、不push。

逐条初始分类见[initial assignment](item-classification-initial-assignment.json)，按真实ID通过Core PATCH写入，不自动删除或合并条目。75项道具均已核对，其中71项有一级归属；洗炼精华、核心自选宝箱精华、核心自选宝箱、自选核心的具体适用体系未确认，一级留空，资源类型保留已知分类，避免虚构可选奖励。

迁移/赋类后再次核对：35个来源全部字段不变，234条产出ID、关联、金额、年月、备注及时间字段不变；道具ID、名称、type、图标、stats、描述保留。分类元数据写入会正常更新Item.updatedAt。

## 验证和当前运行

- Admin全部82项测试通过；Core全部146项测试通过。两仓TypeScript通过。
- Admin变更范围lint无错误，12条既有警告；Core新增模块及修改服务lint通过。没有关闭规则或删除测试。
- 独立SQLite副本的真实HTTP测试覆盖：多分类写入、整批非法ID拒绝、来源改名回读、匿名401、只读角色403、账号隔离、新登录会话恢复、拒绝指定其他用户ID、保存空选择。
- 本机Core接口健康、Admin /items和/yields均HTTP200；正式来源空值/冲突/无效Token返回400/409/401，未发生写入。
- Admin在`/tmp/danke-admin-classifications-build`隔离构建；Core在`/home/guagua/workspace/.runtime/danke-core/classifications-20261101`隔离编译运行，原项目.next/out/dist未覆盖。运行日志位于该Core隔离目录server.log；Core工作目录仍为项目根目录，使用现有.env和public资源。
- 本次真实浏览器控制仍因sandboxCwd URI错误不可用，没有宣称完成浏览器实机操作验收。交互由组件测试验证，浏览器中仍需检查实际视觉布局。

## 回滚

先回退Admin本次组件/读写接入，再恢复旧Core运行版本。可暂留新增分类/偏好表和可空字段，旧代码忽略它们；无需删除新表来回滚界面。若需改回分类，根据ID清单用Core API调整，不动原type或产出。

恢复整库只在确有必要且停止写入、核对迁移后其他业务操作后执行；不能用旧备份直接覆盖当前运行库。未来建立Prisma完整迁移基线应另行审计，本次未伪造初始迁移记录。

## 最终验收耗时

| 环节 | 耗时 |
| --- | ---: |
| Admin tests | 14.20秒 |
| Admin types | 3.00秒 |
| Admin lint | 3.09秒 |
| Admin隔离构建 | 9.70秒 |
| 上述最终检查合计 | 29.99秒 |

Core完整测试146项通过，测试框架报告2.191秒；Core类型、lint及隔离编译另已通过，未与上表混计。
