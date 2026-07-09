# RuneMaster — Continued Development Plan

## Context

RuneMaster is a browser game (static site, no build step) that teaches Dyalog APL. The
player walks a tile map, steps on **rune stones** to solve small APL puzzles (validated
live via TryAPL's REST API), collects the runes into a belt, and uses collected runes to
open **doors** that gate further exploration. Today only two hand-made rooms exist
(`r0c0.json`, `r0c-1.json`) with ad-hoc content.

The goal of this phase is to turn RuneMaster into a real, explorable APL course by:

1. **Content pipeline** — crunch the Excel cross-reference (`APL Challenge content xref.xlsx`)
   together with the challenge-site content (`challenge-site/{A..I}`) into a **skill tree**
   of runes-with-prerequisites, then hand-author a fresh set of `rXcY.json` levels (scrapping
   the current ones) whose geography loosely follows that tree, with problems rephrased into
   the fantasy "rune stone" voice of the current `r0c0.json`, and each room themed to match the
   problems in it.
2. **UI** — remaining-rune counter, click/touch movement, and a responsive no-scroll layout
   that works on phones.
3. **Coding conventions** — capture the user's (Arthur Whitney–style) JS conventions and
   refactor `index.js` to match.

Work proceeds in that order (content → UI → conventions); the conventions refactor is a final
sweep over all JS including the new UI code.

---

## Current architecture (reference)

- **`index.js`** (168 lines) — the whole engine. Key pieces:
  - `loadM(mr,mc)` (`index.js:114-142`) fetches `r{mr}c{mc}.json`, builds the `<table id=M>`
    grid, caches rooms in `mem`, sets theme CSS vars, computes `rMin/cMin/rMax/cMax`, calls `chk()`.
  - Movement is inline in the `keydown` handler (`index.js:64-112`): computes `newR/newC`,
    handles room-edge crossing (loads neighbour, wraps position), and routes tile interaction
    (locked door `l` → message; open door `o` / rune `mdMD` → challenge dialog).
  - `window.ans(t)` (`index.js:154-158`) validates the typed answer against `aski.pattern`,
    then sends `{0::0 ⋄ (ANS)≡⍵}` + challenge `expr` to TryAPL via `exec` (`index.js:11-17`);
    `react` (`index.js:159-167`) hides a solved door or moves a solved rune tile into the belt.
  - `lb(ch)` (`index.js:33-47`) builds the on-screen rune keyboard and sets `aski.pattern`.
  - `show()` (`index.js:49-59`) is the 3×3 fog-of-war reveal; `chk()` (`index.js:60-62`)
    unlocks doors whose required runes are all in the belt.
- **Level JSON schema** (per `r0c0.json` / `r0c-1.json`):
  - `theme`: `{w:<emoji>, wall:<css color>, back:<css color>, spot:<css color>}`.
    (Note: `r0c0.json` currently has 4 duplicate `theme` keys — invalid; fresh files use one.)
  - `M`: array of row strings, **2 chars per cell**: char0 = type (`w` wall, ` ` empty,
    `m/d/M/D` rune challenge, `l` locked door, `o` open door), char1 = unique id suffix.
  - Per-challenge/per-door objects keyed by the 2-char id: `req` (space/pair-delimited required
    rune ids), `add` (bonus runes granted on solve), `task` (markdown w/ `{cd}` rune tokens,
    `` `code` ``, `_italic_`), `expr` (APL that evaluates to the expected answer, and may assign
    the variables the task references, e.g. `+/(a b c)←3?99`).
- **Belt / rune taxonomy**: colored rows keyed by **(gemstone, glyph)** — the gemstone encodes
  the syntactic type, so the *same glyph* in different roles is *different* runes (never merged):
  - `m` **emerald** = monadic function, `d` **ruby** = dyadic function,
    `M` **sapphire** = monadic operator, `D` **amethyst** = dyadic operator.
  - **Rune visual grammar** (already in `index.css:70-73`, `border-radius: TL TR BR BL`, `0em`
    = sharp): *bottom* corners = arguments, *top* corners = operands. Monadic fn = BR sharp only
    (one right arg); dyadic fn = both bottom sharp (infix); monadic operator = TL sharp only
    (lone left operand); dyadic operator = both top sharp. Functions round at `1em`, operators
    at `.5em`. **Preserve this when authoring** — a rune's class must match its true APL arity.
  - **Diamonds** (new 5th category): the enclosure syntax `()`, `[]`, `{}`. They take neither
    arguments nor operands, so **no sharp corners** — fully round (`border-radius:50%`, round
    brilliant cut) with a **neutral faded-rainbow radial gradient** fill (no gemstone border
    color). Collectible into a new 5th belt row; usable as prerequisites (e.g. parens for
    precedence, braces for dfns).

## Source inputs (confirmed)

- **`APL Challenge content xref.xlsx`** — matrix of APL constructs (grouped ENCLOSURES /
  MONADS / DYADICS / OPERATORS / CONCEPTS) × (round A–I, problem 1–9, X). `x` = construct
  **introduced** at that problem, `r` = **required** (a skill learned in an earlier problem of
  the *same round* is needed here). The `x` markers are complete; the `r` markers are only filled
  in for **round A, problems 1–4** — the rest must be completed (see step 1a.0). Read it
  in-memory with Python `zipfile` (no `openpyxl` installed) — parse `xl/sharedStrings.xml` +
  `xl/worksheets/sheet1.xml`.
- **`challenge-site/{A..I}/docs/{1..10}.md`** — 90 problems. YAML frontmatter `round` and a
  **cumulative** `chars:` list (the glyphs known up to that problem → exact intro order).
  Body = APL explanation + narrative + task.
- **`challenge-site/app/{A..I}.json5`** — answer keys, two shapes:
  - **value type**: `r` (accepting regex) + `s` (sample solution, fixed data).
  - **function type**: `a` (list of test-case args; pairs when dyadic), `f` (reference dfn),
    optional `p` (preprocess before compare). Validation logic mirrors `challenge-site/app/Test.aplf`.

---

## Workstream 1 — Content pipeline (do first)

### 1a.0. Complete the xref `r` markers and write them back to the .xlsx

The spreadsheet's `x` (introduces) column is complete, but `r` (requires an earlier same-round
skill) is only filled for **round A, problems 1–4**. Complete `r` across all rounds/problems and
save the updated `APL Challenge content xref.xlsx`.

- **Derive `r`**: for each problem, the constructs actually used come from its solution
  (`s`/`f` in `challenge-site/app/{round}.json5`) plus its body/`chars`. Any construct a problem
  uses that was **introduced (`x`) in an earlier problem of the same round** gets an `r` at that
  (construct, problem) cell (don't `r` the cell that already has the `x`, and don't `r`
  constructs introduced in a *different* round — that's cross-round reuse, out of scope here).
- **Ground-truth check**: reproduce the existing hand-marked round A 1–4 `r`s exactly with the
  derivation before extending to the rest; reconcile any mismatch before writing.
- **Write back**: patch `xl/worksheets/sheet1.xml` in-memory via Python `zipfile` (openpyxl
  absent) — reuse the shared-string index for `"r"`, add `<c t="s">` cells at the right
  (row,col) refs, and rewrite the archive, leaving all other content byte-stable. Keep a backup
  copy of the original first. Re-open and diff to confirm only intended cells changed.

The completed `x`/`r` matrix is the authoritative intra-round prerequisite data feeding 1a.

### 1a. Crunch inputs → skill tree (design artifact)

Produce `skilltree.json` (a design/authoring artifact, not a runtime file) by combining the
xref matrix + cumulative `chars` + json5 keys. One node per **unique rune** = (valence-color,
glyph). For each node record:

- `id` (2-char, e.g. `m⍳`, `d+`, `M⌿`), `color` (`m/d/M/D`), `glyph`, human name.
- `intro`: round+problem where first introduced (first `x` in xref / first appearance in `chars`).
- `prereq`: rune ids that must precede it (from earlier `x`/`r` entries and `chars` deltas).
- `kind`: `value` or `function`.
- validation payload: for value → `expr` (from `s`, generalized to random data where sensible);
  for function → `f`, `a`, `p` (verbatim from json5).
- `source`: `round/problem` back-reference for the prose.

Notes:
- Rune identity is **(gemstone, glyph)**, never glyph alone: the same glyph can be a monadic
  function (emerald) *and* a dyadic function (ruby) — those are two distinct runes. Dedup only
  exact (gemstone, glyph) pairs that recur across rounds (`⍳` monadic in A/D/E/H, the comparison
  dyads in C/G/H, etc.): keep the clearest introduction as the collectible, and treat
  repeat/advanced problems (esp. P7–P10, the function problems) as **deeper gated "trial"
  challenges/doors** rather than duplicate runes.
- ENCLOSURES (`()`, `[]`, `{}`) become **diamond** stones (their own collectible category, see
  taxonomy above), not lore — a node per enclosure with a task teaching its use, collectible into
  the 5th belt row and usable in `req`. `⋄` (statement separator) and CONCEPTS (precedence,
  stranding, factorial, palindrome…) stay as task lore / door requirements, not belt items.

### 1b. Engine change — function-type validation

The current checker (`index.js:154-158`) only compares one value (`(ANS)≡⍵`). Add a
function-type path so the player enters a dfn `g` and the engine wraps the reference solution
`f` + test cases `a` (+ preprocess `p`) into **one** APL expression sent to TryAPL:

```apl
0::0 ⋄ G←{player} ⋄ F←{ref} ⋄ P←{preprocess} ⋄ ∧/{(P F ⍵)≡(P G ⍵)}¨(arg1)(arg2)…   ⍝ monadic
0::0 ⋄ G←{player} ⋄ F←{ref} ⋄ P←{preprocess} ⋄ ∧/{(P(⊃⍵)F(⊃⌽⍵))≡(P(⊃⍵)G(⊃⌽⍵))}¨(pair1)…  ⍝ dyadic
```

- Represent this in the level JSON by giving function-type challenge objects `f`, `a`, and
  optional `p` (dyadic inferred from `≡` depth of `a`, mirroring `Test.aplf`). `window.ans`
  branches: `f` present → build the harness above; else keep the existing `expr` value check.
- Relax `aski.pattern` in `lb()` (`index.js:33-47`) for function challenges to allow `{ } ⍺ ⍵`
  digits and the round's `chars` glyphs (use the json5 `t`/`Chars` notion of allowed chars),
  instead of the current tight "collected-runes-only" character class.
- Keep the TryAPL call path (`exec`/`react`, `index.js:11-17`,`159-167`) unchanged; it already
  expects a 0/1 back.

### 1c. Author fresh levels (`rXcY.json`), hand-written

Scrap `r0c0.json` and `r0c-1.json`; author a new set by hand (no generator script), with
`r0c0` as the start room. Geography **loosely** follows the skill tree (tree informs layout; I
adjust for fun and playability), using the `r{row}c{col}` offset naming (negative allowed).

Per room:
- **Theme** chosen to match the problems inside (e.g. counting/forest, arithmetic/caves,
  comparison/cliffs, text/library, matrices/temple, magic-square/pure-magic finale) via
  `theme` `{w,wall,back,spot}`.
- **Rune tiles** = the collectible runes rooted in that area; **doors** (`l#`) gate exits/deeper
  rooms, their `req` = prerequisite runes from the tree, `add` = bonus runes where useful.
  Advanced/function problems become deeper gated challenges.
- **`task`** rewritten from the neutral challenge-site wording into the fantasy "rune stone"
  voice of the current `r0c0.json` (colored-rune intro sentence + a themed narrative framing of
  the same computation), keeping `{cd}` rune tokens / `` `code` `` / `_italic_` markup.
- **Validation**: value runes get `expr` (prefer randomized-data form like existing
  `+/(a b c)←3?99` where the task references named data; else the fixed `s`); function runes get
  `f`/`a`/`p` from 1b.

Author and verify **round by round** (a few rooms at a time) so each batch is playtested before
moving on. Ensure every file is valid JSON (single `theme` key).

### 1d. Diamond stones — rendering + belt (engine/CSS)

Add the enclosure "diamond" category so it can appear as tiles and be collected:

- **`index.css`**: add a diamond class (e.g. `.j`) sibling to `.m/.d/.M/.D` (`index.css:62-73`)
  — same size/box, but `border-radius:50%` (no sharp corners), a **neutral faded-rainbow radial
  gradient** fill (round-brilliant look), and no gemstone-tied border/text color.
- **`index.js`**: extend the challenge-type string `"mdMD"` used for tile routing
  (`index.js:100`) to include the diamond class, and extend the belt-row index used by
  `react` (`$$("#belt td")[g]`, `index.js:164`) so a solved/collected diamond lands in the new
  row. Choose an id/glyph encoding for the three enclosures that won't break selectors.
- **`index.html`**: add a 5th belt row (e.g. "diamond"/"crystal") to `#belt`.

---

## Workstream 2 — UI (do second)

All in `index.js` + `index.css` + `index.html`.

### 2a. Remaining-rune counter
- Add a small display element (e.g. in the belt `<fieldset>` legend or a header bar) in
  `index.html`.
- Count remaining challenge tiles in the current room: `$$("#M b.m,#M b.d,#M b.M,#M b.D").length`.
  Solved runes are moved into the belt by `react` (`index.js:164`) so they leave `#M` naturally.
- Update the count at end of `loadM` (`index.js:141`) and after each solve in `react`.

### 2b. Click / touch movement
- Refactor the inline movement body (`index.js:80-112`) into a reusable
  `step(newR,newC)` async function; the `keydown` handler and new pointer handlers both call it.
- Add a `pointerdown`/`click` handler on `#M` tiles: tap a tile → step one cell toward it
  (8-direction) using the tile's `r`/`c` (from `getR`/`getC`, `index.js:20-21`); tapping an
  adjacent rune/door triggers its interaction exactly as arrow-key entry does.
- Guard against movement while a `<dialog>` is open (same check as `index.js:80`).

### 2c. Responsive, no-scroll, phone-friendly
- Replace the fixed `--size:2.5rem` with a viewport-derived size so the whole board + belt +
  counter fit without scrolling: set CSS vars for the current room's column/row counts (from
  `rMax/cMax` in `loadM`) and compute `--size: min( (100dvw - margin)/cols , (100dvh - belt -
  header)/rows )` via `clamp()`/`min()`.
- `body{overflow:hidden}`, use `100dvh`, and a grid/flex layout stacking counter → board → belt.
- Keep the existing `resize` re-place handler (`index.js:48`). Verify `<meta viewport>` is
  present (it is, `index.html:4`) and dialogs remain usable on small screens.

---

## Workstream 3 — Coding conventions (do last)

Create **`CONVENTIONS.md`** capturing the Arthur Whitney–style JS rules, then refactor
`index.js` (and the new UI/engine code) to conform in one final sweep.

Rules to document + apply:
1. **Tagged-template calls**: when calling a function with a single string literal and no
   interpolation, use backticks and omit parens — `` f`str` `` — relying on single-element
   string-array → string coercion (works for DOM queries, `split`, `join`, and most string APIs).
   *Caveat*: only where the callee coerces/stringifies its argument (not where it type-checks
   for a string). Existing code already does `` .split`/` ``, `` .join`` ``.
2. **No spaces outside string literals** except leading indentation and deliberate vertical
   alignment that exposes code structure (Whitney "tables"). E.g. `a+b`, `f(x,y)`, `{a:1,b:2}`.
3. **Terser modern JS where it keeps clarity**: `?.`, `??`, `??=`/`||=`/`&&=`, destructuring +
   defaults, `.at(-1)` over `.pop()`/slice, `.flatMap`, `.replaceAll`, `matchAll`, computed keys,
   spread. Preserve the existing single-letter-local idiom.

The refactor is last so it also normalizes the function-test change (1b) and the UI code.

---

## Files to create / modify

- **Create**: `skilltree.json` (design artifact), new `rXcY.json` level set, `CONVENTIONS.md`.
- **Delete/replace**: `r0c0.json`, `r0c-1.json` (rewritten fresh).
- **Update (data)**: `APL Challenge content xref.xlsx` — complete the `r` markers (1a.0),
  keeping a backup of the original.
- **Modify**: `index.js` (function-test validation, diamond tile routing + belt index, movement
  refactor + touch, rune counter, responsive vars, conventions sweep), `index.css` (diamond
  class, responsive/no-scroll layout, counter), `index.html` (5th belt row for diamonds, counter
  element, any layout wrappers).

## Verification

- **Serve locally** (already running): `python3 -m http.server 8000 --bind 0.0.0.0`, open in
  browser (and via forwarded port / phone).
- **Xref completion**: derived round A 1–4 `r`s match the existing hand-marked ones; the saved
  .xlsx re-opens cleanly and diffs against the backup show only intended `r` cells added.
- **Content**: for each authored room, walk it, solve each rune (value and function types) and
  confirm TryAPL returns success; confirm doors unlock only with the right runes; confirm the
  remaining-rune counter reaches 0 when a room is cleared. Spot-check a sample of `expr` /
  function-harness strings directly against `https://tryapl.org/Exec` before shipping a batch.
- **UI**: keyboard + click/touch movement both work; tapping a rune/door interacts; the page
  never scrolls and the board+belt fit at desktop and phone sizes (test narrow viewport / device
  emulation); rotating / resizing keeps the player correctly placed.
- **Conventions**: `index.js` runs clean (no regressions) after the style sweep; skim it against
  `CONVENTIONS.md`.

## Risks / notes

- **Scope**: 90 source problems → author in round-sized waves, dedup exact (gemstone, glyph)
  runes so the collectible set stays manageable.
- **Function harness correctness**: dyadic vs monadic detection and `p` preprocess must match
  `Test.aplf` semantics; validate against TryAPL before relying on generated exprs.
- **`aski.pattern` relaxation** must still block APL features TryAPL bans (see the `safe` set in
  `Test.aplf`) enough to avoid confusing errors, without over-restricting function answers.
- **Randomized `expr`**: when generalizing fixed-data problems to random data, ensure the task
  references the same named variables the `expr` assigns (as `r0c0.json` does).
