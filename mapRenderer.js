/* =========================================================
   MAP RENDERER
   ---------------------------------------------------------
   Draws the supermarket as a Google-Maps-style indoor floor
   plan: soft rounded sections, small product-marker pins, a
   drawn route line with direction arrows, and an animated
   customer marker - never the raw pathfinding grid itself.
   Reads data/supermarketMap.js + data/products.js, and reads
   route/instruction objects produced by
   utils/navigationInstructions.js. Never computes a path itself.
   ========================================================= */

let mapViewState = { scale: 1, tx: 0, ty: 0 };

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]));
}

function px(gridUnits) {
  return gridUnits * CELL_PX;
}

function buildZonesSVG() {
  return ZONES.map((zone, index) => {
    const zx = px(colX(zone.col));
    const zy = px(rowY(zone.row));
    const w = px(ZONE_W);
    const h = px(ZONE_H);
    let shelfSVG = "";
    if (!zone.decorative) {
      const sx = px(colX(zone.col) + 1);
      const sy = px(rowY(zone.row) + 2);
      const sw = px(ZONE_W - 2);
      shelfSVG = `<rect class="shelf-block" x="${sx}" y="${sy}" width="${sw}" height="${CELL_PX}" rx="3"/>`;
    }
    return `
      <g class="zone-group${zone.decorative ? " zone-decorative" : ""}" data-zone="${zone.id}" style="animation-delay:${index * 35}ms;transform-origin:${zx + w / 2}px ${zy + h / 2}px">
        <rect class="zone-fill" x="${zx}" y="${zy}" width="${w}" height="${h}" rx="14"
              style="fill:${zone.fill};stroke:${zone.accent}"/>
        ${shelfSVG}
        <text class="zone-label" x="${zx + w / 2}" y="${zy + 15}" style="fill:${zone.accent}">${zone.icon} ${escapeXml(zone.label)}</text>
      </g>`;
  }).join("");
}

function buildFixedMarkersSVG() {
  const entrance = `
    <g class="pin pin-entrance" transform="translate(${px(ENTRANCE.x)},${px(ENTRANCE.y)})">
      <circle r="10" class="pin-halo"/>
      <circle r="6" class="pin-dot"/>
      <text y="-13" class="pin-label">🚪 Entrance</text>
    </g>`;
  const billing = BILLING_COUNTERS.map(
    (b) => `
    <g class="pin pin-billing" data-billing="${b.id}" transform="translate(${px(b.x)},${px(b.y)})">
      <circle r="10" class="pin-halo"/>
      <circle r="6" class="pin-dot"/>
      <text y="-13" class="pin-label">💳 ${escapeXml(b.name)}</text>
    </g>`
  ).join("");
  return entrance + billing;
}

function buildProductMarkersSVG() {
  return PRODUCTS.map((p) => {
    const accent = ZONES_BY_ID[p.zoneId].accent;
    return `<circle class="product-marker" data-product="${p.id}" cx="${px(p.x)}" cy="${px(p.y)}" r="4.2" style="fill:${accent}">
      <title>${escapeXml(p.name)} – ${escapeXml(p.section)}, Shelf ${p.shelf}</title>
    </circle>`;
  }).join("");
}

function routePathD(fullPath) {
  return fullPath.map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x)} ${px(p.y)}`).join(" ");
}

function buildArrowsSVG(instructions) {
  const rotationFor = { up: 0, right: 90, down: 180, left: 270 };
  return instructions
    .filter((step) => step.type === "move")
    .map((step) => {
      const x = px(step.position.x);
      const y = px(step.position.y);
      return `<polygon class="route-arrow" points="0,-5 4,4 -4,4" transform="translate(${x},${y}) rotate(${rotationFor[step.direction]})"/>`;
    })
    .join("");
}

// ---------------- Public API ----------------

function initMap(containerEl) {
  containerEl.innerHTML = `
    <svg id="store-map-svg" viewBox="0 0 ${MAP_PIXEL_WIDTH} ${MAP_PIXEL_HEIGHT}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Supermarket floor map">
      <defs>
        <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect class="map-floor" x="0" y="0" width="${MAP_PIXEL_WIDTH}" height="${MAP_PIXEL_HEIGHT}" rx="18"/>
      <g id="map-viewport">
        <g id="zones-layer">${buildZonesSVG()}</g>
        <g id="route-layer"></g>
        <g id="markers-layer">${buildFixedMarkersSVG()}${buildProductMarkersSVG()}</g>
        <g id="customer-marker-layer"></g>
      </g>
    </svg>`;
  mapViewState = { scale: 1, tx: 0, ty: 0 };
  applyMapViewTransform();
  wireMapPan(document.getElementById("store-map-svg"));
}

function applyMapViewTransform() {
  const g = document.getElementById("map-viewport");
  if (g) g.setAttribute("transform", `translate(${mapViewState.tx},${mapViewState.ty}) scale(${mapViewState.scale})`);
}

function zoomMapBy(factor) {
  mapViewState.scale = Math.min(2.5, Math.max(0.6, mapViewState.scale * factor));
  applyMapViewTransform();
}

function recenterMap() {
  mapViewState = { scale: 1, tx: 0, ty: 0 };
  applyMapViewTransform();
}

function wireMapPan(svgEl) {
  let dragging = false;
  let startX = 0, startY = 0, startTx = 0, startTy = 0;

  svgEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".product-marker, .pin")) return; // let clicks through
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startTx = mapViewState.tx;
    startTy = mapViewState.ty;
    svgEl.classList.add("dragging");
    try { svgEl.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
  });
  svgEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    mapViewState.tx = startTx + (e.clientX - startX);
    mapViewState.ty = startTy + (e.clientY - startY);
    applyMapViewTransform();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
    svgEl.addEventListener(evt, () => {
      dragging = false;
      svgEl.classList.remove("dragging");
    })
  );
}

function wireProductMarkerClicks(handlerFn) {
  const svgEl = document.getElementById("store-map-svg");
  if (!svgEl) return;
  svgEl.addEventListener("click", (e) => {
    const marker = e.target.closest(".product-marker");
    if (marker) handlerFn(marker.dataset.product);
  });
}

function updateMarkerSelection(shoppingListIdSet) {
  document.querySelectorAll(".product-marker").forEach((el) => {
    el.classList.toggle("in-list", shoppingListIdSet.has(el.dataset.product));
  });
}

function clearRouteFromMap() {
  const routeLayer = document.getElementById("route-layer");
  const customerLayer = document.getElementById("customer-marker-layer");
  if (routeLayer) routeLayer.innerHTML = "";
  if (customerLayer) customerLayer.innerHTML = "";
}

function renderRouteOnMap(route, instructions) {
  const { fullPath } = flattenRoute(route);
  const d = routePathD(fullPath);

  document.getElementById("route-layer").innerHTML = `
    <path class="route-line-glow" d="${d}" filter="url(#softGlow)"/>
    <path class="route-line" id="route-line-path" d="${d}"/>
    ${buildArrowsSVG(instructions)}
  `;

  // Draw-in animation: the route visibly traces itself onto the map
  // instead of just appearing. Purely cosmetic - if getTotalLength()
  // isn't available the route still renders correctly, just instantly.
  const routeLineEl = document.getElementById("route-line-path");
  if (routeLineEl && typeof routeLineEl.getTotalLength === "function") {
    try {
      const length = routeLineEl.getTotalLength();
      routeLineEl.style.strokeDasharray = String(length);
      routeLineEl.style.strokeDashoffset = String(length);
      routeLineEl.getBoundingClientRect(); // force a reflow so the transition below actually animates
      requestAnimationFrame(() => { routeLineEl.style.strokeDashoffset = "0"; });
    } catch (err) { /* cosmetic only - safe to skip */ }
  }

  const durationSeconds = Math.max(2.5, route.totalDistance * 0.3).toFixed(2);
  document.getElementById("customer-marker-layer").innerHTML = `
    <g class="customer-marker">
      <circle r="8" class="customer-halo"/>
      <circle r="4.5" class="customer-dot"/>
      <animateMotion id="customer-motion" dur="${durationSeconds}s" fill="freeze" begin="indefinite" path="${d}"/>
    </g>`;
}

function startWalkAnimation() {
  const anim = document.getElementById("customer-motion");
  if (anim && typeof anim.beginElement === "function") {
    try { anim.beginElement(); } catch (err) { /* SMIL not supported - marker just stays put */ }
  }
}
