# RuneMaster JS Conventions

The engine is a single dense file (`index.js`). The house style is
Arthur Whitney–inspired: **maximum signal, minimum ceremony**. Read the
whole function at a glance; don't scroll. These rules capture that style —
apply them to `index.js` and any new JS. When density and clarity conflict,
clarity wins (a one-line comment is cheaper than an unreadable line).

---

## 1. Tagged-template calls

When calling a function with a **single string literal and no
interpolation**, use backticks and drop the parentheses, relying on
single-element string-array → string coercion:

```js
s.split`/`        // not s.split("/")
a.join``          // not a.join("")
```

**Caveat:** only where the callee coerces/stringifies its argument. Don't
use it where the callee type-checks for a real string, or where the
template has interpolation (`${…}`) — those need normal call syntax.
Already in the code: `terms=q.a.map(...).join\`\``.

## 2. No spaces outside string literals

Omit spaces except for **leading indentation** and **deliberate vertical
alignment** that exposes structure (Whitney "tables"). Inside string/template
literals, spacing is whatever the string needs.

```js
let newR=i.r,newC=i.c          // yes
JSON.stringify([0,0,0,s])      // not [0, 0, 0, s]
Object.defineProperty(i,"r",{get:()=>i.rVal,set:v=>place(i,i.rVal=v,i.cVal)})
```

Alignment tables are encouraged where rows share shape — the keydown
direction table and the `getTop`/`getLeft` pair already do this:

```js
const up   =()=>newR=i.r-1
const down =()=>newR=i.r+1
const left =()=>newC=i.c-1
const right=()=>newC=i.c+1
```

## 3. Terser modern JS (where it stays clear)

Reach for the concise form: `?.`, `??`, `??=`/`||=`/`&&=`, destructuring with
defaults, `.at(-1)` over `.pop()`/`slice(-1)`, `.flatMap`, `.replaceAll`,
`matchAll`, computed keys, and spread. All present already, e.g.
`doors[key]?.includes(id)`, `seen[cur]??=[]`, `[...new Set(...)]`,
`let[r,c]=k.split`,`.

## 4. Naming — single letters, short globals

Locals and hot globals are single letters or very short. New names follow
suit. The core globals (worth knowing, since the terseness leans on them):

| name          | is                  |     | name           | is                   |
| ------------- | ------------------- | --- | -------------- | -------------------- |
| `i`           | player element      |     | `j`            | current room JSON    |
| `M`           | map `<table>`       |     | `mem`          | room cache           |
| `mr`/`mc`     | room row/col offset |     | `cur`          | current room key     |
| `rMax`/`cMax` | last row/col index  |     | `doors`/`seen` | per-room saved state |
| `$`/`$$`      | querySelector / all |     | `td(r,c)`      | cell lookup          |

## 5. Control-flow idioms

- **Conditional side-effect as a ternary**, not `if`, when it's one action:
  `cond?doThing():0` (the `:0` is the throwaway else). See `chk()`.
- **Membership via `~indexOf`**: `~bi.indexOf(r)`, `~"mdMDj".indexOf(cls)`
  (truthy when found, since `~-1===0`).
- **Split-into-pairs / tokens**: `s.match(/../g)??[]` (the `??[]` guards the
  no-match `null`). Same `??[]` guard on any `.match` whose result is mapped.
- Prefer `for` loops only where an array method would obscure intent (e.g.
  the 3×3 reveal in `show()`); otherwise `.map`/`.forEach`/`.some`/`.every`.

## 6. DOM

Go through the `$`/`$$` helpers, never raw `document.querySelector*` in
bodies. Build HTML with template literals (`b()`, `loadM`), or
`document.createElement` only when the node must keep identity (`mkb`).

## 7. Comments

One-line `//` stating **intent or a non-obvious invariant** — never
restating the code. Write them **terse and telegraphic**: drop articles and
full sentences, keep only the punch. Align where a block shares a theme.

```js
// ignore diag move off edge (wall!)
//   was: a diagonal move off an edge is ignored (would land on a wall)

// tile click steps toward it; click outside map steps that way (even across edge)
//   was: click a tile to step toward it; click outside the map to step that way (even across an edge)
```
