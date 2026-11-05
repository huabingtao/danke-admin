# 跨电脑路径兼容治理

实施范围：Creator Node 发现、Admin 导入准备、Core 备份和内容同步、Resource 导出、工具门户技能发现及部署、Cloud Calc 部署。

规则：仓库内文件按脚本位置定位；跨仓目录提供环境变量覆盖并保留相邻仓库默认布局；Node 使用 PATH 或 NODE_BIN；备份默认位于输入数据库旁 backups 目录，可通过 DANKE_BACKUP_DIR 指定。部署目标是服务器路径，允许独立配置，不执行部署。

验收：扫描可执行源码不再依赖特定用户名；Python 语法、Shell 语法、相关 TypeScript 检查；不运行写数据库、导出或部署脚本。回滚只撤回本次路径适配，保留已有修改和数据。

## 换电脑运行

- 安装各项目要求的 Node/Python 版本，在对应仓库安装依赖。Node 放入 PATH，或为 Creator 设置 NODE_BIN。
- 常规页面不依赖 Creator 目录。离线导出/同步需要对应的数据和素材；Git 未跟踪的数据库、原始解包数据、密钥和历史快照需单独准备。
- Resource 导出默认使用相邻 danke-web，可设置 DANKE_WEB_ROOT。Admin 准备脚本默认使用相邻 danke-core，可设置 DANKE_CORE_ROOT。
- Core 历史内容入库可设置 DANKE_CREATOR_ROOT；素材包可设置 DANKE_ASSET_PACK，指向含 assets/img 的包目录。
- Core 三个维护脚本可设置 DANKE_BACKUP_DIR；默认是输入数据库旁的 backups。未执行任何数据库维护脚本。
- Tool Portal 技能目录通过 DANKE_SKILL_DIRS 指定，以系统路径分隔符分隔；部署仓库父目录通过 DANKE_PROJECTS_ROOT 指定。
- Cloud Calc 部署密码通过 DANKE_DEPLOY_PASSWORD 提供，不设置时由 SSH 密钥认证；服务器目录通过 DANKE_DEPLOY_DIR 指定。未执行部署。
- resource_map.json 中路径以该 JSON 所在目录为基准，调用者需要先拼接该目录再解析。

## 保留项与边界

历史文章发布缓存、审计快照和文档中的旧机器路径作为历史记录保留；服务器 /var/www 等路径是部署目标，不是本机项目依赖。相邻仓库默认值仅适用于显式同步/导出工具，独立克隆时需配置来源与目标。当前未在 Windows/macOS 实机运行，不能宣称全平台完整验收。
