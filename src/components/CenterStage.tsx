import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type {
  DecisionOpenEvent,
  DecisionShape,
  ShapePayload,
  ShapePayloadComparison,
  ShapePayloadDiff,
  ShapePayloadInspection,
  ShapePayloadReplace,
  Tier
} from "../types"
import {
  setOpsTab,
  tierForArtifact,
  useArtifactsByRefs,
  useCriticalDecisionCount,
  useLatestDecisionForAgent,
  useOpenDecisions,
  useSelectedAgentId,
  useAgent
} from "../store"
import { sendAction, FAYE_AGENT_ID } from "../demo-runtime"
import { SourcePreview } from "./SourcePreview"
import { AgentAvatar } from "./AgentAvatar"
import { AutoReplyCard } from "./AutoReplyCard"

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "00:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatTimeUtc(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm} UTC`
}

const ICON_DOC = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </svg>
)
const ICON_SPARKLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M5 17v4M3 19h4M19 4v3M17.5 5.5h3" />
  </svg>
)
const ICON_SEND = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 2-7 20-4-9-9-4 20-7z" />
  </svg>
)
const ICON_ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const ICON_EXT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17 17 7M7 7h10v10" />
  </svg>
)
const ICON_CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12l5 5L20 7" />
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
const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)
const ICON_SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
  </svg>
)

const DEMO_DECISION = {
  agentId: "agent_nash",
  agent: "Cole · comparison",
  ts: "08:42 local",
  category: "Compare-page review",
  pillKind: "needs" as const,
  pillLabel: "Needs decision",
  title: "Replace the unsourced fluff sentence on /compare/launch",
  rec: (
    <>
      Cole flagged <strong>"Built for teams who actually ship — unlike legacy tools that slow you down."</strong>{" "}
      as marketing-style with no citation. Replace with{" "}
      <strong>"Median build 2.1s vs. competitor average 6.4s (last week, n=412 builds)"</strong>, then re-render the comparison page.
    </>
  ),
  shape: "replace" as DecisionShape,
  shapePayload: {
    kind: "replace",
    existingText: "“Built for teams who actually ship — unlike legacy tools that slow you down.”",
    suggestionText:
      "“Median build 2.1s vs. competitor average 6.4s (last week, n=412 builds).”",
    actionText: "Update /compare/launch and re-render"
  } satisfies ShapePayload,
  evidence: [
    { badge: "V", name: "Build benchmark · last week n=412", flagged: false },
    { badge: "V", name: "Competitor build-time public docs", flagged: false },
    { badge: "M", name: "marketing-style score 0.87", flagged: false },
    { badge: "U", name: "Original sentence · no source attached", flagged: true }
  ],
  defaultCountdown: "Approve & ship in 06:00"
}

function tierBadge(t: Tier): string {
  switch (t) {
    case "verified":
      return "V"
    case "model":
      return "M"
    case "user":
      return "U"
    default:
      return "?"
  }
}

function urgencyPillClass(u: DecisionOpenEvent["urgency"]): string {
  if (u === "critical") return ""
  if (u === "sign-off") return "signoff"
  return "fyi"
}
function urgencyPillLabel(u: DecisionOpenEvent["urgency"]): string {
  if (u === "critical") return "Needs decision"
  if (u === "sign-off") return "Awaiting sign-off"
  return "FYI"
}

interface DispatchPreset {
  id: string
  slug: string
  name: string
  description: string
  goal: string
}

const DISPATCH_PRESETS: DispatchPreset[] = [
  {
    id: "research-analyst",
    slug: "outreach",
    name: "Outreach Scout",
    description: "Finds creators, scores fit, drafts personalized DMs.",
    goal: "Find 40 dev-tool creators and score fit for launch outreach"
  },
  {
    id: "writing-partner",
    slug: "drafts",
    name: "Drafter",
    description: "Turns rough angles into ready-to-post drafts; tags by audience.",
    goal: "Draft launch-week posts across 4 audience angles"
  },
  {
    id: "qa-reviewer",
    slug: "comparison",
    name: "Comparison Builder",
    description: "Builds competitor comparison pages with sourced claims.",
    goal: "Audit /compare/launch for unsourced claims and replace with citations"
  },
  {
    id: "project-scout",
    slug: "social",
    name: "Social Monitor",
    description: "Watches X / HN / Reddit; auto-replies low-stakes; flags risky.",
    goal: "Watch overnight mentions and flag anything off-tone for enterprise prospects"
  }
]

// ----- Shape renderers ---------------------------------------------------
// Each shape sits between .card-rec and .card-evidence. They share padding
// and hairline language so the family reads as one component, varying only
// in how the middle "context" is structured.

function ShapeReplace({ data }: { data: ShapePayloadReplace }) {
  return (
    <div className="diagram">
      <div className="diagram-grid">
        <div className="dgm-block">
          <div className="dgm-head">
            <div className="dgm-icon">{ICON_DOC}</div>
            Existing
          </div>
          <div className="dgm-text">
            <span className="strike">{data.existingText}</span>
          </div>
        </div>
        <div className="dgm-arrow">
          <span className="dgm-lab replace">Replace</span>
          <span className="dgm-arrow-line">{ICON_ARROW}</span>
        </div>
        <div className="dgm-block">
          <div className="dgm-head">
            <div className="dgm-icon">{ICON_SPARKLE}</div>
            Suggestion
          </div>
          <div className="dgm-text">{data.suggestionText}</div>
        </div>
        <div className="dgm-arrow">
          <span className="dgm-lab ship">Ship</span>
          <span className="dgm-arrow-line">{ICON_ARROW}</span>
        </div>
        <div className="dgm-block">
          <div className="dgm-head">
            <div className="dgm-icon">{ICON_SEND}</div>
            Action
          </div>
          <div className="dgm-text">{data.actionText}</div>
        </div>
      </div>
    </div>
  )
}

function ShapeComparison({ data }: { data: ShapePayloadComparison }) {
  const Side = ({
    side,
    opt,
    picked
  }: {
    side: "A" | "B"
    opt: ShapePayloadComparison["optionA"]
    picked: boolean
  }) => (
    <div className={`cmp-side${picked ? " picked" : ""}`}>
      <div className="cmp-head">
        <span className="cmp-tag">Option {side}</span>
      </div>
      <div className="cmp-title">{opt.title}</div>
      {picked && <div className="cmp-pick-reason">{data.pickReason}</div>}
      <dl className="cmp-metrics">
        {opt.metrics.map((m) => (
          <div className="cmp-metric" key={m.k}>
            <dt>{m.k}</dt>
            <dd>{m.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
  return (
    <div className="shape shape-comparison">
      <div className={`cmp-grid pick-${data.pick.toLowerCase()}`}>
        <Side side="A" opt={data.optionA} picked={data.pick === "A"} />
        <div className="cmp-divider" aria-hidden="true" />
        <Side side="B" opt={data.optionB} picked={data.pick === "B"} />
      </div>
    </div>
  )
}

function ShapeDiff({ data }: { data: ShapePayloadDiff }) {
  const ok = data.testStatus.passed === data.testStatus.total
  return (
    <div className="shape shape-diff">
      <div className="diff-head">
        <span className="diff-file">{data.file}</span>
        <span className="diff-counts">
          <span className="diff-add-count">+{data.hunks.filter((h) => h.kind === "add").length}</span>
          <span className="diff-del-count">−{data.hunks.filter((h) => h.kind === "del").length}</span>
        </span>
      </div>
      <pre className="diff-body">
        {data.hunks.map((h, i) => (
          <div key={i} className={`diff-line diff-${h.kind}`}>
            <span className="diff-gutter">
              {h.kind === "add" ? "+" : h.kind === "del" ? "−" : " "}
            </span>
            <span className="diff-text">{h.text}</span>
          </div>
        ))}
      </pre>
      <div className={`diff-tests${ok ? " ok" : " fail"}`}>
        <span className="diff-tests-dot" aria-hidden="true" />
        <span className="diff-tests-lab">Tests</span>
        <span className="diff-tests-num">
          {data.testStatus.passed}/{data.testStatus.total} passed
        </span>
        {data.testStatus.note && <span className="diff-tests-note">{data.testStatus.note}</span>}
      </div>
    </div>
  )
}

function ShapeInspection({ data }: { data: ShapePayloadInspection }) {
  return (
    <div className="shape shape-inspection">
      <div className="insp-scope">
        <span className="insp-scope-lab">Scope</span>
        <span className="insp-scope-val">{data.scope}</span>
      </div>
      <ul className="insp-checks">
        {data.checks.map((c, i) => (
          <li key={i} className={`insp-check${c.ok ? " ok" : " fail"}`}>
            <span className="insp-check-label">{c.label}</span>
            <span className="insp-check-result">{c.result}</span>
            <span className="insp-check-tag" aria-hidden="true">{c.ok ? "OK" : "FAIL"}</span>
          </li>
        ))}
      </ul>
      <p className="insp-conclusion">{data.conclusion}</p>
    </div>
  )
}

function renderShape(_shape: DecisionShape | undefined, payload: ShapePayload | undefined) {
  if (!payload) return null
  switch (payload.kind) {
    case "replace":
      return <ShapeReplace data={payload} />
    case "comparison":
      return <ShapeComparison data={payload} />
    case "diff":
      return <ShapeDiff data={payload} />
    case "inspection":
      return <ShapeInspection data={payload} />
    default: {
      const _exhaustive: never = payload
      return _exhaustive
    }
  }
}

function CenterEmpty(_props: { counter: string; calm: boolean }) {
  return (
    <section className="center no-eyebrow">
      <article className="card cold-start-card">
        <div className="card-scroll">
          <header className="card-meta">
            <span className="agent">Empty lane</span>
            <span className="sep">·</span>
            <span>Morning start</span>
            <span className="pill fyi">Cold start</span>
          </header>

          <h2 className="card-title">Dispatch your first agent.</h2>

          <p className="card-rec">
            Pick a template — or connect an agent already running in your terminal. Dispatched
            agents stream into the queue; their decisions land here.
          </p>

          <section className="card-evidence cold-start-templates">
            <header className="card-evidence-head">
              <span className="card-evidence-label">Templates</span>
              <span className="card-evidence-num">{DISPATCH_PRESETS.length}</span>
            </header>
            <div className="cold-start-list">
              {DISPATCH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ev-card cold-start-row"
                  onClick={async () => {
                    const { dispatchAgent } = await import("../demo-runtime")
                    dispatchAgent({
                      display_name: `${p.name.split(" ")[0]} · ${p.slug}`,
                      intent: p.goal,
                      preset: p.id
                    })
                  }}
                >
                  <AgentAvatar agentId={p.id} size="md" title={p.name} />
                  <span className="cold-start-row-copy">
                    <span className="cold-start-row-name">{p.name}</span>
                    <span className="cold-start-row-desc">{p.description}</span>
                  </span>
                  <span className="ext">{ICON_ARROW}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="card-actions cold-start-cli-row">
          <span className="lab">Or watch an agent already running</span>
          <code className="cold-start-cli-snippet">$ oversight register --runtime claude</code>
          <button
            type="button"
            className="cold-start-load-demo"
            onClick={async () => {
              const { loadPopulatedDemo } = await import("../demo-runtime")
              loadPopulatedDemo()
            }}
          >
            Load full demo →
          </button>
        </footer>
      </article>
    </section>
  )
}

interface PreviewArtifact {
  kind: "url" | "file" | "snippet"
  location: string
  label: string
}

function v7DemoPreviewFor(name: string): PreviewArtifact {
  const n = name.toLowerCase()
  if (n.includes("competitor") && n.includes("docs")) {
    return { kind: "url", location: "https://example.com/competitor/docs/build-times", label: name }
  }
  if (n.includes("benchmark")) {
    return {
      kind: "snippet",
      location:
        "Build benchmark · last week\n\nMedian build time: 2.1s\np95: 4.7s\nSample: 412 builds\nSource: ci/build-log.json (week of 2026-04-27).",
      label: name
    }
  }
  if (n.includes("original sentence") || n.includes("no source")) {
    return {
      kind: "snippet",
      location:
        "Original sentence · provenance trace\n\nNo upstream source attached. Generated by the page-writer step at 07:58 with prompt slot 'tone: punchy'.\n\n[flagged · no citation]",
      label: name
    }
  }
  if (n.includes("marketing-style")) {
    return {
      kind: "snippet",
      location:
        "marketing-style score 0.87\n\nFlags: superlative phrasing, no number, vague comparison.\nCues: 'actually ship', 'slow you down'.",
      label: name
    }
  }
  return {
    kind: "snippet",
    location: `${name}\n\n(preview stub — full evidence drill-down lives in the Niti fork)`,
    label: name
  }
}

export function CenterStage() {
  const selectedId = useSelectedAgentId()
  const agent = useAgent(selectedId)
  const decision = useLatestDecisionForAgent(selectedId)
  const openDecisions = useOpenDecisions()
  const criticalCount = useCriticalDecisionCount()
  const total = openDecisions.length

  const [preview, setPreview] = useState<PreviewArtifact | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const counter = total === 0
    ? "All clear"
    : `${String(criticalCount).padStart(2, "0")} / ${String(total).padStart(2, "0")} pending`

  const refs = useMemo(() => (decision ? decision.evidence.map((e) => e.ref) : []), [decision])
  const artifacts = useArtifactsByRefs(refs)

  const deadline = decision ? decision.ts + decision.timeout_seconds * 1000 : 0
  const [remaining, setRemaining] = useState<number>(() =>
    decision ? Math.max(0, Math.floor((deadline - Date.now()) / 1000)) : 0
  )
  useEffect(() => {
    if (!decision) return
    const t = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(t)
  }, [decision, deadline])

  const toastNode = toast && (
    <div className="momentum-toast" role="status" aria-live="polite">
      <span className="momentum-toast-dot" aria-hidden="true" />
      <span className="momentum-toast-text">{toast}</span>
    </div>
  )

  // Drill-down variant — Faye escalated her scenario to a richer card.
  // The agent owns the choice of card form; CenterStage just dispatches.
  if (decision && decision.agent_id === FAYE_AGENT_ID) {
    return (
      <>
        <AutoReplyCard />
        {toastNode}
      </>
    )
  }

  // No selected agent and no decision: show empty + closed overlay slot
  if (!decision) {
    if (!agent) {
      return (
        <>
          <CenterEmpty counter={counter} calm={criticalCount === 0} />
          {toastNode}
        </>
      )
    }
    // Have agent but no live decision → calmer "agent at work" card
    return (
      <>
        <AgentAtWorkCard agent={agent} />
        {toastNode}
      </>
    )
  }

  // Real decision
  const evidenceRows = decision.evidence.slice(0, 4).map((e, i) => {
    const art = artifacts[i] ?? null
    const tier = tierForArtifact(art)
    return {
      badge: tierBadge(tier),
      name: e.label ?? art?.label ?? art?.location ?? `evidence ${i + 1}`,
      flagged: tier === "unverified",
      artifact: art
    }
  })

  const defaultActionLabel =
    decision.actions.find((a) => a.id === decision.default_action)?.label ??
    decision.default_action

  const primary = decision.actions[0]
  const reject = decision.actions.find((a) => /reject|deny|no/i.test(a.id)) ?? decision.actions[1]

  return (
    <>
    <DossierCard
      meta={{
        agentId: decision.agent_id,
        agent: agent?.display_name ?? decision.agent_id,
        ts: formatTimeUtc(decision.ts),
        category: decision.headline.length > 40 ? "Decision" : decision.headline,
        pillKind: decision.urgency === "critical" ? "needs" : decision.urgency === "sign-off" ? "signoff" : "fyi",
        pillLabel: urgencyPillLabel(decision.urgency)
      }}
      criticalCount={criticalCount}
      total={total}
      title={decision.headline}
      rec={<>{decision.recommendation}</>}
      shape={decision.decision_shape ?? "replace"}
      shapePayload={decision.shape_payload}
      evidence={evidenceRows}
      defaultCountdown={`${defaultActionLabel} in ${formatRemaining(remaining)}`}
      primaryLabel={primary?.label ?? "Approve"}
      rejectLabel={reject?.label}
      onPrimary={() => {
        if (!primary) return
        sendAction(decision.decision_id, primary.id)
        flashToast("Logged · ledger appended")
      }}
      onReject={() => {
        if (!reject) return
        sendAction(decision.decision_id, reject.id)
        flashToast("Rejected · agent paused")
      }}
      onChat={() => setOpsTab("chat")}
      onPreviewEvidence={(name, art) => {
        if (art) {
          setPreview({
            kind: art.kind === "url" ? "url" : art.kind === "snippet" ? "snippet" : "file",
            location: art.location,
            label: art.label ?? art.location
          })
        } else {
          setPreview(v7DemoPreviewFor(name))
        }
      }}
      preview={preview}
      onClosePreview={() => setPreview(null)}
    />
    {toastNode}
    </>
  )
}

// Calmer "agent at work" card — shown when a non-decision agent is selected.
// Same dossier shell, no urgency pill, no Approve/Reject, single ghost button.
function AgentAtWorkCard({ agent }: { agent: import("../types").AgentStateEvent }) {
  const elapsed = formatElapsed(agent.elapsed_ms)
  const stateLabel =
    agent.state === "working"
      ? "Working"
      : agent.state === "waiting"
      ? "Waiting"
      : agent.state === "stalled"
      ? "Stalled"
      : agent.state === "done"
      ? "Done"
      : "Errored"
  return (
    <section className="center no-eyebrow">
      <article className="card agent-at-work">
        <span className="card-sticker">
          <AgentAvatar agentId={agent.agent_id} size="md" title={agent.display_name} />
        </span>
        <div className="card-scroll">
          <header className="card-meta">
            <span className="agent">{agent.display_name}</span>
            <span className="sep">·</span>
            <span>{stateLabel}</span>
            <span className="sep">·</span>
            <span>elapsed {elapsed}</span>
          </header>

          <h2 className="card-title">{agent.intent ?? `${agent.display_name} is ${agent.state}.`}</h2>

          <p className="card-rec">
            No decision pending. The agent is on task — activity continues to stream into the right
            panel. A new decision will replace this card the moment one opens.
          </p>

          <div className="atwork-grid">
            <div className="atwork-block">
              <div className="atwork-lab">Current task</div>
              <div className="atwork-val">{agent.intent ?? "—"}</div>
            </div>
            <div className="atwork-block">
              <div className="atwork-lab">Latest activity</div>
              <div className="atwork-val mono">{formatTimeUtc(agent.ts)}</div>
            </div>
            <div className="atwork-block">
              <div className="atwork-lab">Elapsed</div>
              <div className="atwork-val mono">{elapsed}</div>
            </div>
          </div>
        </div>

      </article>
    </section>
  )
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`
  return `${sec}s`
}

interface DossierMeta {
  agentId: string
  agent: string
  ts: string
  category: string
  pillKind: "needs" | "signoff" | "fyi"
  pillLabel: string
}

interface EvidenceRow {
  badge: string
  name: string
  flagged: boolean
  artifact?: { kind: "url" | "file" | "snippet"; location: string; label?: string } | null
}

interface DossierProps {
  meta: DossierMeta
  criticalCount: number
  total: number
  title: string
  rec: React.ReactNode
  shape?: DecisionShape
  shapePayload?: ShapePayload
  evidence: EvidenceRow[]
  defaultCountdown: string
  primaryLabel: string
  rejectLabel?: string
  onPrimary: () => void
  onReject: () => void
  onChat: () => void
  onPreviewEvidence: (name: string, art?: any) => void
  preview: PreviewArtifact | null
  onClosePreview: () => void
}

function DossierCard(p: DossierProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [flash, setFlash] = useState<null | "approve" | "reject">(null)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 700)
    return () => clearTimeout(t)
  }, [flash])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const overflowing = el.scrollHeight - el.clientHeight > 1
      el.dataset.overflow = overflowing ? "true" : "false"
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [p.title, p.evidence.length])

  return (
    <section className="center no-eyebrow">
      <article className={`card${flash ? ` flash-${flash}` : ""}`}>
       <span className="card-sticker">
         <AgentAvatar agentId={p.meta.agentId} size="md" title={p.meta.agent} />
       </span>
       <div className="card-scroll" ref={scrollRef}>
        <header className="card-meta">
          <span className="agent">{p.meta.agent}</span>
          <span className="sep">·</span>
          <span>{p.meta.ts}</span>
          <span className="sep">·</span>
          <span>{p.meta.category}</span>
          <span className={`pill ${urgencyPillKindClass(p.meta.pillKind)}`}>{p.meta.pillLabel}</span>
        </header>

        <h2 className="card-title">{p.title}</h2>

        <p className="card-rec">{p.rec}</p>

        {renderShape(p.shape, p.shapePayload)}

        <section className="card-evidence">
          <header className="card-evidence-head">
            <span className="card-evidence-label">Evidence</span>
            <span className="card-evidence-num">{p.evidence.length}</span>
          </header>
          <div className="evidence-grid">
            {p.evidence.map((ev, i) => (
              <button
                key={`${ev.name}-${i}`}
                type="button"
                className={`ev-card${ev.flagged ? " flagged" : ""}`}
                onClick={() => p.onPreviewEvidence(ev.name, ev.artifact)}
              >
                <span className="badge">{ev.badge}</span>
                <span className="name">{ev.name}</span>
                <span className="ext">{ICON_EXT}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="card-default">
          <span className="lab">
            {ICON_CLOCK}
            Default if no action
          </span>
          <span className="countdown">{p.defaultCountdown}</span>
        </div>
       </div>

        <footer className="card-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => { setFlash("approve"); p.onPrimary() }}
          >
            {ICON_CHECK}
            {p.primaryLabel}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => { setFlash("reject"); p.onReject() }}
          >
            {ICON_REJECT}
            {p.rejectLabel ?? "Reject"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={p.onChat}
          >
            {ICON_CHAT}
            Chat
          </button>
        </footer>
      </article>

      {p.preview && (
        <SourcePreview
          artifact={{
            seq: 0,
            ts: 0,
            agent_id: "",
            type: "artifact.added",
            ref: "preview",
            kind: p.preview.kind,
            location: p.preview.location,
            label: p.preview.label
          } as any}
          onClose={p.onClosePreview}
        />
      )}
    </section>
  )
}

function urgencyPillKindClass(k: "needs" | "signoff" | "fyi"): string {
  if (k === "signoff") return "signoff"
  if (k === "fyi") return "fyi"
  return ""
}

// Demo-mode export so App can render dossier when no agent ever connects
export function DemoDossier() {
  const [preview, setPreview] = useState<PreviewArtifact | null>(null)
  return (
    <DossierCard
      meta={{
        agentId: DEMO_DECISION.agentId,
        agent: DEMO_DECISION.agent,
        ts: DEMO_DECISION.ts,
        category: DEMO_DECISION.category,
        pillKind: "needs",
        pillLabel: DEMO_DECISION.pillLabel
      }}
      criticalCount={1}
      total={2}
      title={DEMO_DECISION.title}
      rec={DEMO_DECISION.rec}
      shape={DEMO_DECISION.shape}
      shapePayload={DEMO_DECISION.shapePayload}
      evidence={DEMO_DECISION.evidence}
      defaultCountdown={DEMO_DECISION.defaultCountdown}
      primaryLabel="Approve"
      onPrimary={() => {}}
      onReject={() => {}}
      onChat={() => setOpsTab("chat")}
      onPreviewEvidence={(name) => setPreview(v7DemoPreviewFor(name))}
      preview={preview}
      onClosePreview={() => setPreview(null)}
    />
  )
}
