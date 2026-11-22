// Gera um card SVG de linguagens (467x195, mesmo tamanho e fontes dos outros cards).
// Uso: node langs-card.mjs <usuario> <arquivo-saida.svg>   (usa GITHUB_TOKEN se existir)
import { writeFileSync } from "node:fs";

const [user = "evymelo", out = "dist/langs-card.svg"] = process.argv.slice(2);
const MAX = 6;
const C = {
  bg: "#fff5f7", border: "#ffc2d4", title: "#d6567a", text: "#9b3a52", soft: "#c27a8e", track: "#ffe4ec",
  langs: ["#d6567a", "#ff8fab", "#ffb6c1", "#e7a1b4", "#c27a8e", "#ffd6e0"],
};
const headers = { "User-Agent": "langs-card", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const get = async (u) => {
  const r = await fetch(u, { headers });
  if (!r.ok) throw new Error(`${r.status} em ${u}`);
  return r.json();
};

const repos = (await get(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`)).filter((r) => !r.fork);
const bytes = {};
for (const r of repos) {
  for (const [lang, n] of Object.entries(await get(r.languages_url))) bytes[lang] = (bytes[lang] || 0) + n;
}
const sum = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
let list = Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pct: (100 * n) / sum }));
if (list.length > MAX) {
  const rest = list.slice(MAX - 1).reduce((a, l) => a + l.pct, 0);
  list = [...list.slice(0, MAX - 1), { name: "outras", pct: rest }];
}

const W = 467, H = 195, X0 = 25, X1 = 442;
const font = `'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif`;
let x = X0, bar = "";
list.forEach((l, i) => {
  const w = ((X1 - X0) * l.pct) / 100;
  bar += `<rect class="seg" style="animation-delay:${(i * 0.12).toFixed(2)}s" x="${x.toFixed(1)}" y="56" width="${Math.max(w, 1).toFixed(1)}" height="10" fill="${C.langs[i]}"/>`;
  x += w;
});
const colW = (X1 - X0) / 2;
const items = list.map((l, i) => {
  const cx = X0 + (i % 2) * colW, cy = 98 + Math.floor(i / 2) * 28;
  return `<g class="it" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s"><circle cx="${cx + 6}" cy="${cy - 4}" r="5" fill="${C.langs[i]}"/><text x="${cx + 18}" y="${cy}" class="l">${l.name}</text><text x="${cx + colW - 14}" y="${cy}" text-anchor="end" class="p">${l.pct.toFixed(1).replace(".", ",")}%</text></g>`;
}).join("");

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="linguagens favoritas">
<style>
.t{font:600 18px ${font};fill:${C.title}}
.l{font:600 14px ${font};fill:${C.text}}
.p{font:400 13px ${font};fill:${C.soft}}
.seg{animation:fill .8s ease-out both;transform-box:fill-box;transform-origin:left}
.it{animation:show .5s ease-out both}
@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes show{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.seg,.it{animation:none}}
</style>
<rect x="0.5" y="0.5" rx="12" width="${W - 1}" height="${H - 1}" fill="${C.bg}" stroke="${C.border}"/>
<text x="${X0}" y="35" class="t">linguagens favoritas</text>
<text x="${X1}" y="35" text-anchor="end" style="font:16px ${font}">🎀</text>
<clipPath id="r"><rect x="${X0}" y="56" width="${X1 - X0}" height="10" rx="5"/></clipPath>
<rect x="${X0}" y="56" width="${X1 - X0}" height="10" rx="5" fill="${C.track}"/>
<g clip-path="url(#r)">${bar}</g>
${items}
</svg>`;

writeFileSync(out, svg);
console.log(`ok: ${list.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")} -> ${out}`);
