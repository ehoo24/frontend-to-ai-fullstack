# 第 11 章 容器化交付、CI/CD 自动化部署与生产环境故障复盘

> 预计学习时间：85–105 分钟  
> 一句话总结：“在我电脑上是好的”在软件工程中没有任何价值；用多阶段 Docker 固化可重复的运行环境，用 CI/CD 流水线守住质量底线，并具备在生产事故后撰写严密复盘（Post-mortem）的专业工程素养。

---

## 交付痛点：从“本地能跑”到“生产可用”的巨大鸿沟

许多转型开发者在本地电脑调试 AI 应用非常顺利，但一旦尝试往云服务器部署，往往遭遇各种“水土不服”：
- **环境差异引发崩溃**：本地是 macOS/Windows 开发机，线上是 Linux Alpine/Debian 服务器；某些 Node.js 原生 C++ 扩展（如部分分词器或向量计算库）在线上构建直接报错。
- **镜像体积臃肿不堪**：把整个开发环境打包成 Docker 镜像，里面塞满了 `node_modules`、开发依赖（TypeScript、Webpack、测试库）、源码和构建缓存，一个单体镜像体积高达 **1.5GB 甚至 2GB**，导致镜像拉取耗时数分钟，严重拖慢自动扩缩容。
- **安全漏洞裸奔**：直接使用默认的 `root` 用户在容器内运行进程，黑客一旦通过注入漏洞拿到 Web 权限，就直接获得了宿主机的 Root 提权漏洞（容器逃逸）。

---

## 生产级多阶段 Docker 构建 (Multi-Stage Builds)

利用 Docker 的**多阶段构建**技术，我们将“源码编译阶段”与“生产运行阶段”彻底物理隔离：

```mermaid
flowchart LR
  subgraph Stage1: 构建编译阶段 (Builder Stage)
    Base1["node:20-alpine 镜像"] --> InstallAll["安装全量依赖 (含 devDependencies)"]
    InstallAll --> CompileTS["tsc 编译 TypeScript -> 原生 JS"]
    CompileTS --> Prune["移除所有开发依赖 (仅留生产所需)"]
  end

  subgraph Stage2: 最终极简生产镜像 (Production Stage)
    Base2["node:20-alpine 纯净基础镜像"] --> CopyDist["仅复制编译后的 dist/ 目录"]
    CopyDist --> CopyProdModules["仅复制精简后的 node_modules"]
    CopyProdModules --> NonRoot["切换至普通非 root 用户 (node)"]
    NonRoot --> FinalImage["最终轻量镜像 (仅 ~120MB)"]
  end

  Stage1 -- "COPY --from=builder" --> Stage2
```

### 生产级 Dockerfile 编写实战

```dockerfile
# ==========================================
# 阶段 1: 依赖安装与 TypeScript 编译
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装必要的编译原生模块工具
RUN apk add --no-cache python3 make g++

# 优先只复制依赖清单，最大化利用 Docker 构建缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制业务源码并执行生产构建
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# 剔除 devDependencies，仅保留生产运行时依赖
RUN npm prune --production

# ==========================================
# 阶段 2: 极致轻量的生产运行镜像
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 安全第一：使用官方内置的非特权用户 node，杜绝容器逃逸
USER node

# 从 builder 阶段按需抓取产物
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# 声明端口
EXPOSE 3000

# 配置容器健康检查指令
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# 启动服务端应用
CMD ["node", "dist/index.js"]
```

---

## 一键本地生产模拟：Docker Compose 编排

在本地同时拉起 **Fastify 业务网关 + PostgreSQL 16 (集成 pgvector) + Redis 7**：

```yaml
version: "3.8"

services:
  # 1. AI 全栈业务网关
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: copilot_app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://copilot_user:copilot_pass@postgres:5432/copilot_db
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # 2. 关系与向量存储引擎 (PostgreSQL 16 + pgvector)
  postgres:
    image: pgvector/pgvector:pg16
    container_name: copilot_postgres
    restart: always
    environment:
      POSTGRES_USER: copilot_user
      POSTGRES_PASSWORD: copilot_pass
      POSTGRES_DB: copilot_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U copilot_user -d copilot_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 3. 高并发缓存与异步队列 (Redis 7)
  redis:
    image: redis:7-alpine
    container_name: copilot_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## CI/CD 自动化门禁：GitHub Actions 工作流

每次提交代码或向主分支发起 PR 时，自动化流水线必须严格执行三道质量大门：**静态检查 -> 单元测试 -> 容器构建**。任何一处报错，自动阻断合并：

```yaml
# .github/workflows/ci.yml
name: CI/CD Quality Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest

    services:
      # 在 CI 环境中自动拉起 PostgreSQL 配合自动化测试
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 设置 Node.js 环境
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: 安装依赖
        run: npm ci

      - name: 第一道门禁: TypeScript 类型检查与代码风格
        run: npm run lint && npx tsc --noEmit

      - name: 第二道门禁: 自动化单元测试与集成测试
        env:
          DATABASE_URL: postgres://test_user:test_pass@localhost:5432/test_db
        run: npm test

      - name: 第三道门禁: 生产 Docker 镜像试构建
        run: docker build -t copilot-server:test .
```

---

## 优雅停机 (Graceful Shutdown) 实操

在生产环境中，容器会被频繁地滚动更新或重启。如果 Node.js 进程在收到重启信号（`SIGTERM`）时直接自杀退出，正在进行的 SSE 流式长连接会被生硬截断，数据库连接池中的未提交事务会被强行破坏。

```typescript
// src/lifecycle.ts
import { FastifyInstance } from "fastify";
import { dbPool } from "./db";
import { redis } from "./cache";

export function setupGracefulShutdown(app: FastifyInstance) {
  const handleSignal = async (signal: string) => {
    app.log.warn(`收到 ${signal} 退出信号，启动优雅停机流程...`);

    try {
      // 1. 停止接收新的 HTTP 请求，但允许正在处理的请求最多继续运行 10 秒
      await app.close();
      app.log.info("HTTP 服务已平平稳关闭");

      // 2. 关闭数据库连接池
      await dbPool.end();
      app.log.info("数据库连接池已全部释放");

      // 3. 断开 Redis 连接
      await redis.quit();
      app.log.info("Redis 客户端已断开");

      app.log.info("全部资源清理完毕，安全退出进程");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "优雅停机过程中发生异常，强制退出");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
}
```

---

## 生产故障复盘规范：Post-Mortem 真实案例

任何合格的全栈工程师都必须学会正视生产故障。当线上发生事故后，绝不搞“追责抓内鬼”，而是撰写一份详尽的**故障复盘报告（Post-mortem）**，将坏事转化为整个团队的技术防护墙。

### 真实事故复盘报告样例：连接池耗尽导致全局白屏

```text
========================================================================
生产故障复盘报告 (Incident Post-Mortem)
故障编号: INC-202610-09
影响级别: P1 级重大故障 (全线知识库问答不可用)
发生时间: 2026-10-23 14:15 - 14:42 (总历时 27 分钟)
责任团队: AI 全栈研发组
========================================================================

一、故障影响
线上全部租户的知识库检索接口均报 500/504 超时，影响在线活跃用户 2,400 余人。

二、时间线还原 (Timeline)
- 14:15: 运营向全员推送新制度宣贯，并发请求瞬间从 5 QPS 激增至 120 QPS。
- 14:18: Sentry 弹出报警：POST /api/chat 接口延迟突破 15 秒。
- 14:21: 数据库告警触发：PostgreSQL max_connections (100) 达到 100% 满载。
- 14:25: 研发接入排查，发现所有 Node 实例均卡在 dbPool.connect() 等待队列中。
- 14:32: 紧急回滚止损：重启容器并临时调大连接池上限至 200，服务恢复响应。
- 14:42: 观察指标正常，宣布故障解除。

三、根因分析 (Root Cause)
在第 03 章引入的扣费事务中，某开发人员误将外部 OpenAI 的网络请求写在 BEGIN ... COMMIT 
数据库事务锁内部！导致数据库连接在等待外部大模型长达 8 秒的生成期间一直被牢牢占用，
连接无法释放回池中，瞬间将数据库连接池占满并死锁！

四、改进措施 (Action Items)
1. [已完成][P0] 立即重构代码：将外部大模型调用完全移出数据库事务锁，先预扣费，再调用模型，最后异步结算，事务内耗时从 8,000ms 降至 5ms。(责任人: 张工)
2. [本周完成][P1] 在 CI 门禁中增加静态代码扫描规则，禁止在事务包裹函数内发起外部 HTTP 调用。(责任人: 李工)
3. [本月完成][P1] 完善 Grafana 监控大盘，增加连接池利用率超过 80% 时的提前告警。(责任人: 王工)
========================================================================
```

---

## 边界误区与排错清单

### 1. 致命误区
- **Dockerfile 中未指定 USER node**：默认以 root 身份运行，容器一旦被注入 Webshell，黑客可以直接操控 Linux 内核或挂载卷。
- **数据库迁移（Migration）直接在线上手工改表**：在线上手工执行 `ALTER TABLE`，导致开发、测试、生产三个环境的表结构漂移错乱。生产环境必须依靠 Prisma 或 Drizzle 的迁移版本文件在发布时自动化执行。

### 2. 可靠性自检表
- [ ] 生产 Docker 镜像是否通过多阶段构建压制在 150MB 以下，且以非 root 用户启动？
- [ ] 容器内是否配置了有效的 `HEALTHCHECK` 命令探测 `/healthz` 端点？
- [ ] Node.js 进程是否监听了 `SIGTERM` 信号并在优雅关闭前等待正在进行的 SSE 连接？
- [ ] 发生任何线上 P 级事故后，是否严格按照时间线、根因与改进项输出复盘记录？

---

## 课后迁移实践任务

1. **容器编排实战**：在本地利用本章提供的 `docker-compose.yml`，执行 `docker compose up -d`，一次性成功启动 App、PostgreSQL 和 Redis，并访问 `http://localhost:3000/healthz` 验证健康检查返回 `200 OK`。
2. **故障复盘模拟演练**：挑选一次你在前端或服务端开发中真实经历过的线上 Bug（例如内存泄漏、跨域报错导致发布回滚），按照本章的 Post-Mortem 模板撰写一篇详实的分析报告。
