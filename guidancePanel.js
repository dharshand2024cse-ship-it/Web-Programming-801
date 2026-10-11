/* =========================================================
   GUIDANCE PANEL
   ---------------------------------------------------------
   Pure render functions for the right-hand panel: product
   search results, the shopping list, the turn-by-turn
   guidance list, the route summary, and the product popup.
   Each function is given data and a container element and
   renders into it - app.js owns all state and event wiring.
   ========================================================= */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatRupees(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

// ---------------- Category filter chips ----------------
function renderCategoryChips(container) {
  container.innerHTML = CATEGORY_LIST.map(
    (cat, i) => `<button class="chip-filter${i === 0 ? " active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
  ).join("");
}

// ---------------- Product search results ----------------
function renderProductResults(container, products, shoppingListMap) {
  if (products.length === 0) {
    container.innerHTML = `<p class="empty-hint">No products match your search.</p>`;
    return;
  }
  container.innerHTML = products
    .map((p) => {
      const inList = shoppingListMap.has(p.id);
      return `
        <div class="result-card${inList ? " selected" : ""}" data-id="${p.id}">
          <span class="result-icon">${p.icon}</span>
          <div class="result-info">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${escapeHtml(p.section)} · Shelf ${p.shelf} · ${formatRupees(p.price)}/${escapeHtml(p.unit)}</span>
          </div>
          <button class="chip-btn ${inList ? "added" : ""}" data-add="${p.id}">${inList ? "✓ Added" : "+ Add"}</button>
        </div>`;
    })
    .join("");
}

// ---------------- Shopping list ----------------
function renderShoppingListPanel(container, shoppingListMap) {
  const items = [...shoppingListMap.values()];
  document.getElementById("list-count").textContent = items.length;

  const totalEl = document.getElementById("list-total");
  if (totalEl) {
    const total = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
    totalEl.textContent = formatRupees(total);
  }

  const findRouteBtn = document.getElementById("find-route-btn");
  if (findRouteBtn) findRouteBtn.disabled = items.length === 0;

  if (items.length === 0) {
    container.innerHTML = `<li class="empty-hint">Your list is empty. Search or tap a marker on the map to add items.</li>`;
    return;
  }

  container.innerHTML = items
    .map(
      (it) => `
      <li class="list-item" data-id="${it.product.id}">
        <span class="list-item-icon">${it.product.icon}</span>
        <div class="list-item-info">
          <strong>${escapeHtml(it.product.name)}</strong>
          <span>${escapeHtml(it.product.section)} → Shelf ${it.product.shelf} · ${formatRupees(it.product.price)}</span>
        </div>
        <div class="qty-control">
          <button class="qty-btn" data-qty-down="${it.product.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${it.quantity}</span>
          <button class="qty-btn" data-qty-up="${it.product.id}" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-btn" data-remove="${it.product.id}" aria-label="Remove ${escapeHtml(it.product.name)}">✕</button>
      </li>`
    )
    .join("");
}

// ---------------- Product info popup ----------------
function renderProductPopup(container, product, inList) {
  if (!product) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = `
    <button class="popup-close" id="popup-close-btn" aria-label="Close">✕</button>
    <div class="popup-icon">${product.icon}</div>
    <h3>${escapeHtml(product.name)}</h3>
    <p class="popup-meta">Category: ${escapeHtml(product.category)}</p>
    <p class="popup-meta">Section: ${escapeHtml(product.section)}</p>
    <p class="popup-meta">Shelf: ${product.shelf}</p>
    <p class="popup-price">${formatRupees(product.price)} <span>/ ${escapeHtml(product.unit)}</span></p>
    <button class="btn btn-primary" id="popup-add-btn" data-add="${product.id}">
      ${inList ? "✓ Added to Shopping List" : "+ Add to Shopping List"}
    </button>`;
}

// ---------------- Turn-by-turn guidance ----------------
function renderInstructionsList(container, instructions) {
  container.innerHTML = instructions
    .map((step, index) => `<li class="instruction-step" data-index="${index}">${step.text}</li>`)
    .join("");
}

function updateGuidanceStepIndicator(currentIndex, total) {
  const indicator = document.getElementById("step-indicator");
  if (indicator) indicator.textContent = `Step ${currentIndex + 1} of ${total}`;
  document.querySelectorAll(".instruction-step").forEach((li) => {
    li.classList.toggle("current", Number(li.dataset.index) === currentIndex);
  });
  const currentLi = document.querySelector(`.instruction-step[data-index="${currentIndex}"]`);
  if (currentLi && typeof currentLi.scrollIntoView === "function") {
    try { currentLi.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { /* cosmetic only */ }
  }
}

// ---------------- Route summary ----------------
function renderRouteSummary(container, route, shoppingListMap) {
  const items = [...shoppingListMap.values()];
  container.innerHTML = `
    <h2>📋 Route Summary</h2>
    <div class="summary-grid">
      <div><span class="summary-label">🛒 Products</span><span class="summary-value">${items.length}</span></div>
      <div><span class="summary-label">📍 Start</span><span class="summary-value">Entrance</span></div>
      <div><span class="summary-label">🏁 Destination</span><span class="summary-value">${escapeHtml(route.billingCounter.name)}</span></div>
      <div><span class="summary-label">🤖 Algorithm</span><span class="summary-value">A* Search</span></div>
      <div><span class="summary-label">📐 Heuristic</span><span class="summary-value">Manhattan Distance</span></div>
      <div><span class="summary-label">📏 Total Distance</span><span class="summary-value">${route.totalDistance} steps</span></div>
      <div><span class="summary-label">⏱️ Est. Walking Time</span><span class="summary-value">${route.estimatedMinutes} min</span></div>
      <div><span class="summary-label">💰 Estimated Total</span><span class="summary-value">${formatRupees(items.reduce((s, it) => s + it.product.price * it.quantity, 0))}</span></div>
    </div>`;
}
