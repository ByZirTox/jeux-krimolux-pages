import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANGUES, RTL, ECRITURES_COMPLEXES } from './langues.mjs';

// jeux.json n'est PAS dans les sources : il vit dans ../testeurs/ et se modifie à la main,
// sans rebuild. En dev, on le sert depuis là-bas.
const JSON_PROD = fileURLToPath(new URL('../testeurs/jeux.json', import.meta.url));
// L'anglais (langue de repli) est intégré au JS ; les autres langues sont des fichiers
// public/langues/<code>.json chargés à la demande (copiés tels quels dans ../testeurs/langues/).
const EN = fileURLToPath(new URL('./public/langues/en.json', import.meta.url));
// Images facultatives (bannières à venir, héros, aperçu de partage, pictos…) : la page ne les
// référence QUE si le fichier existe dans public/images/ au moment du build → jamais d'image cassée.
// Pour en ajouter une : déposer le fichier dans public/images/ (noms : voir commande-images-testeurs.md), puis `npm run build`.
const IMAGES_DIR = fileURLToPath(new URL('./public/images/', import.meta.url));
const images = () => (existsSync(IMAGES_DIR) ? readdirSync(IMAGES_DIR).filter((f) => /^[\w.-]+$/.test(f)).map((f) => `images/${f}`) : []);
const URL_PAGE = 'https://byzirtox.github.io/jeux-krimolux-pages/testeurs/';
const echapper = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Image de héros : seulement si les deux formats (paysage + portrait) existent. */
function heroImage() {
  const l = images();
  if (!l.includes('images/hero-paysage.webp') || !l.includes('images/hero-portrait.webp')) return '';
  const petit = l.includes('images/hero-paysage-960.webp') ? 'images/hero-paysage-960.webp 960w, ' : '';
  return '<picture class="hero__image" aria-hidden="true">'
    + '<source media="(max-width: 699px)" srcset="images/hero-portrait.webp">'
    + `<source srcset="${petit}images/hero-paysage.webp 1600w" sizes="100vw">`
    + '<img src="images/hero-paysage.webp" alt="" width="1600" height="900" fetchpriority="high" decoding="async"></picture>';
}
/** Aperçu du lien partagé (WhatsApp, Discord, Snap…) : texte toujours, grande image si images/partage.jpg existe. */
function apercuPartage() {
  const titre = 'Bylux Studio · Become a tester';
  const desc = "Play Bylux Studio's mobile games before anyone else: join the closed test on Google Play.";
  const img = images().includes('images/partage.jpg');
  return [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Bylux Studio">',
    `<meta property="og:url" content="${URL_PAGE}">`,
    `<meta property="og:title" content="${echapper(titre)}">`,
    `<meta property="og:description" content="${echapper(desc)}">`,
    ...(img ? [
      `<meta property="og:image" content="${URL_PAGE}images/partage.jpg">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta name="twitter:card" content="summary_large_image">',
    ] : ['<meta name="twitter:card" content="summary">']),
  ].join('\n');
}

export default defineConfig({
  base: './',
  build: {
    outDir: '../testeurs',
    emptyOutDir: false, // ne pas effacer jeux.json (outils/nettoyer.mjs vide le reste)
    assetsDir: 'assets',
    target: 'es2019',
    cssCodeSplit: false,
    modulePreload: false,
  },
  plugins: [{
    // Registre des langues : module virtuel pour le JS, liste injectée dans le <head> et options du sélecteur.
    name: 'langues',
    resolveId: (id) => (id === 'virtuel:langues' || id === 'virtuel:images' ? '\0' + id : null),
    load(id) {
      if (id === '\0virtuel:images') return `export const IMAGES = ${JSON.stringify(images())};`;
      if (id !== '\0virtuel:langues') return null;
      this.addWatchFile(EN);
      return `export const LANGUES = ${JSON.stringify(LANGUES)};\nexport const RTL = ${JSON.stringify(RTL)};\nexport const COMPLEXES = ${JSON.stringify(ECRITURES_COMPLEXES)};\nexport const EN = ${readFileSync(EN, 'utf8')};`;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html
        .replace('__LANGUES__', JSON.stringify(LANGUES.map(([c]) => c)))
        .replace('__RTL__', JSON.stringify(RTL))
        .replace('__COMPLEXES__', JSON.stringify(ECRITURES_COMPLEXES))
        .replace('<!--OPTIONS-LANGUES-->', LANGUES.map(([c, n]) => `<option value="${c}" lang="${c}">${echapper(n)}</option>`).join(''))
        .replace('<!--HERO-IMAGE-->', heroImage())
        .replace('<!--APERCU-PARTAGE-->', apercuPartage()),
    },
  }, {
    // CSS (≈ 4 Ko gzip) inliné dans index.html : un aller-retour réseau de moins avant le 1er rendu.
    name: 'css-en-ligne',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        for (const [nom, f] of Object.entries(ctx.bundle || {})) {
          if (!nom.endsWith('.css')) continue;
          const re = new RegExp(`<link[^>]+href="[^"]*${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
          if (re.test(html)) {
            // Le CSS était prévu pour assets/ : une fois dans index.html, « ../fonts/x » devient « ./fonts/x ».
            const css = String(f.source).replace(/url\((['"]?)\.\.\//g, 'url($1./');
            html = html.replace(re, () => `<style>${css}</style>`);
            delete ctx.bundle[nom];
          }
        }
        return html;
      },
    },
  }, {
    name: 'jeux-json-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/compteurs.json')) {
          const f = fileURLToPath(new URL('../testeurs/compteurs.json', import.meta.url));
          if (!existsSync(f)) return next();
          res.setHeader('Content-Type', 'application/json');
          return res.end(readFileSync(f));
        }
        if (!req.url.startsWith('/jeux.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.end(readFileSync(JSON_PROD));
      });
    },
  }],
});
