# AI Shopping Assistant — Smart Mart Indoor Navigator

A fully working Tamil Nadu supermarket indoor-navigation web app: pick products,
and a real **A\* Search** engine plans the shortest walking route through the
store, drawn live on a Google-Maps-style floor plan **and** written out as
dynamic turn-by-turn text — no Google Maps API, no GPS, no hard-coded routes.

## How to run it
No build tools, no server, no internet connection required (Google Fonts is
used for headings but falls back to system fonts instantly if offline).
1. Unzip the project.
2. Double-click `index.html`.

That's it. Everything runs entirely in the browser.

## Why plain JavaScript instead of React/TypeScript?
The original spec's folder layout (`src/algorithms/aStar.ts`, `src/data/products.ts`,
etc.) implies a React + TypeScript + build-tool setup. This project mirrors that
**exact folder structure** with plain `.js` files instead, because it needs to
run by just opening `index.html` — no `npm install`, no build step, nothing
that can fail on exam day. If you need an actual React/TypeScript/Vite version
for submission, ask and it can be converted.

## Project structure
```
ai-shopping-assistant/
├── index.html
├── css/
│   └── style.css                    All styling (fonts fall back gracefully offline)
├── js/
│   ├── data/
│   │   ├── supermarketMap.js        11 sections laid out on a walkable graph/grid,
│   │   │                            Entrance, 4 Billing Counters
│   │   └── products.js              ~90-product Tamil Nadu catalog, positions
│   │                                computed automatically from the section layout
│   ├── algorithms/
│   │   └── astar.js                 The real A* algorithm: open set, closed set,
│   │                                g/h/f scores, parent map, path reconstruction
│   ├── utils/
│   │   └── navigationInstructions.js Multi-stop routing, nearest-billing-counter
│   │                                selection, dynamic turn-by-turn text generation
│   ├── components/
│   │   ├── mapRenderer.js           Builds the SVG floor map, route line, arrows,
│   │   │                            animated marker, zoom/pan
│   │   └── guidancePanel.js         Search/filter/list UI + guidance UI rendering
│   └── app.js                       State + event wiring (the only file that
│                                    reads DOM events)
└── README.md
```

## Algorithm summary (see the in-app "About & Viva Prep" page for the full Q&A)
- **Representation:** the store is a graph/grid (`SUPERMARKET_GRID` in
  `supermarketMap.js`) — `0` = walkable floor, `1` = a shelf/wall. Eleven
  sections sit in a 4×3 table connected by walking corridors; this grid is
  *never* shown to the customer — `mapRenderer.js` draws soft rounded
  sections and a route line on top of it instead.
- **g(n):** real number of steps taken from the Entrance so far.
- **h(n):** Manhattan Distance to the goal, `|dx| + |dy|` — admissible
  because movement is restricted to Up/Down/Left/Right.
- **f(n) = g(n) + h(n):** A* always expands the open-set node with the
  lowest `f(n)` next. `astar.js` keeps an explicit `openSet`, `closedSet`,
  `gScore`, `hScore` and `fScore`, so every structure the algorithm needs
  can be pointed to directly in a viva.
- **Multiple products:** a nearest-neighbour rule decides a sensible
  visiting order from the Entrance; A* then computes the real shortest
  path for every leg (Entrance → P1 → P2 → ... → chosen Billing Counter).
- **Billing counter:** compares the real A* walking distance from the last
  product to all 4 counters and picks the nearest one, unless you pick a
  specific counter from the dropdown (Billing Counter 1 is the default).
- **Text + map, from one source:** the full path A* returns is used twice —
  once to draw the SVG route line/arrows, and once to generate the
  turn-by-turn text (grouping consecutive same-direction moves and
  detecting left/right turns) — so they can never disagree with each other.

## Adding or changing products
Open `js/data/products.js` and add a line to the relevant section's array in
`CATALOG_BY_ZONE`:
```js
grocery: [
  ["Rice", 55, "1 kg", "🌾"],
  ["Poha", 50, "500 g", "🌾"],   // <- new product, shelf/coordinates auto-assigned
  ...
]
```
Each section can hold up to 24 products before running out of shelf slots.

## Test cases to try
Type these into the search box on the **Start Shopping** page:
- Ponni Rice
- Ponni Rice + Milk
- Ponni Rice + Sambar Powder + Milk + Tomato
- Rice + Murukku + Banana Chips + Shampoo + Detergent
- Ponni Rice + Idli Rice + Sambar Powder + Rasam Powder + Milk + Tomato +
  Onion + Shampoo + Detergent + Camphor

The route line, map markers, distance, time estimate, and text instructions
update live for every combination — nothing is pre-computed or faked.
