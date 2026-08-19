# Development Log

## 2026-08-04 - 项目初始化与核心原型

- Status: Completed
- Goal: 从空工作区建立 AI 成长秘书的可运行 Web 原型，覆盖任务、记录、RPG 成长、奖励和 AI 教练体验。
- Completed: 已创建 Next.js 项目配置、核心类型、成长规则、响应式游戏化 UI、任务计划、生活记录、成长属性、奖励仓库、AI 教练、本地持久化、Supabase schema、环境变量示例和运行说明。
- Validation: 使用已安装的本地 TypeScript 编译器执行 `tsc --noEmit` 通过；Next.js 生产构建通过。
- Problems: `pnpm install` 能完成依赖下载，但环境阻止 esbuild/sharp 安装脚本，pnpm 因此返回非零状态；不影响已安装依赖和 Next 构建。
- Decision: 在未配置 Supabase 或模型密钥时，应用使用浏览器本地持久化和本地 AI fallback；生产集成通过环境变量启用。
- Next: 启动开发服务器，进行页面可访问性验证；后续配置 Supabase 项目后接入真实认证和云端存储。

## 2026-08-05 - 构建验证与本地运行

- Status: Completed
- Goal: 验证应用可以通过类型检查、生产构建并从本地开发服务器访问。
- Completed: 添加 Tailwind 扫描配置；启动 Next.js 开发服务器。
- Validation: `tsc --noEmit` 通过；`next build` 通过；`http://localhost:3000` 返回 HTTP 200。
- Problems: 受管环境的 pnpm 会对被忽略的 esbuild/sharp 构建脚本返回非零状态。
- Decision: 直接调用已安装的 TypeScript 与 Next CLI 完成验证；应用不依赖 sharp 或 esbuild 的运行时能力。
- Next: 在 Supabase 项目创建后执行 `supabase/schema.sql`，填充 `.env.local`，将浏览器本地持久化替换为真实账户同步。

## 2026-08-05 - 首次引导与规则测试

- Status: Completed
- Goal: 补齐首次使用引导、旧版本地数据兼容和成长规则的自动化测试。
- Completed: 新增三步首次引导（身份、学习主线、训练节奏）；新增本地数据 hydration，兼容缺失的新字段；新增等级、经验倍率和每日达标规则测试。
- Validation: TypeScript 检查通过；Vitest 3/3 通过；Next.js 生产构建通过。
- Problems: 暂无 Supabase 项目凭据，无法进行真实邮箱登录和云端数据同步的集成验证。生产构建后，旧开发服务器出现 Webpack 缓存导致的 500；重启进程后恢复。
- Decision: 保持本地模式为默认可用路径；云端结构、RLS 与环境变量约定继续保留，待用户创建 Supabase 项目后接入。
- Next: 配置 Supabase 后实现邮箱验证码登录、服务端成长事件结算和云端同步；配置中转站后验证真实 AI 复盘。

## 2026-08-05 - Supabase 本地配置准备

- Status: In Progress
- Goal: 准备本地 Supabase 环境变量文件，等待填入 Publishable key。
- Completed: 已创建 `.env.local` 并写入 Project URL；已通过 `.gitignore` 排除本地密钥和构建产物。
- Validation: 待填入 Publishable key 后启动应用验证环境变量读取。
- Problems: 尚未配置 Publishable key。
- Decision: 不在聊天或开发日志中记录任何密钥。
- Next: 用户填入 Publishable key 后继续接入认证与云端同步。

## 2026-08-05 - Supabase 认证与云端同步

- Status: Completed
- Goal: 将本地成长秘书接入邮箱验证码登录、Supabase 用户隔离和云端数据同步。
- Completed: 添加 Supabase Browser Client、邮箱验证码登录界面、用户会话监听、首次登录本地数据迁移、任务/记录/奖励/记忆自动同步和退出登录；AI API 在中转站异常时自动降级为本地建议。
- Validation: TypeScript 检查通过；Vitest 3/3 通过；Next.js 生产构建通过；生产服务首页与 `/api/coach` 均返回 HTTP 200。
- Problems: 已执行的初始 schema 缺少 `profiles.onboarded` 字段。首次登录测试发现环境变量误填为 Data API 地址 `/rest/v1/`，认证 SDK 无法拼接正确的 `/auth/v1` 请求路径。Supabase 默认邮件模板发送 Magic Link，而非 6 位验证码。
- Decision: 提供独立迁移文件 `supabase/migrations/002_add_onboarded.sql`，避免用户重复运行完整 schema 和 RLS policy；登录页改为默认 Magic Link 流程，并显式指定当前浏览器地址作为回调。
- Next: 用户在 Supabase SQL Editor 执行迁移后，使用邮箱验证码首次登录并确认云端生成 profile 与任务数据。

## 2026-08-05 - 任务状态与删除控制

- Status: Completed
- Goal: 让用户可手动删除任务，并允许误完成的任务恢复为未完成。
- Completed: 完成按钮改为可切换状态；恢复未完成时回退该任务对应经验与属性；每条任务添加确认删除按钮，删除已完成任务同样会回退成长数值。
- Validation: 待重新构建后验证。
- Problems: 无。
- Decision: 删除操作保留二次确认，避免误触；不实现“撤销删除”历史，用户可重新添加任务。
- Next: 在更新后的本地服务中手动验证完成、取消完成与删除流程。

## 2026-08-05 - 生活记录删除

- Status: Completed
- Goal: 让训练、饮食和日常行为记录可以单独删除。
- Completed: 今日轨迹中的每条训练、饮食和日常记录均增加删除按钮与确认提示。
- Validation: 待重新构建后验证。
- Problems: 无。
- Decision: 记录删除不会影响任务经验，因为当前记录不单独产生属性与经验。
- Next: 继续补充记录编辑和历史筛选能力。

## 2026-08-05 - 本地服务端口稳定化

- Status: Completed
- Goal: 固定本地访问地址为 `http://localhost:3000`，避免 Supabase 回调地址随临时端口变化。
- Completed: 将首页改为动态渲染，避免静态预渲染与客户端 Supabase 初始化发生冲突。
- Validation: production build 通过；`http://localhost:3000/` 和 `/plan` 均返回 HTTP 200。
- Problems: Next 开发模式在当前环境会出现缓存导致的 500，因此本地使用 production server。
- Decision: Supabase 的 Site URL 和 Redirect URL 统一使用 `http://localhost:3000` 与 `http://localhost:3000/**`。
- Next: Supabase 回调地址固定使用 `http://localhost:3000`；继续补充记录编辑和历史筛选能力。

## 2026-08-05 - Supabase 认证加载兜底

- Status: Completed
- Goal: 避免 Supabase 用户状态请求失败时页面永久停留在“正在连接成长系统”。
- Completed: 为 `getUser()` 增加异常处理和 8 秒超时，失败后进入登录页而不是无限加载。
- Validation: production build 通过；重启后的 `http://localhost:3000/` 返回 HTTP 200。
- Problems: 需要进一步观察 Supabase 网络请求失败时的登录页提示。
- Decision: 认证服务不可用时不阻塞本地页面渲染；当前配置模式仍先显示登录页，用户可检查环境变量或服务状态。
- Next: 用户刷新页面后确认认证请求异常时能在 8 秒内进入登录页。

## 2026-08-11 - 本地服务恢复

- Status: Completed
- Goal: 恢复因后台 Next.js 进程停止而无法访问的本地应用。
- Completed: 确认生产构建仍存在；重新启动 `next start -p 3000`。
- Validation: `http://localhost:3000/` 返回 HTTP 200。
- Problems: `localhost` 服务不会在桌面应用或系统重启后自动常驻。
- Decision: 需要使用本地应用时，先启动项目服务；长期使用应部署到 Vercel 等公网托管服务。
- Next: 评估并执行 Vercel 部署，获得不依赖本机进程的固定网址。

## 2026-08-14 - 逾期任务惩罚机制

- Status: Completed
- Goal: 未完成任务的第二天自动扣减相关经验与属性，并支持删除/延期豁免。
- Completed: 新增任务惩罚结算逻辑，主任务扣全额、普通任务扣一半，每日属性与经验扣减上限；结算在次日首次打开时自动执行；计划页新增逾期未完成面板，支持标记完成、延期至明日、删除并退回扣除数值；云端 schema 与同步保留惩罚状态。
- Validation: TypeScript 检查通过；Vitest 6/6 通过；production build 通过；首页与计划页均返回 HTTP 200。
- Problems: 已存在的 Supabase tasks 表缺少惩罚字段。
- Decision: 新增迁移文件 `supabase/migrations/003_add_penalty_fields.sql`，云端用户需在 SQL Editor 执行后才会持久化惩罚状态。
- Next: 云端用户执行 003 迁移；观察每日结算提示与逾期任务管理流程。

## 2026-08-15 - 每日收获功能

- Status: Completed
- Goal: 新增「每日收获」独立导航页，记录学习或刷视频时遇到的新名词/术语，并支持搜索与分类回顾。
- Completed: 新增 GainEntry 类型与 gains/gainCategories 数据字段；侧边栏新增「每日收获」页面，支持新增、编辑、删除收获，自由文本来源、领域分类新增与删除、日期补录；列表支持按名词/定义/来源搜索和分类筛选；云端新增 gains 表与 profiles.gain_categories，同步采用容错处理。
- Validation: TypeScript 检查通过；Vitest 6/6 通过；production build 通过；首页与 /gains 页面均返回 HTTP 200。
- Problems: 云端用户需执行迁移后收获才能跨设备持久化。
- Decision: 云端同步对 gains 表采用 best-effort，表不存在时自动跳过而不影响其他数据。
- Next: 云端用户执行 `004_add_gains.sql` 迁移；观察收获记录与筛选流程。

## 2026-08-15 - 本地静态资源版本修复

- Status: Completed
- Goal: 修复浏览器加载旧构建 HTML、导致「每日收获」页面 CSS/JavaScript 资源不匹配的问题。
- Completed: 定位并停止旧的 3000 端口 Next.js 进程，重新启动最新 production build。
- Validation: 最新 HTML 引用 `f0484cdf1b311305.css`，对应静态资源返回 HTTP 200。
- Problems: 长时间运行的旧 `next start` 进程不会自动读取新构建产物。
- Decision: 每次完成生产构建后必须重启监听 3000 的服务进程。
- Next: 用户强制刷新浏览器，确认每日收获页面正常显示。

## 2026-08-19 - 项目说明书与日志治理

- Status: Completed
- Goal: 为长期迭代建立可持续的项目知识记录，降低超长聊天或更换协作窗口时丢失关键上下文的风险。
- Completed: 新增 `docs/project-rules.md`，集中记录当前技术栈、线上/本地地址、Supabase 迁移与 Auth 配置、数据同步约定、业务规则、已知问题、后续优先级和发布流程；补充本日志作为历史开发记录的使用边界。
- Validation: 已核对项目的 `package.json`、Git 分支与远程仓库、Supabase 迁移文件以及现有云同步实现；未在文档中写入任何真实密钥。
- Problems: 发现每日收获存在潜在重复同步问题：当前全量删除后插入的同步方式在并发请求下可能生成重复条目。
- Decision: 将每日收获重复问题记入 `project-rules.md` 的已知问题，暂不在本次文档整理中改动业务代码；后续优先采用同步锁与稳定 ID upsert/增量同步方案修复。
- Next: 用户确认后实现每日收获防重复同步与现有重复数据处理；后续每次功能改动持续更新本日志。

## 2026-08-19 - 奖励仓库恢复与管理

- Status: Completed
- Goal: 修复已登录用户的云端奖励表为空时，奖励仓库显示为空的问题，并让用户可以自行管理奖励池。
- Completed: 抽取默认奖励工厂函数；云端读取到空奖励池时自动恢复奶茶、电影、游戏和小食四项默认奖励，随后通过现有自动同步写入 Supabase；奖励页新增奖励、编辑、删除、启用/停用和恢复默认奖励池操作，并限制至少保留一个奖励。
- Validation: TypeScript 检查通过；Vitest 6/6 通过；Next.js production build 通过。
- Problems: 当前全量同步方式会重新插入奖励行，因此不保留 Supabase 中原始 reward row id；业务侧使用本地稳定 id 管理当前会话，不影响本次奖励池恢复与编辑功能。
- Decision: 不新增 Supabase 迁移，继续使用现有 `rewards` 表字段；“恢复默认”采用二次确认，避免误覆盖用户自定义奖励。
- Next: 推送到 GitHub 后等待 Vercel 自动部署；用户刷新线上网站，确认默认奖励显示并尝试新增、编辑和停用一条奖励。

## 2026-08-19 - 云端同步重复记录修复

- Status: Completed
- Goal: 修复任务计划与每日收获在云端同步后可能重复出现的问题。
- Completed: 同一 Supabase 用户的同步请求改为排队串行执行；任务、训练、饮食、习惯、奖励、记忆改为使用稳定 ID 的 upsert；每日收获也使用稳定 ID 写入；云端加载任务和每日收获时按业务内容去重，确保历史重复数据不会再次显示或扩散。
- Validation: TypeScript 检查通过；Vitest 6/6 通过；Next.js production build 通过。
- Problems: 已经存在于 Supabase 的旧重复行需要在新版部署后通过一次自动同步被清理；在发布前仍可能在旧线上版本看到重复。
- Decision: 不新增 Supabase 迁移，继续使用现有表的 UUID 主键；依靠前端生成的稳定 ID 和串行同步来解决并发写入。
- Next: 将本次修复与奖励仓库修改一并提交推送；部署完成后刷新线上页面并核对每组重复任务只保留一条。
