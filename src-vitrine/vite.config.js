import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANGUES, RTL, ECRITURES_COMPLEXES } from './langues.mjs';

// jeux.json n'est PAS dans les sources : il vit dans ../testeurs/ et se modifie à la main,
// sans rebuild. En dev, on le sert depuis là-bas.
const JSON_PROD = fileURLToPath(new URL('../testeurs/jeux.json', import.meta.url));
// L'anglais (langue de repli) est intégré au JS ; les autres langues sont des fichiers
// public/langues/<code>.json chargés à la demande (copiés tels quels dans ../testeurs/langues/).
const EN = fileURLToPath(new URL('./public/langues/en.json', import.meta.url));
const echapper = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    resolveId: (id) => (id === 'virtuel:langues' ? '\0virtuel:langues' : null),
    load(id) {
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
        .replace('<!--OPTIONS-LANGUES-->', LANGUES.map(([c, n]) => `<option value="${c}" lang="${c}">${echapper(n)}</option>`).join('')),
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
            html = html.replace(re, () => `<style>${f.source}</style>`);
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
        if (!req.url.startsWith('/jeux.json')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.end(readFileSync(JSON_PROD));
      });
    },
  }],
});
