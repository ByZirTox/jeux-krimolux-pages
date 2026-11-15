# Rapport · Vitrine testeurs v2 (branche feat/vitrine-v2)

Demande de Tedy et Krimo (15/11 au soir) : un parcours en 4 étapes simple et joli, une section « Nos jeux en production », et toutes les langues. Rien n'a été poussé : Home relit puis publie.

## Ce qui est fait

### 1. Parcours en étapes (`#parcours`)
- **Étapes** :
  1. Rejoindre le groupe des testeurs Bylux. Bouton « Rejoindre » vers le Groupe Google ; un clic coche l'étape.
  2. Devenir testeur. Le bouton « Choisir un jeu » descend aux cartes, et toucher « Devenir testeur » sur une carte coche l'étape.
  3. Installer depuis Google Play. Toucher « Installer » sur une carte coche l'étape.
  4. Garder le jeu 14 jours et donner son avis. Le bouton « Donner mon avis » ouvre l'aide sur l'explication « Avis privé au développeur ».
- **Tant que `"groupe"` est vide dans `jeux.json`**, l'étape 1 est cachée et le parcours compte 3 étapes, renumérotées 1 → 3. L'aide « Tu as rejoint le groupe ? » est cachée aussi, et la FAQ garde la réponse « liste Gmail ». Dès qu'un lien `https://…` est saisi, la page passe toute seule à 4 étapes, sans rebuild.
- **Chaque étape** a :
  - une grosse icône animée ;
  - un numéro en pastille ;
  - une phrase courte ;
  - un bouton d'action ;
  - un bouton « Marquer comme fait » qui devient « Fait » avec une coche verte (un nouveau toucher décoche).
- **L'état est mémorisé dans le navigateur** (`localStorage` `bylux-etapes`, protégé par try/catch : la page marche en navigation privée ou avec une valeur corrompue).
- **En haut** : une barre de progression en segments (« 2 sur 4 fait ») et un message de fin quand tout est coché.
- **Encadré jaune** sous la barre : « Utilise le MÊME compte Google que sur ton téléphone Android ».
- **Bloc repliable « Ça ne marche pas ? »** : mauvais compte, pas de bouton Installer, groupe pas rejoint, iPhone/PC, comment donner son avis.

### 2. « Nos jeux en production » (`#prod`), au-dessus des jeux en test
- Elle est alimentée par le tableau `"production"` de `jeux.json`. Pour l'instant il ne contient que **Dragonnet** : `com.krimolux.dragonnet`, Google Play et `https://dragonnet.online/`.
- Les cartes ont le même style que les autres, avec un liseré vert et un badge « En ligne ». Elles ont deux boutons, **Google Play** et **Jouer sur le web**, et pas de compteur X/12.
- Si le tableau est vide, la section disparaît.
- **Dragonnet n'a ni icône ni bannière sur le KVM**, et le site n'est pas joignable d'ici. La carte affiche donc un dégradé avec une manette dessinée, sans aucun texte (voir « À remplir par Home »).
- L'accroche vient du README de Dragonnet : « Ton petit dragon défend son trésor jusqu'à l'aube ». Genre : Survie.

### 3. Toutes les langues (46)
- **Langues** : en, fr, de, es, it, pt-BR, pt-PT, nl, pl, ru, uk, tr, ar, he, fa, ur, hi, bn, ta, id, ms, fil, vi, th, zh-CN, zh-TW, ja, ko, sv, da, nb, fi, cs, sk, hu, ro, el, bg, hr, sr (cyrillique), sl, lt, lv, et, ca, sw.
- **Un fichier par langue** : `src-vitrine/public/langues/<code>.json`, copié dans `testeurs/langues/`. Chaque fichier fait 4 à 10 Ko et n'est chargé que pour la langue affichée, en parallèle de `jeux.json`, dès le `<head>`. L'anglais, langue de repli, est intégré au JS.
- **Choix de la langue**, dans l'ordre :
  1. `?lang=xx` ;
  2. le choix mémorisé ;
  3. les langues du navigateur (zh-HK/zh-Hant → zh-TW, pt-PT/pt-BR, nn/no → nb, iw → he…) ;
  4. sinon l'anglais.
- **Sélecteur** : un `<select>` natif avec un globe dans la barre du haut, mémorisé dans le navigateur.
- **Arabe, hébreu, persan, ourdou** : `dir="rtl"`, mise en page en propriétés logiques, flèches retournées. Pour ces langues et pour hi, bn, ta, th, zh, ja, ko : pas d'italique ni d'espacement de lettres (l'espacement casse la liaison de l'arabe).
- **`jeux.json`** : `genre` et `accroche` sont des objets à 46 langues pour les 9 jeux. S'il manque une langue, la page affiche l'anglais, jamais le français.
- **Textes** : phrases courtes rédigées langue par langue, au tutoiement là où il existe. Pour les boutons, la consigne était 18 caractères au plus ; quelques-uns montent à 19 ou 20 (ca, pl, cs, uk, fil). Les noms de marque restent tels quels.
- **À faire relire par un natif si possible** :
  - les libellés propres à Google Play (« Avis privé au développeur », « Appli non disponible ») et à Safari (« Sur l'écran d'accueil »), écrits sans téléphone sous la main ;
  - les genres « Idle » et « Extraction » dans les langues baltes et d'Asie du Sud.

### 4. Technique
- **Fichiers modifiés** :
  - `src-vitrine/index.html`, `src/main.js`, `src/style.css`, `vite.config.js` (module virtuel `virtuel:langues`) ;
  - `langues.mjs` : le registre des langues. Ajouter une langue = une ligne ici plus son JSON.
  - `outils/jeux-i18n.mjs` : ajoute `groupe`/`production` et fusionne les traductions des jeux. Il a un garde-fou : il s'arrête si un lien ou un compteur change.
  - `outils/verifier.mjs` ;
  - `outils/lighthouse.mjs`.
- `textes.js` (FR/EN) est supprimé, remplacé par les JSON.
- **Les cartes hors écran ont un rendu différé** (`content-visibility`).

## Contrôles

`npm run build`, puis `npm run verifier` (Playwright/Chromium, journal complet dans `sortie/v2/verifier.log`) :

- **Fichiers de langue** : 46 fichiers, 69 clés chacun.
  - Aucune clé manquante ou en trop.
  - Mêmes variables `{n}`, `{nom}`… et mêmes balises `<b>` que l'anglais.
  - Aucun caractère de contrôle bidi.
- **FR et EN à 320, 360, 390, 412 et 1280 px** :
  - Zéro erreur ou avertissement console.
  - Aucune requête vers un tiers.
  - Aucun débordement horizontal ni texte coupé.
  - Toutes les cibles font au moins 48 px.
  - Toutes les images sont chargées et ont un alt.
- **Liens et compteurs** : les 8 × 3 liens (inscription, Play, web) et les 8 compteurs sont identiques à la v1 (Lockdown 12/12 → Bazaar 1/12). La carte Dragonnet a ses liens, pas de compteur, et sa section est bien au-dessus des jeux en test.
- **Parcours** :
  - 3 étapes sans groupe, 4 avec un groupe injecté.
  - Le bouton « Rejoindre » pointe vers le groupe.
  - Les coches restent après rechargement.
  - « Devenir testeur » sur une carte coche l'étape 2.
  - « Donner mon avis » ouvre l'aide.
  - On peut décocher.
  - Un `localStorage` corrompu ne provoque aucune erreur.
- **Les 46 langues à 360 px**, plus 320 px pour de, fi, ru, ar, he et ta, FAQ et aide dépliées :
  - Bonne valeur de `lang` et de `dir`, titre traduit.
  - Aucune phrase anglaise de la page restée en place, **aucune phrase française affichée**. La détection compare avec 90 phrases propres au français, en tolérant celles qui s'écrivent pareil dans la langue cible, comme « Casino social » en espagnol.
  - Aucun débordement, y compris en allemand et en RTL.
- **Détection de la langue** : de, pt-PT, pt-BR, zh-TW, zh-HK, zh-CN, nn, es-MX, ar-EG, et une langue inconnue donne l'anglais. Le sélecteur fr → ja reste en ja après rechargement.
- **Poids** :
  - JS : 12,5 Kio, 5,7 Ko gzip (limite : 150 Ko).
  - `index.html` avec le CSS : 11,5 Ko gzip.
  - Fichier de langue : 10 Ko au plus.
  - `jeux.json` : environ 45 Ko, 12 Ko gzip.
- **Lighthouse mobile** (`node outils/lighthouse.mjs` avec `npx vite preview --port 4174 --host 127.0.0.1`) : **Performance 96 à 98, Accessibilité 100, Bonnes pratiques 100**, LCP 0,8 à 0,9 s, CLS 0. Ces scores sont mesurés sur le KVM partagé, chargé par d'autres sessions. Le SEO à 58 est voulu : la page garde `noindex`.
- **Machine partagée** : le vérificateur rend les pages à l'échelle 1× (mise en page identique) avec des délais de 120 s, pour ne pas échouer quand d'autres tests tournent en même temps.

**Captures**, hors commit, dans `~/vitrine-testeurs/sortie/v2/` :
- `vitrine-<l>x<h>-fr|en.png` (page entière) et `…-ecran.png` (premier écran) ;
- `parcours-4-etapes-390-fr.png` (parcours avec groupe, 3 étapes cochées) ;
- `langue-<code>-<largeur>.png` pour de, ar, he, ja, hi, zh-CN, ru, th et toutes les pages à 320 px ;
- `lighthouse-mobile.html`, `verifier.log`.

## À remplir par Home dans `testeurs/jeux.json` (sans rebuild)

1. **`"groupe"`** : coller l'adresse du Groupe Google ouvert, par exemple `"groupe": "https://groups.google.com/g/…"`. Le lien doit commencer par `https://`. La page passe alors toute seule à 4 étapes. Pour revenir à 3 étapes : `"groupe": ""`.
2. **`"production"`** : compléter la liste, un objet par jeu, dans l'ordre d'affichage :
   ```json
   { "nom": "…", "paquet": "com.…", "play": "https://play.google.com/store/apps/details?id=com.…",
     "web": "https://…" ou null, "age": null ou "16+", "icone": "icones/<nom>.webp" ou null,
     "image": "images/<nom>-800.webp" ou null,
     "genre": { "en": "…", "fr": "…" }, "accroche": { "en": "…", "fr": "…" } }
   ```
   - `en` suffit pour que toutes les langues aient un texte : les autres langues prennent l'anglais en attendant. Pour traduire, ajouter les textes dans `src-vitrine/.cache/jeux-i18n/<code>.json` puis lancer `node outils/jeux-i18n.mjs`, ou les écrire à la main.
   - **Icône de Dragonnet** : déposer `src-vitrine/public/icones/dragonnet.webp` (192 px ou plus), plus éventuellement une bannière `public/images/dragonnet-800.webp` et `-480.webp` (`npm run images` sait les produire), puis renseigner `"icone"`/`"image"` et faire `npm run build`.
   - **Attention** : ne pas déposer l'image directement dans `testeurs/icones/`. Le build vide `testeurs/` sauf `jeux.json`.
3. **Inchangé** : `"testeurs": N` et `"maj": "AAAA-MM-JJTHH:MM"` fonctionnent comme avant. La date est désormais affichée au format local de chaque langue.
