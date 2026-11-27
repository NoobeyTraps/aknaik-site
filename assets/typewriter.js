// Typewriter: types the text of .content (everything except the h1) letter by letter,
// links quickly, once per visit per page. The text and links are real HTML from the start;
// this only reveals them.
//
// A page opts in with a small inline script in its <head> that adds the "typing" class
// (which hides the text so it doesn't flash), plus /assets/typewriter.css. See index.html.
// Whether to type is decided here, once the page is actually shown: a page Chrome
// preloads in the background loses anything it saves to sessionStorage.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains("typing")) return;
  if (document.prerendering) document.addEventListener("prerenderingchange", begin, { once: true });
  else begin();

  function begin() {
    const key = "typed:" + location.pathname;
    try {
      if (sessionStorage.getItem(key)) { root.classList.remove("typing"); return; }
      sessionStorage.setItem(key, "1");
    } catch (e) {}

    const box = document.querySelector(".content");
    if (!box) { root.classList.remove("typing"); return; }
    const nodes = [];
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const n = walk.currentNode;
      if (n.parentElement.closest("h1") || !n.nodeValue.trim()) continue;
      const text = n.nodeValue.replace(/^\s+/, "");
      nodes.push({ n, full: n.nodeValue, lead: n.nodeValue.slice(0, n.nodeValue.length - text.length), text,
                   link: !!n.parentElement.closest("a") });
    }
    nodes.forEach(o => { o.n.nodeValue = ""; });
    root.classList.remove("typing");

    // speeds: about 18 ms a letter for text, 8 for links, with a short pause at each line end.
    // On a page with a lot of text everything speeds up so the whole thing takes at most ~2.2 s.
    const MAX = 2200;
    const est = nodes.reduce((s, o) => s + o.text.trimEnd().length * (o.link ? 8 : 18) + (o.link ? 40 : 90), 0);
    const k = Math.min(1, MAX / Math.max(1, est));

    const caret = Object.assign(document.createElement("span"), { className: "caret", textContent: "▌" });
    let i = 0, c = 0;
    function step() {
      const o = nodes[i];
      if (!o) {
        caret.classList.add("blink");
        setTimeout(() => { caret.classList.add("gone"); setTimeout(() => caret.remove(), 700); }, 1800);
        return;
      }
      c++;
      o.n.nodeValue = o.lead + o.text.slice(0, c);
      (o.link ? o.n.parentElement.closest("a") : o.n).after(caret);
      let wait = o.link ? 8 : 11 + Math.random() * 14;
      if (o.text[c - 1] === " " && !o.link) wait += 10;
      if (c >= o.text.trimEnd().length) { o.n.nodeValue = o.full; i++; c = 0; wait = o.link ? 40 : 90; }
      setTimeout(step, wait * k);
    }
    step();
  }
})();
