# 来源包与证据映射 (RESOURCES)

本文件登记《前端转 AI 全栈：从交互体验到生产级交付》课程的所有事实来源、可信等级与章节断言映射。杜绝编造内容或使用不可靠的二手网帖。

---

## 一、可信等级定义

- **等级 A（官方规范与一手代码）**：语言官方标准（ECMAScript/TypeScript）、官方框架文档（Fastify, Next.js, PostgreSQL, Redis, Docker）、云厂商 API 契约（OpenAI, Anthropic, Google）、企业真实生产代码仓库。具备最高权重，所有核心机制与配置以此为准。
- **等级 B（权威工程实践与同行评审论文）**：Google Engineering Practices、Martin Fowler 企业应用架构模式、RAG 评测权威论文（如 RAGAS 框架论文）、知名大厂公开事故复盘。用于支撑架构选型与权衡决策。
- **等级 C（课程前置输入文档）**：`前端转AI全栈路线优化版.md`，承载本课程的核心逻辑骨架、转型痛点总结与项目演进路线，作为课程任务范围的直接需求输入。

---

## 二、核心来源清单

| 来源 ID | 来源名称 | 作者 / 维护组织 | 类别 / 载体 | 可信等级 | 适用章节 | 访问 / 锁定版本 |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `SRC-ORIGIN` | 《前端转 AI 全栈路线优化版》 | 课程发起人 | 本地 Markdown 文档 | 等级 C | 全书各章 | 本地基准文档 (2026) |
| `SRC-FASTIFY` | Fastify Official Documentation | Fastify Team / OpenJS | 官方文档 | 等级 A | 第 02, 06 章 | Fastify v4.x / v5.x |
| `SRC-PG` | PostgreSQL 16 Official Manual | PostgreSQL Global Development Group | 官方技术手册 | 等级 A | 第 03, 08 章 | PostgreSQL 16.x |
| `SRC-PGVECTOR` | pgvector: Open-source vector similarity search for Postgres | pgvector contributors | GitHub 开源项目规范 | 等级 A | 第 03, 08 章 | pgvector v0.7+ |
| `SRC-REDIS` | Redis Documentation & Patterns | Redis Ltd. | 官方开发指南 | 等级 A | 第 04 章 | Redis 7.2+ |
| `SRC-OPENAI-API` | OpenAI API Reference (SSE, Streaming, Function Calling) | OpenAI | 官方开发者参考手册 | 等级 A | 第 06, 07, 10 章 | 2024–2026 API Spec |
| `SRC-RAGAS` | Ragas: Automated Evaluation of Retrieval Augmented Generation | Exploding Gradients / Paper | 开源规范与学术论文 | 等级 B | 第 09 章 | Ragas v0.1+ |
| `SRC-DOCKER` | Docker Documentation & Best Practices for Node.js | Docker Inc. | 官方工程指南 | 等级 A | 第 11 章 | Docker Engine 24+ |
| `SRC-SPRING-AI` | Spring AI Reference Documentation | VMware Tanzu / Broadcom | 官方工程指南 | 等级 A | 第 12 章 | Spring AI 1.0+ |
| `SRC-CORP-JAVA` | 企业 Java 微服务项目架构与代码库规范 | itran-cargoplus-cloud 团队 | 企业真实代码工程结构 | 等级 A | 第 12 章 | Spring Boot 3.3.13 / Cloud 2023 |

---

## 三、关键断言与证据映射表

| 核心断言 / 架构设计原则 | 支撑来源 | 证据所在段落 / 官方规范点 | 教学应用与落地要求 |
| :--- | :--- | :--- | :--- |
| **“会调 API + 会写页面不等于 AI 全栈，真正的分水岭在边界设计、认证、排错与可观测”** | `SRC-ORIGIN` | 第一节“先给结论” | 在第 01 章作为核心冲突展开，通过一次线上故障案例直观呈现。 |
| **“主次技术路线：TypeScript 做主线打通端到端，Python 做评测与数据副线”** | `SRC-ORIGIN` | 第三节“技术选型存在二选一陷阱” | 避免陷入语言之争，主线用 Fastify/Next.js 交付业务，副线用 Python 做 Ragas 评测。 |
| **“Fastify 提供结构化 Schema 验证（TypeBox/Zod），天然阻断非法输入并提升吞吐”** | `SRC-FASTIFY` | Fastify Validation and Serialization | 第 02 章中演示如何用 JSON Schema / TypeBox 获得编译期与运行时双重保障。 |
| **“PostgreSQL pgvector 支持 HNSW 与 IVFFlat 索引，在十万级知识库内兼顾事务与检索”** | `SRC-PGVECTOR` | pgvector 索引性能评测与 SQL 语法 | 第 03 章中对比专用向量库与关系库插件的权衡，提供建表与 HNSW 索引 SQL。 |
| **“分布式限流必须使用 Redis + Lua 脚本保证原子性，防止高并发穿透”** | `SRC-REDIS` | Redis Programmability & Lua Scripts | 第 04 章给出生产级滑动窗口限流 Lua 脚本，避免并发竞态条件。 |
| **“服务端调用 LLM 必须依靠 SSE (Server-Sent Events) 与 AbortSignal 联动，客户端断开立即释放后端 Token”** | `SRC-OPENAI-API`, `SRC-FASTIFY` | Streams & Async Iteration in Node.js | 第 06 章剖析客户端点击“停止生成”后，服务端若不断开连接导致严重 Token 浪费的事故。 |
| **“RAG 质量不能靠感性判断，必须量化 Faithfulness（真实性）与 Context Precision（上下文精度）”** | `SRC-RAGAS` | Ragas 核心度量体系定义 | 第 09 章提供自动化评测代码，给出 30 组问答评测报告与指标计算脚本。 |
| **“Agent 工具调用必须实施白名单、强参数校验，涉及资金/删除等高风险操作必须人工显式确认”** | `SRC-ORIGIN` | 第六节“阶段 5：Agent 与生产化” | 第 10 章设计受控状态机，提供 Human-in-the-Loop 的双重确认交互机制。 |
| **“多阶段 Docker 构建能把 Node.js 镜像从 1GB+ 缩减至 150MB 以下，显著降低漏洞暴露面”** | `SRC-DOCKER` | Multi-stage builds for Node.js applications | 第 11 章提供生产级多阶段 Dockerfile 与非 root 用户运行配置。 |
| **“读懂 Java 微服务调用链优先掌握 Controller → Service → Mapper，禁止循环内逐条查询 (N+1)”** | `SRC-ORIGIN`, `SRC-CORP-JAVA` | 第十二节“结合公司项目的 Java 最短学习路线” | 第 12 章用货运业务为例剖析 Spring AI 流式调用与 SQL 批量优化，打通跨团队协作。 |

---

## 四、使用限制与合规红线

1. **脱敏红线**：所有引用自真实企业项目的业务实体（如货运、航班、仓单代码），必须做字段与名称脱敏，禁止在公开正文中泄露真实生产数据库密码、Nacos 配置或内部专用 IP。
2. **时效性红线**：不使用已经宣布废弃的 API（如 OpenAI 废弃的 `Completion` 接口、已废弃的 LangChain 抽象链）。
3. **不可伪造红线**：所有代码示例与测试数据必须真实通过本地运行验证，禁止虚构测试通过率与运行日志。
