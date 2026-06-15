# Claude Code — Cullr

Read **[AGENTS.md](./AGENTS.md)** first. It is the canonical onboarding doc for all AI agents in this repo.

## Quick start

```bash
npm install && npm start
```

## Focus areas for Claude

1. **State:** Almost all product logic lives in `src/hooks/useAppState.ts`.
2. **Naming:** Types use `Label` / `imageLabels`; UI files may say `Category` — do not mix schemas when editing persistence.
3. **Storage:** Client-only IndexedDB via `src/services/database.ts`; no API layer.
4. **Scope:** Prefer small, targeted diffs; match existing Tailwind + functional React patterns.

## Before opening a PR

- `npm run build` should pass.
- Run `npm test` if you changed behavior covered by tests (test suite is minimal today).
- Do not commit unless the user asks.

## Human documentation

[README.md](./README.md) describes end-user features; if it conflicts with `src/types/index.ts` or `AGENTS.md`, trust the code and AGENTS.md.
