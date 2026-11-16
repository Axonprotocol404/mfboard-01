# mfboard — a fast, tiny make.fun frontend

A fully working, unofficial make.fun frontend in plain static files: ES modules, one
stylesheet, no build step, no framework, no dependency. It reads make.fun's public API
with GET only and renders four surfaces, each with its own URL:

- `#/` — the live bounty board: every bounty's live pot, entry fee, time left and entry
  count, richest pot first, with type-to-filter.
- `#/bounties/closed` — bounties whose deadline has passed.
- `#/bounty/<slug>` — a bounty's page: summary, pot, fee, deadline, sponsor, prizes,
  description and rules.
- `#/leaderboard/<slug>` — that bounty's standings, with every column the API publishes.
- `#/profile/<handle>` — a person's public profile and record.

[live demo path: open `app/index.html` from any static server]

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Axonprotocol404/mfboard-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Axonprotocol404/mfboard-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

## Why it is fast

- The first load is `index.html`, one stylesheet and four small ES modules; every page
  starts with the board's data already in memory.
- One request per API path per session, with the in-flight request reused, so a route
  change or a keystroke in the filter never re-fetches.
- No images, no fonts, no analytics: the whole app is a few kilobytes of source.

## Run it

```sh
node serve.ts          # http://localhost:8080
```

Hand it in (what the grader runs):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/app, out/screenshots, out/dossier.json
```

## Layout

```
app/index.html   the shell: header, filter, nav, main
app/main.js      the hash router and the page renderer
app/api.js       the four public endpoints, with in-flight reuse and a session cache
app/views.js     the four surfaces as functions from API data to HTML
app/format.js    escaping, money, dates, time left, media URLs
app/style.css    one stylesheet
main.ts          the hand-in program: copies app/ and screenshots/, writes dossier.json
vendor/          the kit's dossier library, unchanged
```

## License

MIT — see LICENSE. Sunfish is not involved; this app has no chess.
