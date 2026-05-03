# Oversight UI — agent guide

You are working in `oversight-ui`, a single-page React frontend for a product called **Oversight OS** (a control room for one human supervising many AI agents). This repository is a UI-only fork — there is no backend, no database, no API to call. A scripted demo runtime in `src/demo-runtime.ts` simulates a full agent lifecycle so the page boots into a believable, populated state.

Read this file first. It tells you the rules. Then read `docs/design-system.md` before touching any visual code.

## What's in scope

| Path | Purpose |
|---|---|
| `src/components/` | All UI components — this is most of the work |
| `src/index.css` | Design tokens + every component style. **No CSS lives anywhere else.** |
| `src/store.ts` | Event-sourced state. ~50 lines. Don't replace with redux/zustand/etc. |
| `src/types.ts` | Inlined event schema. Keep it minimal — only fields the UI uses. |
| `src/demo-runtime.ts` | The ONLY mock layer. If you need new demo data, add it here, don't sprinkle mocks across components. |
| `docs/design-system.md` | The locked design system spec. Conform to it. |
| `reference/v7-dossier.html` | Visual ground truth. Open in a browser to compare. |

## What's out of scope

- No backend code. There is no daemon, CLI, websocket, or HTTP API. Don't add `fetch` to a localhost URL.
- No new dependencies unless there's a written reason in the PR.
- No new fonts, color hues, or radii outside the design tokens in `:root`.
- No tests (yet). If you add one, add Vitest, not Jest.

## Tech preferences

- **Package manager: `npm` is the default.** `bun` and `pnpm` also work — `package.json` is plain enough that any of them is fine. Don't commit `bun.lock` and `package-lock.json` together; pick one.
- **TypeScript strict.** `npm run typecheck` (= `tsc --noEmit`) must pass before any PR.
- **`npm run build` must pass.** It runs typecheck + vite build.
- **React 18 + Vite 6.** No Next.js, no React Server Components.
- **Plain CSS.** No Tailwind, no styled-components, no CSS-in-JS. All tokens are `var(--...)` from `:root` in `index.css`.
- **Hand-write components.** No shadcn, Radix, MUI, etc.

## Don't

- Don't introduce a new state library. `useStore` in `store.ts` is intentional.
- Don't introduce a routing library. There are no routes.
- Don't reformat files you didn't change. ESLint/Prettier are not enforced; keep diffs small.
- Don't write new docs unless asked.
- Don't bypass the demo runtime — if a component needs to "do" something on user input, route it through `demo-runtime.ts` so the change is visible in the event stream.

## Where to make changes — by task type

| You want to | Edit |
|---|---|
| Redesign evidence drill-down | `src/components/SourcePreview.tsx` and the `onPreviewEvidence` callback in `CenterStage.tsx` |
| Add a new tab to the right panel | `src/components/OpsPanel.tsx` — extend the `Tab` union, add a section |
| Add a new event type | `src/types.ts` first, then handle in `store.ts` `applyEvent`, then render |
| Style anything | `src/index.css` only. Use existing tokens. |
| Test a new flow in demo | Edit `src/demo-runtime.ts` — add events to the scenario, or write a new scenario |

## Workflow

1. `npm install`
2. `npm run dev` (http://localhost:5173)
3. Make changes. Verify in the browser against `reference/v7-dossier.html`.
4. `npm run build` (must pass)
5. Commit, push, open PR (see `docs/CONTRIBUTING.md`)

## When in doubt

The visual answer is `reference/v7-dossier.html`. The structural answer is `docs/design-system.md`. The behavior answer is `src/demo-runtime.ts`. If the answer isn't in those three files, ask the maintainer in the PR.
