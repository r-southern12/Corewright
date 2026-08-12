# Overworld Visual Overhaul — Integration Plan

**Status:** art direction fully approved (mockups in `mockups/`). Nothing from the
overhaul is in the live game yet except two earlier stopgap passes that this plan
*replaces*. This document is the brief for the single, careful integration pass.

**Branch:** `claude/corewright-claude-code-dhvpbq`. Work here, commit per stage, push.

---

## 1. Why this exists / what was rejected

The overworld (the 2D canvas dig view) looked like placeholders. We iterated on a
full art direction with the visual director and locked it design-by-design. The hard
constraints that came out of that — **do not violate these**:

- **The game stays tile-based.** Mining is per-tile, each tile has a tier/resist,
  gates check tiers, materials are per-tile. An early smooth-blob / coverage-field
  terrain was **rejected** for throwing away the working tile system. The approved
  look is **baked-texture tiles + directional lighting** that *reads* seamless within
  a material mass but still behaves as discrete tiles.
- **Cores are unwrought gemstones embedded in host rock**, not floating diamond icons
  in cut-out air gaps. The reference the director approved: a faceted teal crystal
  cluster set into dark chunky rock with orange ore flecks. Diamond/gem icons were
  **rejected** repeatedly.
- **Moss and clay are resource deposits inside dirt/stone tiles** (clustered pockets),
  **not** ground-cover / topsoil crust. Remove any grass crust.
- **Metals are flecks spread throughout the tile**, not a single central nugget, and
  **no ore dust**.
- Don't re-litigate settled decisions or ask permission repeatedly on things already
  approved below. Build to the mockups.

## 2. Approved art — source of truth

Each mockup is a self-contained HTML canvas; open via `file://` or the render harness.
The named functions are the exact approved art — **port these, don't reinvent them.**
PNGs next to each file are the visual target.

| Element | Mockup file | Key functions | Notes |
|---|---|---|---|
| Terrain (dirt / stone / deep) | `mockups/terrain.html` | `rock()` (tier-tinted chunky rock) | Value-noise fill sampled by **world** coord so same-material tiles are seamless; edges drawn **only** at material boundaries (air or different tier); per-pixel directional light top-left. Tier tints: T1 brown-ish shallow, T2 grey stone, T3 dark hard rock. Needs enough seeded variation that it does not read copy-paste. |
| Cores | `mockups/cores.html` | `core()`, `xtal()` | Faceted crystal cluster embedded in host rock. **Tier sets** size / shard count / brilliance / glow (`{1:{main:24,n:1},2:{main:40,n:3},3:{main:54,n:6}}`). Seed sets arrangement → variation. Six hues via `CORE_HUES` (teal shown; wire all six). Orange ore flecks scattered around the cluster. |
| Metals: copper / tin / iron / voidsteel | `mockups/resources.html` | `chunk()`, metal fleck spread | Angular faceted metallic chunks **spread throughout** the tile. No ore dust. Each metal has its own 4-stop palette (COP / IRON / VST + a tin palette to add). |
| Moss / clay | `mockups/resources.html` | `moss()`, `clay()` | **Clustered** deposits within the rock. Moss = glowing green organic nodules + motes. Clay = smooth matte tan pockets with a soft sheen and drying cracks. Both come in dirt and stone variants (host tier only changes the backing rock). |
| Salt / mica / brine / cinder / rime | `mockups/resources.html` | (per-material draw) | Salt: slight spread. Mica: slight spread. Brine: approved as-is. Cinder: a **crystalline flower** structure (not a blob). Rime: a little bigger than the first pass. |
| Gates (reward vaults) | `mockups/gates.html` | `glyph()` (B), `reclaimed()` (D) | **B · Glyph slab** and **D · Reclaimed ring** are the two approved vault styles. These are **reward caches** housing consumables (core protection, super-sandblast, cleaner…) and equipment upgrades (facet saw, polishing, forge templates), not just walls. Centre glow colour = **required tier** (teal I / amber II / violet III) + numeral, same read as today's gate. |
| Mining animation | `mockups/mining.html` | `disintegrate()` | **D · Disintegrate** replaces the yellow progress arc. Tile is eaten inward from centre with a bright energised cut-edge; motes rise off and dissolve upward. Progress = fraction eaten (`eat = s*0.5*p`). |

Shared helpers across mockups: `mul()` (seeded PRNG), `noise()`, `_rr()` rounded-rect.
`drawHero()` (the procedural hardsuit explorer) is **already live** in the game.

## 3. Where it plugs into the live game (`index.html`)

Navigate by section banner comments, not line numbers (they drift). Anchors as of now:

- **Tile render loop:** inside `drawWorld(now)` (~line 6194+). Currently draws a flat
  `TILE_INFO[t].col` fill plus the **pass-2 stopgap** bevel / rim / crystal-bloom /
  tier-fog / metal-specular code. That stopgap is what the baked art **replaces**.
- **Mining animation:** `index.html:6367` — the amber arc:
  ```js
  ctx.strokeStyle='#E8A33D'; ctx.lineWidth=3;
  ctx.arc(px2+TS/2,py2+TS/2,TS*0.42,-Math.PI/2,-Math.PI/2+(mine.progress/mine.need)*Math.PI*2);
  ```
  Replace this block with a `disintegrate()` call driven by `mine.progress/mine.need`.
- **Gates:** gate tiles are `T_WALL` with a stamped tier in `gate[y]`; `gateReqTier()`
  reads it; the "wall" tile branch is at `~6279` (`t===T_WALL`). Swap its render for
  `glyph()` / `reclaimed()` keyed to the required tier's colour + numeral.
- **Do NOT touch** (must keep working unchanged): mining logic (`autoMine`, `startMine`,
  `breakTile`), tier gates (`gateReqTier`, `TILE_TIER`), fog-of-war (`getSeen`,
  `surfaceY`), scanner pings (`NODE_TILE` map + tiered ping), `TILE_INFO[t].resist`,
  save format.

Tile constants for reference:
`T_DIRT=1,T_S1=2,T_S2=3,T_S3=4,T_ORE=5,T_NODE1=6,T_NODE2=7,T_NODE3=8,T_MOSS=9,`
`T_SALT=10,T_CINDER=11,T_COPPER=12,T_IRON=13,T_VST=14,T_CLAY=15,T_MICA=16,`
`T_BRINE=17,T_WALL=18,T_BEDROCK=19,T_RIME=20,T_TIN=21`.

## 4. Rendering approach (the load-bearing technique)

Per-frame procedural draw of every visible tile would be too expensive (the mockups
run one tile at a time). So:

- **Bake each tile to an offscreen canvas once, cache it**, keyed by
  `(tileType, tier, seed)` where `seed = absolute tile coord` (so a given world cell is
  deterministic and matches its neighbours). Draw the cached bitmap in the tile loop.
- **Re-bake a single tile** only when it changes (mined, gate opened). This mirrors the
  forge's `forgeDirty` discipline — settled tiles cost nothing.
- **Seamlessness:** sample the material noise by **world** coordinate inside the bake so
  adjacent same-material tiles line up; draw a tile edge/bevel **only** where the
  neighbour is air or a different material. (Neighbour lookup via `getTile`.)
- **Directional light** top-left, consistent with the workshop visual language.
- Only visible tiles are drawn (existing cull by camera stays).
- **Measure** before/after with the perf harness; watch the cache size (bounded by tile
  types × tiers × on-screen cells).

## 5. Task breakdown (ordered, one commit each, screenshot each)

Serve first (`python3 -m http.server 8099`); the render harness hits
`http://localhost:8099/index.html`. Screenshot the **real game surface view** at each
stage, not just mockups.

1. **Scaffold the bake cache.** Add the offscreen per-tile bake + cache + re-bake-on-mine
   hook and route the tile loop through it, still drawing today's flat colour. Verify fog,
   gates, scanner, mining all unchanged and perf is fine. No visual change yet.
2. **Terrain.** Port `rock()` dirt/stone/deep with world-coord seamless fill, directional
   light, boundary-only edges. **Remove the grass/topsoil crust** and the pass-2 stopgap
   terrain code. Screenshot.
3. **Cores.** Port `core()`/`xtal()`; wire all six `CORE_HUES` and tier→size/density/glow;
   embed in host rock. Screenshot each hue + each tier.
4. **Metals.** Port `chunk()` flecks-throughout for copper / **tin** / iron / voidsteel
   (add the tin palette). No ore dust. Screenshot.
5. **Moss / clay.** Clustered deposits, dirt + stone variants. Screenshot.
6. **Materials.** Salt (slight spread), mica (slight spread), brine, cinder (crystal
   flower), rime (bigger). Screenshot.
7. **Gates.** Replace the `T_WALL` render with `glyph()` + `reclaimed()`; glow = required
   tier + numeral. Decide the mapping (see open questions). Screenshot both, all 3 tiers.
8. **Mining animation.** Replace the amber arc block at ~6367 with `disintegrate()` driven
   by mine progress. Screenshot early/mid/late.
9. **Full pass.** Surface + a few depths screenshot; confirm scanner pings, fog reveal,
   gate lock/unlock, and mining all read correctly against the new art. Commit.

## 6. Open questions to settle at the start of tomorrow

- **Mining tint:** disintegrate tinted by the **tile's tier** (teal T1 / amber T2 /
  violet T3, nearly free and reinforces the tier read) vs. flat violet. *Default: tier-tinted.*
- **Gate mapping:** B · Glyph slab = consumable caches, D · Reclaimed ring = equipment
  caches? Or random per gate? (Consumables/equipment-in-vaults are a **future** system —
  the gate art can ship now; the loot wiring is separate.) *Default: B=consumables, D=equipment.*
- **Character:** `drawHero()` is live. A further AAA character pass was deferred in favour
  of terrain/materials — confirm if it's in scope for this pass or later.

## 7. Constraints (repo rules)

- Single file, no build/bundler/import. Any new top-level name is a global — check for
  collisions. Prefer **surgical edits**; `index.html` is ~330 KB and regenerating regions
  silently drops helpers / reverts tuned constants.
- Comments explain **why**. When you change tuned behaviour, update the rationale beside it.
- Overworld is 2D canvas (works from `file://`); the 3D benches need HTTP for textures.
- **Save format:** the art is *derived* from tile type + coord, so no `saveGame()` shape
  change and **no `SAVE_VERSION` bump** is expected. If that stops being true, bump it.
