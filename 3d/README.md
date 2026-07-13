# RuneMaster 3D

A first-person, grid-based dungeon-crawler rendering of [RuneMaster](../). Same maze, levels, runes, and puzzles as the top-down game — it reads the level files (`r*c*.json`) and fonts from the repository root — but you explore it in first person.

[Play it here](https://abrudz.github.io/runemaster/3d/). Progress is saved separately from the top-down game, so you can play both.

## Controls

- The maze is explored in **first person**. Turn left/right with **←/→** (or A/D, numpad 4/6), step forward/back with **↑/↓** (or W/S, numpad 8/2), and sidestep with **Q/E** — all without changing which way you face.
- On a touchscreen or with a mouse, tap a rune gem, door, or apple ahead to approach or interact with it; tap the top/bottom of the view to step forward/back, or the left/right sides to turn.
- A small **automap** below the view charts what you have seen, with an arrow showing where you stand and face.
- When prompted for an APL expression, either type it or click the rune gems and buttons to insert.
- A locked door shows 🚪🔒; once you hold its required runes it becomes 🚪🔓. Solve its puzzle and it turns into a plain 🚪 — step through it to enter the next room, and step back through the plain door on the far side to return.
- Free-standing apples (🍎) are the capstone challenges: each needs its required runes before it will pose its puzzle, but it never blocks your path. **Gather all nine apples to win.**
- Your progress is saved automatically; use _Restart_ to begin afresh.
