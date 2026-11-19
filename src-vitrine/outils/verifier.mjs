// Vérifie la vitrine construite (../testeurs) : fichiers de langue, puis Chromium à plusieurs tailles et dans toutes les langues.
// Usage : npm run build && npm run verifier   → captures dans ../sortie/v2/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUES, RTL } from '../langues.mjs';

const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const SORTIE = join(RACINE, 'sortie', 'v2');
await mkdir(SORTIE, { recursive: true });
let echecs = 0;
const ko = (m) => { echecs++; console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

/* ---------- 1. Fichiers de langue et jeux.json (statique) ---------- */
console.log('Fichiers de langue');
const lire = (c) => JSON.parse(readFileSync(join(RACINE, 'testeurs', 'langues', `${c}.json`), 'utf8'));
const EN = lire('en');
const FR = lire('fr');
const CLES = Object.keys(EN);
const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
const balises = (s) => (s.match(/<[^>]+>/g) || []).join();
const TEXTES = {};
for (const [c] of LANGUES) {
  let T;
  try { T = TEXTES[c] = lire(c); } catch (e) { ko(`${c} : fichier absent ou JSON invalide (${e.message})`); continue; }
  const manque = CLES.filter((k) => typeof T[k] !== 'string' || !T[k].trim());
  const enTrop = Object.keys(T).filter((k) => !(k in EN));
  if (manque.length) ko(`${c} : clés manquantes ${manque.join(', ')}`);
  if (enTrop.length) ko(`${c} : clés inconnues ${enTrop.join(', ')}`);
  for (const k of CLES) {
    if (typeof T[k] !== 'string') continue;
    if (vars(T[k]) !== vars(EN[k])) ko(`${c}.${k} : variables ${vars(T[k]) || '∅'} au lieu de ${vars(EN[k]) || '∅'}`);
    if (balises(T[k]) !== balises(EN[k])) ko(`${c}.${k} : balises « ${balises(T[k])} » au lieu de « ${balises(EN[k])} »`);
    if (/[‎‏‪-‮⁦-⁩]/.test(T[k])) ko(`${c}.${k} : caractère de contrôle bidi`);
  }
}
const poidsLangues = readdirSync(join(RACINE, 'testeurs', 'langues')).map((f) => statSync(join(RACINE, 'testeurs', 'langues', f)).size);
ok(`${Object.keys(TEXTES).length} langues lues, ${CLES.length} clés chacune contrôlées (variables, balises) · ${Math.round(Math.max(...poidsLangues) / 1024)} Ko max par langue`);

// Phrases propres au français (différentes de l'anglais) : elles ne doivent jamais apparaître dans une autre langue.
const brut = (s) => s.replace(/<[^>]+>/g, '').replace(/\{\w+\}/g, '').trim();
const jeuxJson = JSON.parse(readFileSync(join(RACINE, 'testeurs', 'jeux.json'), 'utf8'));
const FR_SEUL = new Set();
for (const k of CLES) if (FR[k] !== EN[k]) for (const morceau of brut(FR[k]).split(/[.:!?]\s/)) if (morceau.length >= 12) FR_SEUL.add(morceau.trim());
for (const j of [...(jeuxJson.production || []), ...jeuxJson.jeux]) for (const champ of ['genre', 'accroche']) {
  const o = j[champ];
  if (o && o.fr && o.fr !== o.en && o.fr.length >= 8) FR_SEUL.add(o.fr);
  const absentes = LANGUES.map(([c]) => c).filter((c) => !o || !o[c]);
  if (absentes.length) ko(`jeux.json ${j.nom}.${champ} : langues absentes ${absentes.join(', ')} (repli en anglais)`);
}
ok(`${FR_SEUL.size} phrases françaises de référence pour la détection de fuite`);

/* ---------- 2. Navigateur ---------- */
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

// Liens attendus (inchangés depuis la v1) : nom, paquet, web, compteur — dans l'ordre d'AFFICHAGE
// (jeux qui cherchent encore des testeurs d'abord, du plus proche de 12 au plus loin, puis les complets).
// Compteurs du 17/11 ; à mettre à jour avec jeux.json.
const ATTENDU = [
  ['Casino Bylux', 'com.krimolux.casinobylux', 'https://casino.dragonnet.online/', '11/12'],
  ['Abyss Angler', 'com.krimolux.pecheurabysses', 'https://abyss.dragonnet.online/', '9/12'],
  ['Last Bastion', 'com.krimolux.dernierbastion', 'https://bastion.dragonnet.online/', '7/12'],
  ['Évasion Idle', 'com.krimolux.evasionidle', 'https://evasion.dragonnet.online/', '6/12'],
  ['Moka & Minou', 'com.krimolux.mokaminou', 'https://moka.dragonnet.online/', '6/12'],
  ['Gunlight', 'com.krimolux.gunlight', 'https://gunlight.dragonnet.online/', '5/12'],
  ['Village Bazaar', 'com.krimolux.villagebazaar', 'https://bazaar.dragonnet.online/', '5/12'],
  ['Lockdown: Extraction', 'com.byzirtox.lockdown', 'https://lockdown.dragonnet.online/', '12/12'],
];

const navigateur = await chromium.launch();

/** Ouvre la page ; options : groupe (URL injectée dans jeux.json), lang (?lang=), locale du navigateur. */
async function ouvrir({ l, h, locale = 'en-US', lang = null, groupe = null, stockage = null, compteurs = null }) {
  const mobile = l < 800;
  // Échelle 1 : même mise en page qu'en 2×, mais captures pleine page 4× plus légères (machine partagée).
  const ctx = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale });
  ctx.setDefaultTimeout(120000);
  const page = await ctx.newPage();
  const erreurs = [];
  const tiers = [];
  // compteurs.json est facultatif (relève automatique à venir) : son 404 n'est pas une erreur.
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !(m.location()?.url || '').endsWith('/compteurs.json')) erreurs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => erreurs.push('requête échouée: ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) tiers.push(r.url()); });
  await page.route((u) => !u.href.startsWith(BASE) && !u.href.startsWith('data:'), (r) => r.abort());
  if (groupe !== null) {
    await page.route('**/jeux.json', async (r) => {
      const d = JSON.parse(readFileSync(join(RACINE, 'testeurs', 'jeux.json'), 'utf8'));
      d.groupe = groupe;
      await r.fulfill({ contentType: 'application/json', body: JSON.stringify(d) });
    });
  }
  if (compteurs !== null) {
    await page.route('**/compteurs.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(compteurs) }));
  }
  if (stockage) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, stockage);
  await page.goto(`${BASE}/testeurs/?m=test123${lang ? '&lang=' + lang : ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#cartes .carte:not(.carte--fantome)');
  await page.waitForFunction(() => !document.documentElement.classList.contains('attente'));
  // Les cartes hors écran ont un rendu différé (content-visibility) : on force leur calcul pour mesurer.
  await page.addStyleTag({ content: '.carte, .faq, .pied { content-visibility: visible !important; }' });
  return { ctx, page, erreurs, tiers };
}

async function mesurer(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const visibles = (e) => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden'; };
    const deborde = [...document.querySelectorAll('body *')].filter((e) => {
      if (!visibles(e) || e.closest('.hero__grille, .carte__fond-icone, .saut, .vh') || e.classList.contains('vh')) return false;
      const r = e.getBoundingClientRect();
      return r.right > doc.clientWidth + 1 || r.left < -1;
    }).map((e) => `${e.tagName.toLowerCase()}.${e.className}`).slice(0, 5);
    // Texte qui dépasse de sa boîte (mot trop long dans un bouton, un titre…).
    const coupe = [...document.querySelectorAll('.btn, .coche, h1, h2, h3, .etape p, .rappel p, .badge, .compteur__ligne, .langue select, .chiffres li')].filter((e) => visibles(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' ? true : visibles(e) && e.scrollWidth > e.getBoundingClientRect().width + 2 && !e.matches('select')).map((e) => (e.textContent || '').trim().slice(0, 40));
    const petits = [...document.querySelectorAll('a, button, summary, select, .btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && !e.closest('.saut') && (r.height < 47.5 || r.width < 47.5); }).map((e) => (e.textContent || '').trim().slice(0, 30));
    const cartes = [...document.querySelectorAll('#cartes .carte')].map((c) => ({
      nom: c.querySelector('.carte__nom').textContent,
      inscription: c.querySelector('a[data-etape="testeur"]')?.href,
      play: c.querySelector('a[data-etape="installe"]')?.href,
      principal: c.querySelector('.btn--principal')?.dataset.etape,
      complet: c.classList.contains('carte--complet'),
      une: c.classList.contains('carte--une'),
      web: c.querySelector('.btn--web')?.href || null,
      compteur: c.querySelector('.compteur__nb b').textContent,
      jauge: c.querySelector('.jauge').getAttribute('aria-valuenow'),
    }));
    const prod = [...document.querySelectorAll('#cartes-prod .carte')].map((c) => ({
      nom: c.querySelector('.carte__nom').textContent,
      play: c.querySelector('.btn--principal')?.href,
      web: c.querySelector('.btn--web')?.href || null,
      compteur: !!c.querySelector('.compteur'),
    }));
    const prodAvant = !!document.querySelector('#prod:not([hidden])') && document.querySelector('#prod').compareDocumentPosition(document.querySelector('#jeux')) & Node.DOCUMENT_POSITION_FOLLOWING;
    const etapes = [...document.querySelectorAll('.etape')].filter((e) => !e.hidden).map((e) => e.dataset.etape + ':' + e.querySelector('.etape__num').textContent);
    const imgsSansAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
    const imgsCassees = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
    // Texte réellement présent (y compris le contenu replié des <details>).
    const texte = document.body.textContent.replace(/\s+/g, ' ');
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, deborde, coupe, petits, cartes, prod, prodAvant: !!prodAvant, etapes, imgsSansAlt, imgsCassees, texte, maj: document.getElementById('maj').textContent, lang: doc.lang, dir: doc.dir, titre: document.title, progres: document.getElementById('progres-txt').textContent };
  });
}

function controlerMise(res, contexte) {
  if (res.scrollW > res.clientW || res.deborde.length) ko(`${contexte} débordement : scrollWidth ${res.scrollW} > ${res.clientW} ${res.deborde.join(', ')}`);
  if (res.coupe.length) ko(`${contexte} texte coupé : ${res.coupe.join(' / ')}`);
  if (res.petits.length) ko(`${contexte} cibles < 48 px : ${res.petits.join(' / ')}`);
}

function controlerFr(res, code) {
  if (code === 'fr') return;
  // Une phrase identique dans la langue cible (ex. « Casino social » en espagnol) n'est pas une fuite.
  const propre = [...Object.values(TEXTES[code] || {}).map(brut), ...[...(jeuxJson.production || []), ...jeuxJson.jeux].flatMap((j) => [j.genre?.[code], j.accroche?.[code]])].join('\n');
  const fuites = [...FR_SEUL].filter((s) => res.texte.includes(s) && !propre.includes(s));
  if (fuites.length) ko(`${code} : texte français affiché : « ${fuites.slice(0, 3).join(' » « ')} »`);
}

async function charger(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.decode().catch(() => {}); })));
  await page.waitForTimeout(900);
}

/* --- 2a. Tailles d'écran en français et en anglais (captures) --- */
const TAILLES = [[320, 640], [360, 640], [390, 844], [412, 915], [1280, 800]];
for (const [locale, suffixe] of [['fr-FR', 'fr'], ['en-US', 'en']]) {
  for (const [l, h] of TAILLES) {
    console.log(`\n${l}×${h} ${suffixe}`);
    const { ctx, page, erreurs, tiers } = await ouvrir({ l, h, locale });
    await charger(page);
    const res = await mesurer(page);
    if (erreurs.length) ko('console : ' + erreurs.join(' | ')); else ok('zéro erreur/avertissement console');
    if (tiers.length) ko('requêtes vers des tiers : ' + tiers.join(', '));
    if (res.lang !== suffixe) ko(`langue détectée ${res.lang} au lieu de ${suffixe}`);
    controlerMise(res, '');
    controlerFr(res, suffixe);
    if (res.imgsSansAlt || res.imgsCassees.length) ko(`images : ${res.imgsSansAlt} sans alt, cassées : ${res.imgsCassees.join(', ')}`);
    if (res.cartes.length !== ATTENDU.length) ko(`${res.cartes.length} cartes au lieu de ${ATTENDU.length}`);
    ATTENDU.forEach(([n, pkg, web, cpt], i) => {
      const c = res.cartes[i];
      if (!c || c.nom !== n) return ko(`carte ${i + 1} : ${c?.nom} au lieu de ${n}`);
      if (c.inscription !== `https://play.google.com/apps/testing/${pkg}`) ko(`${n} : lien d'inscription ${c.inscription}`);
      if (c.play !== `https://play.google.com/store/apps/details?id=${pkg}`) ko(`${n} : lien Play ${c.play}`);
      if (c.web !== web) ko(`${n} : lien web ${c.web}`);
      if (c.compteur !== cpt) ko(`${n} : compteur ${c.compteur} au lieu de ${cpt}`);
      const complet = cpt === '12/12';
      if (c.complet !== complet || c.principal !== (complet ? 'installe' : 'testeur')) ko(`${n} : complet=${c.complet}, bouton plein=${c.principal}`);
      if (c.une !== (i === 0)) ko(`${n} : mise en avant ${c.une}`);
    });
    const dn = res.prod[0];
    if (!dn || dn.nom !== 'Dragonnet' || dn.play !== 'https://play.google.com/store/apps/details?id=com.krimolux.dragonnet' || dn.web !== 'https://dragonnet.online/' || dn.compteur) ko(`carte production Dragonnet incorrecte : ${JSON.stringify(dn)}`);
    if (!res.prodAvant) ko('la section « en production » n’est pas au-dessus des jeux en test');
    // jeux.json a un lien de groupe depuis le 15/11 → 4 étapes ; sans lien → 3.
    const etapesAttendues = /^https:\/\//.test(jeuxJson.groupe || '') ? 'groupe:1,testeur:2,installe:3,avis:4' : 'testeur:1,installe:2,avis:3';
    if (res.etapes.join() !== etapesAttendues) ko(`étapes : ${res.etapes.join()} au lieu de ${etapesAttendues}`);
    if (!echecs) ok(`liens, compteurs, production, 3 étapes (${res.progres}) · ${res.maj}`);
    const nom = `vitrine-${l}x${h}-${suffixe}`;
    await page.screenshot({ path: join(SORTIE, `${nom}.png`), fullPage: true });
    await page.screenshot({ path: join(SORTIE, `${nom}-ecran.png`) });
    await ctx.close();
  }
}

/* --- 2a bis. compteurs.json (relève automatique) remplace les compteurs de jeux.json et retrie --- */
console.log('\ncompteurs.json');
{
  const maj = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const c = { maj, testeurs: { 'com.krimolux.villagebazaar': 12, 'com.krimolux.gunlight': 10, 'com.krimolux.casinobylux': 'x', 'com.byzirtox.lockdown': 999 } };
  const { ctx, page, erreurs } = await ouvrir({ l: 390, h: 844, locale: 'fr-FR', compteurs: c });
  const res = await mesurer(page);
  const ordre = res.cartes.map((x) => `${x.nom} ${x.compteur}`).join(', ');
  const attendu = 'Casino Bylux 11/12, Gunlight 10/12, Abyss Angler 9/12, Last Bastion 7/12, Évasion Idle 6/12, Moka & Minou 6/12, Lockdown: Extraction 12/12, Village Bazaar 12/12';
  if (ordre !== attendu) ko(`ordre avec compteurs.json : ${ordre}`);
  if (!res.maj) ko('date de compteurs.json non affichée');
  if (erreurs.length) ko('console : ' + erreurs.join(' | '));
  if (!echecs) ok(`compteurs.json fusionné et retrié (valeurs invalides ignorées) · ${res.maj}`);
  await ctx.close();
}

/* --- 2b. Parcours : groupe renseigné → 4 étapes ; coches mémorisées ; boutons des cartes --- */
console.log('\nParcours en 4 étapes (groupe renseigné) + mémorisation');
{
  const G = 'https://groups.google.com/g/exemple-testeurs';
  const { ctx, page, erreurs } = await ouvrir({ l: 390, h: 844, locale: 'fr-FR', groupe: G });
  let res = await mesurer(page);
  if (res.etapes.join() !== 'groupe:1,testeur:2,installe:3,avis:4') ko(`étapes avec groupe : ${res.etapes.join()}`);
  const href = await page.getAttribute('#btn-groupe', 'href');
  if (href !== G) ko(`bouton Rejoindre → ${href}`);
  if (!(await page.isVisible('[data-t="a3"]'))) { await page.click('#aide summary'); }
  if (!(await page.isVisible('[data-t="a3"]'))) ko('aide « as-tu rejoint le groupe » absente');
  await page.locator('.etape[data-etape="groupe"] .coche').click();
  await page.locator('.etape[data-etape="avis"] .coche').click();
  // « Devenir testeur » sur une carte coche l'étape 2 (on bloque l'ouverture du lien externe).
  await ctx.route('https://play.google.com/**', (r) => r.abort());
  await page.locator('#cartes .carte').nth(1).locator('a[data-etape="testeur"]').click();
  await page.waitForTimeout(300);
  for (const p of ctx.pages()) if (p !== page) await p.close();
  res = await mesurer(page);
  if (res.progres !== '3 sur 4 fait') ko(`progression après 3 coches : « ${res.progres} »`);
  await page.locator('#parcours').screenshot({ path: join(SORTIE, 'parcours-4-etapes-390-fr.png') });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#cartes .carte:not(.carte--fantome)');
  res = await mesurer(page);
  if (res.progres !== '3 sur 4 fait') ko(`progression après rechargement : « ${res.progres} »`);
  const etat = await page.$$eval('.etape', (l) => l.map((e) => e.dataset.etape + (e.classList.contains('fait') ? '✓' : '·')).join(' '));
  // Étape 4 : le bouton ouvre l'aide sur « donner son avis ».
  await page.click('#btn-avis');
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => document.getElementById('aide').open && document.activeElement.id === 'aide-avis'))) ko('« Donner mon avis » n’ouvre pas l’aide');
  // Décocher fonctionne.
  await page.locator('.etape[data-etape="avis"] .coche').click();
  if ((await mesurer(page)).progres !== '2 sur 4 fait') ko('décocher ne marche pas');
  const filtrees = erreurs.filter((e) => !e.includes('play.google.com'));
  if (filtrees.length) ko('console : ' + filtrees.join(' | '));
  ok(`4 étapes, coches mémorisées après rechargement (${etat}), aide « avis », décochage`);
  await ctx.close();
}
// localStorage indisponible (ex. navigation privée stricte) : pas d'erreur.
{
  const { ctx, page, erreurs } = await ouvrir({ l: 360, h: 640, locale: 'fr-FR', stockage: { 'bylux-etapes': '{cassé' } });
  await page.locator('.etape[data-etape="testeur"] .coche').click();
  if (erreurs.length) ko('localStorage corrompu : ' + erreurs.join(' | ')); else ok('localStorage corrompu toléré');
  await ctx.close();
}

/* --- 2c. Toutes les langues : clés affichées, pas de français, pas de débordement (360 px), RTL --- */
console.log('\nToutes les langues à 360×740 (+ 320 px pour de, fi, ru, ar, he, ta)');
const resume = [];
for (const [code] of LANGUES) {
  for (const l of [360, ...(['de', 'fi', 'ru', 'ar', 'he', 'ta'].includes(code) ? [320] : [])]) {
    // Machine partagée : un rendu qui expire est retenté une fois avant d'être compté comme un échec.
    let o;
    for (let essai = 1; !o; essai++) {
      try {
        o = await ouvrir({ l, h: 740, locale: 'en-US', lang: code, groupe: 'https://groups.google.com/g/exemple-testeurs' });
      } catch (e) {
        if (essai >= 2) throw e;
        console.log(`  · ${code} ${l}px : délai dépassé, nouvel essai`);
      }
    }
    const { ctx, page, erreurs, tiers } = o;
    await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
    const res = await mesurer(page);
    const ctxte = `${code} ${l}px`;
    if (erreurs.length) ko(`${ctxte} console : ${erreurs.join(' | ')}`);
    if (tiers.length) ko(`${ctxte} tiers : ${tiers.join(', ')}`);
    if (res.lang !== code) ko(`${ctxte} : lang=${res.lang}`);
    if (res.dir !== (RTL.includes(code) ? 'rtl' : 'ltr')) ko(`${ctxte} : dir=${res.dir}`);
    if (res.titre !== TEXTES[code]?.titre) ko(`${ctxte} : titre non traduit`);
    if (code !== 'en') {
      // Phrases anglaises de la page restées en place (hors noms de marque identiques).
      const restes = CLES.filter((k) => !['btnPlay', 'btnWebSous', 'badgeWeb'].includes(k) && TEXTES[code]?.[k] !== EN[k] && brut(EN[k]).length > 14 && res.texte.includes(brut(EN[k])));
      if (restes.length) ko(`${ctxte} : texte anglais resté : ${restes.join(', ')}`);
    }
    controlerFr(res, code);
    controlerMise(res, ctxte);
    if (res.etapes.length !== 4) ko(`${ctxte} : ${res.etapes.length} étapes`);
    if (['de', 'ar', 'he', 'ja', 'hi', 'zh-CN', 'ru', 'th'].includes(code) || l === 320) {
      await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = false; }); });
      await charger(page);
      try {
        await page.screenshot({ path: join(SORTIE, `langue-${code}-${l}.png`), fullPage: true, timeout: 90000 });
      } catch (e) {
        console.log(`  · ${code} ${l}px : capture pleine page trop lente, capture de l'écran seul`);
        await page.screenshot({ path: join(SORTIE, `langue-${code}-${l}.png`), timeout: 90000 });
      }
    }
    resume.push(`${code}${l === 320 ? '@320' : ''}`);
    await ctx.close();
  }
}
ok(`${resume.length} rendus contrôlés : ${resume.join(' ')}`);

/* --- 2d. Détection automatique de la langue du navigateur --- */
console.log('\nDétection de la langue du navigateur');
for (const [locale, attendu] of [['de-DE', 'de'], ['pt-PT', 'pt-PT'], ['pt-BR', 'pt-BR'], ['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-CN', 'zh-CN'], ['nn-NO', 'nb'], ['es-MX', 'es'], ['ar-EG', 'ar'], ['xx-YY', 'en']]) {
  const { ctx, page } = await ouvrir({ l: 360, h: 640, locale });
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang !== attendu) ko(`${locale} → ${lang} au lieu de ${attendu}`);
  await ctx.close();
}
ok('de, pt-PT, pt-BR, zh-TW, zh-HK, zh-CN, nn, es-MX, ar-EG, langue inconnue → anglais');
// Sélecteur : passer en japonais puis recharger → reste en japonais.
{
  const { ctx, page, erreurs } = await ouvrir({ l: 390, h: 844, locale: 'fr-FR' });
  await page.selectOption('#langue', 'ja');
  await page.waitForFunction(() => document.documentElement.lang === 'ja');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#cartes .carte:not(.carte--fantome)');
  const lang = await page.evaluate(() => document.documentElement.lang);
  // Le rechargement interrompt les images encore en cours : ce ne sont pas des erreurs.
  const vraies = erreurs.filter((e) => !/requête échouée: .*\.webp$/.test(e));
  if (lang !== 'ja' || vraies.length) ko(`sélecteur : ${lang} ${vraies.join(' | ')}`); else ok('sélecteur de langue mémorisé (fr → ja → rechargement → ja)');
  await ctx.close();
}

/* --- 3. Poids --- */
const js = readdirSync(join(RACINE, 'testeurs', 'assets')).filter((f) => f.endsWith('.js')).reduce((s, f) => s + statSync(join(RACINE, 'testeurs', 'assets', f)).size, 0);
if (js > 150 * 1024) ko(`JS ${Math.round(js / 1024)} Ko > 150 Ko`); else ok(`JS total ${(js / 1024).toFixed(1)} Ko (< 150 Ko)`);

await navigateur.close();
serveur.close();
console.log(echecs ? `\n${echecs} problème(s).` : '\nTout est bon.');
process.exit(echecs ? 1 : 0);
