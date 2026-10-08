# List available recipes
default:
    @just --list

# Install dependencies (clean, from the lockfile)
install:
    npm ci

# Run the dev server, reachable from other devices on the local network (e.g. a phone)
dev:
    npm run dev -- --host

# Build the static site into dist/
build:
    npm run build

# Serve the production build locally
preview: build
    npm run preview

# Run unit tests
test:
    npm test

# Type-check with tsc
typecheck:
    npm run typecheck

# Auto-format and fix lint issues
fmt:
    npm run fmt

# Lint TypeScript, JavaScript and YAML
lint-js:
    npx eslint .

# Check formatting
lint-format:
    npx prettier --check .

# Lint markdown
lint-markdown:
    npx markdownlint-cli "**/*.md" --ignore node_modules --ignore dist

# Lint css
lint-css:
    npx stylelint "src/**/*.css"

# Lint the built html
lint-html: build
    npx html-validate dist/index.html

# Check robots.txt, sitemap.xml, and that OG/canonical URLs are absolute
lint-seo: build
    #!/usr/bin/env bash
    set -euo pipefail
    test -f dist/robots.txt || { echo "missing dist/robots.txt"; exit 1; }
    test -f dist/sitemap.xml || { echo "missing dist/sitemap.xml"; exit 1; }
    test -f dist/CNAME || { echo "missing dist/CNAME"; exit 1; }
    f=dist/index.html
    grep -oE 'property="og:url" content="[^"]*"' "$f" | grep -q 'content="https://' \
        || { echo "$f: og:url is missing or not an absolute https URL"; exit 1; }
    grep -oE 'rel="canonical" href="[^"]*"' "$f" | grep -q 'href="https://' \
        || { echo "$f: canonical link is missing or not an absolute https URL"; exit 1; }
    echo "SEO checks passed"

# Lint source files, then check the built html
lint: lint-js lint-format lint-markdown lint-css lint-html lint-seo

# Check accessibility (WCAG2AA) with pa11y against the built site
check-pa11y: build
    #!/usr/bin/env bash
    set -euo pipefail
    npx http-server dist -p 4001 -s >/dev/null 2>&1 &
    server_pid=$!
    trap 'kill "$server_pid" 2>/dev/null' EXIT
    for i in $(seq 1 30); do
        curl -sf http://localhost:4001/ >/dev/null && break
        sleep 1
    done
    npx pa11y-ci

# Check accessibility with Lighthouse against the built site
check-lighthouse: build
    npx lhci autorun

# Check accessibility (pa11y and Lighthouse) against the built site
check-accessibility: check-pa11y check-lighthouse

# Check npm dependencies for known vulnerabilities against the OSV database
check-security:
    osv-scanner scan source -r .

# Everything CI runs
ci: install lint typecheck test build check-accessibility check-security

# Remove build artifacts and caches
clean:
    rm -rf dist coverage .lighthouseci
