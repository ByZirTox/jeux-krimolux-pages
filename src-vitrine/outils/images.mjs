// Convertit les vraies bannières des jeux (dépôts du KVM) en WebP légers pour la vitrine.
// Usage : npm run images   (à relancer seulement si une bannière change)
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = homedir();
const ici = dirname(fileURLToPath(import.meta.url));
const sortie = join(ici, '..', 'public', 'images');
mkdirSync(sortie, { recursive: true });

const BANNIERES = {
  casino: `${H}/vitrine-assets/casino-banniere.png`,
  bazaar: `${H}/vitrine-assets/bazaar-banniere.png`,
  bastion: `${H}/dernier-bastion/store/banniere-en-IN.png`,
  abyss: `${H}/pecheur-des-abysses/store/banniere-en-US.png`,
  evasion: `${H}/evasion-idle/store/banniere-1024x500.png`,
  moka: `${H}/moka-minou/store/banniere-1024x500.png`,
  gunlight: `${H}/gunlight/store/banniere-1024-500.png`,
};
const LARGEURS = [480, 800];
const MAX = 120 * 1024;

for (const [nom, src] of Object.entries(BANNIERES)) {
  for (const l of LARGEURS) {
    const dest = join(sortie, `${nom}-${l}.webp`);
    let q = 74;
    do {
      await sharp(src).resize({ width: l }).webp({ quality: q, effort: 6 }).toFile(dest);
      q -= 6;
    } while (statSync(dest).size > MAX && q > 30);
    console.log(dest, Math.round(statSync(dest).size / 1024) + ' Ko');
  }
}

// Logo Bylux Studio (vrai logo du dépôt stone-to-stars)
for (const l of [96, 192]) {
  const dest = join(sortie, `logo-bylux-${l}.webp`);
  await sharp(`${H}/stone-to-stars/branding/bylux-studio-logo.png`).resize(l, l).webp({ quality: 82 }).toFile(dest);
  console.log(dest, Math.round(statSync(dest).size / 1024) + ' Ko');
}
