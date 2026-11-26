// Animated ASCII scene along the bottom of the home page.
// On each load it picks one of two scenes at random: Lantern Lake or Aurora Fjord.
//
// Both scenes are adapted from ascii.rest by bas3line (https://ascii.rest,
// https://github.com/bas3line/ascii). The scene code is theirs; the changes here
// are that each scene hands back brightness, colour and what each cell is
// (sky, mountain, water, light...) instead of drawing dots, and the renderer
// below redraws that in this site's characters and colours, at a slower speed.
// The canoe and chimney smoke in Aurora Fjord are new.
//
// Settings worth changing are at the top of the renderer section: SPEED, FPS,
// SQUASH and the scene list. Colours are in index.html (#scene .g/.l/.v/.d).
//
/*
MIT License

Copyright (c) 2026 bas3line (https://github.com/bas3line)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// ============================================================================
// Lantern Lake (ascii.rest, adapted)
// ============================================================================
const lanternLake = (() => {
const LL_META = {
    name: "lantern lake",
    category: "scenes",
    note: "sky lanterns rising over a still mountain lake, one let go from a boat",
    cols: 200,
    rows: 100,
    cell: 1,
    fps: 15,
    ground: "#04060d",
    palette: [
        "#141b30", "#1c2a52", "#22346a", "#2a4080", "#324c96", "#3c58a8",
        "#33306e", "#433c88", "#54449a",
        "#62407e", "#7a4a88", "#934e86",
        "#a4546e", "#bc5e66", "#d06a62",
        "#dc7650", "#e88444", "#f09238",
        "#d4581a", "#ea6c1e", "#f78226", "#ff9530", "#ffa83c", "#ffbb4e", "#ffcc66", "#ffdc86", "#ffe8a8",
        "#fff3cf", "#fffbec",
        "#b8341a", "#d84420",
        "#2f3748", "#4f586c", "#5e5a7e", "#7a6a8c",
        "#5a3220", "#7c4628",
        // the far range's slate, then the stars: written straight in, never
        // matched, so the sky's violets can't turn slate and a greyed mix of warm
        // and blue can't come out as a white star
        "#4a5578", "#5d6a92", "#7381ab",
        "#c4cdec", "#e4e9fb", "#ffffff",
    ],
};
const W = 200, H = 100;
const WL = 64; // the waterline
const SRC = 100; // the middle of the festival on the far shore
// the boat's middle and its waterline, far enough out that the lantern held
// over its head sits against the dark trees' reflection
const BX = 108.5, BW = 90;
const SC = 1.4; // the boat's scale
const FX = BX - 3 * SC; // where the figure stands in it
// The figure lets a lantern go this far into every cycle and lights the
// next one at LIT, so it holds one up most of the time.
const CYCLE = 20, LET_GO = 3, LIT = 6;
const HELD = 5 * SC; // the boat's lanterns, in cells tall
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const AIR = 0, FAR = 1, BACK = 2, PEAK = 3, TREE = 4;
function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, octaves) {
    let s = 0, n = 0, amp = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
        s += amp * noise(x * f, y * f);
        n += amp;
        amp *= 0.5;
        f *= 2;
    }
    return s / n;
}
const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => {
    const k = clamp((v - a) / (b - a));
    return k * k * (3 - 2 * k);
};
const mix = (a, b, k) => a + (b - a) * k;
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
// distance from a point to a segment
function seg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
    const ex = ax + dx * k - px, ey = ay + dy * k - py;
    return Math.sqrt(ex * ex + ey * ey);
}
// Ranges as tent peaks [x, height, slope], roughened: the high peaks either
// side, the nearer shoulders in front of them, and a distant range between.
const PEAKS = [[22, 42, 1.2], [-4, 33, 0.9], [172, 33, 1.05], [215, 22, 0.6]];
const SHOULDERS = [[50, 25, 1], [64, 12, 0.75], [150, 17, 0.95], [196, 21, 0.75]];
const DISTANT = [[98, 17, 0.42], [122, 14, 0.5], [82, 12, 0.45], [140, 11, 0.5]];
function range(x, peaks, seed, rough) {
    let m = -99, px = 0;
    for (const [cx, h, s] of peaks) {
        const v = h - Math.abs(x - cx) * s;
        if (v > m)
            (m = v), (px = cx);
    }
    const j = rough * (fbm(x * 0.09, seed, 3) - 0.5) + rough * 0.45 * (noise(x * 0.45, seed + 5) - 0.5);
    return [m + j * Math.min(1, Math.max(0, m) / 6), px];
}
// A sky lantern's outline, in units of its height from its top: wider at the
// shoulders than at the open bottom, the shoulders rounded.
function inside(u, v) {
    if (v < 0 || v > 1)
        return false;
    let hw = 0.34 - 0.08 * v;
    if (v < 0.14)
        hw *= Math.sqrt(1 - 0.6 * ((0.14 - v) / 0.14) ** 2);
    return u <= hw && u >= -hw;
}
function lanternLake() {
    const P = LL_META.palette.map(hex);
    const STAR = P.length - 3; // the first of the stars' colours
    const SL = STAR - 3; // and of the far range's slate
    const N = W * H, S = WL * W;
    const out = new Array(N);
    const lut = new Uint8Array(32768).fill(255);
    const nearest = (r, g, b) => {
        const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
        if (lut[k] !== 255)
            return lut[k];
        let best = 0, bd = 1e9;
        for (let i = 0; i < SL; i++) {
            const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
            const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
            if (d < bd)
                (bd = d), (best = i);
        }
        return (lut[k] = best);
    };
    // --- the land and the sky, built once ----------------------------------------
    const mat = new Uint8Array(S);
    const sR = new Float32Array(S), sG = new Float32Array(S), sB = new Float32Array(S);
    const take = new Float32Array(S); // how much of the festival's warm light each cell takes
    const backTop = new Float32Array(W), backX = new Float32Array(W);
    const frontTop = new Float32Array(W), frontX = new Float32Array(W), farTop = new Float32Array(W);
    for (let x = 0; x < W; x++) {
        const [hb, pb] = range(x + 0.5, PEAKS, 3.1, 4);
        const [hf, pf] = range(x + 0.5, SHOULDERS, 7.7, 3);
        const [hd] = range(x + 0.5, DISTANT, 11.3, 2.2);
        backTop[x] = WL - Math.max(hb, 0), backX[x] = pb;
        frontTop[x] = WL - Math.max(hf, 0), frontX[x] = pf;
        farTop[x] = WL - Math.max(hd, 0);
    }
    // The festival's light: a warm dome in the air over the middle of the far
    // shore, leaning the way the breeze carries the lanterns.
    const dome = (x, y) => {
        const up = Math.max(0, WL - 6 - y); // from the tops of the trees
        const dx = (x - SRC - 0.3 * up) / (44 + up);
        return Math.exp(-dx * dx) * (0.6 * Math.exp(-up / 14) + 0.4 * Math.exp(-up / 40));
    };
    // The sky's hue by how warm it is: night blue, through violet, mauve and
    // rose, to amber right over the trees. Mixing the glow into the blue would
    // grey it, and a grey dot is drawn pale, so the hue walks round instead.
    const HUES = [[0.22, 0.36, 1], [0.46, 0.36, 1], [0.76, 0.42, 0.92], [1, 0.48, 0.58], [1, 0.54, 0.34], [1, 0.58, 0.2]];
    const hue = (w, j) => {
        const f = clamp(w) * 5, i = Math.min(4, Math.floor(f));
        return mix(HUES[i][j], HUES[i + 1][j], f - i);
    };
    // A mountainside: the faces turned toward the festival take a little of its
    // light, the ridge between them wandering as it comes down from the peak,
    // and the ridgeline catches the sky behind it, blue away from the festival
    // and warm near it. `haze` lifts a range, `relief` is how far its faces
    // stand out from its gullies, `edge` is how bright its ridgeline is and
    // `warm` is how much the festival's light tints it. Returns that light.
    const slope = (k, x, y, top, px, haze, relief, edge, warm) => {
        const xc = x + 0.5, depth = y - top;
        const inward = px < SRC ? 1 : -1;
        const ridge = px + (depth + 1) * 0.6 * (noise(y * 0.1, px) - 0.5);
        const face = smooth(-4, 4, (xc - ridge) * inward);
        const u = x + depth * 0.45 * Math.sign(xc - px || 1);
        const rib = (q) => fbm(q * 0.13, px * 0.37, 3);
        const grad = (rib(u + 1) - rib(u - 1)) * 7 * inward;
        const lit = clamp(0.3 + 0.5 * face + grad * 0.5);
        const tex = 0.8 + 0.4 * fbm(x * 0.35, y * 0.35, 2);
        const w = lit * Math.exp(-(((xc - SRC) / 70) ** 2)) * (0.4 + 0.6 * smooth(top + 2, WL, y)) * 0.9;
        const b = (haze + relief * lit * lit) * tex + 0.16 * w;
        const rim = smooth(1.8, 0.3, depth) * edge, sky = dome(xc, top - 1);
        const c = (j) => b * hue(w * warm, j) + rim * hue(sky, j);
        sR[k] = c(0), sG[k] = c(1), sB[k] = c(2);
        return w;
    };
    // The far range's cells, drawn in slate, a greyed blue no other part of the
    // picture uses: the air in front of it greys it, so it stands apart from the
    // saturated sky above and the dark shoulders below. Written straight in, as
    // the stars are, since matching would pull the sky's violets to it as well.
    const far = new Uint8Array(S);
    for (let r = 0; r < WL; r++) {
        for (let x = 0; x < W; x++) {
            const k = r * W + x;
            const y = r + 0.5, xc = x + 0.5;
            if (y >= frontTop[x]) {
                mat[k] = PEAK;
                slope(k, x, y, frontTop[x], frontX[x], 0.05, 0.06, 0.3, 1);
            }
            else if (y >= backTop[x]) {
                mat[k] = BACK;
                // slate, but not where the festival lights it or on the ridgeline,
                // which keeps the sky's own blue
                if (slope(k, x, y, backTop[x], backX[x], 0.24, 0.3, 0.35, 0.5) < 0.3 && y - backTop[x] > 1.2)
                    far[k] = 1;
            }
            else if (y >= farTop[x]) {
                mat[k] = FAR;
                // a distant range behind the festival, veiled in the warm haze its
                // light makes in the air in front, dark up on the ridge
                const tex = fbm(x * 0.2, y * 0.3, 3);
                const w = dome(xc, y);
                const b = 0.06 + 0.04 * tex + 0.3 * w + 0.7 * w ** 3;
                sR[k] = b * hue(w, 0), sG[k] = b * hue(w, 1), sB[k] = b * hue(w, 2);
            }
            else {
                // night blue overhead, lighter on the horizon, warmed over the festival
                const v = Math.pow(y / WL, 1.5);
                const hz = 0.85 + 0.3 * fbm(x * 0.04, r * 0.07, 3);
                const w = dome(xc, y);
                const b = (0.18 + 0.32 * v) * hz + 0.5 * w;
                sR[k] = b * hue(w, 0), sG[k] = b * hue(w, 1), sB[k] = b * hue(w, 2);
                take[k] = w;
            }
        }
    }
    // The far shore's trees: a low band of scrub along the water with spruce
    // standing out of it, shorter in the clearing where the festival is.
    const scrub = (x) => WL - 2.4 - 1.4 * fbm(x * 0.15, 5.5, 3);
    for (let r = 0; r < WL; r++)
        for (let x = 0; x < W; x++)
            if (r + 0.5 >= scrub(x + 0.5))
                mat[r * W + x] = TREE;
    const spruce = (tx, th, tw, tb) => {
        for (let r = Math.max(0, Math.floor(tb - th)); r < WL; r++) {
            const y = r + 0.5, dy = y - (tb - th);
            if (dy < 0 || y >= tb + 0.5)
                continue;
            const tier = (dy + th * 0.3) / 1.6;
            const w = (dy / th) * tw * (0.7 + 0.45 * (tier - Math.floor(tier))) + 0.3;
            for (let x = Math.max(0, Math.floor(tx - tw - 1)); x <= Math.min(W - 1, tx + tw + 1); x++) {
                if (Math.abs(x + 0.5 - tx) <= w)
                    mat[r * W + x] = TREE;
            }
        }
    };
    for (let x = -2; x < W + 2;) {
        const h = hash(Math.floor(x * 7), 21);
        const clearing = smooth(22, 0, Math.abs(x - SRC));
        const th = (2.6 + 4.4 * hash(Math.floor(x * 3), 5) ** 1.2) * (1 - 0.3 * clearing);
        spruce(x + hash(Math.floor(x), 2), th, 1 + 0.8 * hash(Math.floor(x), 4), scrub(x) + 1);
        x += 1.2 + 1.8 * h;
    }
    for (let k = 0; k < S; k++) {
        if (mat[k] !== TREE)
            continue;
        const x = k % W, r = (k / W) | 0;
        const h = hash(x * 13 + r, 5);
        sR[k] = 0.004 + 0.004 * h, sG[k] = 0.006 + 0.006 * h, sB[k] = 0.012 + 0.008 * h;
        // the tops of the trees, backlit by the festival behind them
        const edge = r === 0 || mat[k - W] !== TREE ? 1 : r > 1 && mat[k - 2 * W] !== TREE ? 0.35 : 0;
        const g = edge * dome(x + 0.5, r + 0.5) * 0.45;
        sR[k] += g, sG[k] += g * 0.5, sB[k] += g * 0.18;
        take[k] = edge * 0.5;
    }
    const floorS = new Float32Array(S);
    for (let k = 0; k < S; k++)
        floorS[k] = mat[k] === AIR ? 0.04 + 0.08 * ((k / W) | 0) / WL : mat[k] === FAR || mat[k] === BACK ? 0.03 : 0;
    // people on the shore with lanterns still in their hands
    const shoreLights = [];
    for (let i = 0, x = SRC - 24; i < 8; i++) {
        shoreLights.push([Math.round(x), WL - 1 - (hash(i, 62) > 0.6 ? 1 : 0), hash(i, 63) * 6.28]);
        x += 2 + 9 * hash(i, 61) ** 2;
    }
    // stars, thinning out where the festival lights the sky
    const stars = [];
    for (let k = 0; k < S; k++) {
        if (mat[k] !== AIR)
            continue;
        const h = hash(k % W, Math.floor(k / W) + 101);
        if (h > 0.985 && take[k] < 0.25)
            stars.push([k, hash(k, 3) * 6.28, 0.8 + hash(k, 4) * 2.5, (0.45 + (h - 0.985) * 40) * (1 - take[k] * 2.5)]);
    }
    // rows of the water that break the reflection into strips
    const gap = new Uint8Array(H);
    for (let r = WL; r < H; r++)
        gap[r] = hash(r, 404) < 0.3 ? 1 : 0;
    // --- the lanterns -----------------------------------------------------------
    // Let go on the far shore. Each climbs from below the scrub, so its start is
    // hidden, and either burns out or sails off the top before it starts again.
    const shore = [];
    for (let i = 0; i < 240; i++) {
        const near = i >= 196;
        const s = near ? 1.5 + 1.7 * hash(i, 11) ** 1.5 : 0.45 + 0.9 * hash(i, 11) ** 1.4;
        const v = 0.3 + 0.62 * s;
        const out = near && hash(i, 12) < 0.7;
        const climb = out ? WL + 3 * s + 4 : 12 + 46 * hash(i, 13) ** 0.8;
        shore.push({
            i, s, v, life: (climb + s + 1) / v, off: hash(i, 14), wd: 0.12 + 0.3 * hash(i, 15),
            sw: 0.25 * s + 0.2, sf: 0.3 + 0.5 * hash(i, 16), ph: hash(i, 17) * 6.28, f1: 2 + 3 * hash(i, 18), f2: 5 + 4 * hash(i, 19),
            out, wide: near || hash(i, 20) < 0.08,
        });
    }
    shore.sort((a, b) => a.s - b.s);
    const startX = (f, lap) => {
        const n = f.i * 7 + lap * 131;
        if (f.wide)
            return 12 + 176 * hash(n, 23);
        return SRC - 6 + 30 * (hash(n, 23) + hash(n, 24) + hash(n, 25) - 1.5);
    };
    // The breeze leans the plume over to the right, more the higher it gets.
    const lean = (f, climb) => climb * f.wd + climb * climb * 0.004;
    // Let go near us, below the frame: they rise past large and fast.
    // [size, where it is across and down at the start]; the last few are still
    // below the frame, on their way up
    const NEAR = [
        [12.5, 34, 30], [8.5, 178, 14], [6.5, 66, 74], [5.2, 154, 46], [4.4, 18, 86], [4.6, 136, 4],
        [9.5, 190, 116], [10.5, 150, 160], [5.8, 80, 128], [7, 28, 190], [4.2, 172, 150],
    ];
    const close = NEAR.map(([s, x, y], i) => {
        const v = 0.35 + 0.42 * s;
        const path = H + 5 * s; // from below the frame to above it, glow and all
        const life = (path / v) * (1.08 + 0.3 * hash(i, 41));
        return { i, s, v, x, path, life, off: (H + 2.5 * s - y) / v / life, wd: s * 0.05, sw: 0.35 * s, sf: 0.2 + 0.2 * hash(i, 42), ph: hash(i, 43) * 6.28 };
    });
    // --- the boat and the figure in it --------------------------------------------
    // Drawn in boat units, SC cells each, measured across from the figure (or
    // the boat's middle) and up from the waterline.
    // [shoulder, elbow, hand] for each pose, one arm; the other mirrors it
    const ARMS = {
        up: [[1.3, 9.4], [3, 11.5], [2, 14.1]],
        down: [[1.3, 9.4], [2, 6.6], [1.9, 4.4]],
        chest: [[1.3, 9.4], [2.4, 7.2], [1.2, 6]],
    };
    // a long low hull, its ends sweeping up, the bow (on the right) higher
    const gunwale = (dx) => 2.4 + (dx > 0 ? 3 : 1.8) * smooth(4, 12.5, Math.abs(dx)) ** 2;
    const hull = (dx, up) => up <= gunwale(dx) && up > -0.6 && Math.abs(dx) <= 12.5 - Math.max(0, 1.8 - up) * 2.4;
    const body = (dx, up, arms) => {
        if ((dx * dx) / 1.3 + (up - 11.2) ** 2 / 1.5 < 1)
            return true; // the head
        if (up <= 9.8 && up > 1 && Math.abs(dx) <= 1.35 + 0.5 * smooth(9.8, 2, up))
            return true; // a long coat
        const ax = Math.abs(dx);
        return seg(ax, up, arms[0][0], arms[0][1], arms[1][0], arms[1][1]) < 0.66 || seg(ax, up, arms[1][0], arms[1][1], arms[2][0], arms[2][1]) < 0.58;
    };
    // The boat and the figure, drawn into a box of cells round the boat each
    // frame (1 boat, 2 figure) with the arms partway between two poses, so they
    // move rather than snap from one to the next.
    const BOX = [Math.floor(BX - 13 * SC), BW - Math.ceil(16 * SC), Math.ceil(27 * SC), Math.ceil(16 * SC) + 2]; // x, row, cols, rows
    const hulls = new Uint8Array(BOX[2] * BOX[3]), shape = new Uint8Array(BOX[2] * BOX[3]);
    for (let j = 0; j < BOX[3]; j++) {
        for (let i = 0; i < BOX[2]; i++)
            if (hull((BOX[0] + i + 0.5 - BX) / SC, (BW - (BOX[1] + j + 0.5)) / SC))
                hulls[j * BOX[2] + i] = 1;
    }
    const arms = ARMS.up.map((p) => [...p]);
    const pose = (a, b, k) => {
        for (let i = 0; i < 3; i++)
            (arms[i][0] = mix(a[i][0], b[i][0], k)), (arms[i][1] = mix(a[i][1], b[i][1], k));
        for (let j = 0; j < BOX[3]; j++) {
            for (let i = 0; i < BOX[2]; i++) {
                const q = j * BOX[2] + i;
                shape[q] = hulls[q] || (body((BOX[0] + i + 0.5 - FX) / SC, (BW - (BOX[1] + j + 0.5)) / SC, arms) ? 2 : 0);
            }
        }
    };
    // a small lamp on the bow, always lit, so the boat never goes dark between
    // one lantern and the next
    const BOWX = BX + 11.2 * SC, BOWY = BW - (gunwale(11.2) + 1.2) * SC;
    const SOLID = new Uint8Array(N);
    const LIT = new Float32Array(N);
    // --- per frame ----------------------------------------------------------------
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
    const FL = new Float32Array(N);
    const paint = (k, pr, pg, pb, a) => {
        R[k] += (pr - R[k]) * a, G[k] += (pg - G[k]) * a, B[k] += (pb - B[k]) * a;
        if (FL[k] < 0.12 * a)
            FL[k] = 0.12 * a;
        if (LIT[k] < a) LIT[k] = a;
    };
    // Draws a lantern h cells tall centred on (cx, cy) at brightness I and
    // opacity a, above row `limit`, leaving out the cells `hide` marks.
    const lantern = (cx, cy, h, I, a, limit, hide) => {
        if (h < 1.4) {
            // a spark: one cell
            const x = Math.floor(cx), r = Math.floor(cy);
            if (x < 0 || x >= W || r < 0 || r >= limit)
                return;
            const k = r * W + x;
            if (hide && hide[k])
                return;
            const q = I * (0.85 + 0.15 * h);
            paint(k, q, q * (0.42 + 0.3 * q), q * (0.1 + 0.18 * q * q), a);
            return;
        }
        if (h < 2.6) {
            // two cells tall, the paper above and the burner's glow below, spread
            // over the rows it straddles so it slides up rather than jumping
            const x = Math.floor(cx), top = cy - 1, r0 = Math.floor(top);
            if (x < 0 || x >= W)
                return;
            for (let r = r0; r <= r0 + 2; r++) {
                if (r < 0 || r >= limit)
                    continue;
                const k = r * W + x;
                if (hide && hide[k])
                    continue;
                const up = Math.max(0, Math.min(r + 1, top + 1) - Math.max(r, top)); // overlap with the paper
                const dn = Math.max(0, Math.min(r + 1, top + 2) - Math.max(r, top + 1)); // and with the glow
                if (up + dn < 0.02)
                    continue;
                const q = I * (0.8 * up + 1.1 * dn) / (up + dn);
                paint(k, q, q * (0.34 + 0.36 * q), q * (0.06 + 0.2 * q * q), a * (up + dn));
            }
            return;
        }
        const top = cy - h / 2;
        const x0 = Math.max(0, Math.floor(cx - 0.36 * h)), x1 = Math.min(W - 1, Math.floor(cx + 0.36 * h));
        const r0 = Math.max(0, Math.floor(top)), r1 = Math.min(limit - 1, Math.floor(top + h));
        for (let r = r0; r <= r1; r++) {
            for (let x = x0; x <= x1; x++) {
                const k = r * W + x;
                if (hide && hide[k])
                    continue;
                let cov = 0;
                for (let sy = 0; sy < 3; sy++)
                    for (let sx = 0; sx < 3; sx++)
                        if (inside((x + (sx + 0.5) / 3 - cx) / h, (r + (sy + 0.5) / 3 - top) / h))
                            cov++;
                if (!cov)
                    continue;
                const u = (x + 0.5 - cx) / h, v = clamp((r + 0.5 - top) / h);
                const xn = Math.min(1, Math.abs(u) / (0.34 - 0.08 * v));
                // Lit through: past full brightness, so the body is solid, its colour
                // deep orange up under the crown and pale gold over the burner.
                const q = I * (1 - 0.3 * xn * xn) * (0.78 + 0.42 * v);
                const fl = Math.exp(-((u / 0.13) ** 2) - ((v - 0.9) / 0.1) ** 2) * I;
                paint(k, q + fl * 0.3, q * (0.3 + 0.42 * q) + fl * 0.6, q * (0.04 + 0.2 * q * q) + fl * 0.5, (cov / 9) * a);
            }
        }
    };
    // the warm air round a lantern
    const halo = (cx, cy, h, g, limit) => {
        const e = 0.4 + 0.32 * h;
        const reach = Math.ceil(e * 4);
        const r0 = Math.max(0, Math.floor(cy - reach)), r1 = Math.min(limit - 1, Math.floor(cy + reach));
        const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(W - 1, Math.floor(cx + reach));
        for (let r = r0; r <= r1; r++) {
            const dy = r + 0.5 - cy;
            for (let x = x0; x <= x1; x++) {
                const dx = x + 0.5 - cx;
                const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - 0.3 * h);
                const q = g * (Math.exp(-d / e) + 0.25 * Math.exp(-d / (e * 2.5)));
                const k = r * W + x;
                R[k] += q, G[k] += q * 0.5, B[k] += q * 0.17;
            }
        }
    };
    const hide = new Uint8Array(S);
    for (let k = 0; k < S; k++)
        hide[k] = mat[k] === TREE ? 1 : 0;
    // the festival's light laid on the water as a broad road, widening toward us
    const roadX = new Float32Array(H), roadW = new Float32Array(H), roadA = new Float32Array(H);
    for (let r = WL; r < H; r++) {
        const dw = r + 0.5 - WL;
        roadX[r] = SRC + 4 + dw * 0.12;
        roadW[r] = 7 + dw * 0.9;
        // near the shore the mirror carries the festival's light; the road takes
        // over further out
        roadA[r] = 0.9 * smooth(3, 16, dw) * Math.exp(-dw / 60);
    }
    return (t, { color } = {}) => {
        SOLID.fill(0); LIT.fill(0);
        for (let k = 0; k < S; k++) if (mat[k] === TREE) SOLID[k] = 3; else if (mat[k] === PEAK) SOLID[k] = 2; else if (mat[k] === BACK) SOLID[k] = 1; else if (mat[k] === FAR) SOLID[k] = 4;
        const breathe = 0.06 * Math.sin(t * 0.5) + 0.04 * Math.sin(t * 1.7 + 1);
        // --- the sky and the land -------------------------------------------------------
        for (let k = 0; k < S; k++) {
            const g = 1 + take[k] * breathe;
            R[k] = sR[k] * g, G[k] = sG[k] * g, B[k] = sB[k] * g;
            FL[k] = floorS[k];
        }
        // lanterns from the far shore, the furthest first
        for (const f of shore) {
            const u = t / f.life + f.off;
            const lap = Math.floor(u);
            const a = (u - lap) * f.life;
            const cx = startX(f, lap) + lean(f, f.v * a) + f.sw * (Math.sin(a * f.sf + f.ph) - Math.sin(f.ph));
            const cy = WL + f.s * 0.5 + 0.6 - f.v * a;
            if (cy < -2 * f.s - 2)
                continue;
            let I = (0.7 + 0.45 * Math.min(1, f.s)) * (0.88 + 0.08 * Math.sin(t * f.f1 + f.ph) + 0.04 * Math.sin(t * f.f2));
            let alpha = 1;
            if (!f.out) {
                // burning out: it gutters, reddens and goes
                const end = smooth(f.life - 4, f.life, a);
                I *= 1 - 0.55 * end * (0.6 + 0.4 * Math.sin(a * 11 + f.ph));
                alpha = 1 - end;
            }
            if (alpha <= 0.01)
                continue;
            if (f.s >= 1.4)
                halo(cx, cy, f.s, 0.07 * I * alpha * smooth(0, 2, a), WL);
            lantern(cx, cy, f.s, I, alpha, WL, hide);
        }
        for (const [x, r, ph] of shoreLights) {
            const k = r * W + x;
            const q = 0.9 + 0.15 * Math.sin(t * 3.1 + ph) + 0.1 * Math.sin(t * 7.3 + ph * 2);
            R[k] = q, G[k] = q * 0.62, B[k] = q * 0.24, FL[k] = 0.2;
        }
        // --- the lake: the sky upside down, stretched and broken by slow ripples ----
        for (let r = WL; r < H; r++) {
            const y = r + 0.5;
            const dw = y - WL;
            const deep = mix(1, 0.65, dw / (H - WL));
            const ry = WL - 1 - (r - WL);
            const r0 = Math.max(0, ry) * W, r1 = Math.max(0, ry - 1) * W, r2 = Math.max(0, ry - 2) * W;
            const fade = smooth(H + 4, H - 7, y);
            const rx = roadX[r], rw = roadW[r], ra = roadA[r];
            for (let x = 0; x < W; x++) {
                const k = r * W + x;
                const wave = noise(x * 0.04 + t * 0.05, r * 0.55 - t * 0.35);
                const sx = x + (0.45 + dw * 0.075) * Math.sin(r * 1.3 + t * 1.6 + wave * 4);
                let ix = Math.floor(sx);
                const fx = sx - ix;
                ix = Math.max(0, Math.min(W - 2, ix));
                const a0 = r0 + ix, a1 = r1 + ix, a2 = r2 + ix;
                const sky = mat[a0] !== TREE;
                // long level streaks where the ripples face us, darker troughs between
                const streak = smooth(0.25, 0.75, noise(x * 0.035 + t * 0.04, r * 0.75 - t * 0.3));
                let kr = 0.9 * (0.5 + 0.5 * streak) * (0.85 + 0.25 * wave) * deep;
                if (gap[r] && wave < 0.45)
                    kr *= 0.2;
                const gx = 1 - fx;
                let cr = ((R[a0] * gx + R[a0 + 1] * fx) * 0.5 + (R[a1] * gx + R[a1 + 1] * fx) * 0.3 + (R[a2] * gx + R[a2 + 1] * fx) * 0.2) * kr + 0.006;
                let cg = ((G[a0] * gx + G[a0 + 1] * fx) * 0.5 + (G[a1] * gx + G[a1 + 1] * fx) * 0.3 + (G[a2] * gx + G[a2 + 1] * fx) * 0.2) * kr + 0.012;
                let cb = ((B[a0] * gx + B[a0 + 1] * fx) * 0.5 + (B[a1] * gx + B[a1 + 1] * fx) * 0.3 + (B[a2] * gx + B[a2 + 1] * fx) * 0.2) * kr + 0.028;
                // the festival's road: a glow on the water, broken into short level
                // dashes where the ripples catch it
                let g = 0;
                const qx = (x + 0.5 - rx) / rw;
                if (qx > -2.2 && qx < 2.2) {
                    const dash = smooth(0.42, 0.72, noise(x * 0.11 + t * 0.1, r * 0.9 - t * 0.55));
                    g = ra * Math.exp(-qx * qx) * (0.3 + 0.7 * dash) * (gap[r] ? 0.55 : 1);
                }
                // the shore lights laid on the water
                if (dw < 10) {
                    for (const [lx, , ph] of shoreLights) {
                        const d = x - lx;
                        if (d > 3 || d < -3)
                            continue;
                        g += Math.exp(-d * d * 1.5) * Math.exp(-dw / 4) * smooth(0.35, 0.7, noise(x * 0.6 + ph, y * 1.3 - t * 1.4)) * 0.8;
                    }
                }
                // where the warm light lies on the water it replaces the blue, so it
                // stays gold instead of greying
                if (g > 0) {
                    const keep = 1 - Math.min(0.9, g * 4);
                    cr = cr * keep + g, cg = cg * keep + g * 0.56, cb = cb * keep + g * 0.2;
                }
                // elsewhere the crests of the ripples catch the blue of the sky
                if (g < 0.2) {
                    const sheen = smooth(0.6, 0.85, noise(x * 0.07 + t * 0.03, r * 1.1 - t * 0.25)) * 0.12 * (1 - g * 5) * deep;
                    cr += sheen * 0.3, cg += sheen * 0.48, cb += sheen;
                }
                R[k] = cr * fade, G[k] = cg * fade, B[k] = cb * fade;
                FL[k] = (sky ? 0.07 * deep : 0.03) * fade;
            }
        }
        // --- the boat ------------------------------------------------------------------
        const tc = ((t % CYCLE) + CYCLE) % CYCLE;
        const bob = (at) => 0.3 * Math.sin(at * 1.3);
        const holdY = BW - 14.1 * SC - HELD / 2;
        // each of the boat's lanterns flickers in its own time, the same in the
        // hands and after it is let go: m is the cycle it is let go in
        const flick = (m) => 1.1 + 0.05 * Math.sin(t * 4.7 + m * 2.1) + 0.03 * Math.sin(t * 11.3 + m * 5.3);
        const n = Math.floor(t / CYCLE);
        const mine = flick(tc < LET_GO ? n : n + 1);
        // the lantern in the figure's hands, if there is one, and how lit it is
        let hy = 0, hs = HELD, ha = 0;
        if (tc < LET_GO || tc >= LIT + 5)
            (hy = holdY + bob(t)), (ha = 1);
        else if (tc >= LIT) {
            // lit at the chest, filling with light, then lifted over the head
            ha = smooth(LIT, LIT + 2.5, tc);
            hs = HELD * (0.75 + 0.25 * smooth(LIT, LIT + 3, tc));
            hy = mix(BW - 8.6 * SC, holdY + bob(t), smooth(LIT + 3.5, LIT + 5, tc));
        }
        // the arms: held up a moment after the let-go, lowered, brought up to the
        // chest to light the next, and lifted with it over the head
        if (tc < LET_GO + 2)
            pose(ARMS.up, ARMS.down, smooth(LET_GO + 1, LET_GO + 2, tc));
        else if (tc < LIT + 1)
            pose(ARMS.down, ARMS.chest, smooth(LIT - 0.6, LIT, tc));
        else
            pose(ARMS.chest, ARMS.up, smooth(LIT + 3.5, LIT + 5, tc));
        // the lanterns already let go: this cycle's and the two before
        const flights = [];
        for (let m = n; m >= n - 2; m--) {
            const tr = m * CYCLE + LET_GO, age = t - tr;
            if (age < 0)
                continue;
            const y = holdY + bob(tr) - 2.8 * (age - 1.5 * (1 - Math.exp(-age / 1.5)));
            if (y < -3 * HELD)
                continue;
            flights.push([FX + 0.3 * age + 1.2 * Math.sin(age * 0.35), y, flick(m)]);
        }
        // their light: a glow in the air round each, and on the water a pool
        // round the boat and a broken road toward us, fading as a lantern rises
        // [x, the bottom of the lantern, how much of it reaches the water and the
        // boat, how big its pool is]
        const lights = [];
        const lamp = 1.2 + 0.04 * Math.sin(t * 5.3) + 0.03 * Math.sin(t * 12.7);
        lights.push([BOWX, BOWY + 1, 0.4 * lamp, 0.4]);
        halo(BOWX, BOWY, 2, 0.07 * lamp, H);
        if (ha > 0)
            lights.push([FX, hy + hs / 2, ha * mine, 1]);
        for (const [x, y, l] of flights) {
            halo(x, y, HELD, 0.2 * l, H);
            lights.push([x, y + HELD / 2, l * Math.exp(-Math.max(0, holdY - y) / 8), 1]);
        }
        if (ha > 0)
            halo(FX, hy, HELD, 0.2 * ha * mine, H);
        for (const [lx, , q, sz] of lights) {
            if (q < 0.003)
                continue;
            for (let r = Math.floor(BW - 9 * SC); r < H; r++) {
                const y = r + 0.5, dw = y - BW;
                for (let x = Math.max(0, Math.floor(lx - 34 * sz)); x < Math.min(W, lx + 34 * sz); x++) {
                    const k = r * W + x;
                    const dx = x + 0.5 - lx;
                    // the water behind the boat is further off, so its pool is squashed
                    let g = Math.exp(-Math.sqrt((dx / (16 * SC * 0.8 * sz)) ** 2 + (dw / ((dw < 0 ? 2.6 : 3.6) * SC * sz)) ** 2)) * 0.5;
                    if (dw > -1) {
                        const w = (1.4 + 0.2 * Math.max(0, dw)) * (0.5 + 0.5 * sz);
                        g += Math.exp(-((dx / w) ** 2)) * Math.exp(-Math.max(0, dw) / (16 * sz)) * smooth(0.4, 0.72, noise(x * 0.45 + 3, y * 1.2 - t * 1.3)) * 1.1;
                    }
                    g *= q;
                    const keep = 1 - Math.min(0.9, g * 4);
                    R[k] = R[k] * keep + g, G[k] = G[k] * keep + g * 0.62, B[k] = B[k] * keep + g * 0.26;
                }
            }
        }
        // the boat and the figure, dark against it, their edges lit from above
        for (let j = 0; j < BOX[3]; j++) {
            for (let i = 0; i < BOX[2]; i++) {
                const m = shape[j * BOX[2] + i];
                if (!m)
                    continue;
                const x = BOX[0] + i, r = BOX[1] + j;
                if (x < 0 || x >= W || r >= H)
                    continue;
                const k = r * W + x;
                // the sides of the figure, a thin rim against the road behind
                let g = m === 2 && (i === 0 || i === BOX[2] - 1 || !shape[j * BOX[2] + i - 1] || !shape[j * BOX[2] + i + 1]) ? 0.16 : 0;
                const top = j === 0 || !shape[(j - 1) * BOX[2] + i];
                for (const [lx, ly, lq] of lights) {
                    if (lq < 0.003)
                        continue;
                    const dx = lx - (x + 0.5), dy = ly - (r + 0.5);
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (m === 2) {
                        // the neighbour toward the light: if it is open, this cell is an edge facing it
                        const ni = i + Math.round(dx / d), nj = j + Math.round(dy / d);
                        const open = ni < 0 || nj < 0 || ni >= BOX[2] || nj >= BOX[3] || !shape[nj * BOX[2] + ni];
                        g += lq * (open ? 0.95 : 0.05) * Math.exp(-d / (6 * SC));
                    }
                    else {
                        // the gunwale catches the light along its length
                        g += lq * (top ? 0.6 * Math.exp(-Math.abs(dx) / (11 * SC)) : 0.02);
                    }
                }
                R[k] = 0.01 + g, G[k] = 0.008 + g * 0.55, B[k] = 0.014 + g * 0.22;
                FL[k] = 0; SOLID[k] = 5;
            }
        }
        lantern(BOWX, BOWY, 2, lamp, 1, H, null);
        for (const [x, y, q] of flights)
            lantern(x, y, HELD, q, 1, H, null);
        if (ha > 0)
            lantern(FX, hy, hs, ha * mine, Math.min(1, ha * 1.4), H, null);
        // --- lanterns rising past us ------------------------------------------------------
        for (const c of close) {
            const u = t / c.life + c.off;
            const lap = Math.floor(u);
            const a = (u - lap) * c.life;
            // before its first flight it is still waiting below the frame
            if (lap < 0 || a * c.v > c.path)
                continue;
            let x0 = c.x;
            if (lap) {
                x0 = 6 + 188 * hash(c.i * 17 + lap, 44);
                if (x0 > 84 && x0 < 132)
                    x0 = x0 < 108 ? x0 - 32 : x0 + 32; // clear of the boat
            }
            const cx = x0 + c.wd * a + c.sw * (Math.sin(a * c.sf + c.ph) - Math.sin(c.ph));
            const cy = H + 2.5 * c.s - c.v * a;
            const I = 1.15 + 0.05 * Math.sin(t * 3.3 + c.ph) + 0.03 * Math.sin(t * 8.1 + c.i);
            halo(cx, cy, c.s, 0.1 * I, H);
            lantern(cx, cy, c.s, I, 1, H, null);
        }
        // --- levels out (port: no dots, no colour) ---
        const LV = new Float32Array(N);
        for (let k = 0; k < N; k++) {
            const peak = Math.max(R[k], G[k], B[k], 1e-4);
            LV[k] = clamp(FL[k] + (1 - FL[k]) * Math.pow(peak, 0.85) * 0.95);
        }
        const ST = new Float32Array(N);
        for (const [k, ph, rate, b] of stars) {
            const s = b * (0.7 + 0.3 * Math.sin(t * rate + ph));
            if (s > 0.3 && Math.max(R[k], G[k], B[k]) <= 0.4) ST[k] = s;
        }
        return { LV, SOLID, LIT, ST, W, H, WL };
    };
}

return lanternLake;
})();

// ============================================================================
// Aurora Fjord (ascii.rest, adapted)
// ============================================================================
const auroraFjord = (() => {

const meta = {
    name: "aurora fjord",
    category: "scenes",
    note: "aurora curtains rippling over a still fjord, a cabin lit on the shore",
    cols: 200,
    rows: 100,
    cell: 1,
    fps: 15,
    ground: "#05080f",
    palette: [
        "#0b1322", "#101b30", "#16243f", "#1e3050", "#2a3f63",
        "#0e3a33", "#11573f", "#167a4c", "#22a05c", "#3ccb73", "#7cf0a0", "#c8ffdc",
        "#0f5f5c", "#16877f", "#2cb5a6", "#7fe6d6",
        "#2a1f52", "#432b78", "#6a3c9f", "#9558c6", "#c48ae4", "#363a72", "#4f5596", "#1b4f63",
        "#1a2236", "#283350", "#3b4a6e", "#566a92", "#7d91b8", "#a9bad9", "#d6e0f2", "#9fc9cf",
        "#0f1a1c", "#173128", "#24493a",
        "#4a1517", "#7c2420", "#b23a2a", "#d65aa8",
        "#ffd27c", "#ffb04a", "#fff2c4",
        "#eef3ff",
    ],
};
const W = 200, H = 100;
const WL = 62; // the waterline
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const AIR = 0, NEAR = 1, FAR = 2, SHORE = 3, WALL = 4, ROOF = 5, PANE = 6, TREE = 7, DOOR = 8;
const CAB = [142, 161]; // the cabin's walls, x from and to
const PANES = [[145, 148], [156, 159]];
const DOOR_X = [150, 152];
const LAMPS = [[147, 1], [158, 0.8]]; // pane centres and their strength
function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, octaves) {
    let s = 0, n = 0, amp = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
        s += amp * noise(x * f, y * f);
        n += amp;
        amp *= 0.5;
        f *= 2;
    }
    return s / n;
}
const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => {
    const k = clamp((v - a) / (b - a));
    return k * k * (3 - 2 * k);
};
const mix = (a, b, k) => a + (b - a) * k;
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
// Ranges as tent peaks [x, height, slope], roughened.
const LEFT = [[25, 38, 1.3], [6, 29, 0.9], [50, 25, 1.0], [72, 13, 0.6]];
const RIGHT = [[172, 30, 1.15], [194, 24, 0.85], [151, 16, 1.0], [212, 22, 0.6]];
const DISTANT = [[100, 10, 0.5], [119, 12, 0.55], [86, 7, 0.45], [134, 8, 0.5]];
function range(x, peaks, seed, rough) {
    let m = -99, px = 0;
    for (const [cx, h, s] of peaks) {
        const v = h - Math.abs(x - cx) * s;
        if (v > m)
            (m = v), (px = cx);
    }
    const j = rough * (fbm(x * 0.09, seed, 3) - 0.5) + rough * 0.45 * (noise(x * 0.45, seed + 5) - 0.5);
    return [m + j * Math.min(1, Math.max(0, m) / 6), px];
}
function auroraFjord() {
    const P = meta.palette.map(hex);
    const N = W * H;
    const out = new Array(N);
    const lut = new Uint8Array(32768).fill(255);
    const nearest = (r, g, b) => {
        const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
        if (lut[k] !== 255)
            return lut[k];
        let best = 0, bd = 1e9;
        for (let i = 0; i < P.length; i++) {
            const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
            const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
            if (d < bd)
                (bd = d), (best = i);
        }
        return (lut[k] = best);
    };
    // --- the land, built once ------------------------------------------------
    const mat = new Uint8Array(N);
    const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N);
    const rec = new Float32Array(N); // how much aurora light a cell picks up
    const rim = new Float32Array(N); // aurora light caught on ridgelines and treetops
    const nearTop = new Float32Array(W), farTop = new Float32Array(W), peakX = new Float32Array(W);
    for (let x = 0; x < W; x++) {
        const [hl, pl] = range(x + 0.5, LEFT, 3.1, 4);
        const [hr, pr] = range(x + 0.5, RIGHT, 7.7, 4);
        const [hd] = range(x + 0.5, DISTANT, 11.3, 2.2);
        nearTop[x] = WL - Math.max(hl, hr, 0);
        peakX[x] = hl > hr ? pl : pr;
        farTop[x] = WL - Math.max(hd, 0);
    }
    const shoreTop = (x) => WL - 2.2 * smooth(134, 140, x) * smooth(178, 168, x) - 0.6 * noise(x * 0.3, 2);
    const cabBase = WL - 2.2;
    for (let r = 0; r < WL; r++) {
        for (let x = 0; x < W; x++) {
            const k = r * W + x;
            const y = r + 0.5;
            if (y >= nearTop[x]) {
                mat[k] = NEAR;
                const px = peakX[x];
                const side = x + 0.5 - px;
                const depth = y - nearTop[x];
                const height = WL - nearTop[x];
                // Faces turned toward the fjord catch the aurora; the ridge between
                // the faces wanders as it comes down from the peak.
                const ridge = px + (depth + 1) * 0.6 * (noise(y * 0.1, px) - 0.5);
                const inward = px < 100 ? 1 : -1;
                const face = smooth(-4, 4, (x + 0.5 - ridge) * inward);
                // ribs and couloirs running down the fall line, each with a lit side
                const u = x + depth * 0.45 * Math.sign(side || 1);
                const rib = (v) => fbm(v * 0.13, px * 0.37, 3);
                const grad = (rib(u + 1) - rib(u - 1)) * 7 * inward;
                // the snow reaches further down the ribs than the couloirs, in fingers
                const reach = 3 + height * (0.62 + 0.42 * rib(u + 40));
                const streak = smooth(0.56, 0.64, fbm(u * 0.32, y * 0.035 + px, 3)) * smooth(1, 5, depth);
                // a stand of spruce climbing the slope behind the cabin, jagged on top
                const cx = x + 0.5 - 152;
                const wood = WL - 18.5 + 9 * (cx / 19) ** 2 + 1.5 * (noise(x * 0.7, 9) - 0.5) - 2.6 * hash(x, 77) * ((x & 1) ? 1 : 0.3);
                const snow = smooth(reach + 1.6, reach - 1.6, depth) * (1 - smooth(WL - 3, WL - 0.5, y)) * (1 - 0.5 * streak);
                const lit = clamp(0.35 + 0.55 * face + grad * 0.5);
                // blue-grey rock below the snow, a little lighter on the lit faces
                const rv = 0.75 + 0.5 * fbm(x * 0.4, y * 0.4, 2);
                const rr = (0.05 + 0.03 * lit) * rv, rg = (0.065 + 0.035 * lit) * rv, rb = (0.11 + 0.05 * lit) * rv;
                const s = 0.34 + 0.66 * Math.pow(lit, 1.5);
                sr[k] = mix(rr, 0.62 * s + 0.04, snow);
                sg[k] = mix(rg, 0.7 * s + 0.05, snow);
                sb[k] = mix(rb, 0.86 * s + 0.09, snow);
                rec[k] = snow * (0.25 + 0.75 * lit) + 0.06;
                rim[k] = smooth(2.2, 0.3, depth) * 0.5;
                if (y > wood && cx > -14 - 2 * hash(r, 3) && cx < 13 + 2 * hash(r, 4)) {
                    mat[k] = TREE;
                    const h = hash(x * 13 + r, 5);
                    sr[k] = 0.02 + 0.03 * h, sg[k] = 0.045 + 0.045 * h, sb[k] = 0.06 + 0.04 * h;
                    rec[k] = 0.05;
                    rim[k] = smooth(wood + 1.6, wood + 0.2, y) * (0.7 + 0.3 * h);
                }
            }
            else if (y >= farTop[x]) {
                mat[k] = FAR;
                const depth = y - farTop[x];
                const snow = smooth(0.5, 0.62, fbm(x * 0.18, y * 0.25, 3) * 0.6 + (1 - depth / 7) * 0.55);
                const lit = 0.5 + 0.3 * (noise(x * 0.25, y * 0.1) - 0.5);
                sr[k] = mix(0.075, 0.22 * lit + 0.12, snow);
                sg[k] = mix(0.1, 0.27 * lit + 0.15, snow);
                sb[k] = mix(0.17, 0.36 * lit + 0.24, snow);
                rec[k] = 0.2 + 0.3 * snow;
            }
            // the shelf the cabin stands on, snowed over
            if (x > 132 && x < 180 && y >= shoreTop(x)) {
                mat[k] = SHORE;
                const f = 0.6 + 0.3 * fbm(x * 0.3, y * 0.5, 2);
                sr[k] = 0.26 * f, sg[k] = 0.3 * f, sb[k] = 0.42 * f;
                rec[k] = 0.4;
                rim[k] = 0;
            }
        }
    }
    // a spruce treeline along the foot of both ranges, open where the fjord runs in
    const spruce = (tx, th, tw, tb, guard) => {
        for (let r = Math.max(0, Math.floor(tb - th)); r < WL; r++) {
            const y = r + 0.5, dy = y - (tb - th);
            if (dy < 0 || y >= tb + 0.5)
                continue;
            const tier = (dy + th * 0.3) / 1.8;
            const w = (dy / th) * tw * (0.7 + 0.45 * (tier - Math.floor(tier))) + 0.35;
            for (let x = Math.max(0, Math.floor(tx - tw - 1)); x <= Math.min(W - 1, tx + tw + 1); x++) {
                const k = r * W + x;
                const ex = x + 0.5 - tx;
                if (Math.abs(ex) > w || (guard && guard(k)))
                    continue;
                mat[k] = TREE;
                const h = hash(x * 13 + r, 5);
                const s = ex < 0 ? 0.7 : 0.3; // the aurora is up and left
                sr[k] = 0.02 + 0.03 * s * h, sg[k] = 0.04 + 0.05 * s, sb[k] = 0.055 + 0.045 * s;
                rec[k] = 0.05;
                rim[k] = Math.max(smooth(1.6, 0.2, dy), ex < 0 && ex < -w + 1 ? 0.45 * smooth(th, 0, dy) : 0);
            }
        }
    };
    const solid = (k) => mat[k] === WALL || mat[k] === ROOF || mat[k] === PANE || mat[k] === DOOR || mat[k] === SHORE;
    for (let x = -1; x < W + 2;) {
        const h = hash(Math.floor(x * 7), 21);
        const open = smooth(96, 80, x) + smooth(122, 136, x);
        const onShelf = x > 132 && x < 180;
        if (open > 0.05 && !(x > 136 && x < 166)) {
            const th = (3.2 + hash(Math.floor(x * 3), 5) * 3 + (hash(Math.floor(x * 5), 8) > 0.7 ? 2.4 : 0)) * Math.min(1, open) * (onShelf ? 0.7 : 1);
            if (th > 1.5)
                spruce(x + hash(Math.floor(x), 2), th, 1 + hash(Math.floor(x), 4) * 0.6, onShelf ? shoreTop(x) - 0.4 : WL + 0.3, onShelf ? solid : null);
        }
        x += 2 + 2.2 * h;
    }
    // The cabin: red boards, a snowed roof, two warm panes, a door, a chimney.
    const eave = cabBase - 7;
    const roofTop = eave - 8;
    const CHIM = CAB[1] - 5, CHIM_TOP = eave - 8.5;
    for (let r = 0; r < WL; r++) {
        for (let x = CAB[0] - 3; x <= CAB[1] + 3; x++) {
            const k = r * W + x;
            const y = r + 0.5;
            const cx = (CAB[0] + CAB[1] + 1) / 2;
            if (x >= CAB[0] && x <= CAB[1] && y >= eave && y < cabBase + 0.5) {
                mat[k] = WALL;
                const boards = r & 1 ? 0.82 : 1;
                const s = (0.5 + 0.5 * ((CAB[1] - x) / (CAB[1] - CAB[0]))) * boards;
                sr[k] = 0.7 * s, sg[k] = 0.14 * s, sb[k] = 0.11 * s;
                rim[k] = 0;
                for (const [a, b] of PANES)
                    if (x >= a && x <= b && y >= eave + 1.5 && y < cabBase - 2)
                        mat[k] = PANE;
                if (x >= DOOR_X[0] && x <= DOOR_X[1] && y >= eave + 1.5) {
                    mat[k] = DOOR;
                    sr[k] = 0.16, sg[k] = 0.06, sb[k] = 0.05;
                }
            }
            const half = 12.5 - (eave - y) * 1.45;
            if (y >= roofTop && y < eave && Math.abs(x + 0.5 - cx) <= half) {
                mat[k] = ROOF;
                const snowy = y < eave - 1;
                const s = 0.78 + 0.22 * ((cx - x - 0.5) / 12);
                if (snowy)
                    (sr[k] = 0.78 * s), (sg[k] = 0.84 * s), (sb[k] = 0.96 * s);
                else
                    (sr[k] = 0.12), (sg[k] = 0.05), (sb[k] = 0.06);
                rec[k] = snowy ? 0.5 : 0;
                rim[k] = 0;
            }
            if (x >= CHIM && x <= CHIM + 1 && y >= CHIM_TOP && y < eave - 4) {
                mat[k] = WALL;
                const s = x === CHIM ? 1 : 0.55;
                sr[k] = 0.2 * s, sg[k] = 0.21 * s, sb[k] = 0.27 * s;
                rim[k] = 0;
            }
        }
    }
    // a few spruce on the shelf, beside the cabin
    for (const [tx, th] of [[134, 7], [137.8, 10], [166.5, 9], [170, 6], [174.5, 8]]) {
        spruce(tx, th, 2.2, shoreTop(tx) + 0.5, (k) => mat[k] === WALL || mat[k] === ROOF || mat[k] === PANE || mat[k] === DOOR);
    }
    // the warm light the panes throw on the snow and the air around them
    const lampLand = new Float32Array(WL * W);
    for (let r = 0; r < WL; r++) {
        for (let x = 0; x < W; x++) {
            const k = r * W + x, m = mat[k];
            if (m === PANE || m === WALL || m === ROOF || m === DOOR)
                continue;
            let g = 0;
            for (const [lx, s] of LAMPS) {
                const wx = x + 0.5 - lx, wy = r + 0.5 - (cabBase - 2.5);
                const d = Math.sqrt(wx * wx * 0.6 + wy * wy * 2.2);
                g += s * Math.exp(-d / 5.5) * 0.6;
            }
            lampLand[k] = g * (m === AIR ? 0.3 : m === TREE ? 0.4 : 0.75 + 0.5 * hash(x, r + 31));
        }
    }
    // the sky's unevenness and its stars
    const haze = new Float32Array(WL * W);
    for (let k = 0; k < WL * W; k++)
        haze[k] = fbm((k % W) * 0.04, Math.floor(k / W) * 0.07, 3);
    const star = new Float32Array(WL * W);
    for (let k = 0; k < WL * W; k++) {
        const h = hash(k % W, Math.floor(k / W) + 101);
        if (h > 0.986)
            star[k] = 0.35 + (h - 0.986) * 45;
    }
    // rows of the water that break the reflection into strips
    const gap = new Uint8Array(H);
    for (let r = WL; r < H; r++)
        gap[r] = hash(r, 404) < 0.3 ? 1 : 0;
    // per-column aurora state, filled each frame
    const baseA = new Float32Array(W), tallA = new Float32Array(W), envA = new Float32Array(W);
    const baseB = new Float32Array(W), envB = new Float32Array(W);
    const RAYS = 4 * W;
    const raysA = new Float32Array(RAYS + 2), raysB = new Float32Array(RAYS + 2);
    const R = new Float32Array(WL * W), G = new Float32Array(WL * W), B = new Float32Array(WL * W);
    const lightX = new Float32Array(W); // the aurora's light falling on the land below
    const ray = (arr, u) => {
        const s = u * 4;
        let i = Math.floor(s);
        const f = s - i;
        i = ((i % RAYS) + RAYS) % RAYS;
        return arr[i] + (arr[i + 1] - arr[i]) * f;
    };
    const oLV = new Float32Array(N), oR = new Float32Array(N), oG = new Float32Array(N), oB = new Float32Array(N), oM = new Uint8Array(N);
    const AM = [0, 2, 1, 2, 4, 4, 6, 3, 4];
    return (t, { color } = {}) => {
        // --- the curtains -------------------------------------------------------
        for (let x = 0; x < W; x++) {
            const u = x / W;
            // the main curtain sweeps down from the upper left, low over the fjord,
            // and lifts again to the right; ripples travel along it and fold it
            baseA[x] = 5 + 40 * Math.pow(Math.sin(Math.min(1, u / 0.6) * Math.PI / 2), 1.5) - 13 * smooth(0.6, 0.95, u)
                + 2.6 * Math.sin(x * 0.07 - t * 0.55) + 1.4 * Math.sin(x * 0.17 + t * 0.9 + 1.3) + 2.2 * Math.sin(x * 0.22 + t * 1.2)
                + 4 * (fbm(x * 0.015 + t * 0.03, 4.2, 2) - 0.5);
            tallA[x] = 11 + 8 * fbm(x * 0.03 - t * 0.05, 1.7, 2);
            envA[x] = smooth(0.0, 0.2, u) * smooth(0.98, 0.72, u) * (0.4 + 0.8 * fbm(x * 0.022 - t * 0.07, 8.8, 3));
            // a fainter curtain behind, higher up, on the right
            baseB[x] = 14 + 4 * Math.sin(x * 0.035 + t * 0.3 + 2) + 1.6 * Math.sin(x * 0.11 - t * 0.7);
            envB[x] = smooth(0.45, 0.7, u) * smooth(1.05, 0.85, u) * (0.25 + 0.5 * fbm(x * 0.03 + t * 0.05, 3.3, 2));
        }
        for (let i = 0; i <= RAYS + 1; i++) {
            const u = i / 4;
            raysA[i] = 0.14 + Math.pow(fbm(u * 0.6 + t * 0.35, t * 0.12, 3), 2.4) * 2.5;
            raysB[i] = 0.1 + Math.pow(fbm(u * 0.45 - t * 0.2, 5 + t * 0.1, 3), 2.2) * 2.0;
        }
        for (let x = 0; x < W; x++) {
            let s = 0;
            for (let d = -24; d <= 24; d += 6) {
                const xx = Math.min(W - 1, Math.max(0, x + d));
                s += envA[xx] + 0.4 * envB[xx];
            }
            lightX[x] = s / 9;
        }
        const flick = 0.92 + 0.05 * Math.sin(t * 2.3) + 0.03 * Math.sin(t * 7.1);
        // --- sky and land ---------------------------------------------------------
        for (let r = 0; r < WL; r++) {
            const y = r + 0.5;
            const v = y / WL;
            for (let x = 0; x < W; x++) {
                const k = r * W + x;
                const m = mat[k];
                let cr, cg, cb;
                if (m === AIR) {
                    const hz = 0.85 + 0.3 * haze[k];
                    cr = (0.025 + 0.03 * v * v) * hz;
                    cg = (0.04 + 0.07 * v * v) * hz;
                    cb = (0.1 + 0.11 * v * v) * hz;
                    // curtain A: a sharp lower hem, rays rising and fading to violet
                    let a = 0;
                    const d = baseA[x] - y;
                    if (d > -4 && d < 46) {
                        const bend = Math.abs(baseA[Math.min(W - 1, x + 1)] - baseA[Math.max(0, x - 1)]);
                        const hc = tallA[x];
                        const lean = ray(raysA, x + d * 0.22);
                        const prof = d < 0 ? Math.exp(-d * d * 0.9) : (1 - Math.exp(-(d + 0.4) * 1.1)) * Math.exp(-d / hc);
                        // the rays, over a continuous bright band along the hem
                        const band = d < 0 ? Math.exp(-d * d) : Math.exp(-d / 3);
                        a = (prof * lean + 0.3 * band * (0.55 + 0.45 * Math.min(1.4, lean))) * envA[x] * (1.15 + 0.35 * bend);
                        const up = clamp(d / (hc * 1.6));
                        const gk = 1 - smooth(0, 0.5, up), vk = smooth(0.4, 0.9, up);
                        const tk = 1 - gk - vk;
                        cr += a * (0.18 * gk + 0.06 * tk + 0.42 * vk);
                        cg += a * (1.0 * gk + 0.78 * tk + 0.16 * vk);
                        cb += a * (0.48 * gk + 0.7 * tk + 0.75 * vk);
                        // pink at the very hem where it is brightest
                        const hem = Math.exp(-((d + 0.6) ** 2) * 1.2) * smooth(0.3, 0.8, a) * 0.8 * (0.45 + 0.55 * Math.min(1, lean));
                        cr += hem * 0.95, cg *= 1 - 0.55 * Math.min(1, hem * 1.6), cb += hem * 0.4;
                    }
                    // curtain B, further away, thinning out toward the top of the frame
                    const db = baseB[x] - y;
                    if (db > -3 && db < 30) {
                        const prof = db < 0 ? Math.exp(-db * db) : (1 - Math.exp(-(db + 0.4))) * Math.exp(-db / 9);
                        const b = prof * ray(raysB, x + db * 0.18) * envB[x] * 0.85 * smooth(0, 8, y);
                        const up = clamp(db / 12);
                        cr += b * (0.1 + 0.4 * up);
                        cg += b * (0.75 - 0.5 * up);
                        cb += b * (0.7 + 0.2 * up);
                        a += b;
                    }
                    // a little glow round the curtain, kept tight under the hem so the
                    // hem reads as an edge over dark sky
                    const below = y - baseA[x];
                    const gl = envA[x] * (below > 0 ? Math.exp(-below / 6) * 0.1 : Math.exp(below / 8) * 0.18);
                    cr += gl * 0.12, cg += gl * 0.62, cb += gl * 0.52;
                    // airglow on the horizon
                    const ag = Math.exp(-(WL - y) / 10) * (0.1 + 0.16 * lightX[x]);
                    cg += ag * 0.7, cb += ag * 0.75, cr += ag * 0.2;
                    const st = star[k];
                    if (st > 0) {
                        const tw = 0.7 + 0.3 * Math.sin(t * (1.3 + 3 * hash(x, r)) + 6.28 * hash(r, x));
                        const s = st * tw * clamp(1 - a * 1.6) * smooth(WL - 2, 30, y);
                        cr = Math.max(cr, s * 0.9), cg = Math.max(cg, s * 0.94), cb = Math.max(cb, s);
                    }
                }
                else {
                    cr = sr[k], cg = sg[k], cb = sb[k];
                    const L = lightX[x] * rec[k];
                    cr += L * 0.03, cg += L * 0.14, cb += L * 0.1;
                    const e = rim[k];
                    if (e > 0) {
                        const q = e * (m === TREE ? 0.2 + 0.45 * lightX[x] : 0.05 + 0.22 * lightX[x]);
                        cr += q * 0.25, cg += q * 0.95, cb += q * 0.7;
                    }
                    if (m === PANE) {
                        const f = flick + 0.04 * Math.sin(t * 5.3 + x);
                        cr = f, cg = 0.76 * f, cb = 0.38 * f;
                    }
                    else if (m === DOOR) {
                        // light through the crack of the door
                        if (x === DOOR_X[1] && r > eave + 1)
                            (cr = 0.55 * flick), (cg = 0.36 * flick), (cb = 0.14 * flick);
                    }
                }
                const lg = lampLand[k] * flick;
                if (lg > 0)
                    cr += lg, cg += lg * 0.62, cb += lg * 0.26;
                R[k] = cr, G[k] = cg, B[k] = cb;
            }
        }
        for (let r = 0; r < H; r++) {
            const y = r + 0.5;
            let floor = 0.1, fade = 1;
            const dw = y - WL;
            const deep = r >= WL ? mix(1, 0.45, dw / (H - WL)) : 1;
            const ry = WL - 1 - (r - WL) - Math.round(0.4 * Math.sin(r * 0.9 + t * 0.6));
            const r0 = Math.max(0, ry) * W, r1 = Math.max(0, ry - 1) * W, r2 = Math.max(0, ry - 2) * W;
            for (let x = 0; x < W; x++) {
                const k = r * W + x;
                let cr, cg, cb;
                if (r < WL) {
                    cr = R[k], cg = G[k], cb = B[k];
                    const m = mat[k];
                    floor = m === AIR ? 0.1 : m === NEAR ? 0.05 : m === TREE ? 0.04 : 0.06;
                }
                else {
                    // still water: the mirror image, stretched and broken by slow ripples
                    const wave = noise(x * 0.04 + t * 0.05, r * 0.55 - t * 0.35);
                    const sx = x + (0.5 + dw * 0.12) * Math.sin(r * 1.3 + t * 1.6 + wave * 4);
                    let ix = Math.floor(sx);
                    const fx = sx - ix;
                    ix = Math.max(0, Math.min(W - 2, ix));
                    const a0 = r0 + ix, a1 = r1 + ix, a2 = r2 + ix;
                    const sky = mat[a0] === AIR;
                    let kr = (sky ? 0.55 : 0.64) * (0.82 + 0.3 * wave) * deep;
                    if (sky && gap[r] && wave < 0.45)
                        kr *= 0.12;
                    // the cabin's own image is soft; the lamplight road below carries it
                    const ms = mat[a0];
                    if (ms === PANE)
                        kr *= 0.4;
                    else if (ms === WALL || ms === ROOF || ms === DOOR)
                        kr *= 0.7;
                    const gx = 1 - fx;
                    cr = ((R[a0] * gx + R[a0 + 1] * fx) * 0.5 + (R[a1] * gx + R[a1 + 1] * fx) * 0.3 + (R[a2] * gx + R[a2 + 1] * fx) * 0.2) * kr;
                    cg = ((G[a0] * gx + G[a0 + 1] * fx) * 0.5 + (G[a1] * gx + G[a1 + 1] * fx) * 0.3 + (G[a2] * gx + G[a2 + 1] * fx) * 0.2) * kr;
                    cb = ((B[a0] * gx + B[a0 + 1] * fx) * 0.5 + (B[a1] * gx + B[a1 + 1] * fx) * 0.3 + (B[a2] * gx + B[a2 + 1] * fx) * 0.2) * kr;
                    if (ms !== WALL && ms !== DOOR)
                        cr += 0.02, cg += 0.035, cb += 0.065;
                    // a pale line where the water meets the shore
                    if (r === WL) {
                        const e = 0.3 * (0.3 + 0.7 * smooth(0.25, 0.75, noise(x * 0.3, t * 0.4)));
                        cr += e * 0.6, cg += e * 0.85, cb += e;
                    }
                    // the lamplight laid on the water as a broken golden road
                    if (dw < 14 && x > 138 && x < 166) {
                        const rip = noise(x * 0.5 - t * 0.2, r * 1.4 - t * 1.5);
                        for (const [lx, s] of LAMPS) {
                            const lw = 1 + dw * 0.1;
                            const q = (x + 0.5 - lx) / lw;
                            const g = Math.exp(-q * q) * Math.exp(-dw / 8) * smooth(0.3, 0.65, rip) * s * 1.6 * flick;
                            cr += g, cg += g * 0.68, cb += g * 0.28;
                        }
                    }
                    floor = sky ? 0.07 * deep : 0.03;
                    fade = smooth(H + 3, H - 12, y);
                }
                const peak = Math.max(cr, cg, cb, 1e-4);
                oLV[k] = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95) * fade;
                oR[k] = cr, oG[k] = cg, oB[k] = cb, oM[k] = r < WL ? AM[mat[k]] : 5;
            }
        }
        return { LV: oLV, R: oR, G: oG, B: oB, M: oM, W, H };

    };
}


return auroraFjord;
})();

// ============================================================================
// Renderer
// ============================================================================
(() => {
  const host = document.getElementById("scene");
  if (!host) return;
  if (matchMedia("(max-width: 722px)").matches) return;   // hidden on phones; don't run there

  const SCENE_LIST = ["lake", "fjord"];   // picked at random on each load
  const RAMP = " .:-=+*#%";              // the same characters as the old hills, light to heavy
  const COLS = 300;                       // characters across
  const SQUASH = 0.4;                     // flatten the picture to 40% height so it stays a low strip
  const SPEED = 0.45;                     // scene time per real second (under half speed)
  const FPS = 10;
  const CLS = ["", "g", "l", "v", "d"];   // colour classes: none, glow, light, violet, deep violet

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
  const sm = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const out = host.appendChild(document.createElement("div"));
  let ink = null, cls = null, ov = null, ovc = null, er = null;   // scene ink, its colour, drawn-on extras, and paled-out areas

  function buffers(n) {
    if (ink && ink.length === n) return;
    ink = new Float32Array(n); cls = new Uint8Array(n); ov = new Float32Array(n); ovc = new Uint8Array(n); er = new Float32Array(n);
  }

  // Resample the scene grid into the strip and pick a character for each cell.
  // Extras (canoe, smoke) are taken at their strongest over each character's span,
  // so thin shapes don't get lost between rows.
  function draw(W, H, TOP) {
    const sx = W / COLS, rows = Math.round((H - TOP) / (sx / 0.6) * SQUASH);
    const sy = (H - TOP) / rows;
    let html = "";
    for (let j = 0; j < rows; j++) {
      const fy = TOP + (j + 0.5) * sy - 0.5, y0 = Math.floor(fy), y1 = Math.min(H - 1, y0 + 1), wy = fy - y0;
      const r0 = Math.max(0, Math.floor(TOP + j * sy)), r1 = Math.min(H - 1, Math.floor(TOP + (j + 1) * sy - 1e-6));
      let cur = 0;
      for (let i = 0; i < COLS; i++) {
        const fx = (i + 0.5) * sx - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(W - 1, x0 + 1), wx = fx - x0;
        let v = (ink[y0 * W + x0] * (1 - wx) + ink[y0 * W + x1] * wx) * (1 - wy) + (ink[y1 * W + x0] * (1 - wx) + ink[y1 * W + x1] * wx) * wy;
        const xc = Math.min(W - 1, Math.max(0, Math.round(fx)));
        let c = cls[Math.round(fy) * W + xc];
        v *= 1 - er[Math.round(fy) * W + xc];
        for (let r = r0; r <= r1; r++) {
          const k = r * W + xc;
          if (ov[k] > v) { v = ov[k]; c = ovc[k]; }
        }
        const step = Math.max(0, Math.min(8, Math.round(v * 8 + BAYER[(j & 3) * 4 + (i & 3)])));
        const ch = RAMP[step];
        const cc = ch === " " ? cur : c;
        if (cc !== cur) { html += (cur ? "</span>" : "") + (cc ? '<span class="' + CLS[cc] + '">' : ""); cur = cc; }
        html += ch;
      }
      html += (cur ? "</span>" : "") + "\n";
    }
    out.innerHTML = html;
  }

  // ---- Lantern Lake ---------------------------------------------------------
  let lake = null;
  function lakeFrame(t) {
    if (!lake) lake = lanternLake();
    const { LV, SOLID, LIT, ST, W, H, WL } = lake(t);
    buffers(W * H); ov.fill(0); er.fill(0);
    // land drawn like the hills, light drawn as marks
    for (let r = 0; r < WL; r++) for (let x = 0; x < W; x++) {
      const k = r * W + x, s = SOLID[k], lv = LV[k];
      let v = 0;
      if (s === 4) v = 0.06 + 0.16 * sm(0.1, 0.5, lv);           // far range, hazy
      else if (s === 1) v = 0.16 + 0.34 * sm(0.05, 0.45, lv);    // back peaks
      else if (s === 2) v = 0.34 + 0.34 * sm(0.03, 0.3, lv);     // near shoulders
      else if (s === 3) v = 0.5;                                 // tree line
      let c = s === 4 ? 3 : s === 1 ? (lv > 0.18 ? 4 : 3) : 0;
      const lit = LIT[k] * (0.55 + 0.4 * lv), glow = 0.55 * sm(0.55, 1, lv) * (s ? 0 : 1);
      if (lit > v && lit > glow) c = 2; else if (glow > v) c = 1;
      v = Math.max(v, lit, glow, ST[k] > 0.5 ? 0.28 : 0);
      ink[k] = v; cls[k] = c;
    }
    // the lake: the land mirrored and broken by ripples, plus the lights laid on it
    for (let r = WL; r < H; r++) {
      const dw = r - WL, ry = WL - 1 - dw;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (SOLID[k] === 5) { ink[k] = 0.78; cls[k] = 0; continue; }   // the boat and figure
        const sx = Math.round(x + (0.4 + dw * 0.06) * Math.sin(r * 1.3 + t * 1.6));
        const mk = ry >= 0 ? ry * W + Math.max(0, Math.min(W - 1, sx)) : -1;
        const m = mk >= 0 ? ink[mk] : 0;
        const streak = 0.55 + 0.45 * Math.sin(r * 2.1 + x * 0.05 - t * 0.6);
        const refl = 0.38 * m * streak, light = 0.8 * sm(0.35, 0.95, LV[k]);
        ink[k] = Math.max(refl, light);
        cls[k] = light > refl ? (light > 0.55 ? 2 : 1) : mk >= 0 && cls[mk] >= 3 ? 3 : mk >= 0 && cls[mk] ? 1 : 0;
      }
    }
    draw(W, H, 12);
  }

  // ---- Aurora Fjord -----------------------------------------------------------
  let fjord = null;
  function put(W, H, x, r, v, c) {                // draw onto the extras layer
    x = Math.round(x); r = Math.round(r);
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    if (v > ov[k]) { ov[k] = v; ovc[k] = c; }
  }
  function pale(W, H, x, r, a) {                  // lighten the scene under a point (smoke)
    x = Math.round(x); r = Math.round(r);
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    if (a > er[k]) er[k] = a;
  }
  function fjordFrame(t) {
    if (!fjord) fjord = auroraFjord();
    const { LV, R, G, B, M, W, H } = fjord(t);
    buffers(W * H); ov.fill(0); er.fill(0);
    for (let k = 0; k < W * H; k++) {
      const lv = LV[k], r = R[k], g = G[k], b = B[k], m = M[k];
      const mx = Math.max(r, g, b, 1e-4);
      const warm = r > 0.4 && r >= g && (r - b) / mx > 0.35;          // the cabin's lamplight
      const cool = b >= r * 0.9 || (g > r && b > r * 0.8);            // aurora and blue hour
      let v = 0, c = 0;
      if (m === 0) { v = 0.85 * sm(0.18, 0.7, lv); c = warm ? (lv > 0.8 ? 2 : 1) : cool ? 3 : 1; }   // sky: its light as marks
      else if (m === 1) { v = 0.08 + 0.22 * (1 - lv); c = lv < 0.35 ? 4 : 3; }                       // far range
      else if (m === 2) { v = 0.28 + 0.42 * (1 - lv); }                                             // mountains: rock ink, snow paper
      else if (m === 3) { v = 0.55; }                                                                // spruce
      else if (m === 4) { v = 0.5 - 0.25 * lv; if (warm && lv > 0.5) c = 1; }                        // cabin
      else if (m === 6) { v = 0.85; c = 2; }                                                         // lit windows
      else if (m === 5) { v = 0.55 * sm(0.3, 0.9, lv); c = warm ? (lv > 0.75 ? 2 : 1) : cool ? 3 : 0; }   // water
      if (warm && m !== 6 && m !== 5 && m !== 0 && lv > 0.55) { v = Math.max(v, 0.6 * lv); c = 1; }
      ink[k] = v; cls[k] = v ? c : 0;
    }

    // chimney smoke: a pale plume (drawn as lighter ink, like the snow) drifting up and right
    for (let i = 0; i < 24; i++) {
      const age = (t * 0.12 + i / 24) % 1;
      const y = 43 - age * 26, x = 157 + age * 18 + 2 * Math.sin(age * 6 + i * 1.7);
      const a = 0.85 * Math.pow(1 - age, 0.8) * Math.min(1, age * 8), rad = 1.2 + age * 3.2;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) {
        const d = Math.hypot(dx, dy * 1.3);
        if (d <= rad) pale(W, H, x + dx, y + dy, a * (1 - 0.6 * d / rad));
      }
    }

    // a canoe crossing the fjord, a lamp on its bow, paddling steadily
    const y0 = 82;                                        // its waterline row
    const px = ((t * 3.2 + 64) % 300) - 50;               // across, left to right, then a pause offscreen
    if (px > -30 && px < W + 30) {
      const bob = 0.3 * Math.sin(t * 1.3);
      // the wake: two soft lines spreading behind it
      for (let d = 2; d < 36; d++) {
        const f = 1 - d / 36, wob = 0.5 * Math.sin(d * 0.9 - t * 2.2);
        const a = 0.24 * f * (0.6 + 0.4 * Math.sin(d * 1.7 + t * 3));
        put(W, H, px - 13 - d, y0 + 0.5 + d * 0.14 + wob * 0.2, a, 0);
        put(W, H, px - 13 - d, y0 + 1.5 + d * 0.3 + wob * 0.3, a * 0.8, 0);
      }
      // hull: long and low, three rows deep, ends sweeping up
      for (let dx = -13; dx <= 13; dx++) {
        const ax = Math.abs(dx);
        if (ax <= 12) put(W, H, px + dx, y0 - 2 + bob, 0.85, 0);
        put(W, H, px + dx, y0 - 1 + bob, 0.9, 0);
        if (ax <= 10) put(W, H, px + dx, y0 + bob, 0.9, 0);
        if (ax >= 10) put(W, H, px + dx, y0 - 3 + bob, 0.8, 0);
        if (ax >= 12) put(W, H, px + dx, y0 - 4 + bob, 0.7, 0);
      }
      // paddler, sitting just aft of the middle: body, shoulders, head
      for (let r = 3; r <= 8; r++) for (let dx = -4; dx <= -1; dx++) put(W, H, px + dx, y0 - r + bob, r === 8 && (dx === -4 || dx === -1) ? 0.6 : 0.85, 0);
      for (let dx = -3.5; dx <= -1.5; dx += 0.5) { put(W, H, px + dx, y0 - 9.2 + bob, 0.8, 0); put(W, H, px + dx, y0 - 10.2 + bob, 0.75, 0); }
      // the paddle: reaching forward, pulling back through the water, lifting out
      const ph = (t * 0.9) % 1;
      const bx = ph < 0.6 ? px + 6 - ph / 0.6 * 13 : px - 7 + (ph - 0.6) / 0.4 * 13;
      const by = ph < 0.6 ? y0 + 1.5 : y0 - 2;
      const hx = px - 1, hy = y0 - 6 + bob;
      for (let s2 = 0; s2 <= 1; s2 += 0.08) { put(W, H, hx + (bx - hx) * s2, hy + (by - hy) * s2, 0.75, 0); put(W, H, hx + 0.6 + (bx - hx) * s2, hy + (by - hy) * s2, 0.6, 0); }
      if (ph < 0.6) for (let s2 = -2; s2 <= 2; s2++) put(W, H, bx + s2 * 1.5, y0 + 0.5, 0.45 * (0.6 + 0.4 * Math.sin(t * 9 + s2)), 0);
      // the bow lamp on a short pole, its glow, and its light broken on the water below
      const lx = px + 10, ly = y0 - 7 + bob, fl = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      for (let r = 3; r <= 5; r++) put(W, H, lx, y0 - r + bob, 0.7, 0);
      for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) put(W, H, lx + dx, ly + dy, 0.95 * fl, 2);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) {
        const d = Math.hypot(dx * 0.6, dy);
        if (d > 1 && d < 3.4) put(W, H, lx + dx, ly + dy, 0.42 * fl * (1 - d / 3.4), 1);
      }
      for (let dr = 2; dr < 16; dr++) {
        if (Math.sin(dr * 2.3 - t * 4) <= -0.2) continue;
        for (let s2 = -2; s2 <= 2; s2++) put(W, H, lx + s2 + Math.sin(dr + t * 2), y0 + dr, 0.6 * (1 - dr / 16) * fl * (Math.abs(s2) === 2 ? 0.4 : 1), dr < 7 ? 2 : 1);
      }
    }
    draw(W, H, 6);
  }

  // ---- run -------------------------------------------------------------------
  const pick = SCENE_LIST[Math.floor(Math.random() * SCENE_LIST.length)];
  const frame = pick === "lake" ? lakeFrame : fjordFrame;
  const T0 = 8;                                   // start a few seconds in, so the scene is already alive
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { frame(T0); return; }

  let start = null, last = 0, running = false, before = 0;
  function loop(now) {
    if (!running) return;
    if (start === null) start = now;
    if (now - last >= 1000 / FPS) { last = now; frame(T0 + before + (now - start) / 1000 * SPEED); }
    requestAnimationFrame(loop);
  }
  function play() { if (!running) { running = true; start = null; requestAnimationFrame(loop); } }
  function pause() { if (running && start !== null) before += (performance.now() - start) / 1000 * SPEED; running = false; }
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  frame(T0);
  play();
})();
