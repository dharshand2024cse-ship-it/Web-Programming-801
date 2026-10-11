/* =========================================================
   SUPERMARKET MAP
   ---------------------------------------------------------
   Defines the store as a set of rectangular SECTIONS (zones)
   arranged on an internal walkable graph/grid, plus the fixed
   Entrance and Billing Counter locations.

   IMPORTANT: this internal grid is only used by the A* engine.
   The screen never draws it as squares/cells - mapRenderer.js
   paints soft rounded "sections" and a route line on top of it
   instead, so the customer only ever sees a Google-Maps-style
   floor plan.

   GRAPH RULES (feeds algorithms/astar.js)
     - Each cell is either 0 (walkable floor) or 1 (a shelf /
       wall - blocked).
     - Movement is only ever Up / Down / Left / Right.
   ========================================================= */

// ---- Layout constants (all in "grid units") ----
const ZONE_COLS = 4;
const ZONE_ROWS = 3;
const ZONE_W = 6;          // width of one section, in grid units
const ZONE_H = 5;          // height of one section, in grid units
const CORRIDOR = 3;        // width of the walking aisles between sections
const OUTER_MARGIN = 3;    // corridor width around the left/right edge
const TOP_MARGIN = 4;      // depth of the entrance lobby
const BOTTOM_MARGIN = 5;   // depth of the billing lobby

const GRID_WIDTH = OUTER_MARGIN + ZONE_COLS * ZONE_W + (ZONE_COLS - 1) * CORRIDOR + OUTER_MARGIN;
const GRID_HEIGHT = TOP_MARGIN + ZONE_ROWS * ZONE_H + (ZONE_ROWS - 1) * CORRIDOR + BOTTOM_MARGIN;

// Pixel size of one grid unit when the map is drawn (see mapRenderer.js)
const CELL_PX = 20;
const MAP_PIXEL_WIDTH = GRID_WIDTH * CELL_PX;
const MAP_PIXEL_HEIGHT = GRID_HEIGHT * CELL_PX;

function colX(col) {
  return OUTER_MARGIN + col * (ZONE_W + CORRIDOR);
}
function rowY(row) {
  return TOP_MARGIN + row * (ZONE_H + CORRIDOR);
}

// ---- The 11 sections (+ 1 open trolley bay) laid out in a 4x3 table ----
const ZONES = [
  { id: "grocery",  label: "Grocery & Staples",   category: "Grocery",       col: 0, row: 0, icon: "🌾", fill: "#F3E3B8", accent: "#B9861F" },
  { id: "masala",   label: "Masala & Spices",     category: "Masala",        col: 1, row: 0, icon: "🌶️", fill: "#F6D3C4", accent: "#C85A28" },
  { id: "snacks",   label: "Snacks",              category: "Snacks",        col: 2, row: 0, icon: "🍿", fill: "#FCEBB0", accent: "#C99416" },
  { id: "beverages",label: "Beverages",           category: "Beverages",     col: 3, row: 0, icon: "🥤", fill: "#D3EFE6", accent: "#1F8F6E" },
  { id: "dairy",    label: "Dairy",               category: "Dairy",         col: 0, row: 1, icon: "🥛", fill: "#DCEEF7", accent: "#2E7D9C" },
  { id: "fruits",   label: "Fruits",               category: "Fruits",       col: 1, row: 1, icon: "🍎", fill: "#FBDCE0", accent: "#C64764" },
  { id: "vegetables",label:"Vegetables",           category: "Vegetables",   col: 2, row: 1, icon: "🥦", fill: "#E1F0D6", accent: "#548A36" },
  { id: "personal", label: "Personal Care",        category: "Personal Care",col: 3, row: 1, icon: "🧴", fill: "#E9E1F7", accent: "#6E51BE" },
  { id: "cleaning", label: "Home & Cleaning",      category: "Cleaning",     col: 0, row: 2, icon: "🧹", fill: "#DBF1F1", accent: "#288080" },
  { id: "pooja",    label: "Pooja & Traditional",  category: "Pooja",        col: 1, row: 2, icon: "🪔", fill: "#FBE6C2", accent: "#B4750F" },
  { id: "baby",     label: "Baby Care",            category: "Baby Care",    col: 2, row: 2, icon: "👶", fill: "#FCE3ED", accent: "#C55E85" },
  { id: "trolley",  label: "Trolley Bay",          category: null,           col: 3, row: 2, icon: "🛒", fill: "#ECEEED", accent: "#6B7573", decorative: true },
];

const ZONES_BY_ID = {};
ZONES.forEach((z) => (ZONES_BY_ID[z.id] = z));

// ---- Fixed special locations ----
const ENTRANCE = { x: colX(0) - 2, y: 2, name: "Entrance", kind: "entrance" };

const BILLING_COUNTERS = [
  { id: "billing1", name: "Billing Counter 1", x: colX(0) + 2, y: rowY(2) + ZONE_H + 2, kind: "billing" },
  { id: "billing2", name: "Billing Counter 2", x: colX(1) + 2, y: rowY(2) + ZONE_H + 2, kind: "billing" },
  { id: "billing3", name: "Billing Counter 3", x: colX(2) + 2, y: rowY(2) + ZONE_H + 2, kind: "billing" },
  { id: "selfcheckout", name: "Self Checkout", x: colX(3) + 2, y: rowY(2) + ZONE_H + 2, kind: "billing" },
];

// ---- Build the walkable graph/grid ----
// 0 = walkable, 1 = shelf / wall (obstacle)
function buildSupermarketGrid() {
  const grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) grid.push(new Array(GRID_WIDTH).fill(1));

  function carve(x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) grid[y][x] = 0;
      }
    }
  }

  // Horizontal walking aisles (full width): entrance lobby, between rows, billing lobby
  carve(0, 0, GRID_WIDTH, TOP_MARGIN);
  for (let r = 0; r < ZONE_ROWS - 1; r++) carve(0, rowY(r) + ZONE_H, GRID_WIDTH, CORRIDOR);
  carve(0, rowY(ZONE_ROWS - 1) + ZONE_H, GRID_WIDTH, BOTTOM_MARGIN);

  // Vertical walking aisles (full height): outer + between columns
  carve(0, 0, OUTER_MARGIN, GRID_HEIGHT);
  for (let c = 0; c < ZONE_COLS - 1; c++) carve(colX(c) + ZONE_W, 0, CORRIDOR, GRID_HEIGHT);
  carve(colX(ZONE_COLS - 1) + ZONE_W, 0, OUTER_MARGIN, GRID_HEIGHT);

  // Each section's floor, plus one shelf-rack obstacle through its middle
  // (leaves a walkable margin on every side, so the section can never be sealed off)
  ZONES.forEach((zone) => {
    const zx = colX(zone.col);
    const zy = rowY(zone.row);
    carve(zx, zy, ZONE_W, ZONE_H);
    if (!zone.decorative) {
      for (let x = zx + 1; x <= zx + ZONE_W - 2; x++) grid[zy + 2][x] = 1;
    }
  });

  return grid;
}

const SUPERMARKET_GRID = buildSupermarketGrid();

// The open (non-shelf) product slots inside one zone, in a fixed scan order.
// Rows 0,1 then 3,4 relative to the zone's top-left corner (row 2 is the shelf).
function zoneOpenSlots(zone) {
  const zx = colX(zone.col);
  const zy = rowY(zone.row);
  const slots = [];
  [0, 1, 3, 4].forEach((ry) => {
    for (let rx = 0; rx < ZONE_W; rx++) slots.push({ x: zx + rx, y: zy + ry });
  });
  return slots;
}

// Which zone (if any) contains a grid point - used to give navigation
// instructions real "toward the Dairy Section" style context.
function zoneContainingPoint(x, y) {
  return (
    ZONES.find((z) => {
      const zx = colX(z.col);
      const zy = rowY(z.row);
      return x >= zx && x < zx + ZONE_W && y >= zy && y < zy + ZONE_H;
    }) || null
  );
}
