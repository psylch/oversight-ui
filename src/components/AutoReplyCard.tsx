import { useState } from "react"
import { createPortal } from "react-dom"
import { setOpsTab } from "../store"
import { CardHeader } from "./CardChrome"

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
const ICON_RULE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const ICON_REJECT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
)
const ICON_CHAT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
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
  docs:     "var(--c-ok)",
  internet: "var(--c-warn)",
}

const CLAIMS: ClaimData[] = [
  {
    num: 1, symbol: "❶", colorClass: "ar-amber",
    text: "median build 2.1s vs Riverbend 6.4s",
    sourceTrace: "compare/launch · build-bench Apr 27 · model paraphrase",
    bars: [{ kind: "model", pct: 20 }, { kind: "docs", pct: 70 }],
    validity: 84,
  },
  {
    num: 2, symbol: "❷", colorClass: "ar-green",
    text: "last public benchmark Apr 27 (n=412)",
    sourceTrace: "blog/post-apr27.md · user-written",
    bars: [{ kind: "docs", pct: 95 }],
    validity: 96,
  },
  {
    num: 3, symbol: "❸", colorClass: "ar-amber",
    text: "Riverbend doesn't publish enterprise-tier numbers",
    sourceTrace: "riverbend.dev/pricing · scraped 2d ago",
    bars: [{ kind: "internet", pct: 80 }, { kind: "model", pct: 20 }],
    validity: 71,
  },
  {
    num: 4, symbol: "❹", colorClass: "ar-red",
    text: "Happy to DM you the raw trace if useful.",
    sourceTrace: "",
    bars: [{ kind: "model", pct: 100 }],
    validity: 38,
    warning: 'tone flag: reads casual for an enterprise prospect thread. offer ("DM trace") has no backing source.',
    noCitations: true,
  },
]

function validityColor(v: number): string {
  if (v >= 80) return "var(--c-ok)"
  if (v >= 60) return "var(--c-warn)"
  return "var(--c-needs)"
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function ClaimTooltip({ claim, mouseAt }: { claim: ClaimData; mouseAt: { x: number; y: number } }) {
  const vcolor = validityColor(claim.validity)

  // Position: floating to the right of the cursor, clamped to viewport.
  const TIP_W = 300
  const left = Math.min(mouseAt.x + 16, window.innerWidth - TIP_W - 12)
  const top  = Math.min(mouseAt.y + 8, window.innerHeight - 220)

  return (
    <div
      className="ar-tip"
      style={{ left, top }}
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
  const ringColor = pct >= 0.8 ? "var(--c-ok)" : pct >= 0.6 ? "var(--c-warn)" : "var(--c-needs)"
  return (
    <svg viewBox="0 0 100 100" className="ar-ring" aria-hidden="true" data-step-target="ar-ring">
      <circle cx="50" cy="50" r={r} fill="none" style={{ stroke: "var(--hair)" }} strokeWidth="11" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        style={{ stroke: ringColor }}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 19, fontWeight: 500, fill: "var(--ink-1)", fontFamily: "var(--mono)" }}>
        {Math.round(pct * 100)}%
      </text>
      <text x="50" y="68" textAnchor="middle"
        style={{ fontSize: 7, fill: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: 1 }}>
        CONFIDENCE
      </text>
    </svg>
  )
}


// ── Decision tree ────────────────────────────────────────────────────────────
type NodeState = "chosen" | "rejected" | "flagged"

interface TreeNode {
  id: string
  x: number; y: number; w: number; h: number
  label: string
  sub: string
  state: NodeState
}

interface Edge { from: string; to: string; state: NodeState }

const TREE_NODES: TreeNode[] = [
  { id: "root",     x:   8, y: 184, w: 200, h: 64, state: "chosen",
    label: "@raj_builds asked", sub: "“faster than Riverbend?”" },

  { id: "thread",   x: 232, y: 144, w: 200, h: 56, state: "chosen",
    label: "reply in-thread", sub: "public, visible" },
  { id: "dm",       x: 232, y: 224, w: 200, h: 56, state: "rejected",
    label: "DM instead", sub: "no public signal" },
  { id: "escalate", x: 232, y: 304, w: 200, h: 56, state: "rejected",
    label: "skip → escalate to Alex", sub: "tone risk low" },

  { id: "casual",   x: 456, y:  64, w: 200, h: 56, state: "rejected",
    label: "tone: casual", sub: "matches @raj’s style" },
  { id: "pro",      x: 456, y: 144, w: 200, h: 56, state: "chosen",
    label: "tone: professional", sub: "enterprise prospect guard" },
  { id: "dry",      x: 456, y: 224, w: 200, h: 56, state: "rejected",
    label: "tone: technical/dry", sub: "too cold for X" },

  { id: "bench",    x: 680, y:  64, w: 208, h: 56, state: "chosen",
    label: "cite Apr-27 benchmark", sub: "high validity (96%)" },
  { id: "internal", x: 680, y: 144, w: 208, h: 56, state: "rejected",
    label: "quote internal numbers", sub: "not public yet — risk" },
  { id: "trace",    x: 680, y: 224, w: 208, h: 56, state: "flagged",
    label: "offer: DM raw trace", sub: "38% validity (model only)" },
]

const TREE_EDGES: Edge[] = [
  { from: "root",   to: "thread",   state: "chosen" },
  { from: "root",   to: "dm",       state: "rejected" },
  { from: "root",   to: "escalate", state: "rejected" },
  { from: "thread", to: "casual",   state: "rejected" },
  { from: "thread", to: "pro",      state: "chosen" },
  { from: "thread", to: "dry",      state: "rejected" },
  { from: "pro",    to: "bench",    state: "chosen" },
  { from: "pro",    to: "internal", state: "rejected" },
  { from: "pro",    to: "trace",    state: "flagged" },
]

const STATE_ICON: Record<NodeState, string> = { chosen: "✓", rejected: "✗", flagged: "⚠" }

function nodeMap(): Record<string, TreeNode> {
  const m: Record<string, TreeNode> = {}
  for (const n of TREE_NODES) m[n.id] = n
  return m
}

function edgePath(s: TreeNode, t: TreeNode): string {
  const sx = s.x + s.w
  const sy = s.y + s.h / 2
  const tx = t.x
  const ty = t.y + t.h / 2
  const dx = (tx - sx) / 2
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`
}

function DecisionTree() {
  const nodes = nodeMap()
  const W = 900, H = 388
  return (
    <div className="ar-tree">
      <div className="ar-tree-head">
        <div className="ar-tree-head-text">
          <h3 className="ar-tree-title">How Faye got here</h3>
          <p className="ar-tree-sub">
            Paths Faye explored, the branches it rejected, and the one it picked.
          </p>
        </div>
        <div className="ar-tree-legend">
          <span><i style={{ background: "var(--c-ok)" }} /> chosen path</span>
          <span><i style={{ background: "var(--c-needs)" }} /> rejected</span>
          <span><i style={{ background: "var(--c-warn)" }} /> flagged</span>
          <span className="muted">mode: decision tree</span>
        </div>
      </div>

      <svg className="ar-tree-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Decision tree" data-step-target="ar-tree-svg">
        {TREE_EDGES.map((e, i) => {
          const s = nodes[e.from], t = nodes[e.to]
          if (!s || !t) return null
          return <path key={i} className={`edge ${e.state}`} d={edgePath(s, t)} />
        })}
        {TREE_NODES.map((n) => (
          <g key={n.id} className={`node ${n.state}`} transform={`translate(${n.x} ${n.y})`}>
            <rect className="node-rect" x={0} y={0} width={n.w} height={n.h} />
            <text className="node-icon" x={14} y={n.h / 2 + 4}>{STATE_ICON[n.state]}</text>
            <text className="node-label" x={32} y={22}>{n.label}</text>
            <text className="node-sub"   x={32} y={40}>{n.sub}</text>
          </g>
        ))}
      </svg>

      <p className="ar-tree-caption">
        Why Faye stopped before auto-firing: every chosen node passed threshold except{" "}
        <em>“DM raw trace”</em> — that’s the node dragging overall confidence to 62%.
      </p>
    </div>
  )
}

const ICON_CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

// ── Main component ────────────────────────────────────────────────────────────
export function AutoReplyCard() {
  const [hoveredClaim, setHoveredClaim] = useState<ClaimData | null>(null)
  const [mouseAt, setMouseAt] = useState<{ x: number; y: number } | null>(null)
  const [treeOpen, setTreeOpen] = useState(false)

  const [c1, c2, c3, c4] = CLAIMS as [ClaimData, ClaimData, ClaimData, ClaimData]

  function handleClaimEnter(claim: ClaimData, e: React.MouseEvent<HTMLSpanElement>) {
    setHoveredClaim(claim)
    setMouseAt({ x: e.clientX, y: e.clientY })
  }
  function handleClaimMove(e: React.MouseEvent<HTMLSpanElement>) {
    setMouseAt({ x: e.clientX, y: e.clientY })
  }
  function handleClaimLeave() {
    setHoveredClaim(null)
    setMouseAt(null)
  }

  return (
    <section className="center no-eyebrow">
      <article className="card ar-card">

        <CardHeader
          agentId="agent_faye"
          agentName="Faye · replies"
          meta={
            <>
              <span className="sep">·</span>
              <span>Auto-reply review</span>
            </>
          }
          title="Faye wants to auto-reply on @raj_builds"
          pillKind="needs"
          pillLabel="Needs decision"
        />

        <div className="card-scroll">
        {/* Body */}
        <div className="ar-body">

          {/* Left column */}
          <div className="ar-left">
            <span className="ar-conf-label">Overall confidence</span>
            <ConfidenceRing pct={0.62} />
            <div className="ar-warning">
              <span className="ar-warn-icon">⚠</span>
              <span>Below your 80% auto-send threshold</span>
            </div>
            <dl className="ar-stats">
              <div className="ar-stat-row"><dt>Claims cited</dt><dd>3 / 4</dd></div>
              <div className="ar-stat-row"><dt>Low-confidence claims</dt><dd>1</dd></div>
            </dl>
          </div>

          {/* Right column */}
          <div className="ar-right">
            <div className="ar-draft-meta">
              <span className="ar-dm-key">Draft reply</span>
              <span className="ar-sep">·</span>
              <span>Replying to a public thread</span>
              <span className="ar-sep">·</span>
              <span>Tone target:</span>
              <div className="ar-dm-tone">Professional / enterprise</div>
            </div>

            <div className="ar-tweet">
              <div className="ar-tweet-head">
                <span className="ar-tweet-handle">@raj_builds</span>
                <span className="ar-sep">·</span>
                <span className="ar-tweet-age">2h</span>
              </div>
              <p className="ar-tweet-body">
                is your thing actually faster than Riverbend for folks on enterprise plans? or is that a benchmark thing
              </p>
            </div>

            <div className="ar-draft-box">
              <div className="ar-draft-hint">Hover any underlined claim to inspect its source</div>
              <p className="ar-draft-text">
                Hey Raj — on our launch benchmark we see{" "}
                <span className={`ar-claim ${c1.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c1, e)} onMouseMove={handleClaimMove} onMouseLeave={handleClaimLeave}>
                  {c1.symbol} {c1.text}
                </span>
                {" "}across typical enterprise workloads.{" "}
                <span className={`ar-claim ${c2.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c2, e)} onMouseMove={handleClaimMove} onMouseLeave={handleClaimLeave}>
                  {c2.symbol} {c2.text}
                </span>
                {" "}used a 50-rps cold-start workload across 3 regions.{" "}
                <span className={`ar-claim ${c3.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c3, e)} onMouseMove={handleClaimMove} onMouseLeave={handleClaimLeave}>
                  {c3.symbol} {c3.text}
                </span>
                , so we only compared against their open-source tier.{" "}
                <span className={`ar-claim ${c4.colorClass}`} onMouseEnter={(e) => handleClaimEnter(c4, e)} onMouseMove={handleClaimMove} onMouseLeave={handleClaimLeave}>
                  {c4.symbol} {c4.text}
                </span>
              </p>
            </div>

            <button
              type="button"
              className={`ar-tree-toggle${treeOpen ? " open" : ""}`}
              onClick={() => setTreeOpen((v) => !v)}
              aria-expanded={treeOpen}
              data-step-target="ar-tree-toggle"
            >
              {treeOpen ? "Hide decision path" : "Trace decision path"}
              {ICON_CHEVRON}
            </button>
          </div>
        </div>

        {treeOpen && <DecisionTree />}
        </div>

        <footer className="card-actions">
          <button type="button" className="btn primary">{ICON_CHECK} Send</button>
          <button type="button" className="btn ghost">{ICON_EDIT} Edit</button>
          <button type="button" className="btn ghost">{ICON_RULE} Save as rule</button>
          <button type="button" className="btn danger">{ICON_REJECT} Decline</button>
          <button type="button" className="btn ghost" onClick={() => setOpsTab("chat")}>
            {ICON_CHAT} Chat
          </button>
        </footer>

      </article>

      {/* Tooltip — portaled to document.body so it escapes any ancestor
          stacking context (sidebar / glass panels create their own). */}
      {hoveredClaim && mouseAt &&
        createPortal(
          <ClaimTooltip claim={hoveredClaim} mouseAt={mouseAt} />,
          document.body
        )}
    </section>
  )
}
