# 8-BIT Quake

Every earthquake on Earth from the last 24 hours, live from the USGS feed, dropped like stones in an 8-bit pond. The map is drawn in NES colors at about 150 pixels on the short side and scaled up with hard edges: Natural Earth land, borders, rivers and cities when zoomed out, OpenStreetMap roads and towns when zoomed in. Personal project.

- **Live URL:** https://8bitquake.pages.dev (once the Pages project is connected, see below)
- **Owner:** Zack Almaguer

## How it is built

One file: `index.html`. HTML, CSS and vanilla JavaScript, no build step, no back end, no database.

It pulls everything from public sources in the browser:

| What | From |
| --- | --- |
| Quakes | USGS summary feeds `all_day` (every 5 min) and `all_hour` (every 60 s) |
| Land and country borders | `world-atlas@2.0.2` on jsDelivr (TopoJSON) |
| Lakes, rivers, state lines, cities | Natural Earth `v5.1.2` GeoJSON on jsDelivr, GitHub raw as fallback |
| Big roads | `data/roads/` in this repo, built from Natural Earth 1:10m roads by `tools/build-roads.js` |
| Towns, close-up roads, villages, streets | OpenStreetMap through public Overpass servers, fetched per grid cell |
| Font | Press Start 2P from Google Fonts |

If USGS does not answer twice in a row, it shows clearly labeled demo quakes along real fault zones. Add `?demo=1` to the URL to force demo mode.

## Controls

- Drag to pan, pinch or scroll to zoom, `+` and `-` buttons.
- Each quake is a triangle. Color and size show magnitude; solid means the last 6 hours, hollow means 6 to 24 hours. Rings mean it shook in the last hour.
- Opens on a title screen that says what this is and where the data comes from. PRESS START to play.
- Tap a triangle to select it. Its card shows magnitude, place, depth, miles from you (great-circle distance from your own location; tap TAP TO SET the first time), and a plain-words line on what it feels like (official USGS intensity wording when USGS has a real reading, otherwise a rough guide from magnitude). While selected it ripples every few seconds. There is no sound or vibration.
- The ticker at the bottom scrolls the 6 newest quakes, with the red 8-BIT QUAKE header (count and biggest today) between them. Tap a quake in it to zoom there; tap the header to open the list.
- **Clock (bottom left):** a 72 second replay of the last 24 hours. Tap again for live.
- **LIST:** biggest 40 quakes in the last 24 hours.
- **USA / WORLD:** jump between views.
- **Gear:** switches for place names, borders, roads, town icons (remembered on this device), the key, how selection works, and credits.
- Menus close with their X, a tap outside, or `Esc`.
- Layout is tailored per device: phones get a bottom card; tablets and desktops get a side panel and a finer map; desktops add a pointer cursor and arrow-key panning.
- Keys: `l` list, `k` settings, `r` replay, `+` and `-` zoom, arrows pan, `Esc` close.

Counts are a rolling 24 hours (the USGS `all_day` feed), not since midnight.

Big roads come from our own files in `data/roads/`: Natural Earth's 1:10m world roads (public domain), cut into 10 degree tiles that load only when the view needs them (1.7 MB for the whole world; a tile is a few KB to 80 KB). Major highways show from about one zoom step past the USA view, secondary highways and main roads a little closer. To rebuild them from a new Natural Earth release, see the comment at the top of `tools/build-roads.js`.

Extra detail comes from OpenStreetMap through the public Overpass servers: town names once you zoom in to about 150 miles across, then all main roads, rivers and villages, then streets. Each grid cell is asked one at a time with a 45 second limit; if one server fails, the next is tried. The map shows no status messages; it just fills in when the data arrives. If Overpass is down, the big roads still show.

All distances and depths are in miles and feet. USGS place names like "283 km E of Levuka" are converted to miles.

Ripple timing lives in the `RIPPLE` object near the top of the script, with a comment on each knob.

"From you" needs a starting point. Tap the FROM YOU box (or the gear, then SET YOUR LOCATION) and either tap USE MY LOCATION, which the phone asks permission for the first time, or type a city and state or a ZIP code, which is looked up with Nominatim (OpenStreetMap's place search). The result is saved on that device only, in `localStorage` key `8bitquake.home`, rounded to about half a mile. A GPS position is never sent anywhere; a typed place is sent to Nominatim to look it up.

## Run it locally

```sh
python3 -m http.server 8787
# open http://localhost:8787
```

Any static server works. Opening the file directly also works in most browsers.

To check layouts on desktop, phones and tablets (iPhone SE to iPad Pro, Android phones and tablets, portrait and landscape): `node tests/devices.js` with the server running. It needs Playwright and uses Chromium emulation, so it does not replace a real look on Safari.

## Deploy

Cloudflare Pages, connected to this GitHub repo. `main` is production; every other branch gets a preview URL.

- Build command: none
- Output directory: `/`

## Where the data lives

Nowhere of ours. All data is fetched live from the public sources above and kept in memory. Nothing is stored or sent anywhere.
