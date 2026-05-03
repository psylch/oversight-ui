---
title: Oversight OS — Design System (v7-dossier lock)
description: Single source of truth for tokens, components, layout, motion, and writing voice. Anything you build must conform to this spec.
status: locked
date: 2026-05-03
---

# Design System — v7-dossier

This is the **only** spec you need to consult when adding or changing UI in this repo. It is locked: do not invent new tokens or new visual treatments without a written reason.

The reference HTML implementation lives at [`reference/v7-dossier.html`](../reference/v7-dossier.html). Open it in a browser when in doubt — it is the visual ground truth.

---

## 1. Design intent

Oversight OS is a **control room for an executive overseer of AI agents**. Every screen should feel like:

- A pilot's heads-up display, not a SaaS dashboard
- Calm at rest, **alarming when it should be alarming**, never noisy
- Information-dense without being cluttered — generous use of mono labels for scope, sans for content
- Glass-on-chrome surfaces over a deep void atmosphere; depth comes from layered shadows and atmospheric gradients, not borders

Three writing rules:

1. **Don't say the same thing twice.** If the header says it, the eyebrow doesn't.
2. **No FYI noise.** Quiet states get *less* UI, not a "QUIET LANE" banner.
3. **Mono labels are scope; sans is content.** Don't mix them inside one phrase.

---

## 2. Tokens

All tokens live in `src/index.css` under `:root`. Use the variables — never hard-code colors, radii, or shadows.

### 2.1 Color (OKLCH)

```css
/* Background void */
--void:        oklch(0.075 0.005 278);   /* page bg */
--void-2:      oklch(0.105 0.012 278);   /* slight lift */

/* Glass on chrome — for floating panels (queue, right panel, header) */
--glass-01: rgba(255, 255, 255, 0.025);
--glass-02: rgba(255, 255, 255, 0.045);
--glass-03: rgba(255, 255, 255, 0.07);
--hair:        rgba(255, 255, 255, 0.07);   /* hairline border */
--hair-strong: rgba(255, 255, 255, 0.13);
--blur:        blur(28px) saturate(1.4);

/* Card surfaces — for elevated solid panels (dossier card, modal) */
--card:    oklch(0.135 0.008 278);
--card-2:  oklch(0.155 0.01 278);
--row:     oklch(0.12 0.008 278);
--row-hover: oklch(0.145 0.01 278);

/* Ink (text on dark) */
--ink-1: rgba(255, 255, 255, 0.96);   /* headlines, primary content */
--ink-2: rgba(255, 255, 255, 0.66);   /* body */
--ink-3: rgba(255, 255, 255, 0.42);   /* meta, mono labels */
--ink-4: rgba(255, 255, 255, 0.22);   /* dividers in text */

/* Semantic — needs (red) — used for "decision required", flagged, errored */
--c-needs:      oklch(0.7 0.21 25);
--c-needs-soft: oklch(0.18 0.08 25 / 0.4);
--c-needs-edge: oklch(0.5 0.18 25 / 0.42);
--c-needs-glow: oklch(0.7 0.21 25 / 0.55);

/* Semantic — flight (blue) — used for "running", "in flight", live agent */
--c-flight:      oklch(0.74 0.13 235);
--c-flight-soft: oklch(0.18 0.08 235 / 0.4);
--c-flight-edge: oklch(0.5 0.16 235 / 0.42);

/* Semantic — done (muted) */
--c-done: oklch(0.55 0.02 280);

/* Action accent (Approve primary) — same blue family as flight, more saturated */
--c-action:      oklch(0.62 0.18 245);
--c-action-2:    oklch(0.55 0.18 245);
--c-action-soft: oklch(0.32 0.14 245 / 0.45);
--c-action-edge: oklch(0.55 0.18 245 / 0.6);

/* Decoration — purple/teal for diagram arrows; presentation only */
--c-deco-1: oklch(0.66 0.2 295);
--c-deco-2: oklch(0.7 0.13 195);
```

**Color rules:**
- Neutrals are tinted toward hue `278` (the brand purple). Never use a true gray.
- Never use pure `#000` or `#fff` — always tint via OKLCH.
- Never use cyan-on-dark + purple-to-blue gradient as decoration. (That's the AI-slop palette; we are different *because* we use semantic-only color.)
- Reds (`--c-needs`) are reserved for **action-needed**. Never use red for "delete" buttons unless the action is destructive AND blocked-on-user.
- Blues (`--c-flight` / `--c-action`) are for **in-progress** and **primary action**. Same family on purpose.

### 2.2 Radius

```css
--radius-lg: 22px;   /* outer card, modal, panel */
--radius-md: 14px;   /* inner blocks, buttons */
--radius-sm: 8px;    /* small chips, hit zones */
--radius-xs: 4px;    /* tier badges */
```

Concentric rule: **outer radius = inner radius + padding**. If a card is `--radius-lg` (22) with 14px inner padding, inner block should be `--radius-md` (~8 = 22 − 14, but we use 14 for visual rhythm).

### 2.3 Type scale

```css
--sans: "Geist", -apple-system, system-ui, sans-serif;
--mono: "Geist Mono", "JetBrains Mono", monospace;
/* Brand mark only */
"Caveat" — only for the "Oversight OS" wordmark in the header. Never anywhere else.
```

| Use | Size | Weight | Family | Notes |
|---|---|---|---|---|
| Brand wordmark | 26px | 600 | Caveat | Header only |
| Card title | 22px | 500 | sans | `text-wrap: balance`; letter-spacing `-0.012em` |
| Body / recommendation | 14px | 400 | sans | `text-wrap: pretty`; line-height 1.65 |
| Default body | 13–14px | 400 | sans | line-height 1.55 |
| Sub / row meta | 11–12.5px | 400–500 | sans | |
| **Mono labels** (timestamps, tier badges, counters, scope) | 9.5–11.5px | 400–600 | mono | uppercase + `letter-spacing: 0.14–0.18em` for headings; tabular for numbers |

Apply `font-variant-numeric: tabular-nums` to anything that updates live (timestamps, counters, elapsed). Already on `body`.

### 2.4 Shadow / depth

Two stock shadows:

```css
/* Glass panel (queue, right-col, header) */
box-shadow:
  0 24px 60px -18px rgba(0,0,0,0.55),
  inset 0 1px 0 rgba(255,255,255,0.05);

/* Elevated card (dossier card, modal) */
box-shadow:
  0 36px 80px -24px rgba(0,0,0,0.7),
  0 14px 28px -10px rgba(0,0,0,0.45),
  inset 0 1px 0 rgba(255,255,255,0.05);
```

The `inset 1px white-5%` highlight is the "edge of glass" — keep it on every elevated surface.

---

## 3. Layout

### 3.1 Page shell

```
header (56px, glass-on-chrome, sticky-feeling)
workspace (calc(100vh - 56px), 3 columns, never page-scrolls)
  ├─ queue (264px)
  ├─ center (1fr)
  └─ right-col (340px)
```

The page itself never scrolls. **Each column scrolls itself** with a bottom-fade mask.

### 3.2 Center column behaviour

`.center` is a CSS grid with `grid-template-rows: auto 1fr`:

- Row 1 (`auto`): the **eyebrow alarm bar** — only rendered when `urgency === "critical"` or `"sign-off"`. Quiet states omit it entirely (do not render a calm placeholder).
- Row 2 (`1fr`): the dossier card with `align-self: center; max-height: 100%`.
  - Content small → card sits at natural height, vertically centered in the column
  - Content overflows → card grows to `max-height: 100%`, `.card-scroll` overflows, `data-overflow="true"` triggers the bottom 56px mask, `.card-actions` stays pinned at the bottom

This **content-aware stage** behavior is non-negotiable. Don't add `min-height` to `.card` to "make it look the same every time" — the asymmetry is intentional.

### 3.3 Spacing scale

4pt scale, semantic naming preferred when adding new tokens:
`4, 8, 12, 14, 18, 22, 24, 32`

Avoid 16/20/28/40 unless aligning to an existing rhythm. Card padding is `18px 24px`; queue padding is `14px 8px 12px`; workspace gap is `18px`.

---

## 4. Components catalog

| Component | File | Source of v7 markup | Status |
|---|---|---|---|
| Header | `OsBar.tsx` | `index.html` `.header` | locked |
| Decision queue (left) | `Sidebar.tsx` | `.queue` | locked |
| Dossier card (center) | `CenterStage.tsx` `<DossierCard>` | `.card` | locked |
| 3-block diagram | inside CenterStage | `.diagram` | **demo content only** — see §5 |
| Evidence grid | inside CenterStage | `.card-evidence` | locked, drill-down hookable |
| Tabbed panel (right) | `OpsPanel.tsx` | `.right-col .panel` | locked |
| Source preview overlay | `SourcePreview.tsx` | (added by port) | open for redesign |
| Agent dispatcher modal | `AgentDispatcher.tsx` | (added by port) | functional, visual-debt — see §6 |

When adding new screens, **reuse existing primitives** (`.card`, `.glass`, `.row`, `.btn`, `.eyebrow`, `.tab-section`). Do not introduce a new container shape without a written reason.

---

## 5. Diagram block (`.diagram`)

The 3-block "Existing → Replace → Suggestion → Ship → Action" is **visual narrative, not data-driven** in v1. Protocol `DecisionOpenEvent` only has `headline` + `recommendation` (free text) + `evidence[]`. There is no structured before/after/action.

Rules:
- For demo / static screens: use the `DEMO_DECISION.diagram` content from `CenterStage.tsx`.
- For real decisions: render the same demo content as a **placeholder narrative** until the protocol grows structured fields.
- Do NOT try to NLP-parse `recommendation` to extract before/after. We tried. It's lossy and worse than the placeholder.

If you need to remove the diagram for a specific use case, hide it via prop, don't delete the structure.

---

## 6. Interaction patterns

### 6.1 Buttons

- **Primary**: blue gradient (`--c-action` → `--c-action-2`), white-overlay highlight, used for "Approve / Acknowledge / Send" — at most ONE per stage
- **Danger**: red soft fill, red border, used for "Reject / Block" — only when the destructive action is the inverse of primary
- **Ghost**: row-color fill, hairline border, used for everything else ("Chat with agent", cancel, secondary action)
- All buttons: `scale(0.96)` on press; never `0.95` or below
- All interactive surfaces: ≥ 40×40px hit area (use `::before` pseudo-extender if visible size is smaller)

### 6.2 Hover

- Glass surfaces lift to `--glass-02` background
- Borders strengthen from `--hair` to `--hair-strong`
- Never use `transition: all` — always specify properties (`background`, `border-color`, `transform`)

### 6.3 Selection

- Queue rows in "Needs review" lane: selected → `--c-needs-soft` background + `--c-needs-edge` border + name color → `--c-needs`
- Queue rows in "Running" lane: selected → `--c-flight-soft` + `--c-flight-edge` + name → `--c-flight`
- The selection color **matches the lane semantic**, not a global "selected" color

### 6.4 Motion

- Workspace columns enter staggered: queue 0ms, center 90ms, right 180ms (already implemented in `index.css` "POLISH PASS")
- Card body cross-fade on tab switch (already implemented)
- Eyebrow dot pulses 1.8s ease-in-out infinite on critical
- Modal entry: backdrop fade (160ms) + modal `translateY(8px) → 0` (180ms) with `cubic-bezier(0.2, 0, 0, 1)`
- **No bouncy easing.** Real objects decelerate.

### 6.5 Empty / quiet states

- A quiet center stage means *less* UI, not a "Quiet Lane" banner. Hide the eyebrow, let the card center vertically. (See §3.2.)
- Empty panel tabs: short helpful sentence (`<= 12 words`), no illustration, no "click here to add..."

---

## 7. Writing voice

- Sentence case for buttons, headings, tabs (`Decision queue`, not `DECISION QUEUE` — caps are reserved for mono scope labels)
- Mono ALL-CAPS only for: scope (`AI-EVAL SESSION · DONE · STATUS`), tier badges (`V/M/U`), section heads inside diagram (`EXISTING / SUGGESTION / ACTION`), and timestamps
- Tone: neutral pilot's HUD. Never apologize, never cheerlead. "All quiet." > "Nothing here yet — let's get started!"
- No emoji in product UI. (We have one exception: the avatar gradient is itself the personality.)

---

## 8. The forbidden list (non-negotiable)

1. **No left-stripe accents.** `border-left: 4px solid red` on cards/list items/alerts is banned. Use the existing semantic background tints instead.
2. **No gradient text** (`background-clip: text`). Solid color only.
3. **No glassmorphism on top of glassmorphism.** Glass panels never nest inside other glass panels. (Glass on void only.)
4. **No card inside a card.** The dossier card has inner blocks, not inner cards.
5. **No new fonts.** Geist sans + Geist mono + Caveat (brand mark only). To use a fourth font you need a written design rationale.
6. **No new color hues.** If you need a new semantic color, derive it via OKLCH from an existing hue, don't introduce a new one.
7. **No `transition: all`.** Specify properties.
8. **No `min-height` band-aids on `.card`.** The content-aware stage is correct. Variable card heights are fine.
9. **No "FYI" pills, banners, or eyebrows.** If the information isn't actionable, it doesn't earn a high-attention treatment.

---

## 9. Adding a new component — checklist

Before opening the PR, confirm:

- [ ] Uses existing tokens (no new hex, no new px in radius/font-size)
- [ ] Reuses an existing container primitive (card / glass panel / row)
- [ ] Buttons follow primary/danger/ghost taxonomy
- [ ] Hover and focus-visible states defined
- [ ] Press scale is `0.96`
- [ ] Hit area ≥ 40×40 (extend with `::before` if needed)
- [ ] No item in §8 forbidden list
- [ ] Visually compared against `visual-exploration/v7-dossier/index.html` for tone match
- [ ] `npm run build` passes (zero TS errors — `npm run typecheck` is the same check)
