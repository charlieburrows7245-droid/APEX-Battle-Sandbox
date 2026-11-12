# DW5 5 river rendering and APEX generation

Source: the user's supplied `DW5 Code(5)` client, `awversion=5`, captured map 1415. Native assets already present in `assets/i/`.

The active DW5 5 path calls `de4()` on an a–t letter stream. Each letter selects a river piece, advances by `Ojx`/`Ojy`, and is drawn at `AL[type+1]-150`, `CP[type+1]-50` relative to its origin. Types 0–15 use `fluss1.jpg` through `fluss8.jpg` (opposite directions reuse images); 16–19 use transition/bridge tiles 9 and 10. The renderer masks each 1500×500 JPEG using the client's 150×50 alpha mask with XOR compositing, then optionally adds the matching PNG water-light layer. This is applied at native size, with viewport culling.

The previously used base64/nibble `seegen()` path belongs to another format in the shared client. It is not the decoder used by the captured DW5 5 `fluss` data. The earlier APEX 300-unit/5-degree narrow-line generator and rectangular importer have been removed.

APEX now generates one stable letter-coded river from the saved seed, using adjacent native orientations and exact native piece offsets. Every river enters from the top; exit edges vary, including top-to-top U-shaped routes and exits through the east, west or bottom. A curved interior guide with seeded meanders steers the river through the map; there is no forced southbound direction. Refresh retains the seed. Generate produces a fresh layout and exits import mode. This is an APEX layout algorithm, not DW5's unavailable server-side random generator. Tributary junctions are not fabricated without verified junction artwork. Generated rivers contain one to three native q/r/s/t bridge tiles on cardinal channel sections, with spacing between crossings. Their exact native displacement advances the following pieces. Bridge decks render after neighbouring banks and appear as crossings on the minimap. River terrain currently affects appearance and minimap rendering; water blocking and bridge-only ground traversal are not implemented by this change.

`apexImportDw5River(encoded, flusspos, startY=0)` imports a real DW5 5 stream with its required origin. A saved object `{encoded, startX, startY}` is also accepted. The captured map 1415 uses `flusspos=22327`. Import mode replaces procedural rivers rather than drawing both sets on top of each other. Invalid older data is left intact in storage, but not rendered.

Validation: `node tests/rivers.test.cjs`; production, unit stats and base range regression tests. Native decoder positions were compared against the supplied client's `de4` implementation with `Ju=0`.
