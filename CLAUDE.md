# 8bit Quake: project notes

Follow the global `~/.claude/CLAUDE.md`. This file adds what is specific here.

## What this is

A single-file static site (`index.html`) that shows live USGS earthquakes as ripples on an 8-bit world map. Personal project, Cloudflare Pages project `8bitquake`, served at `8bitquake.pages.dev`.

## Decided

- Single HTML file, no build step, no Worker, no D1, KV or R2. Nothing to store.
- NES palette only (the `NES` object). All drawing goes into a small buffer (`SHORT = 150` pixels on the short side) and is scaled up with `image-rendering: pixelated`.
- Map data: Natural Earth (world-atlas TopoJSON plus Natural Earth GeoJSON) when zoomed out, OpenStreetMap via Overpass when zoomed in, in three zoom tiers (`TIERS`).
- Overpass is a shared public service. Keep queries per cell, only after the view settles, one at a time, with backoff and server rotation. Do not make it chattier.
- USGS polling: `all_day` every 5 minutes, `all_hour` every 60 seconds. USGS does not update faster.
- Demo quakes only when USGS fails, always labeled DEMO.
- Default home spot is Hurricane, UT.
- Units are miles and feet only, never km. `toMiles()` rewrites USGS place strings.
- Quakes are triangles colored by magnitude (`magColor`, `triSize`); solid under 6 hours old, hollow after. The KEY sheet draws its legend with the same `tri()` function so they always match.
- No HUD box. 8BIT QUAKE, the count and top quake live in the ticker in red, between the newest quakes. Ticker rebuilds only when a loop ends so it never jumps.
- Switches (labels, borders, roads, town icons, vibrate) are saved in localStorage `quakepond.layers`.
- Ripple timing knobs are all in `RIPPLE`.
- No audio at all; it was removed on purpose. A selected quake repeats its ripple (`RIPPLE.selectedEvery`) and buzzes the phone once per burst via `navigator.vibrate` (Android only), switchable in the gear menu.
- Card has a "feels like" line (`feelFor`): USGS MMI wording when `mmi >= 2` or `cdi` from 3+ reports, else a magnitude guide. Remote ocean quakes report near-zero intensity, so low values are ignored.
- Controls: LIST, USA/WORLD and a gear top right; replay clock bottom left; zoom bottom right. Icons are pixel art in `ICONS`, rendered by `pixSvg()`.
- Credits live in the gear menu and the title screen. A small "© OPENSTREETMAP" stays on the map whenever OSM data can be on screen, because OSM requires visible attribution.
- Name is "8bit Quake", written 8BIT QUAKE on screen. Never "Quake Pond" (old name). The localStorage key `quakepond.layers` keeps the old name on purpose so saved settings survive.
- Title screen shows on every visit. Not an earthquake warning; the safety lines are red with a red caution triangle (`ICONS.warn`).
- Count wording is "IN 24H", never "today": the feed is a rolling 24 hours.
- Attribution line (USGS, Natural Earth, OpenStreetMap) must stay visible.

## Current step

Live at `8bitquake.pages.dev` from `main`. Bigger changes go to a branch first for a Pages preview, and merge after Zack checks it.

## Commands

```sh
python3 -m http.server 8787   # run locally at http://localhost:8787
```

Add `?demo=1` to force demo quakes.
