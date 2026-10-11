/* =========================================================
   APP.JS
   ---------------------------------------------------------
   Owns all application state and wires the map (mapRenderer.js)
   together with the search/list/guidance UI (guidancePanel.js).
   This is the only file that reads DOM events directly; it
   never computes a route itself - that's always
   utils/navigationInstructions.js + algorithms/astar.js.
   ========================================================= */

// ---------------- State ----------------
let shoppingListMap = new Map(); // productId -> { product, quantity }
let currentRoute = null;
let currentInstructions = [];
let currentStepIndex = 0;
let activePopupProductId = null;
let billingPreference = "billing1"; // "Initially, use Billing Counter 1 as the default"
let searchQuery = "";
let activeCategory = "All";
let stepAnimTimer = null;

// ---------------- Derived data ----------------
function getFilteredProducts() {
  const query = searchQuery.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesQuery = query === "" || p.name.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
}

// ---------------- Shopping list mutations ----------------
function invalidateRouteIfShowing() {
  const guidanceVisible = !document.getElementById("panel-navigation-guidance").classList.contains("hidden");
  currentRoute = null;
  if (guidanceVisible) {
    clearRouteFromMap();
    setPanelState("list-builder");
  }
}

function toggleProduct(productId) {
  if (shoppingListMap.has(productId)) {
    shoppingListMap.delete(productId);
  } else {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (product) shoppingListMap.set(productId, { product, quantity: 1 });
  }
  invalidateRouteIfShowing();
  refreshProductResults();
  refreshShoppingList();
  if (activePopupProductId === productId) openProductPopup(productId);
}

function changeQuantity(productId, delta) {
  const entry = shoppingListMap.get(productId);
  if (!entry) return;
  entry.quantity = Math.max(1, Math.min(20, entry.quantity + delta));
  refreshShoppingList();
}

function clearShoppingList() {
  shoppingListMap.clear();
  invalidateRouteIfShowing();
  refreshProductResults();
  refreshShoppingList();
  closeProductPopup();
}

// ---------------- Rendering glue ----------------
function refreshProductResults() {
  const container = document.getElementById("product-results");
  renderProductResults(container, getFilteredProducts(), shoppingListMap);
  container.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleProduct(btn.dataset.add);
    })
  );
  container.querySelectorAll(".result-card").forEach((card) =>
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      openProductPopup(card.dataset.id);
    })
  );
}

function refreshShoppingList() {
  renderShoppingListPanel(document.getElementById("shopping-list"), shoppingListMap);
  document.querySelectorAll("#shopping-list [data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => toggleProduct(btn.dataset.remove))
  );
  document.querySelectorAll("#shopping-list [data-qty-up]").forEach((btn) =>
    btn.addEventListener("click", () => changeQuantity(btn.dataset.qtyUp, 1))
  );
  document.querySelectorAll("#shopping-list [data-qty-down]").forEach((btn) =>
    btn.addEventListener("click", () => changeQuantity(btn.dataset.qtyDown, -1))
  );
  updateMarkerSelection(new Set(shoppingListMap.keys()));
}

// ---------------- Product popup ----------------
function openProductPopup(productId) {
  activePopupProductId = productId;
  const product = PRODUCTS.find((p) => p.id === productId);
  const popupEl = document.getElementById("product-popup");
  renderProductPopup(popupEl, product, shoppingListMap.has(productId));
  const closeBtn = document.getElementById("popup-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeProductPopup);
  const addBtn = document.getElementById("popup-add-btn");
  if (addBtn) addBtn.addEventListener("click", () => toggleProduct(productId));
}

function closeProductPopup() {
  activePopupProductId = null;
  renderProductPopup(document.getElementById("product-popup"), null, false);
}

// ---------------- Panel state (list-builder <-> navigation-guidance) ----------------
function setPanelState(state) {
  document.getElementById("panel-list-builder").classList.toggle("hidden", state !== "list-builder");
  document.getElementById("panel-navigation-guidance").classList.toggle("hidden", state !== "navigation-guidance");
}

function editShoppingList() {
  stopWalkAnimationTimer();
  setPanelState("list-builder");
}

// ---------------- Route calculation ----------------
function findBestRoute() {
  const selected = [...shoppingListMap.values()].map((it) => it.product);
  if (selected.length === 0) return;

  try {
    currentRoute = buildShoppingRoute(selected, billingPreference);
  } catch (err) {
    currentRoute = null;
    showToast("Sorry, we couldn't calculate a route: " + err.message, "error");
    return;
  }

  currentInstructions = generateTextInstructions(currentRoute);
  currentStepIndex = 0;

  renderRouteOnMap(currentRoute, currentInstructions);
  renderInstructionsList(document.getElementById("instructions-list"), currentInstructions);
  updateGuidanceStepIndicator(currentStepIndex, currentInstructions.length);
  renderRouteSummary(document.getElementById("route-summary"), currentRoute, shoppingListMap);

  document.getElementById("shopping-summary").classList.add("hidden");
  setPanelState("navigation-guidance");
  closeProductPopup();
}

function stepGuidance(delta) {
  const next = currentStepIndex + delta;
  if (next < 0 || next >= currentInstructions.length) return;
  currentStepIndex = next;
  updateGuidanceStepIndicator(currentStepIndex, currentInstructions.length);
}

function stopWalkAnimationTimer() {
  if (stepAnimTimer) {
    clearInterval(stepAnimTimer);
    stepAnimTimer = null;
    const btn = document.getElementById("animate-btn");
    if (btn) btn.textContent = "▶ Start Walking Animation";
  }
}

function toggleWalkAnimation() {
  const btn = document.getElementById("animate-btn");
  if (stepAnimTimer) {
    stopWalkAnimationTimer();
    return;
  }
  startWalkAnimation();
  currentStepIndex = 0;
  updateGuidanceStepIndicator(currentStepIndex, currentInstructions.length);
  btn.textContent = "⏸ Stop Animation";
  stepAnimTimer = setInterval(() => {
    if (currentStepIndex >= currentInstructions.length - 1) {
      stopWalkAnimationTimer();
      return;
    }
    currentStepIndex++;
    updateGuidanceStepIndicator(currentStepIndex, currentInstructions.length);
  }, 450);
}

// ---------------- Shopping summary ----------------
function completeShopping() {
  if (!currentRoute) return;
  stopWalkAnimationTimer();
  const items = [...shoppingListMap.values()];
  document.getElementById("summary-product-list").innerHTML = items
    .map((it) => `<li>✓ ${it.product.icon} ${escapeHtml(it.product.name)}${it.quantity > 1 ? ` × ${it.quantity}` : ""}</li>`)
    .join("");
  document.getElementById("summary-distance").textContent = currentRoute.totalDistance;
  document.getElementById("summary-destination").textContent = currentRoute.billingCounter.name;
  const summaryEl = document.getElementById("shopping-summary");
  summaryEl.classList.remove("hidden");
  try { summaryEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { /* cosmetic only */ }
}

// ---------------- Toast notifications ----------------
function showToast(message, type) {
  const container = document.getElementById("toast-container");
  if (!container) return; // cosmetic only - never block the actual flow
  const toast = document.createElement("div");
  toast.className = "toast" + (type === "error" ? " toast-error" : "");
  toast.setAttribute("role", "status");
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ---------------- Section (page) navigation ----------------
function showSection(sectionId) {
  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
  document.querySelectorAll(".nav-link").forEach((btn) => btn.classList.toggle("active", btn.dataset.section === sectionId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- Init ----------------
function init() {
  initMap(document.getElementById("map-container"));
  wireProductMarkerClicks(openProductPopup);

  renderCategoryChips(document.getElementById("category-chips"));
  document.querySelectorAll(".chip-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      document.querySelectorAll(".chip-filter").forEach((b) => b.classList.toggle("active", b === btn));
      refreshProductResults();
    })
  );

  document.getElementById("product-search").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    refreshProductResults();
  });

  document.getElementById("billing-select").addEventListener("change", (e) => {
    billingPreference = e.target.value;
  });

  document.getElementById("clear-list-btn").addEventListener("click", clearShoppingList);
  document.getElementById("find-route-btn").addEventListener("click", findBestRoute);
  document.getElementById("edit-list-btn").addEventListener("click", editShoppingList);
  document.getElementById("prev-step-btn").addEventListener("click", () => stepGuidance(-1));
  document.getElementById("next-step-btn").addEventListener("click", () => stepGuidance(1));
  document.getElementById("animate-btn").addEventListener("click", toggleWalkAnimation);
  document.getElementById("complete-shopping-btn").addEventListener("click", completeShopping);

  document.getElementById("zoom-in-btn").addEventListener("click", () => zoomMapBy(1.25));
  document.getElementById("zoom-out-btn").addEventListener("click", () => zoomMapBy(0.8));
  document.getElementById("recenter-btn").addEventListener("click", recenterMap);

  document.querySelectorAll("[data-section]").forEach((btn) =>
    btn.addEventListener("click", () => showSection(btn.dataset.section))
  );

  const countEl = document.getElementById("products-count");
  if (countEl) countEl.textContent = PRODUCTS.length;

  refreshProductResults();
  refreshShoppingList();
  setPanelState("list-builder");
}

document.addEventListener("DOMContentLoaded", init);
