# Photography

## Add photos

Drop photos (JPG, PNG or WebP) into this folder, then commit and push. They show up on `aknaik.com/photography` in filename order and are resized automatically.

iPhone HEIC photos won't work. Export them as JPG first, or set **Settings → Camera → Formats → Most Compatible**.

## Make a photo bigger

Add `_med` or `_big` to the end of the file name:

- `IMG_0042_med.jpg` is 2 rows tall
- `IMG_0042_big.jpg` is 3 rows tall (best for tall or square photos)

## Add captions

Open `captions.txt` in this folder and add one line per photo:

```
IMG_0042.jpg: Last light over the cornfields, heading home on I-57.
```

Leave out `_med` / `_big`, so a caption stays put if you resize the photo. Photos without a line get no caption.

## One-time Cloudflare setup

The photo page needs a build step. In Cloudflare, open the project → **Settings** → **Builds** and set:

- Build command: `npm run build`
- Build output directory: `dist`

## Preview on your computer (optional)

Needs [Node.js](https://nodejs.org). In the site folder run `npm install` once, then `npm run build`. The finished site is in `dist/`. Run `npx serve dist` and open the address it prints.
