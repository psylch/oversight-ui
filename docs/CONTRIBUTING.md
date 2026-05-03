# Onboarding & Contribution Guide

> **Hi Niti** — this doc gets you (and your AI coding assistant) from zero to "PR opened" in about 20 minutes. You can also paste this entire file into Claude / Cursor / any AI coding tool and say *"follow this guide step by step"* — it's written so the agent can drive most of it for you.

---

## What you're contributing to

**Oversight OS** — a control room where one human supervises many AI agents. Chihao built the visual system and the supervisor surface. Your contribution is the **evidence drill-down**: when someone clicks an "Evidence" card in the central dossier, what view opens? What does it teach them about why the agent made the recommendation?

The current placeholder is `src/components/SourcePreview.tsx` — that's your starting point.

This repo is a **UI-only fork**. There is no backend to set up. A scripted demo runtime in `src/demo-runtime.ts` boots the page into a believable populated state — six agents register, one opens a critical decision, chat and audit events stream in. You can exercise the entire flow from `npm run dev` alone.

You'll work in your own GitHub fork, on a branch, and open a Pull Request back to `psylch/oversight-ui`. All changes are reviewed before merge.

---

## Prerequisites (one-time, ~10 min)

You need three tools:

### 1. Node.js (v20 or later)

If you already have Node, check the version:

```bash
node --version    # should print v20.x or higher
```

If not, install from https://nodejs.org or via `nvm`:

```bash
brew install nvm                 # macOS, one time
nvm install 20 && nvm use 20
```

`npm` ships with Node — no separate install.

### 2. GitHub CLI (`gh`)

```bash
brew install gh                  # macOS
# or see https://cli.github.com for other platforms
gh auth login                    # follow prompts; choose HTTPS + browser auth
```

Verify:

```bash
gh auth status                   # should say "Logged in to github.com as <your-username>"
```

### 3. Your AI coding tool

Anything works — Claude Code, Cursor, Windsurf, Copilot Chat. The rest of this guide assumes you're going to ask it to help. **You do not need to use the same tools Chihao uses.** No skills, MCP servers, or special setup required.

---

## Step 1 — Fork the repo

```bash
gh repo fork psylch/oversight-ui --clone --remote
cd oversight-ui
```

This creates `<your-username>/oversight-ui` on GitHub, clones it locally, and sets two git remotes:

- `origin` → your fork (where you push)
- `upstream` → `psylch/oversight-ui` (where you'll open PRs against)

Verify:

```bash
git remote -v
# origin    git@github.com:<you>/oversight-ui.git
# upstream  git@github.com:psylch/oversight-ui.git
```

## Step 2 — Install & run

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You should see the Oversight OS dashboard with a Caveat-script "Oversight OS" wordmark in the top-left, a queue of agents on the left, a critical decision card in the center, and a tabbed panel of audit events on the right. Click **Approve** on the center card — the agent moves to "Background", the eyebrow disappears, and the audit panel records the close.

If it doesn't run, paste the error into your AI tool and ask it to fix.

## Step 3 — Read the design system

**Before changing anything visual**, skim two files:

1. `CLAUDE.md` (in repo root) — what the project is, where the code is, what's allowed and not
2. `docs/design-system.md` — tokens, components, what's locked, what's forbidden

The whole design is locked to a reference called "v7-dossier" — open `reference/v7-dossier.html` in a browser to compare against. The design system doc transcribes everything you need.

You can also tell your AI tool: *"Read CLAUDE.md and docs/design-system.md before suggesting any changes."*

## Step 4 — Create a branch

```bash
git checkout -b drill-down-v1     # or any short descriptive name
```

## Step 5 — Make your change

Your starting points:

- `src/components/SourcePreview.tsx` — the current evidence preview overlay (URL → iframe, snippet → mono text). Redesign / extend this.
- `src/components/CenterStage.tsx` — the `onPreviewEvidence(name, art)` callback at the bottom is what the evidence cards call. If your drill-down needs more than the current `artifact` shape, extend the call site.
- `src/index.css` — add styles here. **Use existing tokens** (e.g. `var(--card-2)`, `var(--ink-2)`, `var(--radius-md)`). The design system doc lists them all.
- `src/demo-runtime.ts` — if you want to seed extra demo evidence so your drill-down has something to show, add it here.

If you're unsure: ask your AI tool *"following docs/design-system.md, suggest 3 different drill-down designs for SourcePreview that show why this evidence was flagged"*. Then iterate.

**Before you commit**, run both checks:

```bash
npm run typecheck         # must print nothing
npm run build             # must succeed
```

If either fails, fix it (or ask your AI tool to fix it) before committing.

## Step 6 — Commit & push

```bash
git add src/components/SourcePreview.tsx src/index.css
# (only stage files you actually changed; don't `git add .`)

git commit -m "Add evidence drill-down v1"

git push -u origin drill-down-v1
```

## Step 7 — Open the Pull Request

```bash
gh pr create --base main --head <your-username>:drill-down-v1 \
  --title "Evidence drill-down v1" \
  --body "Adds a richer evidence preview that shows trust-score breakdown and corroborating sources. See screenshots in PR description."
```

Or interactively:

```bash
gh pr create        # walks you through it
```

Then paste the PR URL to Chihao for review.

---

## Tips for working with your AI tool

- **Always show it `CLAUDE.md` and `docs/design-system.md` first.** Those two files plus this onboarding cover the whole context. If you give the AI just one of them, it will guess.
- **Small commits, small PRs.** One drill-down feature per PR. Easier to review, easier to revert.
- **If the AI suggests a new dependency, library, or visual pattern — push back.** The design system § 8 has a "forbidden list". Read it.
- **Demo mode IS the mode.** This repo has no backend. All interactions flow through `src/demo-runtime.ts`. If your drill-down needs to react to a click, route the side-effect through demo-runtime so the change is visible in the event stream.
- **You can ask the AI to verify visually.** Tools like Claude Code with browser automation can open `localhost:5173`, screenshot, and compare against `reference/v7-dossier.html`. If yours can do that, use it.

---

## Updating your branch with upstream changes

If Chihao merges things into `main` while you're working:

```bash
git fetch upstream
git rebase upstream/main          # replays your commits on top of latest main
git push --force-with-lease       # safe force-push to YOUR fork only
```

If `rebase` shows conflicts, ask your AI tool to walk you through resolving them.

---

## Quick reference

```bash
# Setup
gh repo fork psylch/oversight-ui --clone --remote
cd oversight-ui && npm install

# Daily loop
npm run dev                                # http://localhost:5173
git checkout -b my-feature
# ... edit ...
npm run typecheck && npm run build
git add <files> && git commit -m "..."
git push -u origin my-feature
gh pr create

# Sync with upstream
git fetch upstream && git rebase upstream/main && git push --force-with-lease
```

---

## When you're stuck

1. Check `CLAUDE.md` and `docs/design-system.md` first.
2. Ask your AI tool — paste the error or the question with file paths.
3. If still stuck, message Chihao with: what you tried, what you saw, what you expected.

That's it. Have fun.
