#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { marked } from "../node_modules/marked/lib/marked.esm.js";

const courseRoot = resolve("d:/dailyWork/AiProject/ai资料/frontend-to-ai-fullstack");
const courseJson = JSON.parse(readFileSync(join(courseRoot, "course.json"), "utf8"));

// 课程模块划分配置
const MODULES = [
  {
    title: "模块一：认知重塑与工程基石",
    chapterNumbers: [1, 2],
  },
  {
    title: "模块二：后端工程与核心存储",
    chapterNumbers: [3, 4, 5],
  },
  {
    title: "模块三：生产级 LLM 应用开发",
    chapterNumbers: [6, 7],
  },
  {
    title: "模块四：企业级 RAG 架构与评测",
    chapterNumbers: [8, 9],
  },
  {
    title: "模块五：受控 Agent 与生产运维",
    chapterNumbers: [10, 11],
  },
  {
    title: "模块六：企业级微服务协同",
    chapterNumbers: [12],
  },
];

const DEEP_CHAPTERS = new Set([3, 6, 8, 9]);

// 自定义 Marked 渲染器
const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const language = (lang || "").trim().toLowerCase();
  if (language === "mermaid") {
    return `<div class="mermaid-wrapper"><pre class="mermaid">${text}</pre></div>`;
  }
  return `<pre><code class="language-${language || "text"}">${escapeHtml(text)}</code></pre>`;
};

let headingIdCounter = 0;
renderer.heading = function ({ text, depth }) {
  const cleanText = text.replace(/<[^>]+>/g, "").trim();
  const slug = cleanText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || `heading-${++headingIdCounter}`;
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};

marked.use({ renderer });

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function processHtmlEnhancements(rawHtml) {
  let html = rawHtml;

  // 1. 表格包装 (响应式横向滚动)
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="table-wrapper"><table>$1</table></div>');

  // 2. 将 GitHub 风格引用块转换为高质感掘金提示卡片
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, inner) => {
    const alertMatch = inner.match(/<p>\s*\[!(TIP|WARNING|IMPORTANT|CAUTION|NOTE)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*)/i);
    if (!alertMatch) {
      return match;
    }

    const type = alertMatch[1].toUpperCase();
    const firstLine = alertMatch[2].trim();
    const rest = (alertMatch[3] || "").trim();

    let title = "提示";
    let icon = "💡";
    let cls = "callout-tip";

    if (type === "WARNING") {
      title = "重要告警";
      icon = "⚠️";
      cls = "callout-warning";
    } else if (type === "IMPORTANT") {
      title = "核心重点";
      icon = "📌";
      cls = "callout-important";
    } else if (type === "CAUTION") {
      title = "高危警惕";
      icon = "🚨";
      cls = "callout-caution";
    } else if (type === "NOTE") {
      title = "背景说明";
      icon = "📝";
      cls = "callout-tip";
    }

    const bodyHtml = firstLine ? `<p>${firstLine}</p>${rest}` : rest;

    return `
      <div class="callout ${cls}">
        <div class="callout-header">${icon} ${title}</div>
        ${bodyHtml}
      </div>
    `;
  });

  return html;
}

// 统一确保 course.json 中都是 .html 链接
for (const lesson of courseJson.lessons) {
  lesson.href = lesson.markdown.replace(/\.md$/, ".html");
}
for (const ref of courseJson.references) {
  ref.href = ref.markdown.replace(/\.md$/, ".html");
}
writeFileSync(join(courseRoot, "course.json"), JSON.stringify(courseJson, null, 2), "utf8");

const lessons = courseJson.lessons;
const references = courseJson.references;

/**
 * 构建左侧专栏章节导航 (Chapters Sidebar)
 * @param {number|null} currentChapterNumber 当前文章章节号 (如果是参考手册则传 null)
 * @param {string|null} currentRefHref 当前参考手册标识 (如 "glossary.html")
 * @param {boolean} isInLessonsDir 当前文件是否在 lessons/ 目录下
 */
function buildChaptersSidebar(currentChapterNumber, currentRefHref, isInLessonsDir) {
  let groupsHtml = "";

  MODULES.forEach((mod) => {
    const chapterItems = mod.chapterNumbers
      .map((num) => {
        const lesson = lessons.find((l) => l.number === num);
        if (!lesson) return "";

        const isActive = currentChapterNumber === num;
        const isDeep = DEEP_CHAPTERS.has(num);
        const filename = basename(lesson.href);
        const linkHref = isInLessonsDir ? `./${filename}` : `../lessons/${filename}`;

        return `
          <a href="${linkHref}" class="chapter-nav-item ${isActive ? "active" : ""}" title="${lesson.title}">
            <span class="chapter-num">${String(lesson.number).padStart(2, "0")}</span>
            <span class="chapter-title-text">${lesson.title}</span>
            ${isDeep ? `<span class="chapter-tag-mini">深度</span>` : ""}
          </a>
        `;
      })
      .join("");

    groupsHtml += `
      <div class="chapter-group">
        <div class="chapter-group-title">${mod.title}</div>
        ${chapterItems}
      </div>
    `;
  });

  // 配套参考资料组
  const refItems = references
    .map((ref) => {
      const filename = basename(ref.href);
      const isActive = currentRefHref === filename;
      const linkHref = isInLessonsDir ? `../reference/${filename}` : `./${filename}`;

      return `
        <a href="${linkHref}" class="chapter-nav-item ${isActive ? "active" : ""}" title="${ref.title}">
          <span class="chapter-num">附</span>
          <span class="chapter-title-text">${ref.title}</span>
        </a>
      `;
    })
    .join("");

  groupsHtml += `
    <div class="chapter-group">
      <div class="chapter-group-title">配套参考与手册</div>
      ${refItems}
    </div>
  `;

  return `
    <aside class="chapters-sidebar">
      <div class="chapters-sidebar-header">
        <span>📚 专栏章节导航</span>
        <span class="chapters-count-badge">12 讲全</span>
      </div>
      <nav class="chapters-nav-scroll" aria-label="课程章节列表">
        ${groupsHtml}
      </nav>
    </aside>
  `;
}

// 1. 生成所有课程正文 HTML (位于 lessons/ 目录)
lessons.forEach((lesson, index) => {
  const mdPath = join(courseRoot, lesson.markdown);
  if (!existsSync(mdPath)) return;

  const rawMd = readFileSync(mdPath, "utf8");
  
  const titleMatch = rawMd.match(/^#\s+(.+)$/m);
  const chapterFullTitle = titleMatch ? titleMatch[1].trim() : lesson.title;

  const summaryMatch = rawMd.match(/>\s*一句话总结[：:]\s*(.+)$/m);
  const summaryText = summaryMatch ? summaryMatch[1].trim() : lesson.summary;

  const contentMd = rawMd
    .replace(/^#\s+.+$/m, "")
    .replace(/^>\s*预计学习时间[^\n]*\n/m, "")
    .replace(/^>\s*一句话总结[^\n]*\n/m, "")
    .trim();

  const renderedBody = processHtmlEnhancements(marked.parse(contentMd));

  const prevLesson = index > 0 ? lessons[index - 1] : null;
  const nextLesson = index < lessons.length - 1 ? lessons[index + 1] : null;

  const prevHtmlFilename = prevLesson ? basename(prevLesson.href) : "";
  const nextHtmlFilename = nextLesson ? basename(nextLesson.href) : "";

  const pagerHtml = `
    <nav class="article-nav-pager" aria-label="文章上下导航">
      ${
        prevLesson
          ? `<a href="./${prevHtmlFilename}" class="pager-btn prev">
              <span class="pager-label">◀ 上一章</span>
              <span class="pager-title">${prevLesson.title}</span>
            </a>`
          : `<div></div>`
      }
      ${
        nextLesson
          ? `<a href="./${nextHtmlFilename}" class="pager-btn next">
              <span class="pager-label">下一章 ▶</span>
              <span class="pager-title">${nextLesson.title}</span>
            </a>`
          : `<div></div>`
      }
    </nav>
  `;

  const wordCount = Math.round(rawMd.length * 0.95);
  const leftSidebarHtml = buildChaptersSidebar(lesson.number, null, true);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chapterFullTitle} | 前端转 AI 全栈路线</title>
  <link rel="stylesheet" href="../assets/juejin.css">
  <!-- 引入 Mermaid 渲染架构流程图 -->
  <script defer src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <!-- 引入交互脚本: Mac代码框、一键复制、文章目录滚动高亮、左侧章节联动 -->
  <script defer src="../assets/juejin.js"></script>
</head>
<body>
  <!-- 顶部导航条 -->
  <header class="navbar">
    <div class="navbar-inner">
      <a href="../index.html" class="navbar-brand">
        <span class="brand-badge">课程专栏</span>
        <span>前端转 AI 全栈：从交互体验到生产级交付</span>
      </a>
      <div class="navbar-actions">
        <a href="../index.html">返回课程总览 📚</a>
      </div>
    </div>
  </header>

  <!-- 主布局 (三栏布局: 左侧专栏目录 + 中间正文 + 右侧本章目录) -->
  <div class="layout-container">
    <!-- 1. 左侧专栏章节导航 -->
    ${leftSidebarHtml}

    <!-- 2. 中间核心正文卡片 -->
    <main class="article-main">
      <header class="article-header">
        <div class="article-category">
          <span>📖 第 ${lesson.number} 核心实战章节</span>
        </div>
        <h1 class="article-title">${chapterFullTitle}</h1>
        <div class="article-meta">
          <div class="author-info">
            <span class="author-avatar">AI</span>
            <span>全栈技术教练</span>
          </div>
          <span>•</span>
          <span>⏱️ 预计学习：${lesson.time}</span>
          <span>•</span>
          <span>📝 约 ${wordCount} 字</span>
          <span>•</span>
          <span>🏷️ 生产级落地标准</span>
        </div>
      </header>

      <!-- 一句话要点卡片 -->
      <aside class="article-summary-card">
        <strong>💡 本章核心要点：</strong>${summaryText}
      </aside>

      <!-- 文章正文区域 -->
      <article class="markdown-body">
        ${renderedBody}
      </article>

      <!-- 底部上下章导航 -->
      ${pagerHtml}
    </main>

    <!-- 3. 右侧本章目录 (TOC) -->
    <aside class="toc-sidebar">
      <div class="toc-header">
        <span>📑</span>
        <span>本章目录</span>
      </div>
      <ul class="toc-list">
        <!-- 由 juejin.js 自动根据文章内 h2, h3 提取并生成 -->
      </ul>
    </aside>
  </div>
</body>
</html>`;

  const htmlPath = mdPath.replace(/\.md$/, ".html");
  writeFileSync(htmlPath, fullHtml, "utf8");
  console.log(`[Rebuilt 3-Column HTML] ${htmlPath}`);
});

// 2. 生成参考手册 HTML (位于 reference/ 目录)
references.forEach((ref) => {
  const mdPath = join(courseRoot, ref.markdown);
  if (!existsSync(mdPath)) return;

  const rawMd = readFileSync(mdPath, "utf8");
  const titleMatch = rawMd.match(/^#\s+(.+)$/m);
  const refTitle = titleMatch ? titleMatch[1].trim() : ref.title;

  const contentMd = rawMd.replace(/^#\s+.+$/m, "").trim();
  const renderedBody = processHtmlEnhancements(marked.parse(contentMd));

  const refFilename = basename(ref.href);
  const leftSidebarHtml = buildChaptersSidebar(null, refFilename, false);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${refTitle} | 配套资料</title>
  <link rel="stylesheet" href="../assets/juejin.css">
  <script defer src="../assets/juejin.js"></script>
</head>
<body>
  <header class="navbar">
    <div class="navbar-inner">
      <a href="../index.html" class="navbar-brand">
        <span class="brand-badge">配套参考手册</span>
        <span>前端转 AI 全栈：从交互体验到生产级交付</span>
      </a>
      <div class="navbar-actions">
        <a href="../index.html">返回课程总览 📚</a>
      </div>
    </div>
  </header>

  <div class="layout-container">
    <!-- 1. 左侧专栏章节导航 -->
    ${leftSidebarHtml}

    <!-- 2. 中间核心正文卡片 -->
    <main class="article-main">
      <header class="article-header">
        <div class="article-category">
          <span>📚 参考手册与速查清单</span>
        </div>
        <h1 class="article-title">${refTitle}</h1>
      </header>

      <article class="markdown-body">
        ${renderedBody}
      </article>
    </main>

    <!-- 3. 右侧速查目录 -->
    <aside class="toc-sidebar">
      <div class="toc-header">
        <span>📑</span>
        <span>速查目录</span>
      </div>
      <ul class="toc-list"></ul>
    </aside>
  </div>
</body>
</html>`;

  const htmlPath = mdPath.replace(/\.md$/, ".html");
  writeFileSync(htmlPath, fullHtml, "utf8");
  console.log(`[Rebuilt Reference 3-Column HTML] ${htmlPath}`);
});

console.log("All pages upgraded to 3-column layout (Left Chapters + Center Article + Right TOC)!");
