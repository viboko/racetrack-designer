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

# Lint (ESLint) and check formatting (Prettier)
lint:
    npm run lint

# Type-check with tsc
typecheck:
    npm run typecheck

# Auto-format and fix lint issues
fmt:
    npm run fmt

# Everything CI runs
ci: install lint typecheck test build
