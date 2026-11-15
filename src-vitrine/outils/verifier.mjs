// Vérifie la vitrine construite (../testeurs) dans Chromium à plusieurs tailles d'écran.
// Usage : npm run build && npm run verifier   → captures dans ../sortie/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const SORTIE = join(RACINE, 'sortie');
await mkdir(SORTIE, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const serveur = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(RACINE, p));
  if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(f);
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => serveur.listen(4173, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:4173';

// Liens attendus = ceux de l'ancienne page (inchangés).
const ATTENDU = [
  ['Lockdown: Extraction', 'com.byzirtox.lockdown', 'https://lockdown.dragonnet.online/'],
  ['Casino Bylux', 'com.krimolux.casinobylux', 'https://casino.dragonnet.online/'],
  ['Last Bastion', 'com.krimolux.dernierbastion', null],
  ['Abyss Angler', 'com.krimolux.pecheurabysses', null],
  ['Évasion Idle', 'com.krimolux.evasionidle', null],
  ['Moka & Minou', 'com.krimolux.mokaminou', null],
  ['Gunlight', 'com.krimolux.gunlight', null],
  ['Village Bazaar', 'com.krimolux.villagebazaar', null],
];

const TAILLES = [[360, 640], [390, 844], [412, 915], [1280, 800]];
const navigateur = await chromium.launch();
let echecs = 0;
const ko = (m) => { echecs++; console.log('  ✗ ' + m); };

async function tester(l, h, locale, suffixe) {
  const mobile = l < 800;
  const ctx = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale });
  const page = await ctx.newPage();
  const erreurs = [];
  const tiers = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => erreurs.push('requête échouée: ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) tiers.push(r.url()); });
  await page.route((u) => !u.href.startsWith(BASE) && !u.href.startsWith('data:'), (r) => r.abort());

  await page.goto(`${BASE}/testeurs/?m=test123`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.carte:not(.carte--fantome)');
  // Charge toutes les images paresseuses avant la capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.decode().catch(() => {}); })));
  await page.waitForTimeout(1200);

  const nom = `vitrine-${l}x${h}${suffixe}.png`;
  console.log(`\n${l}×${h} ${locale}${suffixe}`);
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const deborde = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > doc.clientWidth + 1 || r.left < -1) && !e.closest('.hero__grille, .carte__fond-icone, .saut'); }).map((e) => e.className || e.tagName).slice(0, 5);
    const petits = [...document.querySelectorAll('a, button, summary, .btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && !e.classList.contains('saut') && (r.height < 47.5 || r.width < 47.5); }).map((e) => (e.textContent || '').trim().slice(0, 30));
    const cartes = [...document.querySelectorAll('.carte')].map((c) => ({
      nom: c.querySelector('.carte__nom').textContent,
      inscription: c.querySelector('.btn--principal')?.href,
      play: c.querySelector('.btn--contour')?.href,
      web: c.querySelector('.btn--web')?.href || null,
      off: !!c.querySelector('.btn--off:not([href])'),
      compteur: c.querySelector('.compteur__nb b').textContent,
      jauge: c.querySelector('.jauge').getAttribute('aria-valuenow'),
    }));
    const imgsSansAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
    const imgsCassees = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, deborde, petits, cartes, imgsSansAlt, imgsCassees, maj: document.getElementById('maj').textContent, lang: doc.lang };
  });

  if (erreurs.length) ko('console : ' + erreurs.join(' | ')); else console.log('  ✓ zéro erreur/avertissement console');
  if (tiers.length) ko('requêtes vers des tiers : ' + tiers.join(', ')); else console.log('  ✓ aucune requête vers un tiers');
  if (res.scrollW > res.clientW || res.deborde.length) ko(`débordement : scrollWidth ${res.scrollW} > ${res.clientW} ${res.deborde.join(', ')}`); else console.log('  ✓ aucun débordement horizontal');
  if (res.petits.length) ko('cibles < 48 px : ' + res.petits.join(' / ')); else console.log('  ✓ toutes les cibles ≥ 48 px');
  if (res.imgsSansAlt || res.imgsCassees.length) ko(`images : ${res.imgsSansAlt} sans alt, cassées : ${res.imgsCassees.join(', ')}`); else console.log('  ✓ images chargées, toutes avec alt');
  if (res.cartes.length !== ATTENDU.length) ko(`${res.cartes.length} cartes au lieu de ${ATTENDU.length}`);
  ATTENDU.forEach(([n, pkg, web], i) => {
    const c = res.cartes[i];
    if (!c || c.nom !== n) return ko(`carte ${i + 1} : ${c?.nom} au lieu de ${n}`);
    if (c.inscription !== `https://play.google.com/apps/testing/${pkg}`) ko(`${n} : lien d'inscription ${c.inscription}`);
    if (c.play !== `https://play.google.com/store/apps/details?id=${pkg}`) ko(`${n} : lien Play ${c.play}`);
    if (c.web !== web) ko(`${n} : lien web ${c.web}`);
    if (!web && !c.off) ko(`${n} : bouton web « bientôt » absent`);
  });
  console.log(`  ✓ liens vérifiés (${res.cartes.map((c) => c.nom.split(':')[0] + ' ' + c.compteur).join(', ')})`);
  console.log(`  · ${res.maj} · lang=${res.lang}`);

  await page.screenshot({ path: join(SORTIE, nom), fullPage: true });
  await page.screenshot({ path: join(SORTIE, nom.replace('.png', '-ecran.png')) });
  console.log('  → sortie/' + nom);
  await ctx.close();
}

for (const [l, h] of TAILLES) await tester(l, h, 'fr-FR', '');
await tester(390, 844, 'en-US', '-en');

await navigateur.close();
serveur.close();
console.log(echecs ? `\n${echecs} problème(s).` : '\nTout est bon.');
process.exit(echecs ? 1 : 0);
