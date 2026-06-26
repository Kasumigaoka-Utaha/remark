# AI 写评页 Demo

一个基于 `ai写评页.docx` PRD 和 `demo.png` UI 参考实现的 Next.js 产品 demo。Demo 模拟「和小评聊聊这单」入口、AI 对话写评、规则检测、补图轻提示、提交成功和续评链路。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 构建检查

```bash
npm run build
```

## 部署到 Vercel

1. 初始化 Git 仓库并提交代码：

```bash
git init
git add .
git commit -m "init ai review demo"
```

2. 在 GitHub 新建仓库，并按 GitHub 页面提示推送当前项目。

3. 打开 Vercel 控制台，点击 `Add New...` -> `Project`。

4. 选择刚推送的 GitHub 仓库并导入。

5. 保持默认配置：
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: 默认留空
   - Install Command: `npm install`

6. 本 demo 不需要环境变量，直接点击 `Deploy`。

7. 部署完成后，Vercel 会生成一个线上访问地址。

## Demo 规则

- AI 只做判断和追问，不代写、不润色、不总结、不改写用户评价。
- 有用评价候选标准：用户原文有效字数满 10 字，且命中至少 1 个有用维度。
- 服饰维度包括：尺码、面料、上身效果、颜色、做工、物流包装。
- 主动追问最多 2 轮。
- 图/视频提示只出现一次，且不是提交前置条件。
- 提交内容只包含用户输入原文和用户上传媒体状态，不包含小评气泡。
