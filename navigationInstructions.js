/* =========================================================
   NAVIGATION INSTRUCTIONS
   ---------------------------------------------------------
   Turns raw A* paths into:
     1. A full shopping ROUTE: Entrance -> every selected
        product -> the chosen Billing Counter.
     2. Turn-by-turn TEXT instructions, phrased the way a person
        actually gives directions ("walk toward", "turn left",
        "collect X"), generated dynamically from the coordinates
        A* returned - nothing here is hard-coded.
   Depends on algorithms/astar.js and data/supermarketMap.js,
   but never touches the DOM.
   ========================================================= */

const DIRECTION_ARROWS = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" };

// Relative-turn lookup: "if I was facing X and I'm now facing
// TURN_RIGHT_OF[X], I turned right" (and the mirror for left turns).
const TURN_RIGHT_OF = { up: "right", right: "down", down: "left", left: "up" };
const TURN_LEFT_OF = { up: "left", left: "down", down: "right", right: "up" };

function directionBetween(from, to) {
  if (to.y < from.y) return "up";
  if (to.y > from.y) return "down";
  if (to.x < from.x) return "left";
  if (to.x > from.x) return "right";
  return null;
}

/**
 * Decides the ORDER in which to visit the selected products, using a
 * greedy "always walk to whichever remaining product is closest"
 * rule (Manhattan Distance), starting from the Entrance.
 *
 * This ONLY decides visiting order, so the route is more efficient
 * than just using click order. It never decides HOW to walk between
 * two points - that is always aStarSearch()'s job.
 */
function orderProductsByNearestNeighbor(startPoint, products) {
  const remaining = [...products];
  const visitOrder = [];
  let current = startPoint;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = manhattanDistance(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = manhattanDistance(current, remaining[i]);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = i;
      }
    }
    const next = remaining.splice(nearestIndex, 1)[0];
    visitOrder.push(next);
    current = next;
  }
  return visitOrder;
}

/**
 * Picks which Billing Counter to head to.
 * @param {{x:number,y:number}} fromPoint  the customer's last stop
 * @param {string} preference  a billing counter id, or "nearest"
 */
function pickBillingCounter(fromPoint, preference) {
  if (preference && preference !== "nearest") {
    const chosen = BILLING_COUNTERS.find((b) => b.id === preference);
    if (chosen) return chosen;
  }
  // "nearest": compare the REAL A* walking distance to every counter -
  // not just the straight-line heuristic - so the choice is accurate.
  let best = null;
  let bestDistance = Infinity;
  BILLING_COUNTERS.forEach((counter) => {
    const path = aStarSearch(SUPERMARKET_GRID, GRID_WIDTH, GRID_HEIGHT, fromPoint, counter);
    if (path && path.length - 1 < bestDistance) {
      bestDistance = path.length - 1;
      best = counter;
    }
  });
  return best || BILLING_COUNTERS[0];
}

/**
 * Builds the full shopping route: Entrance -> product(s) -> Billing
 * Counter. Every leg between two consecutive stops is solved
 * independently with aStarSearch() - this is the actual pathfinding;
 * nothing about the route is hard-coded or faked.
 *
 * @param {Array} selectedProducts   products chosen by the customer
 * @param {string} billingPreference a billing counter id, or "nearest"
 */
function buildShoppingRoute(selectedProducts, billingPreference) {
  const visitOrder = orderProductsByNearestNeighbor(ENTRANCE, selectedProducts);
  const lastStop = visitOrder.length > 0 ? visitOrder[visitOrder.length - 1] : ENTRANCE;
  const billingCounter = pickBillingCounter(lastStop, billingPreference);

  const waypoints = [ENTRANCE, ...visitOrder, billingCounter];
  const legs = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const path = aStarSearch(SUPERMARKET_GRID, GRID_WIDTH, GRID_HEIGHT, from, to);
    if (!path) {
      throw new Error(`No walkable path between (${from.x}, ${from.y}) and (${to.x}, ${to.y})`);
    }
    legs.push({ from, to, path });
    totalDistance += path.length - 1; // number of moves in this leg
  }

  const estimatedMinutes = Math.max(
    1,
    Math.ceil((totalDistance * 1.2 + selectedProducts.length * 12) / 60)
  );

  return { legs, totalDistance, visitOrder, billingCounter, estimatedMinutes };
}

// Concatenates every leg's path into one continuous walk, and records
// which index in that walk corresponds to arriving at each waypoint
// (a product collection point, or the billing counter).
function flattenRoute(route) {
  const fullPath = [route.legs[0].from];
  const waypointAtIndex = new Map();
  route.legs.forEach((leg) => {
    leg.path.slice(1).forEach((point) => fullPath.push(point));
    waypointAtIndex.set(fullPath.length - 1, leg.to);
  });
  return { fullPath, waypointAtIndex };
}

// Finds a human-friendly "toward the X Section" label for a point on
// the path - if the point itself isn't inside a section yet (it's
// still in a corridor), it looks ahead to the next section the path
// actually enters.
function contextLabelForSegment(endPoint, fullPath, endIndex) {
  const zone = zoneContainingPoint(endPoint.x, endPoint.y);
  if (zone) return zone.label;
  for (let i = endIndex; i < fullPath.length; i++) {
    const z = zoneContainingPoint(fullPath[i].x, fullPath[i].y);
    if (z) return z.label;
  }
  return "the Billing area";
}

/**
 * Converts a built route into the turn-by-turn instruction lines shown
 * in the Navigation Guidance panel. Generated purely from the path
 * coordinates A* returned - nothing here is hard-coded.
 */
function generateTextInstructions(route) {
  const { fullPath, waypointAtIndex } = flattenRoute(route);
  const instructions = [{ type: "start", text: "📍 Starting Point: Entrance", position: fullPath[0] }];

  let i = 1;
  let prevDirection = null;

  while (i < fullPath.length) {
    const direction = directionBetween(fullPath[i - 1], fullPath[i]);
    let end = i; // the segment currently reaches fullPath[end]

    // Extend the segment forward while it keeps the same direction.
    // Always stop the instant we land ON a waypoint (even if the
    // direction would otherwise continue), so every product / the
    // billing counter gets its own dedicated arrival line.
    while (!waypointAtIndex.has(end)) {
      const next = end + 1;
      if (next >= fullPath.length) break;
      if (directionBetween(fullPath[end], fullPath[next]) !== direction) break;
      end = next;
    }

    const endPoint = fullPath[end];
    const zoneLabel = contextLabelForSegment(endPoint, fullPath, end);

    let phrase;
    if (prevDirection === null) {
      phrase = `Walk straight toward ${zoneLabel}`;
    } else if (direction === TURN_RIGHT_OF[prevDirection]) {
      phrase = `Turn right toward ${zoneLabel}`;
    } else if (direction === TURN_LEFT_OF[prevDirection]) {
      phrase = `Turn left toward ${zoneLabel}`;
    } else if (direction === prevDirection) {
      phrase = `Continue straight toward ${zoneLabel}`;
    } else {
      phrase = `Turn around toward ${zoneLabel}`;
    }

    instructions.push({
      type: "move",
      direction,
      position: endPoint,
      text: `${DIRECTION_ARROWS[direction]} ${phrase}`,
    });

    prevDirection = direction;

    if (waypointAtIndex.has(end)) {
      const wp = waypointAtIndex.get(end);
      instructions.push(
        wp.kind === "billing"
          ? { type: "arrive-billing", position: wp, billingCounter: wp, text: `💳 Proceed to ${wp.name}.` }
          : { type: "collect", position: wp, product: wp, text: `${wp.icon} Collect ${wp.name} – Shelf ${wp.shelf}` }
      );
    }

    i = end + 1;
  }

  return instructions;
}
