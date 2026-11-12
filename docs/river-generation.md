# DW5 5 river rendering and APEX generation

Source: the user's supplied `DW5 Code(5)` client, `awversion=5`, captured map 1415. Native assets already present in `assets/i/`.

The active DW5 5 path calls `de4()` on an a–t letter stream. Each letter selects a river piece, advances by `Ojx`/`Ojy`, and is drawn at `AL[type+1]-150`, `CP[type+1]-50` relative to its origin. Types 0–15 use `fluss1.jpg` through `fluss8.jpg` (opposite directions reuse images); 16–19 use transition/bridge tiles 9 and 10. The renderer masks each 1500×500 JPEG using the client's 150×50 alpha mask with XOR compositing, then optionally adds the matching PNG water-light layer. This is applied at native size, with viewport culling.

The previously used base64/nibble `seegen()` path belongs to another format in the shared client. It is not the decoder used by the captured DW5 5 `fluss` data. The earlier APEX 300-unit/5-degree narrow-line generator and rectangular importer have been removed.

APEX now generates one stable letter-coded river from the saved seed, using adjacent native orientations and exact native piece offsets. Every river enters from the top; exit edges vary, including top-to-top U-shaped routes and exits through the east, west or bottom. A curved interior guide with seeded meanders steers the river through the map; there is no forced southbound direction. Refresh retains the seed. Generate produces a fresh layout and exits import mode. This is an APEX layout algorithm, not DW5's unavailable server-side random generator. Tributary junctions are not fabricated without verified junction artwork. Generated rivers use native q/r/s/t bridge tiles on cardinal channel sections, with spacing between crossings and no total count cap. Their exact native displacement advances the following pieces. Bridge decks render after neighbouring banks and appear as crossings on the minimap. River terrain currently affects appearance and minimap rendering; water blocking and bridge-only ground traversal are not implemented by this change.

`apexImportDw5River(encoded, flusspos, startY=0)` imports a real DW5 5 stream with its required origin. A saved object `{encoded, startX, startY}` is also accepted. The captured map 1415 uses `flusspos=22327`. Import mode replaces procedural rivers rather than drawing both sets on top of each other. Invalid older data is left intact in storage, but not rendered.

Validation: `node tests/rivers.test.cjs`; production, unit stats and base range regression tests. Native decoder positions were compared against the supplied client's `de4` implementation with `Ju=0`.


## Full maps (1.17.0)

APEX generates exactly 500 bases: 476 military, 20 helicopter, 4 airbases. The helicopter/airbase mix was decoded from the supplied awversion=5 BR snapshot (orientation 2/3). DW5 reserves 500 base slots, including an index-zero sentinel; this is evidence for the captured mix, not a guarantee of every server map. The requested APEX total is 500 actual bases. One military base starts owned; others are unclaimed. No capture system is added by this change.

The client renders 600 Pi bytes as alternating native hinder0..4 cliff images, through the native XOR alpha mask. APEX uses the same five images, mask, byte-quantized horizontal positions and stratified rows, adapting the vertical scale to the existing square map. Cliff collision uses elliptical footprints shared with ground obstacle avoidance; aircraft ignore these ground obstacles. Base placement rejects overlaps with cliffs, river corridors and existing bases.

The DW5 client decodes bridge letters q/r/s/t without a count limit. APEX now places bridges according to seeded spacing at compatible river headings, with no total cap. A 500-seed river test includes maps with at least 17 bridges. Exact random seeds, bridge frequency, cliff collision geometry and placement rules belong to the DW5 server and are not present in the captured client. APEX supplies its own deterministic placement rules.

Generate map replaces the battlefield. Save/Load includes the terrain seed. At distant zoom, bases use markers instead of allocating 500 full-resolution base surfaces.

Version 1.17.1 increases projected crossing separation from 2,200–4,600 to 11,000–20,000 world units. This reduces crowded seeds 1416/1417 from 26/23 to 7/7 crossings. Regression coverage verifies minimum separation across 100 seeds and retains support for 17 or more crossings on long rivers.

Version 1.17.3 reserves a 100-map-unit border for generated bases on every edge, including their 1500x500 terrain footprints. Existing saved scenarios retain their saved base positions; generate a fresh map to apply placement changes.
