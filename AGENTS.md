# AGENTS.md - 源哥AI基金监控助手

## 项目概览
源哥AI基金每日建仓 & 全持仓监控预警助手（含源哥言商每日学习模块），是一个基于 Next.js 16 的全栈 Web 应用。

## 版本技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **LLM**: coze-coding-dev-sdk (doubao-seed-2-0-lite-260215)
- **数据库**: Supabase (预留)

## 目录结构
```
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts    # LLM对话API（SSE流式输出）
│   │   ├── globals.css          # 全局样式（深色交易室主题）
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 主页面（标签页路由）
│   ├── components/
│   │   ├── sidebar.tsx          # 侧边栏（导航+周期倒计时+快捷指令）
│   │   ├── dashboard-overview.tsx # 总览仪表盘
│   │   ├── buy-signal-panel.tsx # 三档买点检测
│   │   ├── portfolio-panel.tsx  # 持仓台账
│   │   ├── learning-panel.tsx   # 源哥言商学习模块
│   │   ├── risk-alert-panel.tsx # 风控预警
│   │   └── command-panel.tsx    # 交互指令+AI对话
│   └── lib/
│       ├── types.ts             # 核心类型定义
│       ├── constants.ts         # 基金常量/铁律/周期理论
│       └── utils.ts             # 通用工具函数
```

## 核心功能模块
1. **总览仪表盘**: 8只基金净值矩阵 + AI仓位仪表 + 信号/预警摘要
2. **买点检测**: 三档阈值(黄金坑/钻石坑/企稳满仓)实时对照 + 满仓4项指标复核
3. **持仓台账**: 4只自有持仓明细 + 半年周期特别提示 + 操作记录
4. **源哥言商学习**: 3时段推送(早间周期/午间铁律/收盘案例) + 测验 + 进度追踪
5. **风控预警**: 三级预警(常规/黄色/红色) + 处置方案 + 知识点关联
6. **交互指令**: 13条快捷指令 + LLM自由对话（SSE流式输出）

## 关键业务规则
- 免责声明：每条回复首行强制固定
- AI仓位上限：60%
- 三档买点：159140(1.37/1.28)、022364(5.68/5.33)、159142(1.32)
- 半年周期：2026.5.29-11月（布局→国庆止盈→11月止损→收尾）
- 风控铁律：3-3-4/追高拦截/浮亏20%止损/6月时间止损/极端风控

## 开发规范
- 包管理器：pnpm only
- 禁止渲染时调用 Math.random()，用 useEffect+useState 替代
- JSX 中 > 符号需用 {'>'} 转义
- LLM 调用仅在后端 (route.ts)，前端通过 fetch + ReadableStream 消费
- 模拟数据使用固定值，不用随机数
