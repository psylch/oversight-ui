# Contributing — read this in 3 minutes

Hi Niti 👋 — welcome.

## The fast path

1. Fork & clone this repo (`gh repo fork psylch/oversight-ui --clone --remote`, or use the GitHub website).
2. Open the cloned `oversight-ui/` folder in **Claude Code** (or Cursor / Windsurf — anything works).
3. Say:
   > "Read CLAUDE.md and docs/CONTRIBUTING.md, then walk me through making my first change step by step."

That's it. The agent already has all the rules (`CLAUDE.md` is auto-loaded) and will drive the rest — install, dev server, edit, commit, push, PR. If you get stuck on any step, paste the error back to it.

## What you're building

The **evidence drill-down**. In the dossier card (center of the screen), each evidence row is a clickable card. Right now clicking it opens a placeholder overlay (`src/components/SourcePreview.tsx`). Your job is to redesign that overlay so it shows *why* the evidence was flagged or trusted — trust-score breakdown, corroborating sources, the kind of context a supervisor needs in 3 seconds before approving the decision.

**v1 scope (ship this first):** click an evidence card → overlay opens → shows trust-score breakdown + 1-2 corroborating sources + a sentence explaining why it was flagged/verified. Visual must match v7-dossier (see `reference/v7-dossier.html` and `docs/design-system.md`). Anything beyond this is nice-to-have — let's get v1 in first.

## Where to look

| File | What |
|---|---|
| `src/components/SourcePreview.tsx` | The overlay you're redesigning. |
| `src/components/CenterStage.tsx` | The `onPreviewEvidence(name, art)` callback at the bottom — this is what evidence cards call when clicked. |
| `src/index.css` | Add styles here. **Use existing tokens** (`var(--card-2)`, `var(--ink-2)`, etc.). |
| `src/demo-runtime.ts` | If you want richer demo evidence to design against, add it here. |
| `docs/design-system.md` | The locked design rules. Skim § 8 (forbidden list) before designing. |
| `reference/v7-dossier.html` | The visual ground truth. Open in a browser to compare against. |

## Things to know

- **No backend.** This repo runs in pure demo mode. Everything works from `npm run dev` alone.
- **Before committing**, the agent will run `npm run typecheck` and `npm run build`. Both should pass.
- **One feature per PR.** Don't bundle drill-down + other polish.
- **Stuck?** Paste the error to your AI tool first. If still stuck, ping Chihao.

## Cheatsheet (if you want to drive manually)

```bash
gh repo fork psylch/oversight-ui --clone --remote
cd oversight-ui
npm install
npm run dev                        # http://localhost:5173

git checkout -b drill-down-v1
# ... edit ...
npm run typecheck && npm run build
git add <the files you changed>
git commit -m "Add evidence drill-down v1"
git push -u origin drill-down-v1
gh pr create
```
