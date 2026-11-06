// World coordinates are native art pixels; rendering and navigation share this map.
export const WORLD = { width: 1536, height: 1024 };
export const SPAWN = { x: 758, y: 626 };
export const POND = { x: 1136, y: 716, rx: 127, ry: 87 };
export const SPECIES = {
  oak: { name: 'Cổ thụ', width: 184, height: 202, radius: 17 },
  pine: { name: 'Thông', width: 130, height: 216, radius: 12 },
  willow: { name: 'Liễu rủ', width: 194, height: 192, radius: 16 },
};
export function random(seed) {
  let n = seed >>> 0;
  return () => { n = Math.imul(n, 1664525) + 1013904223 >>> 0; return n / 4294967296; };
}
export function createForestWorld() {
  const rows = [
    ['oak', 160, 194, 1.25], ['pine', 365, 168, .95], ['oak', 588, 185, 1.1], ['oak', 889, 210, 1.45], ['pine', 1160, 180, 1.05], ['willow', 1390, 230, 1.1],
    ['pine', 80, 380, 1.15], ['willow', 287, 372, 1], ['pine', 518, 355, 1.08], ['pine', 685, 345, .88], ['willow', 1075, 385, 1.05], ['oak', 1290, 416, 1.12], ['pine', 1480, 440, .95],
    ['oak', 165, 570, 1.25], ['pine', 409, 505, .9], ['oak', 575, 548, 1.05], ['oak', 984, 550, 1.15], ['pine', 1445, 633, 1.1],
    ['pine', 61, 750, 1], ['willow', 310, 780, 1.12], ['oak', 510, 770, 1.2], ['pine', 896, 781, .94], ['willow', 1045, 830, .95], ['willow', 1370, 800, 1.2],
    ['oak', 151, 965, 1.1], ['pine', 430, 983, .98], ['willow', 615, 993, 1], ['oak', 938, 1020, 1.1], ['pine', 1150, 994, 1.18], ['oak', 1502, 1020, 1.3],
    ['pine', 75, 105, .8], ['pine', 1450, 80, 1], ['oak', 1530, 300, .95], ['pine', 25, 988, 1.2],
  ];
  return { ...WORLD, spawn: { ...SPAWN }, pond: { ...POND }, trees: rows.map(([type, x, y, scale], i) => ({ type, x, y, scale, seed: i * 37 + 11, radius: SPECIES[type].radius * scale })) };
}
export function isWalkable(world, x, y, radius = 7) {
  if (x < 24 || y < 24 || x > world.width - 24 || y > world.height - 24) return false;
  if (((x - world.pond.x) / (world.pond.rx + radius + 5)) ** 2 + ((y - world.pond.y) / (world.pond.ry + radius + 5)) ** 2 < 1) return false;
  return !world.trees.some(t => Math.hypot(x - t.x, (y - t.y) * 1.3) < t.radius + radius);
}
export function moveExplorer(world, player, dx, dy) {
  // Resolve one axis at a time so the explorer slides along roots and shores.
  if (isWalkable(world, player.x + dx, player.y)) player.x += dx;
  if (isWalkable(world, player.x, player.y + dy)) player.y += dy;
}
export function findPath(world, from, to) {
  if (!isWalkable(world, to.x, to.y)) return [];
  const cell = 20, cols = Math.ceil(world.width / cell), rows = Math.ceil(world.height / cell);
  const key = (x, y) => y * cols + x;
  const center = k => ({ x: (k % cols) * cell + cell / 2, y: Math.floor(k / cols) * cell + cell / 2 });
  const start = key(Math.floor(from.x / cell), Math.floor(from.y / cell));
  const goal = key(Math.floor(to.x / cell), Math.floor(to.y / cell));
  const goalPoint = center(goal);
  if (!isWalkable(world, goalPoint.x, goalPoint.y)) return [];
  const open = new Set([start]), came = new Map(), scores = new Map([[start, 0]]), closed = new Set();
  const heuristic = k => { const p = center(k); return Math.abs(p.x - goalPoint.x) + Math.abs(p.y - goalPoint.y); };
  while (open.size) {
    let current, best = Infinity;
    for (const k of open) { const score = scores.get(k) + heuristic(k); if (score < best) { best = score; current = k; } }
    if (current === goal) {
      const path = [to];
      while (current !== start) { path.unshift(center(current)); current = came.get(current); }
      // Include the start-cell center to avoid cutting diagonally through a root.
      path.unshift(center(start));
      return path;
    }
    open.delete(current); closed.add(current);
    const cx = current % cols, cy = Math.floor(current / cols);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || closed.has(k)) continue;
      const p = center(k), middle = center(current);
      if (!isWalkable(world, p.x, p.y) || !isWalkable(world, (p.x + middle.x) / 2, (p.y + middle.y) / 2)) continue;
      const score = scores.get(current) + cell;
      if (score >= (scores.get(k) ?? Infinity)) continue;
      came.set(k, current); scores.set(k, score); open.add(k);
    }
  }
  return [];
}
