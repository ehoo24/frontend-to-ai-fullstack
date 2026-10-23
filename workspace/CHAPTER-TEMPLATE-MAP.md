# 章节模板映射与写法组合 (CHAPTER-TEMPLATE-MAP)

本文件登记《前端转 AI 全栈：从交互体验到生产级交付》全书 12 章的主模板类型、辅助模板模块与选型理由，严格契合 `teach-yourself-skill` 的模板组合规范。

---

## 一、模板类型总览

- `opening-closing`：开篇认知重构、课程收敛与全景图，侧重价值定位与路径指引。
- `framework`：单库/框架/核心机制应用，侧重最小闭环、参数配置与错误模式。
- `mechanism-diagnostics`：原理下钻、性能瓶颈、真实事故与排错诊断，侧重实验与反例。
- `integrated-practice`：跨组件端到端综合实战、架构搭建与验收，侧重系统集成。
- `environment`：容器化、CI/CD 流水线与交付部署，侧重环境确定性与操作核验。
- `language`：跨语言心智映射（TypeScript 到 Java/Python），侧重调用链与工程模式对照。

---

## 二、逐章模板映射矩阵

| 章节编号与标题 | 主模板类型 | 辅助模块 / 借用组件 | 选型理由 |
| :--- | :--- | :--- | :--- |
| **第 01 章 认知重塑** | `opening-closing` | `mechanism-diagnostics` (事故案例复盘) | 从一起真实的前端直调 Token 泄露事故切入，重构全栈工程认知与四层能力模型。 |
| **第 02 章 服务端工程基石** | `framework` | `integrated-practice` (前后端类型共享) | 介绍 Fastify 与 Zod 校验，重点建立入参拦截、统一响应和前后端类型闭环。 |
| **第 03 章 核心数据存储** | `framework` | `mechanism-diagnostics` (并发超卖与锁) | PostgreSQL 关系建模与 pgvector 插件应用，必须用悲观锁实验验证并发扣减安全性。 |
| **第 04 章 高并发护城河** | `mechanism-diagnostics` | `framework` (Redis Lua 封装) | 核心任务是排查与防御缓存击穿/穿透/雪崩，借助滑动窗口 Lua 脚本实现硬限流。 |
| **第 05 章 生产级安全防护** | `framework` | `mechanism-diagnostics` (越权与注入拦截) | 涉及 JWT 鉴权中间件与 RBAC，必须配套 Prompt 注入攻击与多租户越权防御实战。 |
| **第 06 章 生产级 LLM 服务** | `framework` | `mechanism-diagnostics` (连接泄漏与熔断) | SSE 流式长连接与 AbortSignal 是 AI 网关核心，诊断客户端断开导致服务端 Token 跑飞的顽疾。 |
| **第 07 章 结构化输出** | `framework` | `integrated-practice` (Tool Calling 闭环) | 讲解 Zod Schema 受限生成与 Function Calling 工具调度执行。 |
| **第 08 章 工业级 RAG 架构** | `integrated-practice` | `mechanism-diagnostics` (单向量偏科与重排) | 串联切分、混合检索、RRF 融合与权限隔离，是完整的综合架构实践。 |
| **第 09 章 RAG 黄金评测集** | `mechanism-diagnostics` | `integrated-practice` (自动化流水线) | 围绕 Faithfulness、Context Precision 诊断问答退化，副线 Python 运行自动化评估。 |
| **第 10 章 受控业务 Agent** | `integrated-practice` | `mechanism-diagnostics` (死循环与防失控) | 构建有限状态机与人机审核卡片，治理自主 Agent 失控风险。 |
| **第 11 章 容器化交付与运维** | `environment` | `mechanism-diagnostics` (Post-mortem 模板) | Docker 多阶段构建与 GitHub Actions 质量门禁，附带一份真实的生产故障复盘。 |
| **第 12 章 企业微服务协同** | `language` | `mechanism-diagnostics` (N+1 与事务边界) | 建立 TS/Node 与 Java Spring Cloud 的架构心智映射，剖析 Spring AI 流式调用与排错。 |

---

## 三、组合冲突检查

1. **避免双重主线**：同一章内不得出现两个竞争的框架作为核心。第 03 章核心是 PostgreSQL + pgvector，不横生枝节引入 MongoDB；第 12 章核心是 Spring Boot 调用链心智映射，不扩充到 JPA 或分布式事务底层源码。
2. **前后依赖承接**：第 08 章 RAG 依赖第 03 章的 pgvector 表与第 06 章的流式长连接，杜绝超前引用或颠倒顺序。
