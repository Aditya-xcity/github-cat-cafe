# GitHub Cat Café

[Visit the café](https://aditya-xcity.github.io/github-cat-cafe/) · [Try Aditya-xcity](https://aditya-xcity.github.io/github-cat-cafe/?user=Aditya-xcity)

Enter a GitHub username or profile URL and watch its public repositories become cats. Drag or scroll across the continuous map, zoom with the on-screen controls, or use the fullscreen button. Select a cat in the map or search the Cat Directory to jump to its location and open its repository on GitHub. The entrance button returns you to the starting room.

The café follows every page of GitHub's public repository API, including forks and archived projects. New rooms seat up to 12 cats each and extend outward from the entrance, with open space to pan in every direction. Language influences coat color, stars add a collar charm, and archived projects nap. Non-archived projects updated in the past 30 days play with yarn.

## Local development

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The app uses React, TypeScript and Vite. GitHub API access lives in `src/github.ts`, repository mapping in `src/cats.ts`, timing and sound in `src/animation.ts`, and room rendering in `src/Scene.tsx`. Requests are unauthenticated and cached in memory for five minutes. GitHub's public API rate limits apply.

## Deploy to GitHub Pages

1. Run `npm ci` and `npm run build`.
2. Replace the contents of `docs/` with the contents of `dist/` and keep an empty `docs/.nojekyll`.
3. Commit and push to `main`. In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/docs**.
4. Open the Pages URL after the deployment finishes. Add `?user=Aditya-xcity` to open a specific café directly.

Sound starts off. The app respects your system reduced-motion preference. Use Tab to reach the Cat Directory and Enter to open a repository card. Escape closes the card.

Inspired by [Dhruv Sharma's CodeVerse](https://github.com/Dhruv-Sharma29/CodeVerse), which maps GitHub profiles to explorable planetary systems.
