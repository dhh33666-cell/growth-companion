# 成长秘书 / Growth Companion

一个把学习、训练、日常和奖励转化为 RPG 成长系统的个人 AI 秘书原型。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

打开 `http://localhost:3000`。首版没有配置 Supabase 或模型 API 时，使用浏览器本地演示数据；任务结算、成长属性、奖励抽取和 AI 本地 fallback 均可操作。

## 生产集成

1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
2. 复制 `.env.example` 为 `.env.local` 并填写 Supabase 与中转站 API 配置。
3. 使用 `npm.cmd run build` 验证生产构建。
4. 将项目部署至 Vercel，配置同名环境变量。

## 开发日志

开发过程写入 `docs/development-log.md`。每完成一个阶段，都记录完成内容、验证结果、问题、决策和下一步。
