# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Frame Siftr. PostHog (`posthog-js` + `@posthog/react`) was installed and initialized in `src/index.tsx` with the `PostHogProvider` wrapping the entire app. Nine events covering the full user journey — from sign-up through photo culling to export — are now instrumented. Users are identified on sign-in and sign-up so that all subsequent events are linked to a known identity. Exception tracking (`captureException`) was added to all auth, project, label, and export error paths.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully creates a new account | `src/components/AuthForm.tsx` |
| `user_signed_in` | User successfully signs in | `src/components/AuthForm.tsx` |
| `project_created` | A new culling project is created | `src/hooks/useAppState/useProjects.ts` |
| `project_deleted` | A project is deleted | `src/hooks/useAppState/useProjects.ts` |
| `images_uploaded` | A folder of images is loaded into a project (`image_count`, `has_subfolders`, `project_id`) | `src/hooks/useAppState/useImages.ts` |
| `image_labeled` | An image is assigned a label — the core culling action (`label_name`, `is_relabel`, `project_id`) | `src/hooks/useAppState/useLabels.ts` |
| `label_created` | A new label is created in a project (`label_name`, `project_id`) | `src/hooks/useAppState/useLabels.ts` |
| `project_exported` | User exports their work (`export_mode`: json \| folder \| zip, `labeled_image_count`, `project_id`) | `src/hooks/useAppState/useExportImport.ts` |
| `project_imported` | User imports a previously exported project (`project_id`, `labeled_image_count`, `label_count`) | `src/hooks/useAppState/useExportImport.ts` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/204097/dashboard/755088)
- [New signups & sign-ins](https://eu.posthog.com/project/204097/insights/FcXdAc49)
- [Activation funnel: Signup → Project → Upload → Label](https://eu.posthog.com/project/204097/insights/QVynXez7)
- [Images labeled per day](https://eu.posthog.com/project/204097/insights/hgfW7cq5)
- [Exports by mode](https://eu.posthog.com/project/204097/insights/EM4yuXrO)
- [Projects created over time](https://eu.posthog.com/project/204097/insights/fThJlr63)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the current implementation identifies on fresh login/signup only, so returning sessions that bypass the auth form will remain on anonymous distinct IDs until they sign in again.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-vite/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
