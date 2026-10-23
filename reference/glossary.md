# 前端转 AI 全栈核心术语速查表 (Glossary)

本速查表收录《前端转 AI 全栈：从交互体验到生产级交付》全课程涉及的核心架构、后端工程与 AI 专用名词，供随时查阅与复核。

---

## 一、架构与服务工程术语

### BFF (Backend for Frontend)
服务于前端的后端层。通常由前端或全栈团队采用 Node.js/Next.js/Fastify 维护，负责聚合下游微服务数据、裁剪字段、维护用户会话，并作为安全网关调用大模型，防止敏感凭据外泄至浏览器端。

### 幂等性 (Idempotency)
一个 HTTP 接口无论被重复调用多少次，其对系统状态产生的副作用均与单次调用一致。例如：携带同一个 `Idempotency-Key` 的支付或任务创建请求，第二次执行时直接返回第一次的结果，杜绝重复扣费或重复创建。

### 悲观锁 (Pessimistic Locking / SELECT ... FOR UPDATE)
在关系型数据库事务中，为防止多个并发请求同时修改同一行数据（如同时扣减用户 Token 余额导致超卖），在读取数据时显式加行级互斥锁，直到当前事务提交（COMMIT）后才释放。

### 滑动窗口限流 (Sliding Window Rate Limiting)
一种比固定窗口更平滑的限流算法。通常利用 Redis 的有序集合（Sorted Set / ZSET）记录每次请求的时间戳，精确统计“当前时间向前推移 1 分钟内的总请求数”，杜绝在两个相邻窗口临界点被双倍突发流量打垮的情况。

---

## 二、LLM 与 AI 工程术语

### SSE (Server-Sent Events)
一种基于单向长连接的 HTTP 服务端推送技术（`Content-Type: text/event-stream`）。相比 WebSocket 的双向开销，SSE 更轻量，完美契合 LLM“客户端发起一次问答，服务端持续流式逐字回传”的业务场景。

### TTFT (Time To First Token)
首字生成延迟，即从用户点击“发送”到界面打印出第一个字符的时间间隔。流式问答的核心目标就是将 TTFT 压低至 500ms 左右，大幅降低用户的等待焦虑。

### 结构化输出 (Structured Outputs)
一种通过大模型解码约束（Constrained Decoding）技术，强制模型 100% 遵守给定的 JSON Schema 格式输出，彻底解决传统 Prompt 偶发输出 Markdown 代码块或多余解释文字导致程序反序列化崩溃的问题。

### pgvector
PostgreSQL 的开源向量扩展插件。允许在常规关系型数据表中直接新增 `vector` 字段，并支持使用 HNSW（分层导航小世界）或 IVFFlat 索引进行极速余弦距离或欧氏距离近似最近邻（ANN）检索。

### 混合检索 (Hybrid Search)
将基于关键词的稀疏检索（如 PostgreSQL `tsvector` 全文检索，擅长精准匹配零件型号、专有名词、API 名称）与基于语义的密集检索（Embedding 向量余弦相似度，擅长同义词意图匹配）相结合的双路召回策略。

### RRF (Reciprocal Rank Fusion)
互惠排名融合算法。用于将全文搜索和向量检索两份不同的排名列表无缝合并。公式为：
\[
RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}
\]
其中 \(k\) 通常取 60，能有效平衡不同评分维度的绝对数值差异，大幅提升召回稳定性。

### 真实性 (Faithfulness) 与幻觉度量
RAG 质量评价的核心指标。衡量模型给出的回答是否严格来源于检索到的上下文片段（Context Chunks）。如果回答中包含了上下文中未提及的虚构断言，则判定产生幻觉，Faithfulness 分数降低。

---

## 三、微服务与协同术语

### Feign
声明式 Web 服务客户端（常见于 Spring Cloud 体系）。开发者只需定义一个带有注解的 Java 接口，Feign 就会在运行时自动生成跨微服务的 HTTP 调用、序列化与超时重试代码。

### N+1 查询问题
在 ORM（如 MyBatis-Plus 或 Hibernate）中极易发生的性能缺陷：先执行 1 条 SQL 查出 20 条主记录，然后在代码循环中对每条记录各自执行 1 条 SQL 查询关联详情，总计引发 21 次数据库网络 I/O。解决方案为批量查询（`WHERE id IN (...)`）并在内存中通过 Map 关联。

### 多租户上下文 (TenantContext)
在企业级 SaaS 系统中，通过线程本地变量（`ThreadLocal`）或上下文拦截器，将当前登录用户所属的企业/租户 ID 隐式向下传递，并由 MyBatis 拦截器自动在所有 SQL 语句后追加 `WHERE tenant_id = ?`，防止跨租户越权。
