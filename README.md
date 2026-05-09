# sssp-demo

Interactive visualization of the first algorithm to beat Dijkstra's shortest path in 41 years.

Implements [Breaking the Sorting Barrier for Directed Single-Source Shortest Paths](https://arxiv.org/abs/2504.17033) (Duan, Mao, Mao, Shu, Yin — **STOC 2025 Best Paper**) and races it against Dijkstra and A* on real road networks from OpenStreetMap.

![demo](https://github.com/user-attachments/assets/placeholder.png)

## what it does

You click two points on a real city map. Three algorithms race to find the shortest path:

- **Dijkstra (1956)** — the classic. O(m + n log n). Priority queue, one node at a time.
- **A\*** — heuristic-guided Dijkstra. Same complexity, fewer nodes explored.
- **Duan et al. (2025)** — O(m log^{2/3} n). Batch frontier processing with quickselect instead of heap extract-min. First improvement over Dijkstra in the comparison-addition model since Fredman & Tarjan (1984).

You see the search frontiers expand in real time — red, amber, cyan — on actual streets. The stats panel shows nodes explored, edges relaxed, and the paper's key metric: **total comparisons**.

## the paper's key insight

Dijkstra's bottleneck is sorting: n extract-min operations at O(log n) each = O(n log n). The new algorithm replaces this with:

1. **FindPivots**: k rounds of Bellman-Ford from the frontier (discovers reachable vertices without sorting)
2. **Batch extraction**: quickselect the k smallest-distance nodes in O(frontier_size) instead of k × O(log n)
3. **Batch settlement**: settle all k nodes at once

Total: O(m log^{2/3} n) comparisons. On sparse graphs (m = O(n)), this is strictly better than Dijkstra.

## quick start

```bash
git clone https://github.com/yurekami/sssp-demo.git
cd sssp-demo
npm install
npm run dev
```

Open http://localhost:5173. Click two points. Hit Run.

Road network data is fetched from the [Overpass API](https://overpass-api.de/) and cached in localStorage.

## stack

| layer | choice | why |
|-------|--------|-----|
| map | MapLibre GL JS | free WebGL vector tiles, no API key |
| visualization | deck.gl (ScatterplotLayer + PathLayer) | GPU-accelerated, 100K+ points at 60fps, glow effects |
| algorithms | TypeScript, runs in Web Worker | non-blocking UI during computation |
| data | OpenStreetMap via Overpass API | real road networks, cached locally |
| framework | Vite + React | fast HMR, zero config |

## project structure

```
src/
├── algorithms/
│   ├── dijkstra.ts        # standard Dijkstra with step recording
│   ├── astar.ts           # A* with haversine heuristic
│   ├── batch-sssp.ts      # Duan et al. 2025 (simplified faithful impl)
│   ├── graph.ts           # graph construction, nearest-node, haversine
│   └── min-heap.ts        # binary heap with comparison counting
├── components/
│   ├── MapView.tsx         # deck.gl overlay on MapLibre dark basemap
│   ├── ControlPanel.tsx    # algorithm toggles, city presets, playback
│   └── StatsPanel.tsx      # comparison table, animated bars, winner crown
├── workers/
│   └── pathfinding.worker.ts  # off-main-thread algorithm execution
├── hooks/
│   └── usePathfinding.ts   # React hook wrapping the web worker
├── utils/
│   └── osm.ts              # Overpass API fetch + localStorage cache
├── types.ts
└── App.tsx
```

## city presets

Lower Manhattan · Midtown Manhattan · Paris (Latin Quarter) · London (Westminster) · Singapore (Marina Bay)

The bounding boxes are small enough (~3km²) to keep graph size around 10-15K intersections — enough for a good demo, fast enough to animate.

## tests

```bash
npx playwright test
```

7 E2E tests covering: initial render, graph loading, click-to-set markers, full pathfinding flow with animation, reset, algorithm toggling, city switching.

## limitations

This is a demo, not a production routing engine.

- The batch-sssp implementation is a **simplified faithful version** of the paper. It captures the core ideas (FindPivots, batch quickselect, batch settlement) but omits the full recursive BMSSP structure and the two-sequence partial sorting data structure from Lemma 3.3.
- On real road networks (degree ~3, m ≈ 3n), the asymptotic advantage over Dijkstra is marginal: log^{1/3}(n) ≈ 2.4x for n=15K. The paper's contribution is **theoretical** — proving Dijkstra is not optimal.
- Google Maps uses [Contraction Hierarchies](https://en.wikipedia.org/wiki/Contraction_hierarchies) with massive precomputation for microsecond queries. This demo doesn't compete on raw speed — it competes on **transparency**. You can see how routing engines think.

## references

- [arXiv:2504.17033](https://arxiv.org/abs/2504.17033) — the paper
- [STOC 2025](https://dl.acm.org/doi/proceedings/10.1145/3618260) — where it won Best Paper
- [Dijkstra (1959)](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) — the algorithm it beats
- [Fredman & Tarjan (1984)](https://en.wikipedia.org/wiki/Fibonacci_heap) — the previous best (Fibonacci heaps)

## license

MIT
