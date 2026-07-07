# 🎵 Sonata Elite — Svelte 5 Edition

Ang buong Sonata Elite mo, converted from single-file vanilla JS papuntang **Svelte 5 + Vite 6 + Tailwind CSS v4** — same stack as Frostify. Lahat ng features intact: dual playback engine (YouTube + Offline Vault), 5-band EQ, live wave visualizer, sleep timer, swipe gestures, drag-to-reorder, backup/restore, Firebase cloud sync, at 4 glassmorphism themes.

## 🚀 Deploy (Spck → GitHub → Actions → Pages)

1. **Push mo lahat ng files** sa isang GitHub repo (e.g. `sonata-elite`), branch `main`.
2. Sa repo: **Settings → Pages → Source: GitHub Actions.**
3. Kopyahin ang icons mo from the old deployment papunta sa `public/icons/`:
   - `icon-192-1.png`, `icon-512.png`, `apple-touch-icon.png`
4. Push. Ang `.github/workflows/deploy.yml` na ang bahala mag-build at mag-deploy.
5. Live na sa `https://reymprime.github.io/sonata-elite/` (o kung ano man ang repo name).

> ⚠️ Hindi na-run ang `npm install` / `npm run build` sa conversion environment (walang network), kaya ang unang Actions run ang magiging first real build. Kung may build error, chances are minor lang (typo-level) — send mo lang sa akin ang Actions log.

## 🧪 Local dev (optional, kung may Node ka via Termux or future iPad)

```bash
npm install
npm run dev      # dev server
npm run build    # production build → dist/
```

## 📂 Structure

```
src/
  main.js                     # Svelte 5 mount
  app.css                     # Tailwind v4 + sonata.css import
  App.svelte                  # layout + all modals + boot logic
  styles/sonata.css           # ORIGINAL 2800-line design system, verbatim
  lib/
    stores/app.svelte.js      # runes state (lib, player, sleep, eq, ui)
    engine.svelte.js          # dual playback engine, EQ, media session, ticker
    actions.svelte.js         # library CRUD, imports, backup, permissions
    gestures.js               # swipe + drag-reorder Svelte actions
    services/idb.js           # IndexedDB Offline Vault
    services/cloud.js         # Firebase sync (optional, CDN dynamic import)
    components/               # Header, Dock, Tabs, LibraryView, TrackStrip...
    components/modals/        # 12 modals (Now Playing, EQ, Sleep, Vault...)
```

## 🔑 Important notes

- **Data carries over.** Same localStorage keys (`sonata_library`, atbp.) at same IndexedDB (`SonataOfflineVault`) — kapag dineploy mo sa **same origin/path** as the old version, buong library, playlists, at offline songs ay dala-dala.
- **YouTube API key** ay nasa `src/lib/actions.svelte.js` (playlist import). I-restrict mo sa `reymprime.github.io/*` sa Google Cloud Console.
- **Firebase** ay optional — placeholder config sa `src/lib/services/cloud.js`. Palitan mo ng totoong config kung gusto mo ng cloud sync; kung hindi, tahimik lang siyang naka-skip.
- Service worker registers **only in production builds** para hindi makasagabal sa dev.
