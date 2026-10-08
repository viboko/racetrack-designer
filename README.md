# Track Designer

A single-page web app for quickly making a background for a simple top-down racing game in
[Scratch](https://scratch.mit.edu). Sketch a loop and it becomes a track: textured grey road,
red-and-white kerbs and textured grass, at Scratch's 480×360 stage size.

## Using it

1. Drag on the canvas to sketch a loop. When you let go, the end joins back to the start and the
   sketch is smoothed into a track.
2. Reshape the track:
   - **Drag** a point to move it.
   - **Double-click the track** to add a point there.
   - **Double-click a point** to remove it.
   - The blue point marks where the start/finish line goes.
3. Adjust the **road width**, toggle the **start line**, and use **Undo** (Ctrl/Cmd+Z) or
   **Clear** as needed. Untick **Show points** to preview the result without handles.
4. Download:
   - **PNG 480×360**: exact stage size.
   - **PNG 960×720**: double resolution. Scratch 3 stores bitmap backdrops at 2×, so this one
     looks sharper on stage. Import it and it fills the stage.
   - **SVG**: kerbs and road are vector paths. The grass and asphalt textures are embedded as
     tiling PNG patterns.

If the loop crosses itself, the crossing becomes a junction: the road is drawn over the kerbs.

## Colour rules for the Scratch game

The game detects the edge of the track with `touching color`, so:

- **Kerbs are the only red or white things in the image.** They use pure red `#FF0000` and pure
  white `#FFFFFF`. Use those exact colours in your `touching color` blocks.
- Grass and asphalt textures stay well away from red and white. A unit test checks every texture
  pixel against both colours, so changing the textures can't quietly break detection.
- The start/finish line is black and yellow, so it never counts as an edge.
- Edges are antialiased, so a 1–2 px blend appears where the kerb meets road or grass. Detection
  still works because the kerb itself is solid.

## Development

Requires Node 24+ and [just](https://github.com/casey/just).

| Recipe           | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `just install`   | Install dependencies (`npm ci`)                           |
| `just dev`       | Run the Vite dev server                                   |
| `just build`     | Build the static site into `dist/`                        |
| `just preview`   | Build and serve the production bundle                     |
| `just test`      | Run unit tests (Vitest)                                   |
| `just lint`      | ESLint + Prettier check                                   |
| `just typecheck` | TypeScript type check                                     |
| `just fmt`       | Auto-format and auto-fix lint issues                      |
| `just ci`        | Everything CI runs: install, lint, typecheck, test, build |

### Layout

- `src/geometry.ts`: resampling, simplification, closed Catmull-Rom → Bézier spline, hit testing
- `src/sketch.ts`: freehand sketch → control points
- `src/textures.ts`: seeded, seamlessly tiling grass/asphalt textures (pure pixel buffers)
- `src/palette.ts`: kerb colours and the "too close to kerb" check
- `src/track.ts`: kerb width, stripe length, start-line layout (shared by PNG and SVG)
- `src/render.ts`: canvas renderer (on-screen and PNG export)
- `src/svg.ts`: SVG export
- `src/main.ts`: UI wiring, editing and undo history

## CI and deployment

- `.github/workflows/ci.yml` runs `just ci` on every pull request and on pushes to `main`.
- `.github/workflows/pages.yml` builds and deploys `main` to GitHub Pages. One-time setup: in the
  repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
