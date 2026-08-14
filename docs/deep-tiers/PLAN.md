# Deep Tiers — T4 & T5 (adamant / aether)

Add two tiers below the current three: deeper world, T4 & T5 node cores, T4 & T5
smeltable ores, new alloys. The engine was built for this (`METALS` has commented
`adamant`/`aether` stubs, `TIER_HARD` already has 5 entries, `FINEST_GRAIN` reads
`TIERS[5]`, the forge scales off `METALS` data) — most of this is filling in data,
but it has to be wired coherently across gen, carving, smelting, forging, seating,
the tier wall, scanner, saves and UI.

## Design decisions (proposed defaults — change any before I build)

| # | Decision | Proposed default |
|---|---|---|
| D1 | New metal identities | **Adamant** (T4), **Aether** (T5) — already the code's own stub names |
| D2 | New alloy names | Adamant+vst = **Blacksteel**; Adamant+tin = **Adamantine**; Aether+adamant = **Godalloy**; Aether+vst = **Voidglass** |
| D3 | How much deeper | World depth `WH` 90 → **150** (adds ~60 rows for two bands) |
| D4 | Core size (same grain as T3, bigger) | vox stays **0.24** (T3 grain); half-extent `halfN` 7 → **9** (T4), **11** (T5) |
| D5 | "More concentrated spots" | Higher core hot-odds **and** denser node clustering in deep bands |

## Core mechanic: "refine to the same grain as T3, but bigger"

`TIERS[t] = {vox, halfN, …}`. A core's physical radius is `halfN·vox` and its
finest facet is `vox / 2^GRAIN_LEVELS`. So keeping **vox = 0.24** (identical to T3)
means T4/T5 refine to the exact same grain, while a larger **halfN** makes the core
physically bigger (more cubes, T5 > T4).

```
1: {vox:0.55, halfN:3,  hotOdds:[0.30,0.00]}
2: {vox:0.36, halfN:5,  hotOdds:[0.40,0.10]}
3: {vox:0.24, halfN:7,  hotOdds:[0.55,0.15]}   // baseline grain
4: {vox:0.24, halfN:9,  hotOdds:[0.72,0.24], dustPer:0.18, durability:3.2}   // NEW
5: {vox:0.24, halfN:11, hotOdds:[0.88,0.32], dustPer:0.14, durability:4.0}   // NEW
```
Note: `FINEST_GRAIN` is derived from `TIERS[5].vox`; setting it to 0.24 makes the
global finest 0.06 (= T3's), consistent — verify T1/T2 plane-splitting is unchanged.

## Stages (each independently committable + headless-verified)

**Stage 1 — Tier & metal data.** Define `TIERS[4]`/`TIERS[5]`; uncomment/define
`adamant`,`aether` in `METALS` + `ORE_INFO`; add `ALLOY_NAMES` for the new pairs;
extend `TIER_GATE` (measure max-T3 power to place the T4 wall above it, max-T4 for
T5 — mirrors how the T3 wall was set at 2.9). No behavioural change to T1–T3.

**Stage 2 — New tiles.** `T_S4`,`T_S5` (deep stone), `T_NODE4`,`T_NODE5` (cores),
`T_ADT`,`T_AETH` (smeltable ore). Wire `TILE_TIER`, `TILE_INFO` (resist: S4≈3.4,
S5≈4.2, kept **below** the tier wall so speed stays sane — the wall does the gating),
`NODE_TILE`, `SELF_LIT` (nodes), `RESOURCE`, `METAL_PAL` (ore flecks), `matClass`
tint band. Tile IDs 22–27.

**Stage 3 — Deepen the world & place the new strata.** `WH` 90→150; extend the band
descriptor `{dirt,s1,s2}` → `{dirt,s1,s2,s3,s4}` and `genColumn`'s stone pick to five
thresholds → six outcomes. New `deep` rolls place T4/T5 nodes + adamant/aether ore in
their bands, with **clustering** (a 2D concentration field) so deep ore comes in rich
pockets. Both planets (Terra, Ferric). Vaults/caches gain T4/T5 tiers.

**Stage 4 — Carving/forge/seat compatibility.** Mining a `T_NODE4/5` yields
`makeCore(seed,4/5)`; confirm `generateCells` builds the bigger grid, carving stations
handle it, forge templates cost the new metals, crucible blends the new alloys, seating
reads T4/T5. Bump partScore-driven power naturally (data). Draw the bigger cores in-world
(`drawWorldCore` tiers 4/5).

**Stage 5 — UI, scanner, saves, balance pass.** Hardness spectrum + forge stores +
tier labels show the new tiers/ores (mostly data-driven). Scanner `curT/nxtT` and the
readiness bar handle 5 tiers. `SAVE_VERSION` 17→18. Full playthrough sanity: T3 gear
walled from T4, T4 from T5; deep ore smelts; alloys forge; big cores carve to T3 grain.

## Cross-game touch-points checklist
world-gen (bands, genColumn, both planets, clustering) · tiles (IDs, TILE_TIER,
TILE_INFO, NODE_TILE, SELF_LIT, RESOURCE, METAL_PAL, matClass) · TIERS (vox/halfN/
hotOdds/dust/durability) · core gen (makeCore/generateCells) · hardness
(TIER_HARD ✓already 5) · drill power (partScore ✓data) · **tier wall (TIER_GATE)** ·
smelting/ORE_INFO/METALS · forge templates + crucible + ALLOY_NAMES · seating/resonance
· drawWorldCore (bigger) · scanner + readiness bar · hardness-spectrum readout · saves
(SAVE_VERSION) · admin fill buttons.
