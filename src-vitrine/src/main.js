import { LANGUES, RTL, COMPLEXES, EN } from 'virtuel:langues';

const racine = document.documentElement;
const CODES = LANGUES.map(([c]) => c);
let langue = CODES.includes(racine.lang) ? racine.lang : 'en';
let T = EN; // textes de la langue courante, complétés par l'anglais
let donnees = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/** Texte traduit, avec {variables} ; repli sur l'anglais, jamais sur le français. */
function t(cle, vars) {
  const s = T[cle] ?? EN[cle] ?? '';
  return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] ?? m)) : s;
}
/** Champ multilingue de jeux.json : { "fr": …, "en": …, "de": … } → langue courante, sinon anglais. */
function loc(o) {
  if (typeof o === 'string') return o;
  if (!o || typeof o !== 'object') return '';
  return o[langue] || o[langue.split('-')[0]] || o.en || '';
}

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
const cache = (txt) => h('span', { class: 'vh' }, ` — ${txt}`);

const sur = (url) => (typeof url === 'string' && /^https:\/\//.test(url) ? url : null);
const local = (p) => (typeof p === 'string' && /^[\w./-]+$/.test(p) && !p.includes('..') ? p : null);

function svg(chemin, taille, classe) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('width', taille);
  s.setAttribute('height', taille);
  if (classe) s.setAttribute('class', classe);
  s.innerHTML = chemin;
  return s;
}
const svgFleche = () => svg('<path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', 18, 'fleche-sortie');
const svgPlay = () => svg('<path d="M5 3.5v17l15-8.5z" fill="currentColor"/>', 18);

/* ---------- Parcours en étapes (état mémorisé dans le navigateur) ---------- */
const CLE_ETAPES = 'bylux-etapes';
let faits = {};
try { faits = JSON.parse(localStorage.getItem(CLE_ETAPES)) || {}; } catch (e) { faits = {}; }
function marquer(etape, valeur = true) {
  if (valeur) faits[etape] = 1; else delete faits[etape];
  try { localStorage.setItem(CLE_ETAPES, JSON.stringify(faits)); } catch (e) { /* navigation privée */ }
  majEtapes();
}

function majEtapes() {
  const groupe = sur(donnees && donnees.groupe);
  const lis = $$('.etape');
  lis.forEach((li) => { if (li.dataset.etape === 'groupe') li.hidden = !groupe; });
  if (groupe) $('#btn-groupe').href = groupe;
  const visibles = lis.filter((li) => !li.hidden);
  const n = visibles.length;
  let x = 0;
  visibles.forEach((li, i) => {
    const fait = !!faits[li.dataset.etape];
    if (fait) x++;
    li.classList.toggle('fait', fait);
    li.querySelector('.etape__num').textContent = String(i + 1);
    const b = li.querySelector('.coche');
    b.classList.toggle('coche--on', fait);
    b.querySelector('.coche__txt').textContent = fait ? t('fait') : t('marquer');
    let vh = b.querySelector('.vh');
    if (!vh) b.append(vh = h('span', { class: 'vh' }));
    vh.textContent = ` — ${li.querySelector('h3').textContent}`;
  });
  $('#t-etapes').textContent = t('etapesT', { n });
  $('#progres-txt').textContent = t('progres', { x, n });
  $$('#progres-barre span').forEach((s, i) => {
    s.hidden = i >= n;
    s.classList.toggle('on', !!(visibles[i] && faits[visibles[i].dataset.etape]));
  });
  $('#bravo').hidden = x < n;
  $$('[data-si-groupe]').forEach((el) => { el.hidden = !groupe; });
  $('#r1').innerHTML = t(groupe ? 'r1g' : 'r1');
}

$('#etapes').addEventListener('click', (e) => {
  const coche = e.target.closest('.coche');
  if (coche) {
    const etape = coche.closest('.etape').dataset.etape;
    marquer(etape, !faits[etape]);
    return;
  }
  if (e.target.closest('#btn-groupe')) marquer('groupe');
  if (e.target.closest('#btn-avis')) {
    e.preventDefault();
    const aide = $('#aide');
    aide.open = true;
    const cible = $('#aide-avis');
    cible.classList.remove('eclair');
    void cible.offsetWidth; // relance l'animation
    cible.classList.add('eclair');
    cible.scrollIntoView({ block: 'center' });
    cible.focus({ preventScroll: true });
  }
});

/* ---------- Textes statiques ---------- */
function traduire() {
  racine.lang = langue;
  racine.dir = RTL.includes(langue) ? 'rtl' : 'ltr';
  document.title = t('titre');
  $('meta[name="description"]').setAttribute('content', t('description'));
  $$('[data-t]').forEach((el) => {
    const v = T[el.dataset.t] ?? EN[el.dataset.t];
    if (v !== undefined) el.innerHTML = v; // textes internes (public/langues/*.json, <b> seulement), pas de données externes
  });
  $('#langue').value = langue;
  majEtapes();
}

/* ---------- Date de mise à jour (lue dans jeux.json) ---------- */
function texteMaj(brut) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/.exec(String(brut || '').trim());
  if (!m) return brut ? t('maj', { date: String(brut) }) : '';
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  const opts = { day: 'numeric', month: 'long' };
  if (m[4]) { opts.hour = 'numeric'; opts.minute = '2-digit'; }
  let date;
  try { date = new Intl.DateTimeFormat(langue, opts).format(d); } catch (e) { date = d.toLocaleDateString(); }
  return t('maj', { date });
}

/* ---------- Cartes ---------- */
function visuel(j, premier) {
  const img = local(j.image);
  const icone = local(j.icone);
  const charge = premier ? 'eager' : 'lazy';
  if (img) {
    const petit = img.replace(/-800\.webp$/, '-480.webp');
    return h('img', {
      class: 'carte__banniere', src: img, alt: t('altBanniere', { nom: j.nom }),
      srcset: petit !== img ? `${petit} 480w, ${img} 800w` : null,
      sizes: petit !== img ? '(min-width: 1100px) 360px, (min-width: 760px) 50vw, 100vw' : null,
      width: 800, height: 391, loading: charge, decoding: 'async', fetchpriority: premier ? 'high' : null,
    });
  }
  if (icone) {
    return h('div', { class: 'carte__fond-icone', style: `--img:url("${new URL(icone, location.href).href}")` },
      h('img', { src: icone, alt: t('altIcone', { nom: j.nom }), width: 192, height: 192, loading: charge, decoding: 'async' }));
  }
  // Ni bannière ni icône : fond dégradé + manette (aucun texte dans le visuel).
  const fond = h('div', { class: 'carte__fond-vide', role: 'img', 'aria-label': t('altIcone', { nom: j.nom }) });
  fond.append(svg('<rect x="2.5" y="7" width="19" height="11" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 10.5v4M5.5 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="15.5" cy="11.5" r="1.1" fill="currentColor"/><circle cx="17.8" cy="13.6" r="1.1" fill="currentColor"/>', 96));
  return fond;
}

function tete(j, premier) {
  const icone = local(j.icone);
  return [
    h('div', { class: 'carte__tete' },
      icone && h('img', { class: 'carte__icone', src: icone, alt: '', width: 64, height: 64, loading: premier ? 'eager' : 'lazy', decoding: 'async' }),
      h('div', { class: 'carte__titres' },
        h('h3', { class: 'carte__nom', dir: 'auto' }, j.nom),
        j.genre && h('p', { class: 'carte__genre' }, loc(j.genre)))),
    j.accroche && h('p', { class: 'carte__accroche' }, loc(j.accroche)),
  ];
}

const btnWeb = (j, lien) => (lien
  ? h('a', { class: 'btn btn--web', href: lien, target: '_blank', rel: 'noopener' }, h('span', {}, t('btnWebCourt')), ' ', h('small', { dir: 'ltr' }, t('btnWebSous')), cache(j.nom))
  : h('span', { class: 'btn btn--off', 'aria-disabled': 'true' }, h('span', {}, t('btnWebCourt')), ' ', h('small', {}, t('bientot'))));

function carteProd(j, i) {
  const lienPlay = sur(j.play);
  const lienWeb = sur(j.web);
  return h('article', { class: 'carte carte--prod', style: `--i:${i}` },
    h('div', { class: 'carte__media' }, visuel(j, i === 0),
      h('div', { class: 'carte__badges' },
        h('span', { class: 'badge badge--live' }, h('span', { class: 'point', 'aria-hidden': 'true' }), t('enLigne')),
        j.age && h('span', { class: 'badge badge--age', 'aria-label': t('ageMin', { age: j.age }) }, j.age))),
    h('div', { class: 'carte__corps' },
      tete(j, i === 0),
      h('div', { class: 'actions' },
        lienPlay && h('a', { class: 'btn btn--principal', href: lienPlay, target: '_blank', rel: 'noopener' }, svgPlay(), t('btnPlay'), cache(j.nom)),
        lienWeb && btnWeb(j, lienWeb)),
      lienWeb && h('p', { class: 'astuce' }, t('astuceIphone'))));
}

function carte(j, i, objectif) {
  const n = Math.max(0, Number(j.testeurs) || 0);
  const pct = Math.min(100, Math.round((n / objectif) * 100));
  const reste = Math.max(0, objectif - n);
  const premier = i === 0;
  const lienInscription = sur(j.inscription);
  const lienPlay = sur(j.play);
  const lienWeb = sur(j.web);

  return h('article', { class: 'carte' + (premier ? ' carte--une' : ''), style: `--i:${i}` },
    h('div', { class: 'carte__media' }, visuel(j, premier),
      h('div', { class: 'carte__badges' },
        j.age && h('span', { class: 'badge badge--age', 'aria-label': t('ageMin', { age: j.age }) }, j.age),
        lienWeb && h('span', { class: 'badge badge--web' }, t('badgeWeb')))),
    h('div', { class: 'carte__corps' },
      tete(j, premier),
      h('div', { class: 'compteur' },
        h('div', { class: 'compteur__ligne' },
          h('span', { class: 'compteur__nb' }, h('b', { dir: 'ltr' }, `${n}/${objectif}`), ' ', t('testeurs')),
          h('span', { class: 'compteur__etat' + (n >= objectif ? ' ok' : '') }, n >= objectif ? t('complet') : t('reste', { n: reste }))),
        h('div', { class: 'jauge', role: 'progressbar', 'aria-label': t('jauge', { nom: j.nom }), 'aria-valuemin': 0, 'aria-valuemax': objectif, 'aria-valuenow': Math.min(n, objectif) },
          h('span', { style: `--p:${pct}%` }))),
      h('div', { class: 'actions' },
        lienInscription && h('a', { class: 'btn btn--principal', 'data-etape': 'testeur', href: lienInscription, target: '_blank', rel: 'noopener' }, t('btnTesteur'), cache(j.nom), svgFleche()),
        lienPlay && h('a', { class: 'btn btn--contour', 'data-etape': 'installe', href: lienPlay, target: '_blank', rel: 'noopener' }, t('btnInstaller'), cache(j.nom)),
        btnWeb(j, lienWeb)),
      lienWeb && h('p', { class: 'astuce' }, t('astuceIphone'))));
}

// « Devenir testeur » et « Installer » sur une carte cochent l'étape correspondante.
$('#cartes').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-etape]');
  if (a) marquer(a.dataset.etape);
});

function afficher() {
  if (!donnees) return;
  const objectif = Number(donnees.objectif) || 12;
  const jeux = Array.isArray(donnees.jeux) ? donnees.jeux : [];
  const prod = Array.isArray(donnees.production) ? donnees.production : [];
  $('#cartes-prod').replaceChildren(...prod.map(carteProd));
  $('#prod').hidden = !prod.length;
  $('#cartes').replaceChildren(...jeux.map((j, i) => carte(j, i, objectif)));
  $('#cartes').removeAttribute('aria-busy');
  $('#maj').textContent = texteMaj(donnees.maj);
  $('#nb-jeux').textContent = String(jeux.length);
  majEtapes();
}

function erreur() {
  $('#cartes').replaceChildren(h('p', { class: 'erreur' }, t('erreur')));
  $('#cartes').removeAttribute('aria-busy');
}

/* ---------- Langue ---------- */
const json = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

function appliquer(code, textes) {
  langue = code;
  T = Object.assign({}, EN, textes || {});
  racine.classList.toggle('cplx', COMPLEXES.includes(code));
  traduire();
  afficher();
  racine.classList.remove('attente');
}

$('#langue').addEventListener('change', (e) => {
  const code = CODES.includes(e.target.value) ? e.target.value : 'en';
  try { localStorage.setItem('bylux-lang', code); } catch (err) { /* navigation privée */ }
  (code === 'en' ? Promise.resolve(null) : json(`langues/${code}.json`))
    .then((tx) => appliquer(code, tx))
    .catch(() => appliquer('en', null));
});

/* ---------- Démarrage ---------- */
// Les requêtes sont lancées dès le <head> (index.html) ; repli si ce script tourne seul.
const textes = langue === 'en' ? Promise.resolve(null) : (window.__textes || json(`langues/${langue}.json`));
textes
  .then((tx) => appliquer(langue, tx))
  .catch(() => appliquer('en', null));

(window.__jeux || json('jeux.json'))
  .then((d) => textes.catch(() => null).then(() => { donnees = d; afficher(); }))
  .catch(() => textes.catch(() => null).then(erreur));
