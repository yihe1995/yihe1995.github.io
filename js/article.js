// ============ 文集页面逻辑：目录树 + md 渲染 ============

const tree = document.getElementById('tree');
const content = document.getElementById('content');
const treeTitle = document.getElementById('tree-title');

// 从 URL 取当前分类；无参数时取第一个有文章的分类
function currentCategory() {
    const params = new URLSearchParams(location.search);
    const catId = params.get('category');
    const cat = ARTICLES.find(c => c.id === catId);
    if (cat) return cat;
    return ARTICLES.find(c => c.files.length > 0) || null;
}

// 构建左侧目录树（只显示当前分类）
function buildTree(cat) {
    treeTitle.textContent = '📚 ' + cat.label;
    let html = '<ul class="tree-root">';
    html += `<li class="tree-cat"><span class="tree-cat-name">${cat.label}</span>`;
    if (cat.files.length) {
        html += '<ul class="tree-files">';
        cat.files.forEach(f => {
            html += `<li class="tree-file"><a href="#" data-cat="${cat.id}" data-file="${f.file}">${f.title}</a></li>`;
        });
        html += '</ul>';
    } else {
        html += '<ul class="tree-files"><li class="tree-empty">（暂无文章）</li></ul>';
    }
    html += '</li></ul>';
    tree.innerHTML = html;
}

// 加载并渲染一篇 md 文章
async function loadArticle(catId, file) {
    try {
        const res = await fetch(`articles/${catId}/${file}`);
        if (!res.ok) throw new Error('not found');
        const md = await res.text();
        content.innerHTML = marked.parse(md);
        // 修正文章内的相对图片路径 → 指向文章所在目录
        const base = `articles/${catId}/`;
        content.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/') && !src.startsWith('data:')) {
                img.src = base + src;
            }
        });
        // 代码高亮（highlight.js 无独立 hlsl 语法，用 glsl 替代）
        content.querySelectorAll('pre code').forEach(el => {
            if (el.classList.contains('language-hlsl')) {
                el.classList.remove('language-hlsl');
                el.classList.add('language-glsl');
            }
            try { hljs.highlightElement(el); } catch (e) { /* 未知语言则保持原样 */ }
        });
        // 目录树高亮当前文章
        tree.querySelectorAll('a[data-cat]').forEach(a => {
            a.classList.toggle('active', a.dataset.cat === catId && a.dataset.file === file);
        });
    } catch (e) {
        content.innerHTML = `<p class="article-error">文章加载失败：${e.message}</p>`;
    }
}

// 确定当前要展示的文章：优先 URL 指定的，否则该分类第一篇
function currentArticle(cat) {
    const params = new URLSearchParams(location.search);
    const file = params.get('article');
    if (file && cat.files.some(f => f.file === file)) {
        return { catId: cat.id, file };
    }
    if (cat.files.length) return { catId: cat.id, file: cat.files[0].file };
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const cat = currentCategory();
    if (!cat) {
        treeTitle.textContent = '📚 文集';
        tree.innerHTML = '';
        content.innerHTML = '<p class="article-empty">文集里还没有文章，敬请期待～</p>';
        return;
    }

    buildTree(cat);
    const cur = currentArticle(cat);
    if (cur) {
        loadArticle(cur.catId, cur.file);
    } else {
        content.innerHTML = '<p class="article-empty">当前文集暂无文章~</p>';
    }

    // 点击目录树文章：原地加载（不刷新页面），并更新 URL
    tree.addEventListener('click', e => {
        const a = e.target.closest('a[data-cat]');
        if (!a) return;
        e.preventDefault();
        const { cat: catId, file } = a.dataset;
        loadArticle(catId, file);
        history.replaceState(null, '', `article.html?category=${encodeURIComponent(catId)}&article=${encodeURIComponent(file)}`);
    });
});
