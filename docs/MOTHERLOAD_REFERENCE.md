# MOTHERLOAD (XGen Studios) — Build Reference (North Star)

> Researched from XGen/Motherload Fandom wikis, GameFAQs, Jay is Games. Depth/value
> figures vary between the "Original" and "Goldium" editions — treat depth thresholds
> as tunable approximations. Upgrade ladders, mineral values, items, and boss HP are
> consistent across sources (high confidence).

## 1. Core Loop & Feel
Refuel → dig down collecting ore → cargo fills / fuel drains / hull takes damage → fly
back up → sell → buy upgrades & consumables → dig deeper.

**Why it works:** three simultaneous depleting resources (fuel, cargo space+weight, hull
HP) all pull you to the surface while exponential ore value pulls you deeper. Every
second underground is a live cost/benefit calc. Running out of fuel at depth = death, so
greed is punished — but deep ore is worth so much more that "one more tile" always feels
rational.

## 2. Pod & Movement
- Gravity + thrust flight (heavy lander feel, not a platformer jump).
- Pod base mass ~1980 kg; ore adds weight. Overloaded + weak engine = can't lift off.
- **No digging straight up.** Dig down/left/right only. This is load-bearing: descending
  is committal; you carve switchback tunnels to climb back (or teleport).
- Fall damage: falling too far onto solid ground damages hull.

## 3. Fuel
Single liquid meter, drains while flying (faster) and idling (slower). Stock tank tiny
(~10 L). Refuel at surface Fuel Station, cost ∝ fuel bought (cheap; the constraint is tank
*capacity*, not price). Empty tank = stranded/explode = game over.

## 4. Minerals (Level-1 base values)
| Mineral | Value $ | Weight kg | First depth |
|---|---|---|---|
| Ironium | 30 | 10 | surface |
| Bronzium | 60 | 10 | surface |
| Silverium | 100 | 10 | surface |
| Goldium | 250 | 20 | surface |
| Platinum | 750 | 30 | ~750 ft |
| Einsteinium | 2,000 | 40 | ~1,560 ft |
| Emerald | 5,000 | 60 | ~2,375 ft |
| Ruby | 20,000 | 80 | ~3,200 ft |
| Diamond | 100,000 | 100 | ~4,000 ft |
| Amazonite | 500,000 | 120 | ~4,800 ft |

**Value scales faster than weight** ($3/kg Ironium → $4,167/kg Amazonite) — why digging
deep pays off. Artifacts (below ~950 ft, instant cash, no cargo): Dino Bones $1k, Treasure
Chest $5k, Martian Skeleton $10k, Religious Symbol $50k.

## 5. Upgrades — 6 systems, ~7 tiers, cost ladder: stock → 750 → 2,000 → 5,000 → 20,000 → 100,000 → 500,000
- **Drill** (dig speed ft/s): 20 → 28 → 40 → 50 → 70 → 95 → 120
- **Fuel Tank** (L): 10 → 15 → 25 → 40 → 60 → 100 → 150
- **Cargo Bay** (cu ft): 7 → 15 → 25 → 40 → 70 → 120
- **Hull** (HP): 10 → 17 → 30 → 50 → 80 → 120 → 180
- **Engine** (HP/lift): 150 → 160 → 170 → 180 → 190 → 200 → 210
- **Radiator** (% lava/gas dmg reduction): 0 → 10 → 25 → 40 → 60 → 80

## 6. Hazards (danger climbs with depth in lockstep with reward)
Lava/magma pockets (hull dmg), gas pockets (explode shortly after digging in), falling
rocks/cave-ins, undrillable rock (~1,750 ft, needs explosives), earthquakes (late game,
reshuffle terrain).

## 7. Consumables
| Item | Effect | Cost |
|---|---|---|
| Dynamite | destroy 3×3 | $2,000 |
| Plastic Explosive | destroy 5×5 | $5,000 |
| Teleporter | short teleport | $2,000 |
| Matter Transmitter | teleport to surface | $10,000 |
| Hull Repair Nanobots | +30 HP | $7,500 |
| Reserve Fuel Tank | +25 L | $2,000 |

## 8. Story / Depth
Surface shops at 0 ft. Artifacts ~950 ft. Undrillable rock ~1,750 ft. Mine bottom ~5,800
ft. You're a Martian pod mining for a corp run by **Mr. Natas** (Satan backwards). Eerie
distress transmissions (trapped pods, "terrifying eyes"). Final boss Mr. Natas (1,000 then
2,000 HP). New Game+ scales ore ÷ level, boss × level.

## 9. Economy Anchors
- Starting cash: **$20**. First goal ~$750 (first fuel-tank upgrade).
- **Early depth bounties**: +$1,000 at 500 ft, +$3,000 at 1,000 ft — bootstrap past the
  slow start. (We replicate this to fix the brutal onboarding.)
- Top-tier gear ($500k) ≈ one Amazonite — tight self-referential curve.

## 10. KEEP vs IMPROVE
**KEEP:** triple-resource squeeze · exponential ore values · persistent self-dug tunnels +
no-dig-up · upgrades that unlock new territory · early depth bounties · weighty lander flight.

**IMPROVE (our edge):** kill softlocks + add dump-cargo · soften first 5 min (stock tank is
brutal) · save/quick-resume for mobile · QoL (autosell option, upgrade "time-to-afford",
tunnel minimap, fuel-to-return warning) · telegraph hazards so deaths feel fair · virtual
stick + context dig for touch · procedural depth + seeds + leaderboards for infinite replay
· amplify the eerie transmission atmosphere · seasonal content (Christmas/Easter/etc).
