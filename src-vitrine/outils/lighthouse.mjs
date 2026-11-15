// Audit Lighthouse mobile de la vitrine. Prérequis : `npx vite preview --port 4174` lancé.
// Usage : node outils/lighthouse.mjs   → ../sortie/lighthouse-mobile.html
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const r = await lighthouse('http://127.0.0.1:4174/?m=test', { port: chrome.port, output: 'html', formFactor: 'mobile', logLevel: 'error' });
writeFileSync(new URL('../../sortie/lighthouse-mobile.html', import.meta.url), r.report);
for (const [k, c] of Object.entries(r.lhr.categories)) console.log(k, Math.round(c.score * 100));
for (const a of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight']) console.log(a, r.lhr.audits[a].displayValue);
for (const a of Object.values(r.lhr.audits)) if (a.score !== null && a.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(a.scoreDisplayMode)) console.log('!', a.id, a.score, a.displayValue || '');
for (const it of r.lhr.audits['label-content-name-mismatch']?.details?.items || []) console.log('  libellé ≠ texte :', it.node?.snippet);
await chrome.kill();
