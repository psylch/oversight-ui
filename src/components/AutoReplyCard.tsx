import { useEffect, useRef, useState } from "react"
import { AgentAvatar } from "./AgentAvatar"
import { setSelectedRecCard } from "../store"

const ICON_CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12l5 5L20 7" />
  </svg>
)
const ICON_EDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const ICON_X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const ICON_RULE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

// ── Claim attribution data ───────────────────────────────────────────────────
//
// Validation score logic:
//   Each source type has a reliability weight:
//     DOCS (user-authored / verified)  → 1.00  (directly written or confirmed by user)
//     INTERNET (scraped / external)    → 0.80  (public but may be stale or misrepresented)
//     MODEL (paraphrase / no citation) → 0.38  (model inference — no direct backing)
//
//   score = Σ(share% × weight) / Σ(share%)
//
//   Claim ❶: (70×1.00 + 20×0.38) / 90  = 77.6/90  ≈ 84 %
//   Claim ❷: (95×1.00 +  5×0.38) / 100 = 96.9/100 ≈ 96 %  (rounded to nearest integer, capped at 96)
//   Claim ❸: (80×0.80 + 20×0.38) / 100 = 71.6/100 ≈ 71 %
//   Claim ❹: (100×0.38)          / 100 = 38 %
//
type SourceKind = "model" | "docs" | "internet"

interface ClaimData {
  num: 1 | 2 | 3 | 4
  symbol: string
  colorClass: "ar-amber" | "ar-green" | "ar-red"
  text: string
  sourceTrace: string
  bars: Array<{ kind: SourceKind; pct: number }>
  validity: number
  warning?: string
  noCitations?: boolean
}

const SOURCE_COLOR: Record<SourceKind, string> = {
  model:    "var(--c-needs)",
  docs:     "oklch(0.72 0.13 145)",
  internet: "oklch(0.74 0.14 60)",
}

const CLAIMS: ClaimData[] = [
  {
    num: 1, symbol: "❶", colorClass: "ar-amber",
    text: "2.4× faster than FlintKit",
    sourceTrace: "product-docs/bench.md (line 42) · model paraphrase",
    bars: [{ kind: "model", pct: 20 }, { kind: "docs", pct: 70 }],
    validity: 84,
  },
  {
    num: 2, symbol: "❷", colorClass: "ar-green",
    text: "Our last public benchmark (Mar 14)",
    sourceTrace: "blog/post-mar14.md · user-written",
    bars: [{ kind: "docs", pct: 95 }],
    validity: 96,
  },
  {
    num: 3, symbol: "❸", colorClass: "ar-amber",
    text: "FlintKit doesn't publish enterprise-tier numbers",
    sourceTrace: "flintkit.com/pricing · scraped 2d ago",
    bars: [{ kind: "internet", pct: 80 }, { kind: "model", pct: 20 }],
    validity: 71,
  },
  {
    num: 4, symbol: "❹", colorClass: "ar-red",
    text: "Happy to DM you the raw trace if useful.",
    sourceTrace: "",
    bars: [{ kind: "model", pct: 100 }],
    validity: 38,
    warning: 'tone flag: reads casual for enterprise audience. offer ("DM trace") has no backing source.',
    noCitations: true,
  },
]

function validityColor(v: number): string {
  if (v >= 80) return "oklch(0.72 0.13 145)"
  if (v >= 60) return "oklch(0.74 0.14 60)"
  return "var(--c-needs)"
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function ClaimTooltip({ claim, anchorRect }: { claim: ClaimData; anchorRect: DOMRect }) {
  const vcolor = validityColor(claim.validity)

  // Position: below the anchor span, clamped so it doesn't clip the right edge
  const left = Math.min(anchorRect.left, window.innerWidth - 320 - 12)
  const top  = anchorRect.top - 8

  return (
    <div
      className="ar-tip"
      style={{ left, top, transform: "translateY(-100%)" }}
      onMouseEnter={(e) => e.stopPropagation()}
    >
      <div className="ar-tip-head">
        <span className={`ar-tip-num ${claim.colorClass}`}>{claim.num}</span>
        <span className="ar-tip-quote">"{claim.text}"</span>
      </div>

      {claim.warning ? (
        <div className="ar-tip-warning">⚠ {claim.warning}</div>
      ) : (
        <div className="ar-tip-source">{claim.sourceTrace}</div>
      )}

      <div className="ar-tip-bar-wrap">
        {claim.bars.map((b) => (
          <div
            key={b.kind}
            className="ar-tip-bar-seg"
            style={{ width: `${b.pct}%`, background: SOURCE_COLOR[b.kind] }}
            title={`${b.kind} · ${b.pct}%`}
          />
        ))}
      </div>
      {claim.noCitations && (
        <div className="ar-tip-no-cite">no citations found</div>
      )}

      <div className="ar-tip-score" style={{ color: vcolor }}>
        {claim.validity}%
        <span className="ar-tip-score-label">validity</span>
      </div>
    </div>
  )
}

// ── Confidence ring ──────────────────────────────────────────────────────────
function ConfidenceRing({ pct }: { pct: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const filled = circ * pct
  return (
    <svg viewBox="0 0 100 100" className="ar-ring" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="oklch(0.74 0.14 60)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 19, fontWeight: 600, fill: "var(--ink-1)", fontFamily: "var(--sans)" }}>
        {Math.round(pct * 100)}%
      </text>
      <text x="50" y="66" textAnchor="middle"
        style={{ fontSize: 8, fill: "var(--ink-3)", fontFamily: "var(--sans)" }}>
        confidence
      </text>
    </svg>
  )
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${String(sec).padStart(2, "0")}s`
}

type Action = "send" | "edit" | "save" | "decline"

// ── Main component ────────────────────────────────────────────────────────────
export function AutoReplyCard() {
  const [decide, setDecide] = useState(132)
  const [action, setAction] = useState<Action>("send")
  const [hoveredClaim, setHoveredClaim] = useState<ClaimData | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [c1, c2, c3, c4] = CLAIMS as [ClaimData, ClaimData, ClaimData, ClaimData]

  useEffect(() => {
    timerRef.current = setInterval(() => setDecide((c) => Math.max(0, c - 1)), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function handleClaimEnter(claim: ClaimData, e: React.MouseEvent<HTMLSpanElement>) {
    setHoveredClaim(claim)
    // snapshot rect so tooltip stays pinned while mouse moves within the span
    setAnchorRect(e.currentTarget.getBoundingClientRect())
  }
  function handleClaimLeave() {
    setHoveredClaim(null)
    setAnchorRect(null)
  }

  return (
    <section className="center no-eyebrow">
      <article className="card ar-card">

        {/* Header */}
        <div className="ar-header">
          <div className="ar-header-main">
            <div className="ar-eyebrow">
              <span>Recommendation</span>
              <span className="ar-sep">·</span>
              <span>auto-reply</span>
            </div>
            <div className="ar-title-row">
              <AgentAvatar agentId="rec_agent_social" size="sm" title="Agent E" />
              <h2 className="ar-title">Agent E wants to auto-reply</h2>
            </div>
          </div>
          <div className="ar-header-end">
            <span className="ar-expiry">18m <span className="ar-sep">·</span> expires</span>
            <button type="button" className="close-btn" onClick={() => setSelectedRecCard(null)} aria-label="Close">
              {ICON_X}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ar-body">

          {/* Left column */}
          <div className="ar-left">
            <span className="ar-conf-label">overall confidence</span>
            <ConfidenceRing pct={0.62} />
            <div className="ar-warning">
              <span className="ar-warn-icon">⚠</span>
              <span>below your 80% auto-send threshold</span>
            </div>
            <dl className="ar-stats">
              <div className="ar-stat-row"><dt>claims cited</dt><dd>3 / 4</dd></div>
              <div className="ar-stat-row"><dt>low-conf claim</dt><dd>1</dd></div>
              <div className="ar-stat-row"><dt>time to decide</dt><dd>{fmt(decide)}</dd></div>
            </dl>
          </div>

          {/* Right column */}
          <div className="ar-right">
            <div className="ar-draft-meta">
              <span className="ar-dm-key">draft reply</span>
              <span className="ar-sep">·</span>
              <span>replying to a public thread</span>
              <span className="ar-sep">·</span>
              <span>tone target:</span>
              <div className="ar-dm-tone">professional / enterprise</div>
            </div>

            <div className="ar-tweet">
              <div className="ar-tweet-head">
                <span className="ar-tweet-handle">@raj_builds</span>
                <span className="ar-sep">·</span>
                <span className="ar-tweet-age">2h</span>
              </div>
              <p className="ar-tweet-body">
                is your thing actually faster than FlintKit for folks on enterprise plans? or is that a benchmark thing
              </p>
            </div>

            <div className="ar-draft-box">
              <div className="ar-draft-hint">hover any underlined claim to inspect its source</div>
              <p className="ar-draft-text">
                Hey Raj — yes, we benchmark roughly{" "}
                <span className={`ar-claim ${c1.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c1, e)} onMouseLeave={handleClaimLeave}>
                  {c1.symbol} {c1.text}
                </span>
                {" "}on typical enterprise workloads.{" "}
                <span className={`ar-claim ${c2.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c2, e)} onMouseLeave={handleClaimLeave}>
                  {c2.symbol} {c2.text}
                </span>
                {" "}used a 50-rps cold-start workload across 3 regions.{" "}
                <span className={`ar-claim ${c3.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c3, e)} onMouseLeave={handleClaimLeave}>
                  {c3.symbol} {c3.text}
                </span>
                , so we only compared against their open-source tier.{" "}
                <span className={`ar-claim ${c4.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c4, e)} onMouseLeave={handleClaimLeave}>
                  {c4.symbol} {c4.text}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="ar-footer">
          {(["send", "edit", "save", "decline"] as Action[]).map((a) => {
            const isActive = action === a
            const isDecline = a === "decline"
            const cls = isActive
              ? isDecline ? "btn danger" : "btn primary ar-btn-primary"
              : "btn ghost ar-btn-ghost"
            const label = a === "send" ? "Send" : a === "edit" ? "Edit" : a === "save" ? "Save as rule" : "Decline"
            const icon = a === "send" ? ICON_CHECK : a === "edit" ? ICON_EDIT : a === "save" ? ICON_RULE : ICON_X
            return (
              <button key={a} type="button" className={cls} onClick={() => setAction(a)}>
                {icon} {label}
              </button>
            )
          })}
        </footer>

      </article>

      {/* Tooltip — rendered outside .card so it's never clipped */}
      {hoveredClaim && anchorRect && (
        <ClaimTooltip claim={hoveredClaim} anchorRect={anchorRect} />
      )}
    </section>
  )
}
