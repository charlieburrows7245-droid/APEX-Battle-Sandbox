# Combat rules — DW5 Wall calibration (12 November 2026)

All sandbox bases use Wall defences by default; Sandbag-only bases are not offered. Each turret has 65,000 VF health, as observed in DW5 base 189 (18 turrets, Wall + Long Range) and base 46 (Sandbag). Wall improves armour by 10×, **not** turret maximum health. Long Range remains 2× range, a sandbox approximation not separately measured.

## Measured DW5 results
- One 47-member MRH division dealt 353 VF per normal ~1-second attack update to Wall base 189.
- Adding a 49-member MRH division brought damage to 720 VF/update. This is consistent with ~7.5 VF per MRH and division-level rounding.
- 18 turrets dealt 5,400 VF per attack update to the tanking Gator division (300 per turret).
- Turret deaths changed 18→17 with health reset to 65,000, then 17→16 with next health 64,647. A separate attacker may hit the next turret in the same update; the precise overflow rule is not verified.

## Sandbox implementation
- Base turret health is 65,000 VF each. Base total health is the sum of surviving turret pools.
- All base rendering uses the Wall sprite. Incoming damage to bases is armour-normalised by a provisional divisor of 200 (=20 baseline ×10 Wall armour). This yields 7.5 VF per MRH when its firepower is 1500; **the MRH is not yet a selectable sandbox unit** and the divisor is not a verified universal DW5 formula.
- Every surviving troop fires; multiple divisions contribute additive damage. Existing troop-vs-troop formulas remain approximations.
- A single turret or troop can be lost per defending group per simulation second. Excess damage is discarded; this is a conservative sandbox rule, not confirmed DW5 behaviour.
- Existing saves are migrated proportionally to the new turret HP. Long Range, upgrades, controls and other game mechanics are retained.

Validation: `node tests/combat.test.cjs`.

## Base range rollback — release 1.13

Reverted the enlarged release 1.12 range on the owner's request. Military bases and airbases again use **12 range units normally and 20 with Long Range**, as before release 1.12. `BASE_WEAPON_RANGE_MAP` configures both targeting and selected range outlines. Existing projection, front/rear rules, target selection, health, armour and damage are unchanged. These are sandbox range settings, not verified exact DW5 values.

Validation: `node tests/base-range.test.cjs`. The broad combat harness's pre-existing extraction/parse failure remains outside this rollback.


## Unit stats and target categories — release 1.15

All 36 currently buildable types now use published normal/special firepower, armour, range, sight and speed from https://help.deltawars.com/?a=units (retrieved 12 November 2026). Three-second production remains an intentional sandbox override. Native client metadata supplies turret height, pivot and horizontal shift, including howitzer (5), Msta (22) and Paladin (31).

Target categories overlap: ground, helicopter, aircraft, air (helicopters + aircraft), weak armour, base attacker, and base defence. Special power replaces normal power only for the declared target class; ground vehicles without an air speciality use the published 20-strength MG against flying targets. Apache's ground bonus excludes bases. Pantsir targets aircraft; TanSAM and Berkut target helicopters; Raptor and MLRS target both flying categories. Base attackers prefer base defence; Leclerc prefers the artillery/Panhard group. Jammer remains unarmed; Detector has its published 20 firepower. Mobile Patriot and mobile Smerch remain unarmed until a separate deployment mechanic is implemented.

The public help page does not enumerate weak-tank membership. The current sandbox interprets weak as ground armour below 150, a provisional cutoff rather than a confirmed server rule. Leclerc's artillery category includes howitzer, Paladin, Panhard and Msta.

Health pools and damage normalization retain the existing sandbox model. The help page publishes armour, not independent maximum HP; this release does not claim exact native health or a verified server damage formula. Existing base range settings and one-casualty-per-attacker limits are retained.

Validation: production.test.cjs, unit-stats.test.cjs and base-range.test.cjs. The older broad combat harness still has its pre-existing extraction failure.
