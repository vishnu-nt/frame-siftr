# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: [AGENTS.md](./AGENTS.md) exists but describes an older Create React App / single-project / no-auth version of this app. It is stale — the app now runs on Vite/Vitest and has multi-project + auth support (see below). Trust this file and `src/types/index.ts` over AGENTS.md and README.md where they disagree.

## Commands

This repo uses **pnpm** (see `pnpm-lock.yaml`; there is no `package-lock.json`/`yarn.lock`) — use `pnpm`, not `npm`. Node version is pinned to **24** (`.nvmrc`, `package.json` `engines.node`).

```bash
pnpm install       # install deps
pnpm start          # dev server (Vite) → http://localhost:3000
pnpm build           # tsc typecheck + vite build
pnpm preview          # preview a production build
pnpm test            # vitest (watch mode by default)
pnpm test -- --run    # single run, e.g. for CI-style checks
pnpm test -- src/utils/paths.test.ts   # run a single test file
```

Before opening a PR: `pnpm build` must pass; run `pnpm test` if you touched tested behavior (only `src/App.test.tsx` and `src/utils/paths.test.ts` exist today). Do not commit unless the user asks.

**Node version gotcha:** `pnpm build` / `pnpm start` fail with `Error [ERR_REQUIRE_ESM] ... std-env/dist/index.mjs` (thrown while Vite loads `vite.config.ts`, which pulls in `vitest/config`) if the active `node` is older than **v22.12.0** — that's the version where Node stabilized synchronous `require()` of ESM. This bites in a fresh Claude Code shell because a non-interactive shell doesn't always source `nvm` from `.zshrc`/`.bashrc`, so `node` on `PATH` can silently resolve to an older system install (e.g. a Homebrew `node` in `/usr/local/bin`) instead of the pinned v24. If you hit that error, don't debug Vite/vitest — check `node -v` first and switch: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use` (reads `.nvmrc`). If the `pnpm` shim itself is missing or broken after switching Node versions, invoke it via corepack directly: `node /usr/local/lib/node_modules/corepack/dist/pnpm.js <command>`.

## Architecture

Browser-only React app for labeling large local image folders — no server-side data layer. All image data stays local (File objects, IndexedDB); the only network calls are Supabase auth and PostHog analytics.

```
index.tsx → App.tsx (session gate via Supabase auth)
              ├── LandingPage / AuthForm   ← signed-out state
              └── Layout.tsx               ← signed-in state
                    ├── useAppState()          ← composed state hook (see below)
                    ├── ProjectDashboard        ← project list/create/switch
                    ├── Navbar                  ← folder upload, progress
                    ├── Sidebar                 ← label filter, folder tree, import/export
                    ├── ImageGrid → GridCell     ← virtualized grid (react-window)
                    ├── ImageViewer              ← full-screen modal
                    ├── CategoryManager          ← label CRUD modal
                    └── SettingsModal
```

**State hub:** `src/hooks/useAppState.ts` composes focused sub-hooks in `src/hooks/useAppState/`:
`useProjects` (DB init, load/create/switch project, `lastActiveProjectId` in localStorage), `useLabels` (label CRUD), `useImages` (uploaded `ImageFile[]`), `useSelection` (filters), `useViewerNavigation` (full-screen viewer state), `useExportImport` (JSON/folder/zip export, import). Read `useAppState.ts` first to see how they're wired together before diving into a sub-hook.

**Persistence:** `src/services/database.ts` — IndexedDB via `idb`, database `image-categorizer` (version 2), stores `projects`, `categories` (legacy name, holds `Label` records), `labels` (`ImageLabel` records). `dbService` is a singleton; `saveProject` writes all three stores. Multiple projects are supported (not single-active-project) — see `useProjects`.

**Auth:** `src/services/supabaseClient.ts`. If `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are unset or placeholder values, it falls back to `MockSupabaseClient`, a localStorage-backed auth mock (`framesiftr_mock_users` / `framesiftr_mock_session`) with the same `auth.*` surface as `@supabase/supabase-js`. `App.tsx` gates on `supabase.auth.getSession()`; there is currently no server-side data sync — Supabase is used for auth only, all project/image data stays in IndexedDB.

**Upload flow:** `Navbar` (webkitdirectory input) → `FileUploadService.processFileList` (`src/services/fileUpload.ts`, captures `webkitRelativePath`) → `useAppState`'s image handling sets `uploadRoot` and reconciles labels. Image identity is `relativePath` + `size` + `lastModified` (`buildImageIdentity` in `src/utils/paths.ts`), since browsers don't expose absolute filesystem paths.

**Export:** `src/services/exportService.ts` + `ExportDropdown.tsx` support three modes (`ExportMode = 'json' | 'folder' | 'zip'`): JSON export (`ExportDataV2`, formatVersion 2, `relativePath` per assignment), on-disk folder copy via File System Access API, and in-browser zip via `fflate`. `scripts/organize-from-export.sh` (bash + `jq`) is a legacy path for organizing files from an exported JSON when run from the original upload root — the in-app `folder`/`zip` export modes now cover the same use case.

**Thumbnails/workers:** `src/services/thumbnailCache.ts` + `src/services/imageWorker.ts` (inline worker blob) generate/cache thumbnails off the main thread. `src/workers/imageProcessor.ts` is standalone worker source that appears unreferenced by the current grid path — check call sites before assuming it's live.

**Analytics:** PostHog is initialized in `src/index.tsx` only in production builds (`import.meta.env.PROD`), keyed by `VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST`; disabled for local dev.

## Naming (important)

Types use `Label` / `imageLabels` (see `src/types/index.ts`); some UI files/props still say `Category`/`selectedCategory` (e.g. `CategoryManager.tsx`) and the `categories` IndexedDB store name is legacy. Don't mix schemas when editing persistence — prefer `Label`/`labels`/`imageLabels` in new code.

## Key files

| Path | Role |
|------|------|
| `src/types/index.ts` | Canonical interfaces — start here for schema changes |
| `src/hooks/useAppState.ts` + `src/hooks/useAppState/*` | Business logic |
| `src/services/database.ts` | All IndexedDB access |
| `src/services/supabaseClient.ts` | Auth (real Supabase or localStorage mock) |
| `src/services/exportService.ts` | JSON/folder/zip export logic |
| `src/components/Layout.tsx` | Wires hook + services + children |
| `src/components/ImageGrid.tsx`, `GridCell.tsx` | Virtualization + filtering |
| `tailwind.config.js` | Theme tokens (Tailwind v4) |

## Conventions

- Functional components + hooks only; TypeScript strict mode.
- Services are a class with static methods (`FileUploadService`) or a singleton export (`dbService`, `supabase`).
- Storage schema changes: update `src/types/index.ts` and bump the IDB version in `database.ts`'s `openDB` upgrade callback.
- Prefer small, targeted diffs matching existing Tailwind + functional React patterns; no unrelated refactors.
