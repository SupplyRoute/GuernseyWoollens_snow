import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const storyDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(storyDir);
const site = 'https://guernsey-woollens.vercel.app';
const posts = JSON.parse(await readFile(path.join(storyDir, 'posts.json'), 'utf8'))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const koreanDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
};
const absolute = (post) => `${site}/story/${post.url}`;
const linkedParagraph = (text) => escapeHtml(text).replace(
  '건지울른스 제품 페이지',
  '<a class="text-link" href="../products.html">건지울른스 제품 페이지</a>',
);
const renderBody = (body) => body.split(/\n\s*\n/).map((block) => {
  const value = block.trim();
  if (value.startsWith('## ')) return `<h2>${escapeHtml(value.slice(3))}</h2>`;
  const lines = value.split('\n');
  if (lines.every((line) => line.startsWith('- '))) {
    return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
  }
  return `<p>${linkedParagraph(value)}</p>`;
}).join('\n            ');

const header = `<a class="skip-link" href="#main">본문으로 바로가기</a>
    <header class="site-header is-scrolled" data-header data-solid-header>
      <a class="wordmark" href="../index.html#home" aria-label="건지울른스 홈"><span>건지울른스</span><small>GEONJIULLEUNS</small></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-button onclick="toggleMenu()"><span class="menu-button__label">메뉴</span><span class="menu-button__lines" aria-hidden="true"><i></i><i></i></span></button>
      <nav class="site-nav" id="site-nav" aria-label="주요 메뉴" data-nav><a href="../index.html#home">홈</a><a href="../index.html#guernsey">건지 니트</a><a href="../products.html">제품</a><a href="index.html" aria-current="page">이야기</a><a href="../about.html">내 소개</a><a href="../contact.html">연락하기</a></nav>
    </header>`;
const footer = `<footer class="site-footer"><a class="wordmark wordmark--footer" href="../index.html#home"><span>건지울른스</span><small>GEONJIULLEUNS</small></a><p>섬의 태도와 오래 입는 옷.</p><nav class="footer-links" aria-label="푸터 연락 링크"><a href="mailto:hello@geonjiulleuns.kr" target="_blank" rel="noopener noreferrer">이메일</a><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">SNS</a></nav><p>© <span data-year></span> GEONJIULLEUNS</p></footer>`;

for (const [index, post] of posts.entries()) {
  if (!post.url || !Array.isArray(post.faq) || post.faq.length !== 3 || !post.author || !post.sources?.length) {
    throw new Error(`${post.id}: url, author, FAQ 3개, 출처가 필요합니다.`);
  }
  const url = absolute(post);
  const modified = post.updated || post.date;
  const blogPosting = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
    description: post.description, datePublished: post.date, dateModified: modified,
    author: { '@type': 'Person', name: post.author }, mainEntityOfPage: url,
    keywords: post.tags.join(', '),
  };
  const faqPage = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: post.faq.map(({ q, a }) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: '이야기', item: `${site}/story/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };
  const related = [posts[index - 1], posts[index + 1]].filter(Boolean);
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(post.title)}</title>
    <meta name="description" content="${escapeHtml(post.description)}">
    <meta name="author" content="${escapeHtml(post.author)}">
    <meta name="theme-color" content="#1C1A17">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(post.description)}">
    <meta property="og:url" content="${url}">
    <link rel="stylesheet" href="../styles.css">
    <script src="../script.js" defer></script>
    <script type="application/ld+json">${json(blogPosting)}</script>
    <script type="application/ld+json">${json(faqPage)}</script>
    <script type="application/ld+json">${json(breadcrumbs)}</script>
  </head>
  <body>
    ${header}
    <main class="story-post-page" id="main">
      <div class="story-post-wrap">
        <a class="story-back" href="index.html"><span aria-hidden="true">←</span> 이야기 목록</a>
        <article class="story-post">
          <header class="story-post__head"><time datetime="${post.date}">${koreanDate(post.date)}</time><h1>${escapeHtml(post.title)}</h1><div class="story-post__meta"><span>${escapeHtml(post.author)}</span>${post.updated ? `<span>수정 ${koreanDate(post.updated)}</span>` : ''}</div><div class="story-tags">${post.tags.map((tag) => `<span class="story-tag">${escapeHtml(tag)}</span>`).join('')}</div></header>
          <hr class="story-rule">
          <div class="story-post__body">
            ${renderBody(post.body)}
          </div>
          <section class="story-faq"><h2>자주 묻는 질문</h2>${post.faq.map(({ q, a }) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}</section>
          <section class="story-sources"><h2>참고·출처</h2><ol>${post.sources.map(({ title, url: sourceUrl }) => `<li><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></li>`).join('')}</ol></section>
          <nav class="story-pagination" aria-label="관련 글">${related.map((item) => `<a href="${item.url}"><div class="story-pagination__direction">관련 글</div><div class="story-pagination__title">${escapeHtml(item.title)}</div></a>`).join('')}</nav>
        </article>
      </div>
    </main>
    ${footer}
  </body>
</html>
`;
  await writeFile(path.join(storyDir, post.url), html, 'utf8');
}

const publicPages = [
  ['', '2026-08-29'], ['about.html', '2026-08-29'], ['products.html', '2026-08-29'], ['contact.html', '2026-08-29'], ['story/', '2026-08-29'],
  ...posts.map((post) => [`story/${post.url}`, post.updated || post.date]),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPages.map(([url, date]) => `  <url><loc>${site}/${url}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(rootDir, 'sitemap.xml'), sitemap, 'utf8');

const rssDate = (value) => new Date(`${value}T00:00:00+09:00`).toUTCString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>건지울른스 이야기</title>\n    <link>${site}/story/</link>\n    <description>건지섬의 피셔맨 니트와 브리티시 울, 오래 입는 옷에 관한 기록</description>\n    <language>ko</language>\n    <lastBuildDate>${rssDate(posts[0].updated || posts[0].date)}</lastBuildDate>\n${posts.slice(0, 20).map((post) => `    <item>\n      <title>${escapeHtml(post.title)}</title>\n      <link>${absolute(post)}</link>\n      <description>${escapeHtml(post.summary)}</description>\n      <pubDate>${rssDate(post.date)}</pubDate>\n      <guid isPermaLink="true">${absolute(post)}</guid>\n    </item>`).join('\n')}\n  </channel>\n</rss>\n`;
await writeFile(path.join(rootDir, 'feed.xml'), feed, 'utf8');

const llms = `# 건지울른스\n\n건지울른스는 건지섬의 피셔맨 니트와 브리티시 울이 지닌 역사와 쓰임을 한국에 소개합니다.\n\n## 파는 것\n\n헤리티지 피셔맨 니트와 가디건을 비롯한 건지울른스 컬렉션을 판매합니다.\n\n## 페이지 안내\n\n- [홈](${site}/): 브랜드와 대표 제품\n- [제품](${site}/products.html): 현재 판매 제품과 구매 링크\n- [내 소개](${site}/about.html): 건지울른스를 한국에 소개하게 된 이야기\n- [연락하기](${site}/contact.html): 문의, SNS, 스토어 링크\n- [이야기](${site}/story/): 소재, 관리법과 브랜드 기록\n\n## 이야기(블로그)\n\n${posts.slice(0, 30).map((post) => `- [${post.title}](${absolute(post)}): ${post.summary}`).join('\n')}\n`;
await writeFile(path.join(rootDir, 'llms.txt'), llms, 'utf8');

await writeFile(path.join(rootDir, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /story/admin.html\n\nSitemap: ${site}/sitemap.xml\n`, 'utf8');
