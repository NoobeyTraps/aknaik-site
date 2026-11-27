// Builds the Thoughts section from the posts in thoughts/.
//
// Each post is one Markdown (.md) or plain text (.txt) file named
//     YYYY-MM-DD Title of the post.md      e.g.  2026-11-26 Why I like chess.md
// The date at the front sets the order (newest first). The rest of the name is the
// headline, unless the file's first line is a "# Heading", which wins (handy for
// titles with characters a file name can't hold, like ? or :).
// Files starting with _ are drafts and aren't published.
//
// Output: dist/thoughts/index.html (the list) and dist/thoughts/<slug>/index.html per post.
// Called from build.mjs.

import { promises as fs } from "node:fs";
import path from "node:path";
import { Marked } from "marked";

const POST_EXT = new Set([".md", ".markdown", ".txt"]);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// "2026-11-26 Why I like chess" -> { date: "2026-11-26", title: "Why I like chess" }
function parseFileName(file) {
  const stem = path.parse(file).name.trim();
  const m = stem.match(/^(\d{4})-(\d{2})-(\d{2})[\s_-]*(.*)$/);
  if (!m) return { date: null, title: stem };
  const [, y, mo, d, rest] = m;
  const ok = +mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31;
  return { date: ok ? `${y}-${mo}-${d}` : null, title: rest.trim() || stem };
}

const longDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";

// Markdown with relative links and images pointing into /thoughts/,
// so an image saved next to the posts can be used as ![](photo.jpg)
const marked = new Marked({
  gfm: true,
  breaks: true,          // a single line break in the file is a line break on the page
  walkTokens(token) {
    if ((token.type === "image" || token.type === "link") && token.href &&
        !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(token.href))
      token.href = "/thoughts/" + token.href.replace(/^\.\//, "");
  },
});

const STYLE = `
  :root {
    --paper: #FBF7EC;
    --ink: #2B2B2B;
    --muted: #8A8478;
    --link: #8B3A2B;
    --art: #D9D1BF;
    --serif: "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Crimson Text", serif;
    --mono: "IBM Plex Mono", Consolas, "Liberation Mono", Menlo, monospace;
  }
  html { scrollbar-width: none; }
  html::-webkit-scrollbar { display: none; }
  body {
    min-height: 100vh;
    margin: 0;
    background-color: var(--paper);
    color: var(--ink);
    font-family: var(--serif);
    font-size: 16px;
    line-height: 1.45;
    font-variant-numeric: oldstyle-nums proportional-nums;
    text-rendering: optimizeLegibility;
  }
  .content { position: relative; z-index: 1; max-width: 556px; padding: 5rem 1.5rem 6rem; }
  h1 { margin: 0 0 1.5rem; font-size: 36px; font-weight: 400; line-height: 1; letter-spacing: -0.025em; }
  a { color: var(--link); text-decoration-thickness: 0.05em; text-underline-offset: 0.12em; }
  @media (max-width: 722px) {
    .content { padding: 3rem 1.5rem 4rem; }
    h1 { font-size: 30px; }
    body { font-size: 15px; }
  }

  /* the list */
  .posts { margin-top: 1.5rem; position: relative; background: rgba(251, 247, 236, 0.85); }
  .post-row { display: flex; gap: 1em; }
  .post-row .date { flex: none; width: 6.8em; color: var(--muted); }
  .empty { margin-top: 1.5rem; color: var(--muted); }

  /* a post */
  .meta { margin: 0.5rem 0 2rem; color: var(--muted); }
  article { position: relative; background: rgba(251, 247, 236, 0.85); }
  article p { margin: 0 0 1em; }
  article h2 { margin: 1.8em 0 0.5em; font-size: 22px; font-weight: 400; line-height: 1.2; }
  article h3 { margin: 1.5em 0 0.4em; font-size: 18px; font-weight: 700; }
  article ul, article ol { margin: 0 0 1em; padding-left: 1.4em; }
  article li { margin: 0.2em 0; }
  article blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 2px solid var(--art); color: #5A5750; font-style: italic; }
  article code { font-family: var(--mono); font-size: 0.85em; background: #F1EADB; padding: 0.05em 0.3em; border-radius: 3px; }
  article pre { font-family: var(--mono); font-size: 13px; line-height: 1.5; background: #F1EADB; padding: 0.8em 1em; border-radius: 4px; overflow-x: auto; }
  article pre code { background: none; padding: 0; font-size: inherit; }
  article img { display: block; max-width: 100%; height: auto; margin: 1.2em 0; }
  article hr { border: 0; border-top: 1px solid var(--art); margin: 2em 0; }
  article table { border-collapse: collapse; margin: 0 0 1em; }
  article th, article td { border-bottom: 1px solid var(--art); padding: 0.3em 0.8em 0.3em 0; text-align: left; }
`;

// the list page types itself in (once per visit), like the home page; see /assets/typewriter.js
const TYPING_HEAD = `<script>
  // typewriter: hide the text under the h1 until /assets/typewriter.js types it in (once per visit)
  try {
    if (!sessionStorage.getItem("typed:" + location.pathname) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("typing");
      if (!document.prerendering) setTimeout(() => document.documentElement.classList.remove("typing"), 4000);   // never stay hidden
    }
  } catch (e) {}
</script>
<link rel="stylesheet" href="/assets/typewriter.css">
`;

function page({ title, description, url, body, typing = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Generated by build-thoughts.mjs from the files in thoughts/ — edit those, not this. -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Akshay Naik">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♞</text></svg>">
${typing ? TYPING_HEAD : ""}<link rel="stylesheet" href="/assets/scene.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=Crimson+Text:ital,wght@0,400;0,700;1,400&display=swap">
<style>${STYLE}</style>
</head>
<body>

<div class="content">
${body}
</div>

<pre id="scene" aria-hidden="true"></pre>

${typing ? '<script src="/assets/typewriter.js"></script>\n' : ""}<script src="/assets/ascii-scenes.js"></script>
</body>
</html>
`;
}

// first paragraph of a post as plain text, for link previews
function summary(html, fallback) {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  if (!m) return fallback;
  const text = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
  return text.length > 160 ? text.slice(0, 157).replace(/\s+\S*$/, "") + "…" : text || fallback;
}

export async function buildThoughts({ src, out, warn }) {
  let files = [];
  try { files = await fs.readdir(src); } catch { /* no folder yet */ }

  const posts = [];
  const slugs = new Set();
  for (const file of files) {
    if (file.startsWith("_") || file.startsWith(".")) continue;          // drafts, hidden files
    if (!POST_EXT.has(path.extname(file).toLowerCase())) continue;     // images etc. are just copied

    let { date, title } = parseFileName(file);
    let text = (await fs.readFile(path.join(src, file), "utf8")).replace(/^﻿/, "");
    const heading = text.match(/^\s*#\s+(.+?)\s*#*\s*(\r?\n|$)/);
    if (heading) { title = heading[1]; text = text.slice(heading[0].length); }
    if (!date) warn(`thoughts/${file}: no date at the start of the name (like "2026-11-26 ${title}.md") — listed at the bottom, undated`);

    let slug = slugify(title);
    while (slugs.has(slug)) slug += "-2";
    slugs.add(slug);

    const html = marked.parse(text);
    posts.push({ file, date, title, slug, html });
  }

  // newest first; same-day posts by name; undated at the bottom
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));

  await fs.mkdir(out, { recursive: true });
  for (const p of posts) {
    const url = `https://aknaik.com/thoughts/${p.slug}/`;
    const body = `  <h1>${esc(p.title)}</h1>
  <a href="/thoughts/">← back</a>
  ${p.date ? `<div class="meta">${longDate(p.date)}</div>` : `<div class="meta"></div>`}
  <article>
${p.html}  </article>`;
    await fs.mkdir(path.join(out, p.slug), { recursive: true });
    await fs.writeFile(path.join(out, p.slug, "index.html"), page({
      title: `${p.title} · Akshay Naik`,
      description: summary(p.html, p.title),
      url, body,
    }));
    console.log(`  ${p.date || "undated   "}  ${p.title}`);
  }

  const rows = posts.map((p) =>
    `    <div class="post-row"><span class="date">${p.date ? esc(shortDate(p.date)) : ""}</span><a href="/thoughts/${p.slug}/">${esc(p.title)}</a></div>`
  ).join("\n");
  await fs.writeFile(path.join(out, "index.html"), page({
    title: "Thoughts · Akshay Naik",
    description: "Writing by Akshay Naik.",
    url: "https://aknaik.com/thoughts/",
    typing: true,
    body: `  <h1>Thoughts</h1>
  <a href="/">← back</a>
${posts.length ? `  <div class="posts">\n${rows}\n  </div>` : `  <div class="empty">Nothing here yet.</div>`}`,
  }));
  console.log(`Thoughts: ${posts.length} post(s).`);
}

function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}
