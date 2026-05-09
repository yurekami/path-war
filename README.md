# Path War

Google Maps is optimized for reliability, not transparency. It gives you a route, but it does not show you how the routing engine thinks.

We built an interactive real-time shortest-path demo that lets you click two points on a real city map and watch three algorithms race across actual OpenStreetMap road networks: **Dijkstra**, **A\***, and the **Duan et al. 2025** algorithm that [theoretically beats Dijkstra for the first time in decades](https://arxiv.org/abs/2504.17033) (STOC 2025 Best Paper).

The product is both a routing demo and an algorithm visualization. You see search frontiers expand in real time, compare nodes explored, edges relaxed, and total comparisons, and understand why different algorithms choose different paths.

[![demo](https://github.com/user-attachments/assets/placeholder.png)](https://youtu.be/uxJzQmM9u3k)

## Why this exists

Dijkstra's bottleneck is sorting. It repeatedly extracts the minimum-distance node from a priority queue — one at a time, O(log n) per extraction, O(n log n) total.

The Duan et al. algorithm replaces that one-by-one heap process with three ideas:

1. **FindPivots** — k rounds of Bellman-Ford from the frontier discover reachable vertices without sorting
2. **Batch extraction** — quickselect pulls the k smallest-distance nodes in O(frontier_size) instead of k x O(log n)
3. **Batch settlement** — all k nodes settle at once

Total: **O(m log^{2/3} n)** comparisons. On sparse graphs, this is strictly better than Dijkstra. The paper's contribution is proving that Dijkstra is not optimal — a question open since Fredman & Tarjan's Fibonacci heaps in 1984.

This is not trying to beat Google Maps in production routing. Google uses contraction hierarchies with massive precomputation and proprietary infrastructure. Our edge is transparency: we turn one of computer science's most important algorithmic breakthroughs into something people can see, test, and understand on real streets.

## Quick start

```bash
git clone https://github.com/yurekami/path-war.git
cd path-war
npm install
npm run dev
```

Open http://localhost:5173. Click two points on the map. Hit **Run**. Watch three algorithms race.

Road network data is fetched live from the [Overpass API](https://overpass-api.de/) and cached in localStorage.

## The three algorithms

| Algorithm | Year | Complexity | Strategy |
|-----------|------|-----------|----------|
| **Dijkstra** | 1956 | O(m + n log n) | Priority queue, one node at a time |
| **A\*** | 1968 | O(m + n log n) | Heuristic-guided Dijkstra — same worst case, fewer nodes explored |
| **Duan et al.** | 2025 | O(m log^{2/3} n) | Batch frontier processing with quickselect instead of heap extract-min |

Each algorithm runs in a Web Worker so the UI stays responsive. Search frontiers paint the map in real time — red, amber, cyan — across actual streets. The stats panel tracks the paper's key metric: **total comparisons**.

## City presets

Lower Manhattan / Midtown Manhattan / Paris (Latin Quarter) / London (Westminster) / Singapore (Marina Bay)

Bounding boxes are ~3km², keeping graph size around 10-15K intersections — enough for a meaningful demo, fast enough to animate.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Map | MapLibre GL JS | Free WebGL vector tiles, no API key |
| Visualization | deck.gl | GPU-accelerated scatterplot + path layers, 100K+ points at 60fps |
| Algorithms | TypeScript in Web Workers | Non-blocking UI during computation |
| Data | OpenStreetMap via Overpass API | Real road networks, cached locally |
| Framework | Vite + React | Fast HMR, zero config |

## Project structure

```
src/
  algorithms/
    dijkstra.ts          standard Dijkstra with step recording
    astar.ts             A* with haversine heuristic
    batch-sssp.ts        Duan et al. 2025 (simplified faithful impl)
    graph.ts             graph construction, nearest-node, haversine
    min-heap.ts          binary heap with comparison counting
  components/
    MapView.tsx          deck.gl overlay on MapLibre dark basemap
    ControlPanel.tsx     algorithm toggles, city presets, playback
    StatsPanel.tsx       comparison table, animated bars, winner crown
  workers/
    pathfinding.worker.ts   off-main-thread algorithm execution
  hooks/
    usePathfinding.ts    React hook wrapping the web worker
  utils/
    osm.ts               Overpass API fetch + localStorage cache
  types.ts
  App.tsx
```

## Tests

```bash
npx playwright test
```

7 E2E tests: initial render, graph loading, click-to-set markers, full pathfinding flow with animation, reset, algorithm toggling, city preset switching.

## Limitations

This is a hackathon demo, not a production routing engine.

- The batch-sssp implementation is a **simplified faithful version** of the paper. It captures the core ideas (FindPivots, batch quickselect, batch settlement) but omits the full recursive BMSSP structure and the two-sequence partial sorting data structure from Lemma 3.3.
- On real road networks (degree ~3, m ~ 3n), the asymptotic advantage is marginal: log^{1/3}(n) ~ 2.4x for n=15K. The breakthrough is theoretical — proving Dijkstra is not optimal.

## References

- [arXiv:2504.17033](https://arxiv.org/abs/2504.17033) — Breaking the Sorting Barrier for Directed Single-Source Shortest Paths
- [STOC 2025](https://dl.acm.org/doi/proceedings/10.1145/3618260) — Best Paper Award
- [Dijkstra (1959)](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) — the algorithm it beats
- [Fredman & Tarjan (1984)](https://en.wikipedia.org/wiki/Fibonacci_heap) — the previous best (Fibonacci heaps)

## License

MIT
