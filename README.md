# Oversight UI

The dashboard surface for **Oversight OS** — a control room where one human supervises many AI agents.

This repository is a **UI-only fork** for design collaboration. It runs in pure demo mode and does not require a backend. A scripted scenario boots inside the page on load (six agents register, one opens a critical decision, chat and audit events stream in) so you can exercise the full visual system with `npm run dev`.

> Looking to contribute? Read **[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)** — it walks you (and your AI coding tool) from zero to "PR opened" in about 20 minutes.

## Quick start

```bash
npm install
npm run dev          # opens at http://localhost:5173
```

If `npm run build` succeeds and `npm run typecheck` prints nothing, you're good to ship.

## What's in here

```
src/
├── App.tsx                    # 3-column layout shell
├── main.tsx                   # mount + boot demo runtime
├── index.css                  # design tokens + every component style
├── store.ts                   # event-sourced state (no backend coupling)
├── types.ts                   # event schema (inlined from @oversight/protocol)
├── demo-runtime.ts            # the ONLY mock layer — emits a full agent lifecycle
└── components/
    ├── OsBar.tsx              # header (Caveat brand, status pill, icon row)
    ├── Sidebar.tsx            # decision queue (left)
    ├── CenterStage.tsx        # dossier card (center) + DemoDossier
    ├── OpsPanel.tsx           # tabbed Audit / Chat / Files (right)
    ├── Environment.tsx        # atmosphere + grain layers
    ├── SourcePreview.tsx      # evidence drill-down overlay  ← collaboration surface
    └── AgentDispatcher.tsx    # "+ new agent" modal
```

The visual ground truth is mirrored at [`reference/v7-dossier.html`](reference/v7-dossier.html) — open it in a browser whenever you want to compare a change against the locked reference.

## Design system

Tokens, components, motion, and writing voice are documented in [`docs/design-system.md`](docs/design-system.md). It's locked — see § 8 of that doc for the non-negotiable list.

## Tech stack

- React 18 + Vite 6
- TypeScript strict
- Plain CSS (no Tailwind, no CSS-in-JS) — every token is a CSS custom property on `:root`
- No state library beyond a ~50-line `useStore`
- No router (single-page surface)

## License

Educational / collaboration use. Not for production resale.
