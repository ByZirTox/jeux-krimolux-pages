import { TEXTES } from './textes.js';

const racine = document.documentElement;
let langue = racine.lang === 'en' ? 'en' : 'fr';
let donnees = null;

const $ = (s) => document.querySelector(s);

/** Crée un élément : h('a', { class: 'x', href }, enfant1, 'texte'…) — jamais d'innerHTML pour les données. */
function h(tag, attrs, ...enfants) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) {
    if (e === null || e === undefined || e === false) continue;
    el.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
  return el;
}

/** Texte lu par les lecteurs d'écran seulement (ex. « — Casino Bylux » après « Installer »). */
const cache = (t) => h('span', { class: 'vh' }, ` — ${t}`);

const sur = (url) => (typeof url === 'string' && /^https:\/\//.test(url) ? url : null);
const local = (p) => (typeof p === 'string' && /^[\w./-]+$/.test(p) && !p.includes('..') ? p : null);

function svgFleche() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('width', '18');
  s.setAttribute('height', '18');
  s.innerHTML = '<path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  return s;
}

/* ---------- Textes statiques ---------- */
function traduire() {
  const T = TEXTES[langue];
  racine.lang = langue;
  document.title = T.titre;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = T[el.dataset.t];
    if (v !== undefined) el.innerHTML = v; // textes internes (textes.js), pas de données externes
  });
  const b = $('#langue');
  b.replaceChildren(h('span', { class: 'vh' }, T.basculer + ' '), langue === 'fr' ? 'EN' : 'FR');
  b.removeAttribute('aria-label');
  b.setAttribute('lang', langue === 'fr' ? 'en' : 'fr');
}

/* ---------- Date de mise à jour (lue dans jeux.json) ---------- */
function texteMaj(brut) {
  const T = TEXTES[langue];
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/.exec(String(brut || '').trim());
  if (!m) return brut ? T.maj(String(brut), '') : '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const jour = d.toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' });
  const heure = m[4] ? (langue === 'fr' ? `${+m[4]} h ${m[5]}` : `${m[4].padStart(2, '0')}:${m[5]}`) : '';
  return T.maj(jour, heure);
}

/* ---------- Cartes ---------- */
function carte(j, i, objectif) {
  const T = TEXTES[langue];
  const n = Math.max(0, Number(j.testeurs) || 0);
  const pct = Math.min(100, Math.round((n / objectif) * 100));
  const reste = Math.max(0, objectif - n);
  const premier = i === 0;

  // Visuel : vraie bannière si disponible, sinon l'icône en grand sur un fond flouté.
  const img = local(j.image);
  const icone = local(j.icone);
  let visuel;
  if (img) {
    const petit = img.replace(/-800\.webp$/, '-480.webp');
    visuel = h('img', {
      class: 'carte__banniere', src: img, alt: T.altBanniere(j.nom),
      srcset: petit !== img ? `${petit} 480w, ${img} 800w` : null,
      sizes: petit !== img ? '(min-width: 1100px) 360px, (min-width: 760px) 50vw, 100vw' : null,
      width: 800, height: 391, loading: premier ? 'eager' : 'lazy', decoding: 'async',
      fetchpriority: premier ? 'high' : null,
    });
  } else {
    visuel = h('div', { class: 'carte__fond-icone', style: icone ? `--img:url("${new URL(icone, location.href).href}")` : null },
      icone && h('img', { src: icone, alt: T.altIcone(j.nom), width: 192, height: 192, loading: premier ? 'eager' : 'lazy', decoding: 'async' }));
  }

  const badges = h('div', { class: 'carte__badges' },
    j.age && h('span', { class: 'badge badge--age', 'aria-label': T.ageMin(j.age) }, j.age),
    sur(j.web) && h('span', { class: 'badge badge--web' }, T.badgeWeb));

  const lienInscription = sur(j.inscription);
  const lienPlay = sur(j.play);
  const lienWeb = sur(j.web);

  const etat = n >= objectif ? T.complet : T.reste(reste);

  return h('article', { class: 'carte' + (premier ? ' carte--une' : ''), style: `--i:${i}` },
    h('div', { class: 'carte__media' }, visuel, badges),
    h('div', { class: 'carte__corps' },
      h('div', { class: 'carte__tete' },
        icone && h('img', { class: 'carte__icone', src: icone, alt: '', width: 64, height: 64, loading: premier ? 'eager' : 'lazy', decoding: 'async' }),
        h('div', { class: 'carte__titres' },
          h('h3', { class: 'carte__nom' }, j.nom),
          j.genre && h('p', { class: 'carte__genre' }, j.genre[langue] || j.genre.fr || ''))),
      j.accroche && h('p', { class: 'carte__accroche' }, j.accroche[langue] || j.accroche.fr || ''),
      h('div', { class: 'compteur' },
        h('div', { class: 'compteur__ligne' },
          h('span', { class: 'compteur__nb' }, h('b', {}, `${n}/${objectif}`), ' ', T.testeurs),
          h('span', { class: 'compteur__etat' + (n >= objectif ? ' ok' : '') }, etat)),
        h('div', { class: 'jauge', role: 'progressbar', 'aria-label': T.jauge(j.nom), 'aria-valuemin': 0, 'aria-valuemax': objectif, 'aria-valuenow': Math.min(n, objectif) },
          h('span', { style: `--p:${pct}%` }))),
      h('div', { class: 'actions' },
        lienInscription && h('a', { class: 'btn btn--principal', href: lienInscription, target: '_blank', rel: 'noopener' }, T.btnTesteur, cache(j.nom), svgFleche()),
        lienPlay && h('a', { class: 'btn btn--contour', href: lienPlay, target: '_blank', rel: 'noopener' }, T.btnInstaller, cache(j.nom)),
        lienWeb
          ? h('a', { class: 'btn btn--web', href: lienWeb, target: '_blank', rel: 'noopener' }, h('span', {}, T.btnWebCourt), ' ', h('small', {}, T.btnWebSous), cache(j.nom))
          : h('span', { class: 'btn btn--off', 'aria-disabled': 'true' }, h('span', {}, T.btnWebCourt), ' ', h('small', {}, T.bientot))),
      lienWeb && h('p', { class: 'astuce' }, T.astuceIphone)));
}

function afficher() {
  const boite = $('#cartes');
  if (!donnees) return;
  const objectif = Number(donnees.objectif) || 12;
  const jeux = Array.isArray(donnees.jeux) ? donnees.jeux : [];
  boite.replaceChildren(...jeux.map((j, i) => carte(j, i, objectif)));
  boite.removeAttribute('aria-busy');
  $('#maj').textContent = texteMaj(donnees.maj);
  $('#nb-jeux').textContent = String(jeux.length);
}

function erreur() {
  const T = TEXTES[langue];
  $('#cartes').replaceChildren(h('p', { class: 'erreur' }, T.erreur));
  $('#cartes').removeAttribute('aria-busy');
}

/* ---------- Démarrage ---------- */
traduire();

$('#langue').addEventListener('click', () => {
  langue = langue === 'fr' ? 'en' : 'fr';
  try { localStorage.setItem('bylux-lang', langue); } catch (e) { /* navigation privée */ }
  traduire();
  afficher();
});

// La requête est lancée dès le <head> (index.html) ; repli si ce script tourne seul.
(window.__jeux || fetch('jeux.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))))
  .then((d) => { donnees = d; afficher(); })
  .catch(erreur);
