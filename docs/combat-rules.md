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
