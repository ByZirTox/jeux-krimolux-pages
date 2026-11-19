// Vide ../testeurs/ avant le build, SAUF jeux.json (mis à jour à la main par la session Déploiement)
// et compteurs.json (écrit par la future relève automatique des compteurs ; facultatif).
import { readdirSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = fileURLToPath(new URL('../../testeurs', import.meta.url));
if (!existsSync(dossier)) mkdirSync(dossier, { recursive: true });
for (const f of readdirSync(dossier)) {
  if (f === 'jeux.json' || f === 'compteurs.json') continue;
  rmSync(join(dossier, f), { recursive: true, force: true });
}
if (!existsSync(join(dossier, 'jeux.json'))) {
  console.warn('⚠ testeurs/jeux.json est absent : la page affichera une erreur.');
}
