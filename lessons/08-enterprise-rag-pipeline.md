# 第 8 章 工业级 RAG 检索管线：清洗切分、混合召回、重排与权限隔离

> 预计学习时间：95–130 分钟  
> 一句话总结：玩具 RAG 只是把文本按固定字数切碎塞进向量库；工业级 RAG 是一套精密的搜索工程，涵盖文档语义感知切分、关键词与向量混合双路召回、RRF 互惠融合重排以及严格的物理权限防线。

---

## 玩具 RAG 的破灭：为什么简单向量检索在生产中频频“胡说八道”

很多团队在学习了向量数据库后，都会按教程搭建一套最朴素的 RAG（检索增强生成，Retrieval-Augmented Generation）：
> 读取 TXT/PDF -> 每 500 字机械切一刀 -> 调 OpenAI Embedding 存入向量库 -> 用户提问 -> 查 Top-3 向量相似片段 -> 拼入 Prompt 让大模型回答。

当你满怀期待将这套系统交付给企业业务部门使用时，用户很快会反馈大量不可理喻的错误：
1. **精准专有名词搜不出**：当用户提问：“错误码 `ERR_AUTH_0921` 是什么原因？”，纯向量检索往往召回的是一堆讲“用户认证错误”的宽泛文章，因为高维向量擅长语义模糊联想，但对**精准型号、序列号、错误代码、函数名等生僻字符串极度钝化**。
2. **上下文语义被粗暴腰斩**：一段重要的免责条款或核心配置代码恰好跨越了第 500 个字符的分界线，前半段和后半段分别被切进两个独立的切片。两段各自孤立看，语义完全残缺，甚至产生与原意完全相反的理解。
3. **低质量噪音干扰生成**：向量检索出来的 Top-5 片段中，可能只有 1 条是真正相关的，其余 4 条只是语气相似的废话。大模型将这 4 条无关噪音全部塞进上下文，不仅消耗高昂的 Token，还会直接被误导产生严重幻觉。

---

## 工业级 RAG 完整全景流水线

为了解决上述缺陷，生产级 RAG 必须构建一条层次严密、证据链完备的检索增强流水线：

```mermaid
flowchart TD
  subgraph 离线处理阶段 (Ingestion Pipeline)
    Doc["原始企业文档 (Markdown/PDF/Docx)"] --> Clean["文本清洗与元数据注入 (标题层级/部门标签)"]
    Clean --> Splitter["Markdown 语法感知递归智能分块 (保留标题上下文)"]
    Splitter --> Embed["计算稠密向量 (Embedding)"]
    Splitter --> FTS_Gen["生成全文检索分词 (PostgreSQL tsvector)"]
    Embed --> DB[("PostgreSQL 16\n同时写入: 结构化元数据 + HNSW 向量 + 全文倒排索引")]
    FTS_Gen --> DB
  end

  subgraph 在线问答阶段 (Query Pipeline)
    Query["用户提问: '货运舱单报送超时怎么处理？'"] --> QueryEmbed["生成提问向量"]
    Query --> QueryKeyword["提取查询关键词"]
    
    QueryEmbed --> DenseSearch["路 A: pgvector 稠密语义检索 (召回 Top-20)"]
    QueryKeyword --> SparseSearch["路 B: tsvector 稀疏全文检索 (召回 Top-20)"]
    
    DenseSearch --> RRF["RRF 互惠排名融合 (Reciprocal Rank Fusion)"]
    SparseSearch --> RRF
    
    RRF --> Rerank["Cross-Encoder 精排模型 (Reranker 打分，截取 Top-3 精华)"]
    Rerank --> ContextBuilder["构建带真实角标引用的提示词上下文 [Ref: Doc#Chunk]"]
    ContextBuilder --> LLM["大模型流式生成最终严谨结论，并在前端高亮溯源"]
  end
```

---

## 智能切分实战：Markdown 语义感知分块

不要按固定长度盲目切分。对于企业技术文档或知识库，通常采用**层次感知切分**，保留父级标题层级（Header Breadcrumbs），确保切片脱离原文档后依然具备完整的上下文语境。

```typescript
export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  metadata: {
    sectionHeader: string;
    tokenCount: number;
  };
}

export function smartMarkdownSplitter(
  fullMarkdown: string,
  maxChunkSize = 600,
  overlap = 100
): DocumentChunk[] {
  const lines = fullMarkdown.split("\n");
  const chunks: DocumentChunk[] = [];
  
  let currentHeader = "引言/全局概述";
  let currentBuffer: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (const line of lines) {
    // 捕获 Markdown 各级标题 (# 一级标题, ## 二级标题)
    if (/^#{1,3}\s+(.+)/.test(line)) {
      currentHeader = line.replace(/^#{1,3}\s+/, "").trim();
    }

    currentBuffer.push(line);
    currentLength += line.length;

    // 当缓冲区达到切片大小阈值时，封包一个切片
    if (currentLength >= maxChunkSize) {
      const chunkText = currentBuffer.join("\n").trim();
      // 在正文头部注入当前所属的章节面包屑信息！
      const enrichedContent = `【所属章节: ${currentHeader}】\n${chunkText}`;

      chunks.push({
        chunkIndex: chunkIndex++,
        content: enrichedContent,
        metadata: {
          sectionHeader: currentHeader,
          tokenCount: Math.ceil(enrichedContent.length / 2),
        },
      });

      // 保留末尾 overlap 行用于重叠滑动窗口，防止边界语句被生硬切断
      const overlapLines = currentBuffer.slice(-3);
      currentBuffer = [...overlapLines];
      currentLength = overlapLines.join("\n").length;
    }
  }

  // 处理剩余尾部内容
  if (currentBuffer.length > 0) {
    const remainingText = currentBuffer.join("\n").trim();
    if (remainingText.length > 50) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content: `【所属章节: ${currentHeader}】\n${remainingText}`,
        metadata: {
          sectionHeader: currentHeader,
          tokenCount: Math.ceil(remainingText.length / 2),
        },
      });
    }
  }

  return chunks;
}
```

---

## 混合检索 (Hybrid Search)：PostgreSQL 双路召回

在同一个 PostgreSQL 数据库中，我们可以完美融合**稀疏关键词检索（Full-Text Search）**与**稠密语义检索（pgvector）**：

### 1. 数据库准备：配置全文检索索引与向量索引

```sql
-- 在 document_chunks 表中增加全文搜索倒排索引字段
ALTER TABLE document_chunks ADD COLUMN tsv TSVECTOR;

-- 自动生成分词向量 (支持英文及常见词，中文可结合 pg_jieba 或 ngram)
UPDATE document_chunks 
SET tsv = to_tsvector('english', content);

-- 创建 GIN 全文索引与 HNSW 向量索引
CREATE INDEX idx_chunks_tsv ON document_chunks USING GIN(tsv);
CREATE INDEX idx_chunks_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

### 2. 双路召回与 RRF (互惠排名融合) 算法

RRF（Reciprocal Rank Fusion）是搜索领域公认的高稳定性融合算法，其评分公式为：
\[
RRF\_Score(d) = \frac{1}{k + rank_{dense}(d)} + \frac{1}{k + rank_{sparse}(d)}
\]
其中常数 $k$ 默认取 60。它将两路检索的排序名次进行加权，完美避开了单纯依靠绝对分值无法对齐的弊端：

```typescript
export interface RankedResult {
  id: string;
  content: string;
  documentId: string;
  rrfScore: number;
}

export async function hybridSearch(
  tenantId: string,
  queryText: string,
  queryVector: number[],
  topK = 5
): Promise<RankedResult[]> {
  // 单条 SQL 即可在 PostgreSQL 内部一次性完成双路召回与 RRF 融合！
  const sql = `
    WITH vector_search AS (
        SELECT id, content, document_id,
               ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) as rank_dense
        FROM document_chunks
        WHERE tenant_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 20
    ),
    keyword_search AS (
        SELECT id, content, document_id,
               ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, plainto_tsquery('english', $3)) DESC) as rank_sparse
        FROM document_chunks
        WHERE tenant_id = $2 AND tsv @@ plainto_tsquery('english', $3)
        LIMIT 20
    )
    SELECT 
        COALESCE(v.id, k.id) as id,
        COALESCE(v.content, k.content) as content,
        COALESCE(v.document_id, k.document_id) as document_id,
        (
            COALESCE(1.0 / (60 + v.rank_dense), 0.0) +
            COALESCE(1.0 / (60 + k.rank_sparse), 0.0)
        ) AS rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT $4;
  `;

  const res = await dbPool.query(sql, [
    JSON.stringify(queryVector),
    tenantId,
    queryText,
    topK,
  ]);

  return res.rows.map((r: any) => ({
    id: r.id,
    content: r.content,
    documentId: r.document_id,
    rrfScore: parseFloat(r.rrf_score),
  }));
}
```

---

## 来源可溯源性 (Citations)：严谨的角标定位

用户不信任 AI 的核心原因就是“不知道你是不是在胡扯”。生产级 RAG 必须在提示词与前端交互中，建立**像学术论文一样严谨的角标溯源体系**。

### 1. 组装携带角标的提示词 (Prompt Assembly)

```typescript
export function buildPromptWithCitations(userQuestion: string, chunks: RankedResult[]) {
  const contextSections = chunks
    .map((c, idx) => `[来源编号: ${idx + 1}] (文档ID: ${c.documentId}):\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `你是一个严谨的企业知识库助理。请严格基于给出的参考资料回答问题。
准则：
1. 回答的每一句关键断言，末尾必须用 [来源编号] 进行溯源标注（例如：根据考勤规定，年假需提前 3 天申请 [1]）。
2. 如果参考资料中完全没有提及与问题相关的事实，请明确回答：“抱歉，依据现有企业知识库资料，无法找到关于该问题的确切记录。”切勿随意编造假想事实！`;

  const userPrompt = `参考资料如下：\n\n${contextSections}\n\n用户问题：${userQuestion}`;

  return { systemPrompt, userPrompt };
}
```

### 2. 前端角标高亮交互

在前端 React 渲染大模型返回的 Markdown 内容时，利用自定义正则或 Remark 插件将 `[1]`、`[2]` 渲染为带下划线的小徽章按钮（Badge / Chip）。点击徽章时，右侧弹窗直接展开对应的真实切片全文，并高亮匹配段落，让用户一眼看清出处。

---

## 边界误区与排错清单

### 1. 致命误区
- **盲目扩大 Top-K**：认为“既然怕漏，那我一次性把 Top-30 全喂给大模型”。过多的上下文会导致大模型的**“迷失在中间（Lost in the Middle）”**现象——模型只关注前几句和后几句，中间的关键信息被完全忽略，且单次问答 Token 费用激增数倍。
- **未及时同步知识库的删除与更新**：文档在数据库被软删除或更新后，切片表和向量索引没有同步触发刷新，导致已被作废的历史过期制度依然被召回并展示给员工。

### 2. RAG 生产上线自检表
- [ ] 是否采用了混合检索（Hybrid Search），避免单一向量对错误码、型号代码召回失效？
- [ ] 切片逻辑是否保留了 Markdown 章节层级元数据，避免切片语义破碎？
- [ ] 检索 SQL 中是否绑定了租户隔离与部门权限，防止越权拉取绝密资料？
- [ ] 模型提示词中是否明确配置了“无依据时主动拒答”，有效遏制幻觉？

---

## 课后迁移实践任务

1. **混合检索效果对比实验**：在本地数据库录入一篇包含生僻参数名（如 `max_concurrent_connections_per_worker = 1024`）的技术文档。分别用纯向量检索和本章的混合检索脚本查询该参数名，观察并记录两者的召回排序位次差异。
2. **拒答能力测试**：向知识库提问一个完全不存在的内容（如“公司 2028 年火星建设计划”），验证系统是否准确触发了拒答分支，而非胡编乱造。
