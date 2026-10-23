# 课程设计笔记与确认记录 (NOTES)

本文件记录课程生成过程中的风格决策、标杆章校准结论、生成批次安排与衔接约束。

---

## 一、风格与基调决策

1. **拒绝“浮夸宣传”，保持“硬核务实”**：
   - 前端转型最容易被市场上的“3 天学会大模型”、“零代码做 Agent”等营销话术误导。
   - 本课程一律采用一线后端/架构师视角，每讲一个概念，必须回答三问：“它解决了什么问题？”、“高并发或异常时它怎么挂的？”、“线上挂了该看哪个日志排查？”。
2. **拒绝“语法复述”，注重“工程闭环”**：
   - 不讲无上下文的纯语法（如“什么是 TypeScript interface”或“什么是 Java for 循环”）。
   - 代码全部嵌入在带有工程上下文的真实模块中（例如在 Fastify 中结合 Zod 实现入参守卫；在 Spring Boot 中分析 Controller 到 Mapper 的数据流向）。
3. **主项目贯穿全书**：
   - 确定贯穿全书的核心业务项目为：“带权限的企业知识库 AI 助手（Enterprise Knowledge Copilot）”。
   - V1：第 01–05 章打磨核心后端服务（用户、知识库、文档 CRUD、权限隔离、Redis 限流）。
   - V2：第 06–07 章引入服务端 LLM 代理网关、流式长连接 (SSE) 与受控结构化输出。
   - V3：第 08–09 章构建工业级混合检索 RAG 管线与自动化黄金评测集。
   - V4：第 10–11 章升级为具备工具调用白名单、人机协同审核（Human-in-the-Loop）与 Docker 容器化交付的生产级系统。
   - 企业级延伸（第 12 章）：打通与公司微服务调用链（Spring Cloud / Spring AI）协同的接口与排错通道。

---

## 二、标杆章 (Benchmark Lessons) 校准结论

- **标杆章 1（认知与架构标杆）**：`lessons/01-mindset-and-fullstack-boundary.md`
  - 确立了全书的叙事节奏：从一次生动的真实事故切入 -> 拆解玩具与生产级的鸿沟 -> 提出四层能力模型 -> 给出行之有效的演进路线。
- **标杆章 2（深度实战标杆）**：`lessons/06-streaming-sse-and-llm-gateway.md`
  - 确立了实战章节的技术深度：Mermaid 时序图明确前后端交互 -> 剖析 AbortSignal 联动切断上游推理以杜绝 Token 泄漏 -> 提供可直接运行的完整 TypeScript/Fastify 代码与 React 消费 Hook。

---

## 三、批次生成规划

- **批次 1（第 01–03 章）**：认知重塑、服务端 Fastify 契约工程、PostgreSQL 与 pgvector 关系存储。
- **批次 2（第 04–06 章）**：Redis 高并发护城河、JWT/RBAC 安全防线、SSE 流式服务与 Token 成本控制。
- **批次 3（第 07–09 章）**：结构化输出与 Tool Calling、工业级 RAG 混合检索、Ragas 自动化量化评测体系。
- **批次 4（第 10–12 章）**：受控业务 Agent、Docker 运维交付与故障复盘、企业级 Java 微服务协同实战。
- **附录手册**：`reference/glossary.md`（高频术语速查）与 `reference/checklist.md`（生产上线检查清单）。
