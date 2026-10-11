/* =========================================================
   A* SEARCH ALGORITHM
   ---------------------------------------------------------
   A generic, fully explicit implementation - written to be
   read and explained in a viva, not just used. Every structure
   a textbook description of A* calls for is here by name:

     openSet    nodes discovered but not yet fully evaluated
     closedSet  nodes already fully evaluated (never revisited)
     gScore(n)  the REAL cost of the cheapest path from start to
                n found so far (every grid step costs 1)
     hScore(n)  the ESTIMATED cost from n to the goal, using the
                Manhattan Distance heuristic:
                    h(n) = |n.x - goal.x| + |n.y - goal.y|
                This never OVER-estimates the true remaining
                distance, because movement is restricted to one
                grid step at a time, horizontally or vertically
                (never diagonally) - and that admissibility is
                exactly what makes A* guaranteed to return the
                shortest possible path.
     fScore(n)  = gScore(n) + hScore(n), the estimated total
                cost of any path that goes through n. A* always
                expands whichever open node has the SMALLEST
                fScore next, so the search is pulled directly
                toward the goal instead of spreading out evenly
                in every direction the way plain BFS does.
     cameFrom   records the parent of every visited node, so the
                final path can be rebuilt by walking backwards
                from the goal once it is reached.

   This file only knows about grids and coordinates - it never
   touches the DOM, so it can be tested completely on its own.
   ========================================================= */

// h(n): Manhattan Distance heuristic between two {x, y} points
function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// A unique string key for a coordinate, used to index the Map/Set structures
function keyOf(node) {
  return node.x + "," + node.y;
}

// Only Up / Down / Left / Right - no diagonals. This restriction is what
// keeps Manhattan Distance a valid (admissible) heuristic for this graph.
function getWalkableNeighbors(node, grid, gridWidth, gridHeight) {
  const candidates = [
    { x: node.x, y: node.y - 1, direction: "up" },
    { x: node.x, y: node.y + 1, direction: "down" },
    { x: node.x - 1, y: node.y, direction: "left" },
    { x: node.x + 1, y: node.y, direction: "right" },
  ];
  return candidates.filter(
    (c) => c.x >= 0 && c.x < gridWidth && c.y >= 0 && c.y < gridHeight && grid[c.y][c.x] === 0
  );
}

// Walk backwards through cameFrom to rebuild the start -> goal path
function reconstructPath(cameFrom, current) {
  const path = [current];
  let key = keyOf(current);
  while (cameFrom.has(key)) {
    current = cameFrom.get(key);
    path.unshift(current);
    key = keyOf(current);
  }
  return path;
}

/**
 * Runs A* search between two grid coordinates.
 * @param {number[][]} grid    0 = walkable, 1 = wall / shelf
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} goal
 * @returns {Array<{x:number,y:number}>|null} the path start -> goal
 *          (inclusive of both ends), or null if no path exists.
 */
function aStarSearch(grid, gridWidth, gridHeight, start, goal) {
  const startKey = keyOf(start);
  const goalKey = keyOf(goal);

  const openSet = new Map();   // key -> node, discovered but not yet evaluated
  const closedSet = new Set(); // keys already fully evaluated
  const cameFrom = new Map();  // key -> parent node
  const gScore = new Map();    // key -> g(n)
  const hScore = new Map();    // key -> h(n)
  const fScore = new Map();    // key -> f(n) = g(n) + h(n)

  gScore.set(startKey, 0);
  hScore.set(startKey, manhattanDistance(start, goal));
  fScore.set(startKey, hScore.get(startKey));
  openSet.set(startKey, start);

  while (openSet.size > 0) {
    // Expand whichever open node currently has the smallest f(n).
    // (The store graph is small, so this linear scan is fast; a much
    // larger map would use a min-heap priority queue here instead.)
    let currentKey = null;
    let current = null;
    for (const [key, node] of openSet) {
      if (currentKey === null || fScore.get(key) < fScore.get(currentKey)) {
        currentKey = key;
        current = node;
      }
    }

    if (currentKey === goalKey) {
      return reconstructPath(cameFrom, current); // goal reached
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    for (const neighbor of getWalkableNeighbors(current, grid, gridWidth, gridHeight)) {
      const neighborKey = keyOf(neighbor);
      if (closedSet.has(neighborKey)) continue; // already fully evaluated, skip

      const tentativeG = gScore.get(currentKey) + 1; // every move costs 1

      if (!openSet.has(neighborKey)) {
        openSet.set(neighborKey, neighbor);
      } else if (tentativeG >= gScore.get(neighborKey)) {
        continue; // this is not a better path to the neighbour
      }

      // Best path to this neighbour found so far - record it
      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeG);
      hScore.set(neighborKey, manhattanDistance(neighbor, goal));
      fScore.set(neighborKey, tentativeG + hScore.get(neighborKey));
    }
  }

  return null; // openSet exhausted without ever reaching the goal
}
