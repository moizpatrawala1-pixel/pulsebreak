# Pulsebreak

Pulsebreak is a mobile-first offline arcade runner for short, repeatable sessions. The player dodges lanes, grabs shards, builds combo, unlocks skins, and can use a rewarded revive placement after a failed run.

## Try It

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## What Is Included

- Offline playable game built with HTML, CSS, and Canvas.
- Local save data for account level, XP, coins, cores, fragments, settings, and cosmetics.
- 25-stage run progression with boss/chaos/elite stage types.
- 6 unlockable zones.
- Skill tree, daily login rewards, daily missions, weekly challenges, achievements, ghost runs, friend challenge codes, and share cards.
- 100 in-game skins plus trails, boost effects, menu themes, and sound packs.
- Rewarded-only ad hooks for revive, double rewards, and lucky spin.
- PWA cache for offline play after the first load.
- Capacitor config and package scripts for wrapping into an iOS app.

## Game Loop

- Dodge obstacle patterns across five lanes.
- Collect shards to build score, combo, and boost energy.
- Trigger Boost at full pulse to smash through blockers.
- Spend earned coins on visual skins.
- Daily Run uses a local date seed, so everyone gets the same pattern for that day without needing a server.

## Files

- `index.html` - app shell
- `styles.css` - mobile UI
- `game.js` - gameplay, saves, ad bridge
- `manifest.webmanifest` and `sw.js` - offline/PWA support
- `capacitor.config.json` and `package.json` - native iOS wrapping starting point
- `APP_STORE_AND_ADS.md` - launch, monetization, and compliance notes
