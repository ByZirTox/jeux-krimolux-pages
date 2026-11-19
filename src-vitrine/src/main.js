import { LANGUES, RTL, COMPLEXES, EN } from 'virtuel:langues';
import { IMAGES } from 'virtuel:images';

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

/** Images facultatives présentes au build (public/images/) : on ne référence jamais un fichier absent. */
const DISPO = new Set(IMAGES);
const dispo = (p) => (DISPO.has(p) ? p : null);
/** Identifiant court d'un jeu, tiré du nom de son icône (icones/casino.webp → casino). */
const slug = (j) => { const m = /^icones\/([\w-]+)\.webp$/.exec(j.icone || ''); return m ? m[1] : null; };
/** Une date « maj » de plus de 3 jours n'est plus affichée (des chiffres vieux font douter de la page). */
const MAJ_MAX_JOURS = 3;

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
/** Petit trophée (« Objectif atteint ») : image commandée si elle existe, sinon dessin vectoriel. */
function trophee() {
  const img = dispo('images/objectif-atteint.webp');
  if (img) return h('img', { class: 'trophee', src: img, alt: '', width: 20, height: 20, decoding: 'async' });
  return svg('<path d="M7 4h10v4.5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 13.5V17m-3.5 3h7l-.8-3H9.3z" fill="currentColor"/>', 18, 'trophee');
}

/* ---------- Pictos des étapes : images commandées si elles existent, sinon les dessins actuels ---------- */
const PICTOS = { groupe: 'etape-groupe', testeur: 'etape-testeur', installe: 'etape-installe', avis: 'etape-garde' };
for (const [etape, nom] of Object.entries(PICTOS)) {
  const img = dispo(`images/${nom}.webp`);
  const picto = document.querySelector(`.etape[data-etape="${etape}"] .picto`);
  if (img && picto) picto.replaceChildren(h('img', { src: img, alt: '', width: 56, height: 56, decoding: 'async' }));
}

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
// Affichage discret : « Compteurs mis à jour : 17/11 · Google Play ». Caché si la date a plus de MAJ_MAX_JOURS jours.
function texteMaj(brut) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/.exec(String(brut || '').trim());
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  if (Date.now() - d.getTime() > MAJ_MAX_JOURS * 864e5) return '';
  let date;
  try { date = new Intl.DateTimeFormat(langue, { day: 'numeric', month: 'numeric' }).format(d); } catch (e) { date = d.toLocaleDateString(); }
  return `${t('maj', { date })} · Google Play`;
}

/* ---------- Cartes ---------- */
/** Bannière du jeu : champ "image" de jeux.json, sinon images/<jeu>-800.webp si elle a été livrée. */
const banniere = (j) => local(j.image) || (slug(j) && dispo(`images/${slug(j)}-800.webp`)) || null;

/** Repli sans bannière : bandeau décoratif aux couleurs du studio, sans icône ni texte (l'icône est juste en dessous). */
const repli = () => h('div', { class: 'carte__repli', 'aria-hidden': 'true' });

/** Zone visuelle de la carte (bannière ou repli) + badges. */
function media(j, premier, badges) {
  const img = banniere(j);
  const zone = h('div', { class: 'carte__media' + (img ? '' : ' carte__media--sans') });
  if (img) {
    const petit = img.replace(/-800\.webp$/, '-480.webp');
    const aPetit = petit !== img && (DISPO.has(petit) || !DISPO.has(img));
    const el = h('img', {
      class: 'carte__banniere', src: img, alt: t('altBanniere', { nom: j.nom }),
      srcset: aPetit ? `${petit} 480w, ${img} 800w` : null,
      sizes: aPetit ? '(min-width: 1100px) 360px, (min-width: 760px) 50vw, 100vw' : null,
      width: 800, height: 391, loading: premier ? 'eager' : 'lazy', decoding: 'async', fetchpriority: premier ? 'high' : null,
    });
    // Filet de sécurité : une bannière introuvable laisse place au repli, jamais une image cassée.
    el.addEventListener('error', () => { zone.classList.add('carte__media--sans'); el.replaceWith(repli()); }, { once: true });
    zone.append(el);
  } else {
    zone.append(repli());
  }
  zone.append(h('div', { class: 'carte__badges' }, badges));
  return zone;
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

const idCarte = (j) => (slug(j) ? `jeu-${slug(j)}` : null);

function carteProd(j, i) {
  const lienPlay = sur(j.play);
  const lienWeb = sur(j.web);
  return h('article', { class: 'carte carte--prod' + (banniere(j) ? '' : ' carte--sans-image'), id: idCarte(j), style: `--i:${i}` },
    media(j, i === 0, [
      h('span', { class: 'badge badge--live' }, h('span', { class: 'point', 'aria-hidden': 'true' }), t('enLigne')),
      j.age && h('span', { class: 'badge badge--age', 'aria-label': t('ageMin', { age: j.age }) }, j.age)]),
    h('div', { class: 'carte__corps' },
      tete(j, i === 0),
      h('div', { class: 'actions' },
        lienPlay && h('a', { class: 'btn btn--principal', href: lienPlay, target: '_blank', rel: 'noopener' }, svgPlay(), t('btnPlay'), cache(j.nom)),
        lienWeb && btnWeb(j, lienWeb))));
}

const nbTesteurs = (j) => Math.max(0, Number(j.testeurs) || 0);

/** Ordre d'affichage : d'abord les jeux qui cherchent encore des testeurs (du plus proche de l'objectif au plus loin), les complets à la fin. */
function trier(jeux, objectif) {
  return jeux.map((j, i) => ({ j, i })).sort((a, b) => {
    const ca = nbTesteurs(a.j) >= objectif;
    const cb = nbTesteurs(b.j) >= objectif;
    if (ca !== cb) return ca ? 1 : -1;
    if (!ca && nbTesteurs(a.j) !== nbTesteurs(b.j)) return nbTesteurs(b.j) - nbTesteurs(a.j);
    return a.i - b.i;
  }).map((x) => x.j);
}

function carte(j, i, objectif) {
  const n = nbTesteurs(j);
  const complet = n >= objectif;
  const pct = Math.min(100, Math.round((n / objectif) * 100));
  const reste = Math.max(0, objectif - n);
  const img = banniere(j);
  // Mise en avant : seulement le 1er jeu qui cherche encore des testeurs, et seulement s'il a une vraie bannière.
  const une = i === 0 && !complet && !!img;
  const premier = i === 0;
  const lienInscription = sur(j.inscription);
  const lienPlay = sur(j.play);
  const lienWeb = sur(j.web);
  // Jeu complet : « Installer » devient le bouton plein, « Devenir testeur » passe en contour.
  const btnTesteur = lienInscription && h('a', { class: 'btn ' + (complet ? 'btn--contour' : 'btn--principal'), 'data-etape': 'testeur', href: lienInscription, target: '_blank', rel: 'noopener' }, t('btnTesteur'), cache(j.nom), svgFleche());
  const btnInstaller = lienPlay && h('a', { class: 'btn ' + (complet ? 'btn--principal' : 'btn--contour'), 'data-etape': 'installe', href: lienPlay, target: '_blank', rel: 'noopener' }, complet && svgPlay(), t('btnInstaller'), cache(j.nom));

  return h('article', { class: 'carte' + (une ? ' carte--une' : '') + (complet ? ' carte--complet' : '') + (img ? '' : ' carte--sans-image'), id: idCarte(j), style: `--i:${i}` },
    media(j, premier, [
      j.age && h('span', { class: 'badge badge--age', 'aria-label': t('ageMin', { age: j.age }) }, j.age)]),
    h('div', { class: 'carte__corps' },
      tete(j, premier),
      h('div', { class: 'compteur' },
        h('div', { class: 'compteur__ligne' },
          h('span', { class: 'compteur__nb' }, h('b', { dir: 'ltr' }, `${n}/${objectif}`), ' ', t('testeurs')),
          h('span', { class: 'compteur__etat' + (complet ? ' ok' : '') }, complet && trophee(), complet ? t('complet') : t('reste', { n: reste }))),
        h('div', { class: 'jauge', role: 'progressbar', 'aria-label': t('jauge', { nom: j.nom }), 'aria-valuemin': 0, 'aria-valuemax': objectif, 'aria-valuenow': Math.min(n, objectif) },
          h('span', { style: `--p:${pct}%` }))),
      h('div', { class: 'actions' },
        complet ? [btnInstaller, btnTesteur] : [btnTesteur, btnInstaller],
        btnWeb(j, lienWeb))));
}

/** Rangée d'icônes sous le bouton du héros : un visuel de chaque jeu dès le premier écran, chacune mène à sa carte. */
function iconesHero(jeux) {
  return jeux.filter((j) => local(j.icone)).map((j) => h('li', {},
    h('a', { class: 'hero__jeu', href: idCarte(j) ? `#${idCarte(j)}` : '#jeux' },
      h('img', { src: local(j.icone), alt: j.nom, width: 44, height: 44, decoding: 'async' }))));
}

// « Devenir testeur » et « Installer » sur une carte cochent l'étape correspondante.
$('#cartes').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-etape]');
  if (a) marquer(a.dataset.etape);
});

function afficher() {
  if (!donnees) return;
  const objectif = Number(donnees.objectif) || 12;
  const jeux = trier(Array.isArray(donnees.jeux) ? donnees.jeux : [], objectif);
  const prod = Array.isArray(donnees.production) ? donnees.production : [];
  $('#cartes-prod').replaceChildren(...prod.map(carteProd));
  $('#prod').hidden = !prod.length;
  const cartes = jeux.map((j, i) => carte(j, i, objectif));
  // Séparateur avant les jeux complets (en bas de liste), seulement s'il y a aussi des jeux à compléter.
  const premierComplet = jeux.findIndex((j) => nbTesteurs(j) >= objectif);
  if (premierComplet > 0) cartes.splice(premierComplet, 0, h('p', { class: 'cartes__separateur' }, trophee(), t('complet')));
  $('#cartes').replaceChildren(...cartes);
  $('#cartes').removeAttribute('aria-busy');
  $('#hero-jeux').replaceChildren(...iconesHero([...prod, ...jeux]));
  $('#maj').textContent = texteMaj(donnees.maj);
  $('#nb-jeux').textContent = String(jeux.length);
  majEtapes();
}

function erreur() {
  const illus = dispo('images/erreur-chargement.webp');
  const reessayer = h('button', { class: 'btn btn--contour', type: 'button' }, t('reessayer'));
  reessayer.addEventListener('click', () => {
    $('#cartes').setAttribute('aria-busy', 'true');
    chargerDonnees(json('jeux.json'), json('compteurs.json').catch(() => null));
  });
  $('#cartes').replaceChildren(h('div', { class: 'erreur' },
    illus && h('img', { src: illus, alt: '', width: 240, height: 160, decoding: 'async' }),
    h('p', {}, t('erreur')), reessayer));
  $('#cartes').removeAttribute('aria-busy');
}

/**
 * Compteurs relevés automatiquement : testeurs/compteurs.json (facultatif), format
 *   { "maj": "2026-11-17T08:00", "testeurs": { "com.krimolux.mokaminou": 6, … } }
 * Chaque valeur valide (entier de 0 à 500) remplace le compteur du même paquet dans jeux.json ;
 * "maj" remplace la date. Fichier absent ou invalide : on garde jeux.json tel quel.
 */
function fusionnerCompteurs(d, c) {
  if (!d || !c || typeof c !== 'object' || !c.testeurs || typeof c.testeurs !== 'object') return d;
  const ok = (v) => Number.isInteger(v) && v >= 0 && v <= 500;
  let n = 0;
  const jeux = (Array.isArray(d.jeux) ? d.jeux : []).map((j) => {
    const v = c.testeurs[j.paquet];
    if (!ok(v)) return j;
    n++;
    return Object.assign({}, j, { testeurs: v });
  });
  if (!n) return d;
  return Object.assign({}, d, { jeux, maj: typeof c.maj === 'string' && c.maj.trim() ? c.maj : d.maj });
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

function chargerDonnees(jeux, compteurs) {
  Promise.all([jeux, compteurs])
    .then(([d, c]) => textes.catch(() => null).then(() => { donnees = fusionnerCompteurs(d, c); afficher(); }))
    .catch(() => textes.catch(() => null).then(erreur));
}
chargerDonnees(window.__jeux || json('jeux.json'), (window.__compteurs || json('compteurs.json')).catch(() => null));
