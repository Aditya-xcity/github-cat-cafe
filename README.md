# Space Cats

[Launch Space Cats](https://aditya-xcity.github.io/github-cat-cafe/) · [Visit Aditya-xcity’s galaxy](https://aditya-xcity.github.io/github-cat-cafe/?user=Aditya-xcity)

Enter a GitHub username or profile URL to turn every public repo into an astronaut cat. Pilot with WASD, drag the map with a mouse or finger, or use the Cat Directory to jump to a repo. Press Space or select **Throw orb** to fire along the ship’s heading. Tap or click a cat to aim at its current position. Cats flee when approached, so lead your throw. The mission counter tracks unique captures for your current visit.

Each sector holds up to 12 cats around a planet. The galaxy includes forks and archived projects, follows GitHub pagination, and keeps repository details available from the Cat Directory before and after a capture.

## Local development

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The app uses React, TypeScript and Vite. GitHub API access lives in `src/github.ts`, repository mapping in `src/cats.ts`, timing and sound in `src/animation.ts`, and galaxy rendering and flight controls in `src/Scene.tsx`. Requests are unauthenticated and cached in memory for five minutes. GitHub's public API rate limits apply.

## Deploy to GitHub Pages

1. Run `npm ci` and `npm run build`.
2. Replace the contents of `docs/` with the contents of `dist/` and keep an empty `docs/.nojekyll`.
3. Commit and push to `main`. In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/docs**.
4. Open the Pages URL after deployment finishes. Add `?user=Aditya-xcity` to open a specific galaxy directly.

Sound starts off. The app respects your system reduced-motion preference. Use Tab to reach the Cat Directory and Enter to open a repository card. Escape closes the card.

Inspired by [Dhruv Sharma's CodeVerse](https://github.com/Dhruv-Sharma29/CodeVerse), which maps GitHub profiles to explorable planetary systems.
