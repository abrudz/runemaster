# RuneMaster: 4×4 world, readable digits, apple-per-room, animated runes

## Context

RuneMaster (`index.js` + per-room `rNcM.json` maps) is an APL maze game: move a player,
collect rune gems (gated by prerequisite runes), open locked doors, and gather apples
(capstone challenges) to win. Challenges are narrative wrappings of the 90 apl.quest
problems (rounds A–I × P1–P10); each is checked live on TryAPL via `exec()`.

This change reshapes and polishes the game per the user's brief:

- **Readability** — digits (esp. `0`/`1`) render in the serif body font (Almendra) and are
  hard to read. Render them in the APL font (SAX2) *without* leaking them into a challenge's
  "allowed runes" list.
- **Feel** — when a rune is earned, it should fly smoothly from the challenge dialog to its
  belt slot instead of popping into place.
- **World** — reshape to a **4×4 grid (16 rooms)**. The Grove is the **south-western room of
  the central 2×2**. Some rooms move.
- **Apples everywhere** — every one of the 16 rooms gets exactly one 🍎; **win = all 16**.
  New apples are drawn from apl.quest, chosen so **every rune is used in at least one apple**,
  and several are phrased as **"transform [data] into [result]."**
- **Interesting layouts** — maze/wall variety themed to each room, preserving the two
  X-shaped rooms (Sundered Cross, Crossmark Vault) and the Pyramid shape (Great Pyramid).
- **Soft traps** — via **topology only** (no new tile mechanic): you enter a region freely,
  but the way back / onward is a locked door needing a rune found within or beyond.
- **Solvability** — the game must be completable both topographically (edge crossings land on
  open ground; no hard deadlock) and skill-tree-wise (every required rune obtainable).
- **Process** — write `PLAN.md` to repo root; create GitHub epics + issues referencing it;
  branch, commit against issues, open a PR for review.

## Decisions (from clarification)

| Question | Answer |
| --- | --- |
| Win condition | Collect **all** apples (now 16) |
| World size | **4×4 = 16 rooms** (revised down from 5×5) |
| Grove position | SW of the central 2×2 → keep at **`r0c0`** |
| One-way doors | **Topology soft-traps** only (reuse locked doors) |

Grid coordinates: **rows −2..1 × cols −1..2**. This keeps `r0c0`=Grove as the start (no
starting-position code change) and makes it the SW cell of the central 2×2 (rows {−1,0} ×
cols {0,1}). The mini-map already iterates rows −2..1; only its column range changes.

---

## Epic 1 — Engine & UX (`index.js`, `index.css`, `index.html`)

**Issue 1.1 — Readable digits in body text.**
In `md()` (index.js:15), append one pass that wraps digit runs *outside* HTML tags in an
APL-font span, using a lookahead that skips text already inside a tag (e.g. `tabindex='0'`):

```js
.replace(/\d+(?![^<]*>)/g,"<span class=num>$&</span>")
```

Add `.num{font-family:APL;font-weight:bold}` to `index.css`. This is purely presentational:
`keys()` (index.js:14) still derives allowed runes only from `req`/`add`/dfn-keys/single
`` `x` `` backtick tokens, so digits never appear as clickable runes. Verify a task like
`` `1 2 3` `` and prose "from 1 to n" both show APL-font digits with no digit buttons.

**Issue 1.2 — Animate earned rune dialog→belt.**
In `react()` (index.js:236, the rune-collected `else` branch), capture the dialog's on-screen
rect *before* `ask.close()`, then FLIP-animate the gem element `c` from that origin to its
final belt slot using the Web Animations API (translate + scale for the size change), e.g.:

```js
const o=ask.getBoundingClientRect()          // origin: challenge dialog (captured pre-close)
$$("#belt td")[g].appendChild(c)             // land in the belt (final layout position)
const f=c.getBoundingClientRect()
c.animate([{transform:`translate(${o.left+o.width/2-f.left}px,${o.top+o.height/2-f.top}px) scale(2)`,opacity:.4},{transform:"none",opacity:1}],{duration:500,easing:"ease-in-out"})
```

Keep `chk();count();mini();save()` after. Gem keeps identity (no clone needed).

**Issue 1.3 — 4×4 mini-map + layout.**
- `mini()` (index.js:72): change column loop to `for(let cc=-1;cc<=2;cc++)` (4 cols; rows
  already −2..1).
- `index.css`: landscape `#util` width `calc(var(--mini)*5 + 2rem)` → `*4`.

**Issue 1.4 — Win on all 16 apples.**
- `react()` (index.js:235): `apples.length>=9` → `>=16`.
- `win()` message and `README.md`: "all nine apples" → "all sixteen apples."
- Bump save key `KEY="runemaster"` → `"runemaster2"` (index.js:4) so pre-reshape saves that
  reference removed/renamed room coords are discarded cleanly.

---

## Epic 2 — Reshape world to 4×4 (map JSON)

Target grid (each cell = room file; `+` = apple newly added this change):

```
        c-1                c0                 c1                 c2
r-2  NEW "Sieve" +aJ    Automaton Loom aF   NEW +aK            NEW +aL
r-1  Amphitheatre aI    Weaver's Hall +aM   Crossmark Vault aB Great Pyramid aH
r0   Reckoner Forge +aN THE GROVE aA        The Caverns +aO    Hall of Scales +aP
r1   Sundered Cross aD  Tally Spires aE     Hall of Mirrors aG Roll Call aC
```

**Issue 2.1 — Relocate the three out-of-bounds (col-3) rooms** by renaming files and
reworking their edge rows/cols so crossings land on open ground on both sides:
- `r1c3.json` (Sundered Cross, **keep X/cross shape**) → `r1c-1.json`
- `r-1c3.json` (Tally Spires) → `r1c0.json`
- `r0c3.json` (Hall of Mirrors) → `r1c1.json`

**Issue 2.2 — Create three new rooms** (top row) with themed layouts + apples:
- `r-2c-1.json` — sets/overlap theme (apple B2, `d∩`); lattice/interlock walls.
- `r-2c1.json` — divergence/comparison theme (apple C1, `d≠`).
- `r-2c2.json` — distinctness theme (apple B8, `d∧`).

**Issue 2.3 — Interesting, themed layouts + edge audit.** For every room, vary walls into
small mazes/motifs referencing its name (keep required chokepoints); preserve X shapes
(Sundered Cross, Crossmark Vault) and the Pyramid (Great Pyramid). Ensure each of the 24
internal edges has at least one matching open-ground crossing on both sides. Reference:
`[[map-topology]]`, `[[map-edge-exits]]`, `[[make-maps-interesting]]`.

---

## Epic 3 — Content: apple per room, rune coverage, doors

**Issue 3.1 — Seven new apples** (`aJ`..`aP`), one per apple-less/new room. Chosen so their
solutions cover the 11 runes no capstone uses (`d∩ d⌊ d⌈ d⌿ d< d≤ d≥ d> d∧ d≠ M¨`):

| Apple | Room | apl.quest | Runes covered | Style |
| --- | --- | --- | --- | --- |
| aN | Reckoner's Forge | B5 Self Replication | `d⌿` | transform |
| aM | Weaver's Hall | D5 All Backwards | `M¨` | transform |
| aO | The Caverns | B4 Staying In Bounds | `d⌊ d⌈` | transform (clamp) |
| aP | Hall of Scales | B6 Double Vision | `d< d≤ d≥ d>` | transform |
| aJ | NEW r-2c-1 | B2 Intersection | `d∩` | transform |
| aK | NEW r-2c1 | C1 Comparing This… | `d≠` | transform |
| aL | NEW r-2c2 | B8 Unique Characters | `d∧` | function |

Each apple: narrative `task`, `req` = the runes its solution needs, and `expr` (value) or
`f`+`a` (function) copied/adapted from `challenge-site/app/{round}.json5`. Result: **every one
of the 37 runes is used in at least one apple** (9 capstones cover 26; these 7 cover the rest).

**Issue 3.2 — "Transform data into result" phrasing.** Author the value-type apples above and
a few new preparatory door challenges in explicit *"Transform `x` into `y`"* framing (e.g.
Weaver's/D5: "Transform the strand `⍵` by reversing each thread within it").

**Issue 3.3 — Preparatory doors & rune reachability.** All 37 rune stones already exist across
the kept rooms, so no new runes are introduced. Add locked-door puzzles where the new topology
needs a gate (soft traps) and to make new rooms interesting; ensure each new apple's `req`
runes have a stone reachable before that apple. Add door problems only where a region would
otherwise be trivially open or unreachable.

---

## Epic 4 — Solvability & verification

**Issue 4.1 — Challenge verification.** For every new/edited challenge, reproduce the engine's
checker and confirm on TryAPL that the reference solution passes and an incomplete one fails.
Follow `[[verify-runemaster-challenges-on-tryapl]]`.

**Issue 4.2 — Topology + skill-tree solver.** Write a throwaway script (`scratchpad`) that
loads all 16 room JSONs and BFS-simulates play: rooms connected by open-ground edge crossings;
a rune/door/apple is obtainable when its `req` ⊆ currently-held runes and its cell is reachable;
iterate to a fixpoint. Assert: (a) every edge crossing lands on open ground both ways;
(b) all 37 runes obtainable; (c) all 16 apples obtainable; (d) no rune stone is gated only
behind a door needing that same (transitively) rune. Fix maps until clean.

---

## Epic 5 — Process

**Issue 5.1** — Write `PLAN.md` to repo root (this document, lightly adapted) so issues can
reference it.
**Issue 5.2** — Create GitHub issues on `abrudz/runemaster`: one tracking ("epic") issue per
Epic 1–5 above with a child-issue checklist, plus the child issues, each linking `PLAN.md`.
(GitHub has no native epics → tracking issues + an `epic` label.)
**Issue 5.3** — Branch (e.g. `4x4-world`), commit in logical chunks referencing issue numbers
(`#n`), open one PR to `main` for review linking `PLAN.md` and closing the issues.

---

## Files touched

- `index.js` — `md()` digit span; `react()` fly animation + win=16; `mini()` col range; `KEY`.
- `index.css` — `.num` APL font; `.a`/`#util` landscape width `*4`.
- `README.md` / `win()` — "all sixteen apples."
- Map JSON — rename 3 (`r1c3→r1c-1`, `r-1c3→r1c0`, `r0c3→r1c1`); add 3
  (`r-2c-1`, `r-2c1`, `r-2c2`); edit most for edges/layout/new apples.
- New: `PLAN.md` (repo root).

## Verification

1. `python3 -m http.server` (see `serve.bat`); open the game.
2. Digits: open any challenge with numbers → digits in APL font, no digit buttons in
   "allowed runes."
3. Animation: solve a rune stone → gem flies from dialog to its belt slot.
4. Mini-map shows a 4×4 grid; every room shows a 🍎 badge until collected.
5. Walk every edge in all four directions → always land on open ground (no wall/locked-door
   landing); Epic 4.2 solver passes.
6. Collecting the 16th apple triggers the win dialog; README text matches.
7. `git diff`/PR renders; issues linked.
