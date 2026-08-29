import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storyDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(storyDir);
const site = 'https://guernsey-woollens.vercel.app';
const posts = JSON.parse(await readFile(path.join(storyDir, 'posts.json'), 'utf8'));
const pages = ['index.html', 'about.html', 'products.html', 'contact.html', 'story/index.html', ...posts.map((post) => `story/${post.url}`)];
const htmls = new Map(await Promise.all(pages.map(async (file) => [file, await readFile(path.join(root, file), 'utf8')])));
const match = (html, pattern) => html.match(pattern)?.[1]?.trim() || '';
const title = (html) => match(html, /<title>([\s\S]*?)<\/title>/i);
const description = (html) => match(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
const canonical = (html) => match(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
const expectedCanonical = (file) => file === 'index.html' ? `${site}/` : file === 'story/index.html' ? `${site}/story/` : `${site}/${file}`;
const results = [];
const record = (number, name, pass, detail) => results.push({ number, name, result: pass ? '통과' : '실패', detail });

const titles = [...htmls.values()].map(title);
record(1, '제목·설명', new Set(titles).size === titles.length && titles.every((value) => value && [...value].length <= 60) && [...htmls.values()].every((html) => description(html)), `${pages.length}개 공개 페이지 확인`);
record(2, 'canonical', [...htmls].every(([file, html]) => canonical(html) === expectedCanonical(file)), 'Vercel 실제 도메인 일치');
record(3, 'Open Graph', [...htmls].every(([, html]) => /property="og:title"\s+content="[^"]+"/i.test(html) && /property="og:description"\s+content="[^"]+"/i.test(html) && /property="og:url"\s+content="https:\/\/guernsey-woollens\.vercel\.app/i.test(html)), 'og:title·description·url 확인');
const headingsValid = (html) => {
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((item) => Number(item[1]));
  return levels.filter((level) => level === 1).length === 1
    && levels.every((level, index) => index === 0 || level <= levels[index - 1] + 1);
};
record(4, '제목 구조', [...htmls.values()].every(headingsValid), '페이지당 h1 1개·단계 건너뜀 0');
record(5, '이미지 alt', [...htmls.values()].every((html) => [...html.matchAll(/<img\b[^>]*>/gi)].every(([tag]) => /\balt="[^"]*"/i.test(tag))), 'alt 누락 0');
let jsonValid = true;
for (const html of htmls.values()) for (const item of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) { try { JSON.parse(item[1]); } catch { jsonValid = false; } }
const homeSchema = htmls.get('index.html').includes('"Organization"') && htmls.get('index.html').includes('"WebSite"');
const postSchemas = posts.every((post) => ['BlogPosting', 'FAQPage', 'BreadcrumbList'].every((type) => htmls.get(`story/${post.url}`).includes(`"${type}"`)));
const productSchema = (await readFile(path.join(root, 'script.js'), 'utf8')).includes("'@type': 'Product'");
record(6, 'JSON-LD', jsonValid && homeSchema && postSchemas && productSchema, '홈·제품·글 스키마 및 JSON.parse 확인');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
record(7, 'sitemap.xml', pages.every((file) => sitemap.includes(expectedCanonical(file))) && !/admin|\?id=/i.test(sitemap), `${pages.length}개 공개 URL 포함`);
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
record(8, 'robots.txt', robots.includes('Disallow: /story/admin.html') && robots.includes(`Sitemap: ${site}/sitemap.xml`) && !/GPTBot|ClaudeBot|PerplexityBot/i.test(robots), 'admin만 차단');
const llms = await readFile(path.join(root, 'llms.txt'), 'utf8');
record(9, 'llms.txt', /^# 건지울른스[\s\S]*## 파는 것[\s\S]*## 페이지 안내[\s\S]*## 이야기\(블로그\)/.test(llms) && !/supplyroute\.github\.io/i.test(llms), '브랜드→제품→페이지→글 순서');
let linksValid = true;
for (const [file, html] of htmls) {
  for (const tag of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = tag[1];
    const href = match(attrs, /href="([^"]+)"/i);
    if (/^https?:/i.test(href) && !/rel="[^"]*noopener/i.test(attrs)) linksValid = false;
    if (!href || /^(?:https?:|mailto:|#)/i.test(href)) continue;
    const clean = href.split(/[?#]/)[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(path.join(root, file)), clean.endsWith('/') ? `${clean}index.html` : clean);
    try { await access(target); } catch { linksValid = false; }
  }
}
record(10, '링크', linksValid, '내부 링크 존재·외부 noopener');
record(11, '글 완결성', posts.every((post) => post.author && post.date && post.url && post.faq?.length === 3 && post.sources?.length && htmls.get(`story/${post.url}`)?.includes(post.author)), `${posts.length}편 정적 페이지 일치`);
const banned = /국내\s*1위|극강|지어낸 후기/i;
record(12, '허위·미검증 표현', posts.every((post) => !banned.test(JSON.stringify(post))), '금지 표현 0');
record(13, '모바일 기본 조건', [...htmls.values()].every((html) => /name="viewport"\s+content="width=device-width, initial-scale=1"/i.test(html)), 'viewport 확인·가로폭은 브라우저 별도 확인');

console.table(results);
if (results.some((item) => item.result === '실패')) process.exitCode = 1;
