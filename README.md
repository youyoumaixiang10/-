# 机会营销 AI 雷达（前端 Demo）

用于公司 AI 提效比赛的可运行网页 Demo，模拟从热点发现到机会营销作战卡生成的 AI Agent 工作流。

## 技术栈

- React + Vite + TypeScript
- Tailwind CSS
- 本地 Mock Data
- 无后端 / 无真实 API

## 启动方式

```bash
npm install
npm run dev
```

默认启动地址：`http://localhost:3000`

## 页面说明

- **Dashboard 首页**：指标卡、入口按钮、流程图
- **热点列表页**：至少 10 条热点数据，支持“查看详情 / 生成建议”
- **热点详情页**：展示热点解读与风险提示
- **品牌产品输入页**：预置小鹏品牌/产品/卖点，支持编辑
- **作战卡结果页**：模拟 AI 输出借势判断、匹配度、创意方向、动作建议、风险与 ROI

## 模拟 AI 逻辑

`simulateMarketingAI(input)` 内置规则：

- 标签包含“自驾/旅行/远方”时，优先匹配续航、补能、家庭出行相关卖点
- 标签包含“科技/智能”时，优先匹配第二代 VLA
- 情绪负向或风险高，优先输出黄灯/红灯
- 行业相关度高且情绪正向时，优先输出绿灯

## 目录结构

```text
.
├── App.tsx               # 主页面与路由状态
├── index.tsx             # 入口
├── src.css               # Tailwind 样式入口
├── tailwind.config.js    # Tailwind 配置
├── postcss.config.js     # PostCSS 配置
├── vite.config.ts        # Vite 配置
└── README.md
```
