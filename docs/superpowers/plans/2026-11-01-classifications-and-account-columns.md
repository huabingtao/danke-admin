# 来源编辑、真实多分类与账号显示列实施记录

执行顺序：来源统一编辑弹窗 → 数据库副本增量迁移 → Core接口与副本HTTP验证 → 正式库在线备份迁移 → 逐条分类 → Admin分类维护与账号穿梭框 → 隔离构建和回归。

- [x] 来源双击及按钮进入同一编辑弹窗，失焦不提交；新旧名确认、空值/重名/错误保留。
- [x] ItemCategory、ResourceType、ItemCategoryLink、UserViewPreference及Item可空resourceTypeId增量结构。
- [x] 分类GET、受权限保护批量分类、个人GET/PUT偏好；旧路径/Item.type保留。
- [x] 道具单个和批量分类、多一级标签＋单二级类型；候选全库穿梭框与确认摘要。
- [x] 一级OR、二级AND，按ID唯一展示；原有显示默认、拖动、数值排序、MD导出保留。
- [x] 备份、副本迁移、SQL完整性、业务数据对账及隔离构建。

浏览器控制连接报sandboxCwd URI错误，不能完成真实浏览器交互验收；通过组件测试、隔离HTTP接口测试和本机页面HTTP200验证。具体交付、测试及回滚见 ../../classifications-and-account-columns.md（实际文件：docs/classifications-and-account-columns.md）。
