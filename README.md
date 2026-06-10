# Wrecking Ball Golf

Petit prototype web de jeu physique : du mini-golf en 2D, mais la balle est une boule de démolition attachée à une corde.

Le joueur tire la boule comme un pendule, relâche, casse des obstacles, rebondit sur des bumpers et essaie de finir dans le trou avec le moins de coups possible.

## Stack

- Vite
- React
- TypeScript
- Matter.js
- CSS simple, responsive
- GitHub Pages via GitHub Actions

## Commandes

```bash
npm install
npm run dev
npm run lint
npm run e2e
npm run build
npm run preview
```

`npm run lint` exécute une vérification TypeScript sans build navigateur.

`npm run e2e` lance les tests Playwright (navigateur Chromium) avec un serveur local.

## Gameplay actuel

- Drag souris/touch sur la boule pour charger le swing.
- Relâche pour lancer.
- `Reset` recharge le niveau courant.
- `Skip niveau` / `Niveau suivant` passe au niveau suivant.
- 3 niveaux courts : tuto, mur destructible, obstacle mobile.
- Score, coups, blocs cassés et feedback texte.

## Production

URL GitHub Pages attendue :

```txt
https://tgrozner.github.io/wrecking-ball-golf-web/
```

Le workflow `.github/workflows/deploy.yml` build automatiquement sur chaque push vers `main` et déploie le dossier `dist` via GitHub Pages.

Dans les réglages du repo, GitHub Pages doit utiliser la source **GitHub Actions**.

## Contribuer

- Installe proprement avec `npm ci` en CI (le dépôt contient maintenant un lockfile) ou `npm install` en local.
- En cas de doute sur la stabilité de `npm install`, exécute `npm install --package-lock-only` pour ré-générer le `package-lock.json`.

## Roadmap courte

- Ajouter un vrai menu de sélection de niveaux.
- Ajouter des sons courts pour swing, bumper, casse et trou.
- Ajouter plus de niveaux avec rampes, portails et obstacles destructibles variés.
- Ajouter un best score local avec `localStorage`.
- Améliorer les particules et les effets d’impact.
