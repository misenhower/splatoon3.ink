# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Splatoon3.ink displays Splatoon 3 map rotations, Salmon Run schedules, SplatNet gear, and more. It has a Vue 3 frontend (`src/`) and a Node.js backend (`app/`) in a single repository. The backend fetches data from Nintendo's SplatNet3 GraphQL API via nxapi and publishes updates to social media (Mastodon, Bluesky, Threads).

## Commands

```bash
npm run dev            # Vite dev server with HMR
npm run build          # Production frontend build to dist/
npm run lint           # ESLint check
npm run lint-fix       # ESLint auto-fix
npm test               # Run Vitest once
npm run test:watch     # Vitest in watch mode
```

Backend commands (require .env configuration):
```bash
npm run splatnet:quick # Quick data update (skip localizations, X-Rank, fest rankings)
npm run splatnet       # Default data update
npm run splatnet:all   # Full data update (all regions, all features)
npm run social         # Post status updates to social media
npm run social:test    # Test social posting (writes to files)
npm start              # Full production: sync → splatnet → social → cron
```

## Architecture

**Frontend** (`src/`): Vue 3 + Vue Router + Pinia + Tailwind CSS + vue-i18n (14 languages). Path alias `@/` maps to `src/`. Pinia stores in `src/stores/` fetch from `/data/*.json` endpoints. The `useDataStore` orchestrates loading schedules, gear, coop, and festival data.

**Backend** (`app/`): Node.js CLI dispatched through `app/index.mjs`. Commands map to actions (splatnet, social, sync, cron, etc.).

**Data pipeline**: `NsoClient` (Nintendo auth) → `SplatNet3Client` (GraphQL queries) → DataUpdaters (`app/data/updaters/`) → JSON files in `dist/data/` → Frontend Pinia stores → Vue components. Images are processed via sharp. Data is optionally archived and synced to S3.

**Social media**: StatusGenerators (`app/social/generators/`) create content from data. Clients (`app/social/clients/`) post to each platform. Screenshots are generated via puppeteer-core + a browserless service.

**Scheduling**: Cron jobs (`app/cron.mjs`) run data updates and social posting at intervals.

## Code Style

- ESLint flat config with Vue, JSDoc, and import-alias plugins
- 2-space indentation, single quotes, semicolons, trailing commas on multiline
- In `src/` files, use `@/` import alias (e.g., `import Foo from '@/components/Foo.vue'`)
- Vue: multi-word component names not required, up to 4 attributes per single line, self-closing void HTML elements
- Node.js 22, ESM modules throughout (`.mjs` extension for backend files, `.js`/`.vue` for frontend)

## Testing

Tests use Vitest. Test files live alongside source: `app/**/*.test.mjs` and `src/**/*.test.{js,mjs}`.

## Deployment

- Frontend: built to `dist/` and deployed to AWS S3 (static hosting)
- Backend: Docker container (`docker/app/Dockerfile`) pushed to GitHub Container Registry
- `dist/` is not emptied on build (preserves generated `dist/data/` from backend)
- Browserless runs as a separate Docker service for screenshot generation
