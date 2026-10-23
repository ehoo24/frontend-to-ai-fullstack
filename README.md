# 前端转 AI 全栈：从交互体验到生产级交付

> 本课程体系遵循 [teach-yourself-skill](https://github.com/chokcoco/teach-yourself-skill) 规范构建，涵盖四层能力模型（产品交付、服务工程、AI 工程、生产运营）与企业真实微服务协同体系。

---

## 📖 如何在其他电脑上拉取并学习？

### 方式一：本地极速离线阅读（零依赖、开箱即用）

1. **克隆仓库到本地**：
   ```bash
   git clone <你的远程仓库地址>
   cd frontend-to-ai-fullstack
   ```
2. **直接阅读**：
   - **无需安装任何环境**（不需要装 Node.js，不需要起服务）；
   - 直接用任意浏览器（Chrome / Edge / Safari）双击打开根目录下的 **`index.html`**；
   - 即可畅享完整掘金风格三栏阅读、左侧章节导航快速切换、右侧大纲高亮与 Mac 风格代码一键复制功能。

---

### 方式二：一键免费部署为在线学习网站 (GitHub Pages)

将本仓库推送到 GitHub 后，只需开启免费的 GitHub Pages：
1. 打开 GitHub 仓库页面，点击 **Settings（设置）** -> **Pages**。
2. 在 **Branch** 处选择 `main`（或 `master`），目录选择 `/ (root)`，点击 **Save**。
3. 稍等 1 分钟，GitHub 会自动为你生成专属公网访问地址（如 `https://<用户名>.github.io/<仓库名>/`），手机、平板、电脑均可随时随地在线阅读！

---

## 📂 目录结构与内容地图

```text
frontend-to-ai-fullstack/
├── index.html                      # 课程总览门户首页 (双击直接阅读)
├── course.json                     # 课程机器可读元数据清单
├── assets/                         # 掘金高质感阅读样式与交互引擎
│   ├── juejin.css                  # 三栏布局、Mac 代码框、告警卡片样式
│   └── juejin.js                   # 目录滚动监听 (Scroll Spy)、一键复制代码、章节居中联动
├── lessons/                        # 12 大核心实战章节 (包含 .html 与 .md 事实源)
│   ├── 01-mindset-and-fullstack-boundary.html        # 第 01 章 认知重塑: 会调 API ≠ AI 全栈
│   ├── 02-fastify-rest-and-contract.html             # 第 02 章 服务端基石: REST 与 Zod 契约
│   ├── 03-postgresql-modeling-and-pgvector.html      # 第 03 章 核心存储: PG 建模与 pgvector (深度章)
│   ├── 04-redis-cache-ratelimit-and-queue.html       # 第 04 章 高并发护城河: Redis 缓存穿透与限流
│   ├── 05-auth-rbac-and-security.html                # 第 05 章 生产安全: 双 Token 轮转与防注入
│   ├── 06-streaming-sse-and-llm-gateway.html         # 第 06 章 生产级 LLM 服务: SSE 与中断熔断 (深度章)
│   ├── 07-structured-output-and-tool-calling.html    # 第 07 章 结构化输出: 受限解码与工具闭环
│   ├── 08-enterprise-rag-pipeline.html               # 第 08 章 工业级 RAG: 混合召回与重排 (深度章)
│   ├── 09-rag-evaluation-and-cost-observability.html # 第 09 章 数据量化: Ragas 黄金评测集与监控 (深度章)
│   ├── 10-controlled-agent-and-human-in-the-loop.html# 第 10 章 受控 Agent: 状态机与人机审核卡片
│   ├── 11-docker-cicd-and-reliability.html           # 第 11 章 容器化交付: 多阶段构建与故障复盘
│   └── 12-java-spring-cloud-collaboration.html       # 第 12 章 微服务协同: Spring Cloud 与 Spring AI
├── reference/                      # 配套辅助参考资料
│   ├── glossary.html / .md         # 核心专有名词速查表 (BFF, HNSW, RRF, SSE, N+1等)
│   └── checklist.html / .md        # 生产上线前四维检查清单与排错速查手册
├── workspace/                      # 教学创作工作区 (决策与事实映射，学生不可见)
│   ├── MISSION.md                  # 课程使命定义
│   ├── RESOURCES.md                # 来源包与证据映射
│   ├── COURSE-GENERATION-SPEC.md   # 章节工程规格
│   ├── COURSE-BLUEPRINT.md         # 逐章全景蓝图
│   ├── CHAPTER-TEMPLATE-MAP.md     # 逐章主副模板组合映射
│   └── NOTES.md                    # 架构笔记与演进记录
├── quality/                        # 质检评估报告
│   ├── phase-1-deterministic.md    # 第一阶段质检报告 (0 error, 0 warning 通过)
│   └── phase-2-rubric-course.md    # 第二阶段课程量规审校报告 (ready)
└── scripts/
    ├── build-juejin-html.mjs       # Markdown 转掘金风格 HTML 编译脚本
    └── validate-course.mjs         # 确定性质检脚本
```

---

## 🛠️ 后续扩展与本地二次编译（可选）

如果你修改了 `lessons/*.md` 想要重新生成 HTML：
```bash
# 安装轻量 markdown 解析器 (仅需一次)
npm install marked

# 重新全量编译生成所有 HTML 页面
node scripts/build-juejin-html.mjs

# 运行自动化质量门禁检查
node scripts/validate-course.mjs .
```
