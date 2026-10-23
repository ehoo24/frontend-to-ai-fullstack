// 掘金高质感技术交互脚本 (Juejin Developer Interactions)
document.addEventListener("DOMContentLoaded", () => {
  initCodeBlocks();
  initTableOfContents();
  initMermaid();
  initChapterNavigation();
});

/**
 * 0. 左侧专栏章节导航初始化 (自动定位当前正在阅读的章节)
 */
function initChapterNavigation() {
  const activeChapter = document.querySelector(".chapter-nav-item.active");
  if (activeChapter) {
    // 稍作延迟确保页面渲染完毕后优雅居中滚动
    setTimeout(() => {
      activeChapter.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }
}

/**
 * 1. 代码块美化与一键复制功能 (Mac Window 风格)
 */
function initCodeBlocks() {
  const codeBlocks = document.querySelectorAll(".markdown-body pre code");

  codeBlocks.forEach((codeEl) => {
    const preEl = codeEl.parentElement;
    if (!preEl || preEl.classList.contains("mermaid")) return;

    // 获取代码语言
    let lang = "TEXT";
    codeEl.classList.forEach((cls) => {
      if (cls.startsWith("language-")) {
        lang = cls.replace("language-", "").toUpperCase();
      }
    });

    // 创建外层卡片
    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";

    // 创建 Mac 顶部栏
    const header = document.createElement("div");
    header.className = "code-block-header";
    header.innerHTML = `
      <div class="mac-dots">
        <span class="mac-dot red"></span>
        <span class="mac-dot yellow"></span>
        <span class="mac-dot green"></span>
      </div>
      <span class="code-lang-label">${lang}</span>
      <button class="copy-btn" type="button" aria-label="复制代码">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>复制</span>
      </button>
    `;

    // 复制按钮交互
    const copyBtn = header.querySelector(".copy-btn");
    copyBtn.addEventListener("click", async () => {
      const codeText = codeEl.innerText;
      try {
        await navigator.clipboard.writeText(codeText);
        copyBtn.classList.add("copied");
        copyBtn.querySelector("span").textContent = "已复制";
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.querySelector("span").textContent = "复制";
        }, 2000);
      } catch (err) {
        // 兼容降级
        const textarea = document.createElement("textarea");
        textarea.value = codeText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        copyBtn.classList.add("copied");
        copyBtn.querySelector("span").textContent = "已复制";
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.querySelector("span").textContent = "复制";
        }, 2000);
      }
    });

    // 替换节点
    preEl.parentNode.insertBefore(wrapper, preEl);
    wrapper.appendChild(header);
    wrapper.appendChild(preEl);
  });
}

/**
 * 2. 悬浮文章目录 (TOC) 生成与滚动高亮监听 (Scroll Spy)
 */
function initTableOfContents() {
  const tocList = document.querySelector(".toc-list");
  if (!tocList) return;

  const headings = document.querySelectorAll(".markdown-body h2, .markdown-body h3");
  if (headings.length === 0) {
    const sidebar = document.querySelector(".toc-sidebar");
    if (sidebar) sidebar.style.display = "none";
    return;
  }

  // 生成目录列表
  headings.forEach((heading, index) => {
    let id = heading.id;
    if (!id) {
      id = "heading-" + index;
      heading.id = id;
    }

    const li = document.createElement("li");
    const level = heading.tagName.toLowerCase() === "h2" ? "level-2" : "level-3";
    li.className = `toc-item ${level}`;

    const link = document.createElement("a");
    link.className = "toc-link";
    link.href = `#${id}`;
    link.textContent = heading.innerText.replace(/^[0-9一二三四五六七八九十、.\s]+/, "").trim() || heading.innerText;
    link.title = heading.innerText;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, null, `#${id}`);
    });

    li.appendChild(link);
    tocList.appendChild(li);
  });

  // 滚动监听高亮
  const tocLinks = document.querySelectorAll(".toc-link");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach((link) => {
            if (link.getAttribute("href") === `#${id}`) {
              link.classList.add("active");
              link.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
              link.classList.remove("active");
            }
          });
        }
      });
    },
    {
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    }
  );

  headings.forEach((h) => observer.observe(h));
}

/**
 * 3. Mermaid 图表渲染
 */
function initMermaid() {
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      flowchart: { curve: "basis" },
    });
  }
}
