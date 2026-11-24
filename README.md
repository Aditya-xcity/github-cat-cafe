# Space Cats

Fly through a galaxy where each public GitHub repository is an astronaut cat. Enter a username or GitHub profile URL, or start in the training sector.

## Flight controls

- Use **WASD** or drag the galaxy to fly. On touchscreens, drag to fly and tap to aim.
- Click or tap anywhere in space to throw a Pokéball. Press **Space** or use **Throw** to fire forward.
- Use the map controls to zoom, return to Origin Station, or enter fullscreen.
- Open **Cat Directory** to find repository details or **Collection** to review your captures. Both pause the game. You can also pause from the HUD or turn on sound.

## Capture and combat

A Pokéball must hit the cat first. The ball shakes three times before the capture resolves. An escaped cat sprints away temporarily.

| Rarity | GitHub stars | Base catch chance |
| --- | ---: | ---: |
| Common | 0 | 80% |
| Uncommon | 1–4 | 65% |
| Rare | 5–19 | 45% |
| Epic | 20–49 | 25% |
| Legendary | 50+ | 10% |

A center hit adds 10 percentage points and fleeing subtracts 10. Each miss after a collision adds 5 points to the next capture roll, up to 20. The final chance is limited to 5–95%. A capture earns 10 score points.

Team Rocket first arrives after 45–90 seconds of active exploration. Later encounters start 60–180 seconds after the last encounter ends. Dodge enemy fire and fight back with Pokéballs. Hits deal 15 damage, with a 15% chance of a 30-damage critical hit. Victory earns 50 points, 25 HP, and 10 Pokéballs within the normal limits. Losing restores full health at Origin Station after a four-second countdown.

You carry up to 30 Pokéballs and regenerate one every five seconds while the game is active. The game saves captures, score, and victories in this browser for each GitHub username.

## Development

Run `npm ci` and `npm run dev`. Run `npm run build` to check TypeScript and create the production site in `dist/`. To update GitHub Pages, copy the built assets under `docs/` and update `docs/index.html` together with them. The deployed site uses relative asset URLs.
