# 弹壳特攻队数据中台 (danke-admin) 项目理解

本项目是一个面向《弹壳特攻队》游戏自媒体博主“弹壳呱呱”的数据运营管理中台。主要用于配置游戏道具底库、追踪限时节日活动以及录入每月各产出途径的资产数量。系统的数据变动旨在为前台（通过 SSR 渲染）提供底层的游戏配置与产出明细数据支持。

---

## 🛠️ 技术栈与依赖架构

项目采用现代的前端技术栈构建：

*   **核心框架**：`Next.js 16.2.10` (App Router 架构) + `React 19.2.4`
*   **样式方案**：`Tailwind CSS v4` + `@tailwindcss/postcss` 提供了底层的现代暗色系（Dark Theme）视觉风格（以 `zinc-950` 为主底色，点缀 `orange` 与 `blue` 极光背景块）
*   **开发语言**：`TypeScript` + `tsconfig.json` 配置
*   **测试框架**：`Vitest 4.1.10` + `jsdom` + `React Testing Library`
*   **运行脚本**：
    *   `npm run dev`：启动 Next.js 本地开发服务
    *   `npm run build`：生产环境打包
    *   `npm run start`：启动生产环境服务
    *   `npm run lint`：ESLint 代码规范校验

---

## 🔐 授权与权限控制 (RBAC)

项目设计了简单的基于角色的权限控制（Role-Based Access Control）：

### 1. 角色定义
在 [AuthContext.tsx](file:///Users/hbt/my-project/apps/danke-admin/context/AuthContext.tsx) 中定义了两种用户角色：
*   **`ADMIN` (超级博主 - 弹壳呱呱)**：拥有完整的数据 CRUD（增删改查）权限。
*   **`ASSISTANT` (录入助理 - 助理小白)**：拥有只读查看权限以及就地双击修改已有数据金额的权限，但不允许创建新的物品/活动或删除它们。

### 2. 鉴权与生命周期
*   用户凭证存储于 `localStorage` (`danke_admin_user` 键名)。
*   系统通过 React Context ([AuthContext.tsx](file:///Users/hbt/my-project/apps/danke-admin/context/AuthContext.tsx)) 向全局下发 `user`、`login`、`logout` 和 `isLoading` 状态。
*   **Router Guard (路由守卫)**：
    *   如果未登录且当前路由不是 `/login`，则自动重定向到 `/login`。
    *   如果已登录且处于 `/login`，则自动重定向到首页 `/`。

---

## 📂 页面路由与业务功能

App 目录采用 Next.js App Router，具有 5 个主要页面：

### 1. 🔐 登录页 (`/login` -> [app/login/page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/login/page.tsx))
*   支持极光背景发光效果的卡片布局。
*   提供快速切换“超级博主 (Admin)”和“录入助理 (Assistant)”的选项卡，选择后会自动预填用户名（`弹壳呱呱` / `助理小白`）。
*   **测试密钥**：统一为 `123`，输入后即可通过授权进入中台。

### 2. 📊 中台监控大屏首页 (`/` -> [app/page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/page.tsx))
*   显示四大关键系统指标：游戏物品总数、活跃产出途径、本期已录入产出条数、进行中限时活动。
*   提供去往产出录入看板和限时活动库的快速跳转入口。
*   总结说明了中台的权限隔离策略与 SSR 刷新原理。

### 3. 📈 资产产出统计看板 (`/yields` -> [app/yields/page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/yields/page.tsx))
*   核心业务表格。支持按**年份**（如2026年）与**月份**（如7月）做数据筛选切换。
*   展示各个**物品名称**（宝石、S钥匙、杰出装备等）在不同**产出渠道**（每日挑战、每日签到、每周宝箱、限时活动奖励等）的具体数额。
*   **双击就地编辑 (In-place Cell Editing)**：双击任意数据格子可切换为输入框，输入后按 `Enter` 键或失焦自动保存，并在右上角显示“保存成功 ✅”。
*   **行总计**：最右侧列会实时计算出每种道具当前月份的汇总值。

### 4. 📦 道具配置库 (`/items` -> [app/items/page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/items/page.tsx))
*   定义底层的游戏道具信息。包含 4 种类型：
    1.  `KEY` (钥匙，如“S钥匙”)
    2.  `CURRENCY` (代币，如“宝石”)
    3.  `EQUIPMENT` (装备/武器，如“随机杰出装备”)
    4.  `TECH_PART` (配件，如“随机精良配件”)
*   属性数值以 JSON 字符串形式定义（如伤害系数、生命加成等）。
*   `ADMIN` 可以弹出 Modal 添加配置，也可以点击删除按钮；而 `ASSISTANT` 登录时，添加与删除按钮都会被隐藏，并额外显示 `🔒 助理只读模式` 徽章。

### 5. 📅 限时活动库 (`/events` -> [app/events/page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/events/page.tsx))
*   追踪游戏里的限时节日活动（如“弹壳周年庆典活动”）。
*   包含活动名称、开始日期、结束日期，以及 JSON 格式的活动产出奖励明细。
*   和道具配置库类似，增删权限严格归属于 `ADMIN`。

---

## 🧪 测试覆盖情况

在 `__tests__/` 目录下包含测试用例：
*   **[setup.ts](file:///Users/hbt/my-project/apps/danke-admin/__tests__/setup.ts)**：引入 `@testing-library/jest-dom`。
*   **[auth.test.tsx](file:///Users/hbt/my-project/apps/danke-admin/__tests__/auth.test.tsx)**：
    *   使用 `vi.mock` 模拟 `AuthContext` 提供的身份状态。
    *   **管理员用例**：验证 `ADMIN` 登录时可以渲染新增道具按钮、删除按钮，且不显示只读模式徽章。
    *   **助理用例**：验证 `ASSISTANT` 登录时隐藏新增与删除按钮，并正确显示 `🔒 助理只读模式` 标识。

---

## 📜 变更与迭代记录 (Changelog)

为了维护系统的可回溯性和代码透明度，所有由 AI 代理完成的功能迭代与代码修改都会在这里实时记录。

### 📅 2026-07-15
*   **动作**：初始化项目理解与变更记录
*   **修改文件**：
    *   `[NEW]` [PROJECT_UNDERSTANDING.md](file:///Users/hbt/my-project/apps/danke-admin/PROJECT_UNDERSTANDING.md)
*   **说明**：完成了首次对项目的通读和理解，建立了此本地文档，并确立了修改记录的追踪规范。

### 📅 2026-07-15 (第二次更新)
*   **动作**：首页内容清空与资产录入动态二级菜单迭代
*   **修改文件**：
    *   `[MODIFY]` [page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/page.tsx)
    *   `[NEW]` [route.ts](file:///Users/hbt/my-project/apps/danke-admin/app/api/sources/route.ts)
    *   `[MODIFY]` [providers.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/providers.tsx)
    *   `[MODIFY]` [page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/yields/page.tsx)
*   **说明**：将首页内容彻底清空以适应后续定制。在服务端新增了 `/api/sources` 路由获取资产分类与来源数据，并重构了侧边栏（使“资产产出录入”支持根据接口动态生成的二级缩进子菜单）与资产产出页面（双击输入框时依据 query 参数 `type` 动态过滤对应来源列并自适应总和计算）。

### 📅 2026-07-15 (第三次更新)
*   **动作**：资产录入侧边栏二级菜单完全动态化 (MySQL + NestJS + Next.js 跨项目重构)
*   **修改文件**：
    *   **danke-core** (NestJS):
        - `[MODIFY]` [schema.prisma](file:///Users/hbt/my-project/apps/danke-core/prisma/schema.prisma) (增加 Menu 数据库模型)
        - `[MODIFY]` [seed.ts](file:///Users/hbt/my-project/apps/danke-core/prisma/seed.ts) (增加初始化菜单记录)
        - `[MODIFY]` [main.ts](file:///Users/hbt/my-project/apps/danke-core/src/main.ts) (启用 CORS 支持)
        - `[NEW]` [menus.service.ts](file:///Users/hbt/my-project/apps/danke-core/src/menus/menus.service.ts) (查询 Menu 列表)
        - `[NEW]` [menus.controller.ts](file:///Users/hbt/my-project/apps/danke-core/src/menus/menus.controller.ts) (暴露 GET /menus 接口)
        - `[NEW]` [menus.module.ts](file:///Users/hbt/my-project/apps/danke-core/src/menus/menus.module.ts)
        - `[MODIFY]` [app.module.ts](file:///Users/hbt/my-project/apps/danke-core/src/app.module.ts) (注册 MenusModule)
    *   **danke-admin** (Next.js):
        - `[MODIFY]` [providers.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/providers.tsx) (动态跨域拉取后端 /menus 数据渲染二级菜单)
        - `[MODIFY]` [page.tsx](file:///Users/hbt/my-project/apps/danke-admin/app/yields/page.tsx) (动态跨域拉取后端 /sources 数据)
*   **说明**：完成了资产录入菜单完全动态化的重构设计。实现了在 MySQL 中新增 Menu 结构并完成了 Seed 数据导入，通过后端 NestJS 暴露了 CORS 授权 of `/menus` 服务；并在 Next.js 侧边栏和资产录入表格中全面对接后端 API，支持自动排序的高亮跳转和数据过滤逻辑。

### 📅 2026-07-15 (第四次更新)
*   **动作**：独立 Git 仓库初始化与本地忽略配置（/grill-me 规划实施）
*   **修改文件**：
    *   **danke-core**:
        - `[MODIFY]` [.gitignore](file:///Users/hbt/my-project/apps/danke-core/.gitignore) (补充忽略 dist/, generated/ 及临时文件)
*   **说明**：完成了在 `danke-admin` 和 `danke-core` 下分别初始化 Git 仓库的工作。丰富了后端的忽略项配置以避开运行编译文件，并对两个项目的工作区执行了首次 Git Add 与首个提交（`chore: initial project setup`）。

### 📅 2026-07-15 (第五次更新)
*   **动作**：danke-web 子项目 Git 仓库初始化
*   **说明**：完成了对 `danke-web` (Next.js 前端应用) 的 Git 仓库初始化。配置并应用了其自带的忽略规则，并执行了首次暂存与首个 Commit 提交（`chore: initial project setup`）。

### 📅 2026-07-17 (第六次更新)
*   **动作**：全新 RBAC 用户、角色与菜单权限体系联调和 Linter 修复
*   **说明**：同步了最新的 Prisma 模式模型（包括 User、Role、Permission、树形级联 Menu 等），成功通过 `db push` 与全新 `seed.ts` 完成了数据库的重建和测试数据（超级博主、录入助理账号及分类目录菜单）注入。对前后端进行编译与 Lint 修复，确保全栈通过代码审查，且单元测试（Vitest）全部绿灯通过。

