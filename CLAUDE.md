# Quake Pond: project notes

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
- Attribution line (USGS, Natural Earth, OpenStreetMap) must stay visible.

## Current step

First version in the repo. Next: connect the repo to Cloudflare Pages so `main` deploys to `8bitquake.pages.dev`.

## Commands

```sh
python3 -m http.server 8787   # run locally at http://localhost:8787
```

Add `?demo=1` to force demo quakes.
