import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// jeux.json n'est PAS dans les sources : il vit dans ../testeurs/ et se modifie à la main,
// sans rebuild. En dev, on le sert depuis là-bas.
const JSON_PROD = fileURLToPath(new URL('../testeurs/jeux.json', import.meta.url));

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
