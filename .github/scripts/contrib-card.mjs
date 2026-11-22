// Gera um card SVG de contribuições (467x195, mesmo tamanho do card de stats).
// Uso: node contrib-card.mjs <usuario> <arquivo-saida.svg> [contributions.html local]
import { writeFileSync, readFileSync } from "node:fs";

const [user = "evymelo", out = "dist/contrib-card.svg", localHtml] = process.argv.slice(2);
const WEEKS = 26;
const C = {
  bg: "#fff5f7", border: "#ffc2d4", title: "#d6567a", text: "#9b3a52", soft: "#c27a8e",
  bars: ["#ffe4ec", "#ffc2d4", "#ffb6c1", "#ff8fab", "#d6567a"],
};

const html = localHtml
  ? readFileSync(localHtml, "utf8")
  : await (await fetch(`https://github.com/users/${user}/contributions`, { headers: { "User-Agent": "contrib-card" } })).text();

// dia -> contagem, lendo as células e os tooltips do calendário público
const ids = new Map();
for (const m of html.matchAll(/<td[^>]*data-date="([\d-]+)"[^>]*id="([^"]+)"/g)) ids.set(m[2], m[1]);
const days = new Map();
for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
  const date = ids.get(m[1]);
  if (!date) continue;
  const n = m[2].match(/^(\d+)\s+contribution/);
  days.set(date, n ? Number(n[1]) : 0);
}
const dates = [...days.keys()].sort();
const total = [...days.values()].reduce((a, b) => a + b, 0);

// soma por semana (domingo a sábado), últimas WEEKS semanas
const weeks = [];
for (const d of dates) {
  const dt = new Date(d + "T00:00:00Z");
  if (dt.getUTCDay() === 0 || weeks.length === 0) weeks.push({ start: dt, n: 0 });
  weeks[weeks.length - 1].n += days.get(d);
}
const recent = weeks.slice(-WEEKS);
const max = Math.max(1, ...recent.map((w) => w.n));
const best = Math.max(0, ...recent.map((w) => w.n));
const activeWeeks = recent.filter((w) => w.n > 0).length;

const W = 467, H = 195, X0 = 25, X1 = 442, Y0 = 62, Y1 = 158;
const slot = (X1 - X0) / recent.length, bw = Math.max(4, slot - 5);
const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const font = `'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif`;

let bars = "", labels = "", lastMonth = -1;
recent.forEach((w, i) => {
  const x = X0 + i * slot + (slot - bw) / 2;
  const h = w.n === 0 ? 3 : Math.max(6, ((Y1 - Y0) * w.n) / max);
  const lvl = w.n === 0 ? 0 : Math.min(4, 1 + Math.floor((3.999 * w.n) / max));
  bars += `<rect class="b" style="animation-delay:${(i * 0.04).toFixed(2)}s" x="${x.toFixed(1)}" y="${(Y1 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${C.bars[lvl]}"><title>${w.n} na semana de ${w.start.getUTCDate()}/${w.start.getUTCMonth() + 1}</title></rect>`;
  const m = w.start.getUTCMonth();
  if (m !== lastMonth && i < recent.length - 1) {
    labels += `<text x="${x.toFixed(1)}" y="176" class="m">${months[m]}</text>`;
    lastMonth = m;
  }
});

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${total} contribuições no último ano">
<style>
.t{font:600 18px ${font};fill:${C.title}}
.s{font:400 12px ${font};fill:${C.text}}
.k{font:700 12px ${font};fill:${C.title}}
.m{font:400 10px ${font};fill:${C.soft}}
.b{transform-box:fill-box;transform-origin:bottom;animation:grow .7s cubic-bezier(.3,1.4,.5,1) both}
.h{animation:beat 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes beat{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
@media (prefers-reduced-motion:reduce){.b,.h{animation:none}}
</style>
<rect x="0.5" y="0.5" rx="12" width="${W - 1}" height="${H - 1}" fill="${C.bg}" stroke="${C.border}"/>
<text x="${X0}" y="35" class="t">minhas contribuições</text>
<text x="${X1}" y="35" text-anchor="end" class="h" style="font:16px ${font}">💗</text>
<text x="${X0}" y="53" class="s"><tspan class="k">${total}</tspan> no último ano · <tspan class="k">${activeWeeks}</tspan> de ${recent.length} semanas ativas · melhor semana: <tspan class="k">${best}</tspan></text>
<line x1="${X0}" x2="${X1}" y1="${Y1 + 0.5}" y2="${Y1 + 0.5}" stroke="${C.border}"/>
${bars}
${labels}
</svg>`;

writeFileSync(out, svg);
console.log(`ok: ${total} contribuições, ${recent.length} semanas -> ${out}`);
