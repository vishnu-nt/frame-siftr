# Agent guide — Frame Siftr

Quick orientation for AI coding agents. Human-facing docs: [README.md](./README.md).

## What this repo is

Browser-only React app for labeling large image folders. Users upload folders (including nested subfolders), assign **labels** (UI sometimes says “categories”), filter by label or folder path, view full-screen, and persist work in **IndexedDB**. Export uses **JSON v2** (`ExportDataV2`) with `relativePath` per image for a local bash organize script.

No backend. No auth. Single active project (first project in DB wins).

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install deps (also `pnpm install` if using pnpm) |
| `npm start` | Dev server → http://localhost:3000 |
| `npm run build` | Production build |
| `npm test` | Jest via react-scripts (interactive watch) |

Stack: **Create React App** (`react-scripts` 5), **React 19**, **TypeScript 6**, **Tailwind 4**, **idb**, **react-window**.

## Terminology (important)

Code and types use **label** naming; some UI/README text still says **category**:

| Concept | Types / state | UI / files |
|---------|---------------|------------|
| Label definition | `Label` in `src/types/index.ts` | `CategoryManager.tsx`, props like `selectedCategory` |
| Per-image assignment | `ImageLabel.label` (string name) | Context menu / viewer |
| Label list on image | `ImageFile.labels?: string[]` | Thumbnail badges |

When adding features, prefer **`Label` / `labels` / `imageLabels`** in new code unless you are intentionally aligning UI copy only.

## Architecture

```
App.tsx → Layout.tsx
            ├── useAppState()     ← app state + DB sync
            ├── Sidebar           ← label filter, folder tree, import/export
            ├── Navbar            ← folder upload
            ├── ImageGrid         ← virtualized grid
            ├── ImageViewer       ← modal
            └── CategoryManager   ← label CRUD modal

Services:
  database.ts      IndexedDB (projects, categories store, labels store)
  fileUpload.ts    FileList → ImageFile[] (captures webkitRelativePath)
  utils/paths.ts   Path parse, folder tree, identity keys
  imageWorker.ts   Inline worker blob for thumbnails (optional path)

Workers:
  workers/imageProcessor.ts   Standalone worker source (ImageWorkerService embeds similar logic inline)
```

**State hub:** `src/hooks/useAppState.ts` — init DB, load/create project, label CRUD, image labeling, export/import, viewer navigation.

**Persistence:** `src/services/database.ts` — DB name `image-categorizer`, stores `projects`, `categories` (Label records), `labels` (ImageLabel records). `saveProject` writes all three.

**Upload flow:** `Navbar` (webkitdirectory) → `FileUploadService.processFileList` → `useAppState.handleImagesUploaded` (sets `uploadRoot`, reconciles labels). Paths stored as `relativePath` (relative to selected folder root).

**Organize workflow:** Export v2 JSON → run `scripts/organize-from-export.sh` from the **upload root** directory on disk.

## Key files

| Path | Role |
|------|------|
| `src/types/index.ts` | Canonical interfaces — start here for schema changes |
| `src/hooks/useAppState.ts` | Business logic; largest file to understand behavior |
| `src/components/Layout.tsx` | Wires hook + services + children |
| `src/components/ImageGrid.tsx` | Virtualization + filtering |
| `src/components/ImageThumbnail.tsx` | Thumbnail, context menu labeling |
| `src/services/database.ts` | All IndexedDB access |
| `tailwind.config.js` | Theme tokens (`cursor-*` colors) |

Test assets: `public/test-image-1.png`, `public/test-image-2.png`.

## Data model (source of truth)

```typescript
// src/types/index.ts — summarized
ImageFile      { id, name, relativePath, size, lastModified, file, url?, labels? }
Label          { id, name, color, count, createdAt }
ImageLabel     { id, relativePath, filename, size, lastModified, label, labeledAt }
ProjectData    { ..., uploadRoot?, formatVersion? }
ExportDataV2   { formatVersion: 2, uploadRoot, assignments[], labels[], summary }
```

Image identity: **`relativePath` + `size` + `lastModified`** (`buildImageIdentity` in `src/utils/paths.ts`). IndexedDB `labels` store keyPath is `id` (DB version 2).

## Common change locations

| Task | Where to edit |
|------|----------------|
| New UI panel / layout | `src/components/`, wire in `Layout.tsx` |
| State / labeling rules | `useAppState.ts` |
| Storage schema / migrations | `database.ts` + types; bump IDB version in `openDB` upgrade |
| Upload / file types | `fileUpload.ts` |
| Grid performance | `ImageGrid.tsx`, `react-window` |
| Styling | Tailwind classes in components; `src/index.css`, `App.css` |

## Conventions

- Functional components + hooks only.
- Services: class with static methods (`FileUploadService`) or singleton (`dbService` export from `database.ts`).
- Prefer extending `useAppState` return API and passing props down over new global state libraries.
- TypeScript strict-ish; define shared types in `src/types/index.ts`.
- Minimize scope: no unrelated refactors when fixing a bug.

## Known gaps (as of repo state)

- README still documents older `Category` / `categories` schema — **types file wins**.
- `handleDeleteLabel` notes missing `deleteCategory` in DB service.
- After page refresh, re-upload the same folder to restore thumbnails (labels persist in IndexedDB).
- Browsers do not expose absolute filesystem paths; export uses `relativePath` from `webkitRelativePath`.
- `ImageWorkerService` duplicates worker logic inline; `workers/imageProcessor.ts` may be unused by grid path — check call sites before consolidating.
- Only first project from `getAllProjects()` is loaded.

## Testing

- `src/App.test.tsx` — default CRA smoke test.
- Manual: `npm start`, upload folder, create label, label image, refresh (IndexedDB), export JSON, import JSON.

## What agents should avoid

- Adding a server, env secrets, or cloud storage without an explicit request.
- Renaming label ↔ category across the whole codebase in a drive-by change.
- Committing lockfile churn from switching package managers unless requested.

## Related docs

- [README.md](./README.md) — features, user guide (may be slightly stale on schema names)
- [CLAUDE.md](./CLAUDE.md) — Claude Code entry point (points here)
