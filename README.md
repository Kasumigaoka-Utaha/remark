# AI 写评页 Demo

一个基于 Next.js 的移动端 AI 写评 demo，包含普通写评页、AI 写评对话、评分引导、追问、提交成功页和继续评价链路。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 构建检查

```bash
npm run lint
npm run build
```

## AI 环境变量

项目支持接入 OpenAI-compatible Chat Completions 接口。未配置环境变量时，会自动使用本地规则追问逻辑兜底。

需要配置的环境变量：

```bash
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=你的 API Key
AI_MODEL=gpt-4o-mini
```

说明：

- `AI_BASE_URL`：兼容 OpenAI API 的 base URL，通常包含 `/v1`。
- `AI_API_KEY`：服务端调用 AI 的密钥，不要提交到 Git。
- `AI_MODEL`：要使用的模型名称。

## 本地配置环境变量

在项目根目录新建 `.env.local`：

```bash
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=你的 API Key
AI_MODEL=gpt-4o-mini
```

然后重启开发服务：

```bash
npm run dev
```

## Vercel 环境变量配置教程

1. 打开 Vercel Dashboard，进入当前项目。
2. 点击 `Settings`。
3. 点击左侧 `Environment Variables`。
4. 依次新增以下变量：

```text
AI_BASE_URL
AI_API_KEY
AI_MODEL
```

5. 每个变量的 `Environment` 建议勾选：
   - `Production`
   - `Preview`
   - `Development`

6. 点击 `Save` 保存。
7. 回到 `Deployments`，选择最新部署，点击 `Redeploy`。

注意：Vercel 修改环境变量后，已部署版本不会自动读取新值，需要重新部署。

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 在 Vercel 点击 `Add New...` -> `Project`。
3. 选择 GitHub 仓库并导入。
4. 保持默认配置：
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Install Command: `npm install`
5. 如需真实 AI 回复，先按上方教程配置环境变量。
6. 点击 `Deploy`。

## Demo 规则

- AI 只做判断和追问，不代写、不润色、不总结、不改写用户评价。
- 用户评分后，系统会记录星级，并从用户侧生成对应评分消息。
- 用户一言，系统一语，持续追问评价细节。
- 未配置 AI 环境变量时，接口使用本地规则追问。
- 配置 AI 环境变量后，接口优先调用真实 AI，失败时回退本地规则。
