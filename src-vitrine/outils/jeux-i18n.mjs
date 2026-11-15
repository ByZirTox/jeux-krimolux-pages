// Ajoute les champs v2 à ../testeurs/jeux.json et y fusionne les genres/accroches traduits.
// Ne modifie JAMAIS : nom, paquet, inscription, play, web, testeurs, age, icone, image, maj, objectif.
// Usage : node outils/jeux-i18n.mjs   (traductions lues dans .cache/jeux-i18n/<code>.json : { paquet: { genre, accroche } })
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANGUES } from '../langues.mjs';

const FICHIER = fileURLToPath(new URL('../../testeurs/jeux.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../.cache/jeux-i18n/', import.meta.url));
const avant = JSON.parse(readFileSync(FICHIER, 'utf8'));

const DRAGONNET = {
  nom: 'Dragonnet',
  paquet: 'com.krimolux.dragonnet',
  play: 'https://play.google.com/store/apps/details?id=com.krimolux.dragonnet',
  web: 'https://dragonnet.online/',
  age: null,
  icone: null,
  image: null,
  genre: { fr: 'Survie', en: 'Survival' },
  accroche: { fr: 'Ton petit dragon défend son trésor jusqu’à l’aube.', en: 'Your little dragon guards its treasure until dawn.' },
};

// Ordre des clés : maj, objectif, groupe, production, jeux (le reste est conservé derrière).
const d = { maj: avant.maj, objectif: avant.objectif, groupe: avant.groupe ?? '', production: avant.production ?? [DRAGONNET], jeux: avant.jeux };
for (const [k, v] of Object.entries(avant)) if (!(k in d)) d[k] = v;

const ORDRE = LANGUES.map(([c]) => c);
const trier = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => ORDRE.indexOf(a) - ORDRE.indexOf(b)));
const tous = [...d.production, ...d.jeux];
let n = 0;
if (existsSync(DOSSIER)) {
  for (const f of readdirSync(DOSSIER).filter((x) => x.endsWith('.json'))) {
    const code = f.slice(0, -5);
    if (!ORDRE.includes(code) || code === 'fr' || code === 'en') continue;
    const tr = JSON.parse(readFileSync(DOSSIER + f, 'utf8'));
    for (const j of tous) {
      const x = tr[j.paquet];
      if (!x) continue;
      for (const champ of ['genre', 'accroche']) {
        if (typeof x[champ] !== 'string' || !x[champ].trim()) continue;
        if (typeof j[champ] === 'string') j[champ] = { en: j[champ] };
        if (!j[champ]) continue;
        j[champ][code] = x[champ].trim();
        n++;
      }
    }
  }
}
for (const j of tous) for (const champ of ['genre', 'accroche']) if (j[champ] && typeof j[champ] === 'object') j[champ] = trier(j[champ]);

// Garde-fou : liens et compteurs strictement identiques.
const cle = (j) => JSON.stringify([j.nom, j.paquet, j.inscription, j.play, j.web, j.testeurs, j.age, j.icone, j.image]);
if (JSON.stringify(avant.jeux.map(cle)) !== JSON.stringify(d.jeux.map(cle)) || avant.maj !== d.maj || avant.objectif !== d.objectif) {
  throw new Error('jeux.json : un lien ou un compteur aurait changé, abandon.');
}
writeFileSync(FICHIER, JSON.stringify(d, null, 2) + '\n');
console.log(`jeux.json : ${n} textes traduits fusionnés, ${d.production.length} jeu(x) en production, groupe = "${d.groupe}"`);
