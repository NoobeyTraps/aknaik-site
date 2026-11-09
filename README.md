# aknaik.com

The whole site is one file: `index.html`. No CSS, no build step, nothing to install.

## Editing

Open `index.html` in any text editor (VS Code works). Put your content between `<body>` and `</body>`.

Common tags:

```html
<h1>Big heading</h1>
<h2>Smaller heading</h2>

<p>A paragraph of text.</p>

<a href="https://github.com/your-username">A link</a>

<ul>
  <li>A bullet point</li>
  <li>Another one</li>
</ul>

<img src="photo.jpg" alt="Description of the photo">

<br>   (line break)
<hr>   (horizontal line)
```

To preview, double-click `index.html` and it opens in your browser. Refresh after each save.

## Adding more pages

Make another `.html` file next to `index.html` (copy `index.html` as a starting point). `about.html` will be at `aknaik.com/about`. Link to it with `<a href="/about">About</a>`.

## Adding files

Put a file (PDF, image) in this folder and link to it. `resume.pdf` will be at `aknaik.com/resume.pdf`, so the link is `<a href="/resume.pdf">Resume</a>`.

## Publishing

### First time

1. In VS Code, open the **Source Control** panel (Ctrl/Cmd+Shift+G) and click **Publish to GitHub**.
2. In Cloudflare, go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git** and pick the repo.
3. Set framework preset to **None**, leave the build command empty, and leave the build output directory empty (or `/`).
4. Click **Save and Deploy**.
5. In the project, open **Custom domains** and add `aknaik.com` and `www.aknaik.com`.

### After that

Edit, save, then commit and push in VS Code. The site updates within about a minute.
