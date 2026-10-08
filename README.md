# RaceTrack Designer

A single-page web app for making the background of a simple top-down racing
game. Sketch a loop and it becomes a track - textured road, red-and-white
kerbs and grass - ready to download as a PNG or SVG. Built with
[Vite](https://vite.dev) and TypeScript.

Live at <https://racetrack.viboko.dev>.

The kerbs are the only pure red (`#FF0000`) and pure white (`#FFFFFF`) things
in the image, so a game can detect the edge of the track by colour.

## Running locally

Install dependencies:

```bash
just install
```

Then start the dev server:

```bash
just dev
```

The site will be available at <http://localhost:5173>.

## Checks

The `ci` GitHub Actions workflow runs four independent checks on every push
and pull request: `just lint`, `just typecheck test build`,
`just check-accessibility`, and `just check-security`. Pushes to `main` that
pass are deployed to GitHub Pages by the `deploy` workflow.

### Linting

```bash
just lint
```

Lints TypeScript and YAML (`eslint`), formatting (`prettier`), Markdown
(`markdownlint`), CSS (`stylelint`), the built HTML (`html-validate`), and SEO
basics (`robots.txt`, `sitemap.xml`, absolute OG/canonical URLs).

### Tests

```bash
just test
```

Runs the unit tests with Vitest. `just typecheck` type-checks with `tsc`.

### Accessibility

```bash
just check-accessibility
```

Checks accessibility with `pa11y-ci` (WCAG2AA) and Lighthouse. Both build the
site and serve it locally to run against.

### Security

```bash
just check-security
```

Checks npm dependencies for known vulnerabilities with
[`osv-scanner`](https://google.github.io/osv-scanner/) against the
[OSV database](https://osv.dev). `osv-scanner` isn't managed by
`just install` - install it separately, e.g. `brew install osv-scanner`.

Vulnerabilities that don't apply (e.g. dev-only tooling with no fix
available) are suppressed with a reason in [`osv-scanner.toml`](osv-scanner.toml)
rather than silently ignored.

Separately, [Dependabot](.github/dependabot.yml) opens a PR weekly for any
outdated npm package or GitHub Action.
