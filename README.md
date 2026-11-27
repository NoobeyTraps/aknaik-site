# aknaik.com

Plain hand-written HTML with a small build step that resizes photos. Hosted on Cloudflare Workers (static assets).

## Layout

```
index.html               home page  → aknaik.com/
portfolio/index.html     → aknaik.com/portfolio/
photography/index.html   → aknaik.com/photography/
contact/index.html       → aknaik.com/contact/
thoughts/                posts → aknaik.com/thoughts/ (pages are generated, see below)
resume.pdf               → aknaik.com/resume.pdf
assets/ascii-arts.js     background ASCII art used on every page
assets/photography/      original photos + captions.txt (see below)
build.mjs                builds the site into dist/
build-thoughts.mjs       turns thoughts/ into the Thoughts pages
wrangler.jsonc           Cloudflare Worker config (serves dist/)
```

Each page has its own `<style>` block in its `<head>`. There's no shared stylesheet.

## Adding a page

Copy a folder like `contact/` to a new name, for example `about/`, then edit `about/index.html`. Change the `<title>`, the description and `og:` tags under it, and the content. It goes live at `aknaik.com/about/`. Link to it from the home page with `<a href="/about/">About</a>`.

## Thoughts (blog)

Add a file to `thoughts/` and it shows up on aknaik.com/thoughts/ the next time the site builds. No page to edit.

- **Name it with the date first:** `2026-11-26 Why I like chess.md`. The date sets the order, newest on top. The rest of the name becomes the headline.
- **Headline with `?` or `:` in it?** File names can't hold those, so put `# What is a qubit, really?` on the first line instead. That line wins over the file name.
- **Write in plain text** (`.txt` or `.md`). Blank lines separate paragraphs. Markdown works too: `## subheading`, `*italic*`, `**bold**`, `[link](https://…)`, `- lists`, `> quotes`.
- **Images:** put the image in `thoughts/` and write `![short description](photo.jpg)`.
- **Drafts:** start the file name with `_` and it won't be published.
- `thoughts/_example.md` is a draft with all of this in it.

A file with no date at the front still gets published, but goes at the bottom with no date, and the build prints a warning.

## Photos

Drop JPG/PNG files into `assets/photography/`. The build makes web-sized copies (640, 1280 and 2000 px wide) and writes the list the photography page reads. Notes:

- Photos are shown in filename order (`001.jpg`, `002.jpg`, …).
- Add `_med` or `_big` to a file name (`014_big.jpg`) to show it larger.
- Captions go in `assets/photography/captions.txt`, one per line: `014: Sunset over the quad`.
- HEIC isn't supported, so export those as JPG first.

## Preview locally

```
npm install
npm run build
npx wrangler dev        # or open dist/index.html directly
```

## Publishing

Commit and push to `main`. Cloudflare runs `npm run build` and deploys `dist/`. The site updates within about a minute.

`README.md`, `wrangler.jsonc`, `build.mjs` and the package files aren't copied into `dist/`, so they aren't public.
