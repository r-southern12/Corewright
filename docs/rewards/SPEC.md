# Ancient Cache Rewards — economy spec

Caches (`T_WALL` 2×2 vaults, tiers I–V) are the game's **tech-unlock gate**. They give
permanent unlocks and one-time consumables — never raw progression you could grind.
Proposal for review; numbers are starting points, not gospel.

## Model & rules

- **A cache of tier N draws from tier N's pool**, in order: the **next unowned unlock**;
  if all unlocks of that tier are owned, a **grade-N consumable** (rolled from the lines
  below); if you're swimming in those, a **materials fallback** (dust + a little tier-N ore).
- **Tool + reagent bundling.** Any unlock that opens a *tool that runs on a reagent* arrives
  with a **starter stock of that reagent**, so a find is usable on the spot (Brine Jet ships
  with brine; Jet Rinse with its charge).
- **Permanent** — every unlock and the consumable counts live in the save (`SAVE_VERSION` bump).
- **Deterministic unlocks, rolled consumables.** You never get a duplicate unlock; the
  variety comes from which consumable a "full" tier rolls.

## Starters (no cache needed)

Excavation bench · Cleaving block · Bruting wheel · Seating bench · base Level & Standing
solvent · Drill frame + Bit + Power Cell templates · **core routing: drill + power only** ·
basic life support.

## One-time unlocks, by cache tier

| Tier | Unlock | Effect |
|---|---|---|
| **I** | Faceting Saw | opens the saw at **1× speed** |
| I | Jet Rinse *(+charge)* | one-cube precision hose |
| I | Sandblast | grain refiner (recipe) |
| I | Brewing kit | Mortar & Pestle + Calcinator templates |
| I | Scanner frame | template **+ scanner-core routing** |
| I | Ward frame | Elemental Ward template |
| **II** | Faceting 2× | speed plate |
| II | Brine Jet *(+brine stock)* | wide deep-strata blast |
| II | Polishing Lamp | opens at **1×** |
| II | Aegis frame | Aegis Plate template |
| II | Suit routing | ward **+** aegis core routing (drive the systems) |
| **III** | Faceting 5× | speed plate |
| III | Polishing 2× | speed plate |
| III | Tank capacity II | jet/brine/sand hold more |
| III | Scanner range II | reach deeper |
| **IV** | Adamant forge | the press takes tier-IV heat *(see open Q3)* |
| IV | Anvil frame | anvil-core routing (forge boost) |
| IV | Polishing 5× | speed plate |
| IV | Scanner range III | — |
| **V** | Aether forge | tier-V heat |
| V | Tank capacity III | — |
| V | *(capstone)* | pool is consumables-only once owned |

## Consumables — `{grade, charges}`, grade = cache tier it dropped from

| id | Name | Kind | Fires on | Effect · grade g |
|---|---|---|---|---|
| `cushion` | Bench Cushion | **reactive** | scribe about to scar crystal | prompt → absorb the scar. charges `g+1`; at g5 also cleans 1 existing scar |
| `salve` | Annealing Salve | active (bench) | you pick a scar | dissolve a scar, **no volume loss**. charges `g` |
| `clamp` | Template Clamp | **reactive** | a cut would throw crystal outside the template | prompt → spare/pull those cubes back in. charges `g`, rescue margin `g` cubes |
| `supersand` | Super Sandblast | active (bench) | button | refine **whole core** one grain step / charge. charges `g`, can finish ≤ tier-`g` cores |
| `lap` | Master Lap | active (bench) | button | mirror-polish every face in one shot. charges `g`, polish cap ↑ with g |
| `surge` | Solvent Surge | active (bench) | button | one plane cut that **ignores hardness**. charges `g`, mass budget ↑ with g |
| `hotdraw` | Hot-draw | active (bench) | button | **permanent** hotspot-retention lift on one core (+~0.08·g output). charges 1 |
| `bore` | Bore Charge | active (world) | button | mine **one tier above gear** for ~`5g` tiles (breach `TIER_GATE` once) |
| `lodestone` | Lodestone Pulse | active (world) | button | ping nearest rich adamant/aether pocket, ~`g`× duration |
| `render` | Ore Render | active (world) | button | next `5g` ores yield double |
| `stabilizer` | Flux Stabilizer | active (forge) | button | one pour with **zero flash penalty** |
| `catalyst` | Crucible Catalyst | active (forge) | button | one part at −ore cost, or +1 alloy grade |

Reactive consumables (cushion, clamp) run automatically-with-a-prompt — dormant in the
pack until the danger instant, then they ask before spending a charge. Everything else is a
button at the relevant bench.

## Per-tier cache pool (what a break can yield)

```
break(tier N):
  1. next unowned UNLOCK[N]           — the spine
  2. else a grade-N CONSUMABLE        — rolled from the lines, weighted to that tier's theme
  3. else MATERIALS: dust + a few tier-N ore   — never a dead find
```

Theme weighting so a tier's consumables feel on-band:
- **I** cushion / clamp / render   **II** supersand / lodestone / brine-adjacent
- **III** surge / lap / bore       **IV** hotdraw / stabilizer / bore(hi)
- **V** hotdraw / catalyst / surge(hi)

## Open decisions

1. **Polishing ladder placement** — I put access@II, 2×@III, 5×@IV to stagger it behind
   faceting. Move earlier if polish should arrive alongside the saw.
2. **Duplicate-cache generosity** — materials fallback amounts (how much dust/ore).
3. **Gate high-tier forge at all?** Mining adamant/aether already needs a T4/T5 drill, so
   "Adamant/Aether forge access" may be redundant double-gating. Options: (a) keep as a
   cache unlock; (b) drop it — owning the ore is enough; (c) make the T4/T5 cache give a
   forge-*efficiency* perk instead of hard access. Leaning (b) or (c).
4. **Core-routing vs frame** — does unlocking a suit *frame template* auto-grant that core's
   routing, or are they two separate finds? (Simpler = bundle them, as tabled.)
5. **Consumable UI** — a new pack shelf (like reagents/potions) with counts + a use button,
   and the reactive prompt overlay.
