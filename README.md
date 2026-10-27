# Quake Pond (8bitquake)

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
| Roads, towns, villages (zoomed in) | OpenStreetMap through public Overpass servers, fetched per grid cell |
| Font | Press Start 2P from Google Fonts |

If USGS does not answer twice in a row, it shows clearly labeled demo quakes along real fault zones. Add `?demo=1` to the URL to force demo mode.

## Controls

- Drag to pan, pinch or scroll to zoom, `+` and `-` buttons.
- Tap a dot for its card (magnitude, place, depth, felt reports, distance from you).
- **LIVE / 24H:** live view, or a 72 second replay of the last 24 hours.
- **SND:** square wave blip for each new quake.
- **LIST:** biggest 40 quakes today.
- **USA / WORLD:** jump between views.
- Keys: `l` list, `r` replay, `s` sound, `Esc` close.

"From you" distance uses Hurricane, Utah by default. It reads an optional override from `localStorage` key `standby.cfg` (`{"lat":..,"lon":..}`).

## Run it locally

```sh
python3 -m http.server 8787
# open http://localhost:8787
```

Any static server works. Opening the file directly also works in most browsers.

## Deploy

Cloudflare Pages, connected to this GitHub repo. `main` is production; every other branch gets a preview URL.

- Build command: none
- Output directory: `/`

## Where the data lives

Nowhere of ours. All data is fetched live from the public sources above and kept in memory. Nothing is stored or sent anywhere.
