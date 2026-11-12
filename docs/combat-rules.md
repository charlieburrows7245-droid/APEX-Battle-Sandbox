# Combat rules in release 1.08

The supplied native DW5 client displays individual members and removes the last visible member when its server-supplied group count changes. The official defence help describes stronger defence armour in DW5 and the benefits of walls and missile improvements. These sources do not expose a verified turret HP value, starting weapon range or authoritative casualty interval.

## APEX rules requested by the owner
- All incoming damage from all attackers is combined per defending division in each simulation update.
- The highest surviving formation slot takes all damage.
- At most one troop (or base turret) can die per group per simulation second.
- Excess damage on a lethal hit is discarded. Incoming damage during the remaining cooldown is also discarded; no deferred damage debt accumulates.
- The cooldown pauses with the game, follows simulation speed, and is saved as remaining seconds on surviving members.
- Group HP is the sum of surviving members' actual HP; the maximum retains the division's pre-casualty capacity, so losses reduce the bar.
- A detached unit starts a one-unit health capacity; joining or production can expand a receiving group's capacity.
- Turret health pools replace generic base HP. Base HP is always their sum.
- Walls multiply each turret's maximum and remaining HP by 10, preserving damage percentage.
- Base long range is 2x, replacing the previous 3x.
- Destroyed turrets can be rebuilt with the flak upgrade. Restore level 1 explicitly resets to two full-health turrets.
- Existing base destruction behaviour remains when all turrets are destroyed.

## Unverified sandbox baseline
500 HP per turret is derived from the old military-base 1,000 HP / two starting turrets. Base weapon range remains the prior 210 world units (420 upgraded). These are not presented as DW5 server values. Both military bases and airbases now use their turret pools for defence.

Troop firepower/armour normalization and the 0.8-second volley cadence remain sandbox approximations from release 1.06. The one-second casualty ceiling is the owner's requested fallback, not a verified native rate.

Sources:
- https://help.deltawars.com/?a=buildings&b=defense
- https://help.deltawars.com/?a=buildings&b=building-types
- Supplied native-client.js: Bc group count decrement and last-member explosion rendering.

Validation: node tests/combat.test.cjs checks full-division firing, projected range, TanSAM specialist range, allies, reverse-slot damage, shared health, casualty locks across multiple attackers and save/load repair, discarded overkill, turret aggregation, wall scaling, long-range multiplier, gun rebuilding, downgrade and legacy migration.
