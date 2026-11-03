# Admin 提醒与资源展示调整

目标：按页面批注精简提醒列和产出页，复制 Web 的真实道具资源至 Core 静态目录及 Admin 备用素材，并提供已有 API 的受权限控制导入入口。

约束：保留未提交修改，不更改数据库结构、认证机制或历史产出，不覆盖已有图标文件，不猜测游戏道具名称；本次只对本机 Core 准备资源，远程发布不在范围内。

- [x] 提醒：app/reminders/page.tsx 的倒计时格只渲染 daysRemaining 数字，删除标题描述；保留状态计算、排序与弹窗预览。
- [x] 产出：app/yields/page.tsx、lib/yield-snapshot.ts；GET /yields 读取全部记录，按最新 year/month 选择完整快照，保存继续使用该快照的兼容字段。空库采用当前年月。删除年月 UI、描述和导出标题中的月份。
- [x] 素材：scripts/prepare-web-item-icons.py；复制现有预置道具及 Web 的道具/钥匙/碎片/宝箱/图纸/活动道具真实 PNG，排除按钮、头像和未知名称。产生文件哈希与来源清单，避免同名覆盖。
- [x] 导入：lib/web-item-catalog.json、lib/import-web-items.ts、components/WebItemImport.tsx；仅通过 JWT API 增补缺少的名称，并将已有默认路径更新至 Core 资源路径；保留自定义图标，重复运行可跳过已有结果。部分失败可重试，401/403 停止；不自动挂载触发写入。
- [x] 页面图标：分类按钮和钥匙/核心统计卡采用真实 S 军备钥匙、神器核心与各类代表道具；路径由 Core base URL 解析。
- [x] 验证：提醒列数字、无月份 UI、最新快照选择与保存、分类图片路径、导入去重/权限失败测试；TypeScript、变更文件 lint、diff 检查。禁止覆盖 .next/out。

回滚：仅撤回本次页面/helper/素材及导入入口；导入仅经操作触发，导入结果需保留 ID 清单，删除前核查引用，不自动删除历史道具。数据库无迁移。

最初浏览器连接报 sandboxCwd URI 错误。后续通过项目正常开发登录与权限 API 已完成本机导入：新增73、更新26、保留2、失败0，合计101项；备份和变更清单见 admin-resource-icons.md。浏览器视觉回归未执行；未发布远程生产环境。
