import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { DecisionOpenEvent, Tier } from "../types"
import {
  tierForArtifact,
  useArtifactsByRefs,
  useCriticalDecisionCount,
  useLatestDecisionForAgent,
  useOpenDecisions,
  useSelectedAgentId,
  useAgent
} from "../store"
import { sendAction } from "../demo-runtime"
import { SourcePreview } from "./SourcePreview"

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
  agent: "Nash · research",
  ts: "22:14 UTC",
  category: "Brief approval",
  pillKind: "needs" as const,
  pillLabel: "Needs decision",
  title: "Approve Q3 brief draft v2 with revised Plaid claim",
  rec: (
    <>
      Replace the unverified <strong>"60% of Series-B fintechs use Plaid"</strong> with{" "}
      <strong>"majority of Series-B fintechs (no single dataset covers all regions)"</strong>, then
      ship v2 to the brief channel.
    </>
  ),
  diagram: {
    existingText: <span className="strike">"60% of Series-B fintechs use Plaid"</span>,
    suggestionText:
      '"majority of Series-B fintechs (no single dataset covers all regions)"',
    actionText: (
      <>
        Ship v2 to <span className="channel">#q3-brief</span> channel
      </>
    )
  },
  evidence: [
    { badge: "V", name: "CB Insights · State of Fintech Q2", flagged: false },
    { badge: "V", name: "Plaid customers page", flagged: false },
    { badge: "M", name: "trust-score 0.42", flagged: false },
    { badge: "U", name: "HN thread #2024-1119 · flagged", flagged: true }
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

function CenterEmpty({ counter, calm }: { counter: string; calm: boolean }) {
  return (
    <section className={`center${calm ? " no-eyebrow" : ""}`}>
      {!calm && (
        <div className="eyebrow">
          <div className="eyebrow-left">
            <span className="dot" />
            <span>Decision required</span>
          </div>
          <div className="eyebrow-right">
            <span className="shield">{ICON_SHIELD}</span>
            <span>{counter}</span>
          </div>
        </div>
      )}
      <div className="center-empty">
        <h1>All quiet.</h1>
        <p>Dispatch an agent from the header (+) to start a lane. The latest decision will land here.</p>
      </div>
    </section>
  )
}

interface PreviewArtifact {
  kind: "url" | "file" | "snippet"
  location: string
  label: string
}

function v7DemoPreviewFor(name: string): PreviewArtifact {
  if (name.toLowerCase().includes("plaid")) {
    return { kind: "url", location: "https://plaid.com/customers/", label: name }
  }
  if (name.toLowerCase().includes("hn")) {
    return {
      kind: "snippet",
      location:
        "HN comments thread (excerpt)\n\n> sample is heavily skewed toward US-only Series-B; the 60% figure does not generalize across EU/APAC.\n\n[flagged · trust-score 0.42]",
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

  // No selected agent and no decision: show empty + closed overlay slot
  if (!decision) {
    if (!agent) {
      return (
        <>
          <CenterEmpty counter={counter} calm={criticalCount === 0} />
        </>
      )
    }
    // Have agent but no live decision → render demo dossier so visual stays anchored
    return (
      <DossierCard
        meta={{
          agent: agent.display_name,
          ts: agent.intent ?? agent.state,
          category: "Status",
          pillKind: "fyi",
          pillLabel: "No decision pending"
        }}
        criticalCount={criticalCount}
        total={total}
        title={agent.intent ?? `${agent.display_name} is ${agent.state}.`}
        rec={
          <>
            No open decision for this agent right now. Activity continues to stream into the right
            panel; new decisions will replace this card immediately.
          </>
        }
        diagramDemo={DEMO_DECISION.diagram}
        evidence={DEMO_DECISION.evidence}
        defaultCountdown={"—"}
        primaryLabel="Acknowledge"
        onPrimary={() => {}}
        onReject={() => {}}
        onChat={() => {}}
        onPreviewEvidence={(name) => setPreview(v7DemoPreviewFor(name))}
        preview={preview}
        onClosePreview={() => setPreview(null)}
      />
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
    <DossierCard
      meta={{
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
      diagramDemo={DEMO_DECISION.diagram}
      evidence={evidenceRows}
      defaultCountdown={`${defaultActionLabel} in ${formatRemaining(remaining)}`}
      primaryLabel={primary?.label ?? "Approve"}
      rejectLabel={reject?.label}
      onPrimary={() => primary && sendAction(decision.decision_id, primary.id)}
      onReject={() => reject && sendAction(decision.decision_id, reject.id)}
      onChat={() => {}}
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
  )
}

interface DossierMeta {
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
  diagramDemo: typeof DEMO_DECISION.diagram
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
  const counter =
    p.total === 0
      ? "All clear"
      : `${String(p.criticalCount).padStart(2, "0")} / ${String(p.total).padStart(2, "0")} pending`
  const isCritical = p.meta.pillKind === "needs"
  const scrollRef = useRef<HTMLDivElement | null>(null)

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

  const showEyebrow = p.meta.pillKind !== "fyi"

  return (
    <section className={`center${showEyebrow ? "" : " no-eyebrow"}`}>
      {showEyebrow && (
        <div className={`eyebrow${isCritical ? "" : " calm"}`}>
          <div className="eyebrow-left">
            <span className="dot" />
            <span>{isCritical ? "Decision required" : "Sign-off open"}</span>
          </div>
          <div className="eyebrow-right">
            <span className="shield">{ICON_SHIELD}</span>
            <span>{counter}</span>
          </div>
        </div>
      )}

      <article className="card">
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

        <div className="diagram">
          <div className="diagram-grid">
            <div className="dgm-block">
              <div className="dgm-head">
                <div className="dgm-icon">{ICON_DOC}</div>
                Existing
              </div>
              <div className="dgm-text">{p.diagramDemo.existingText}</div>
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
              <div className="dgm-text">{p.diagramDemo.suggestionText}</div>
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
              <div className="dgm-text">{p.diagramDemo.actionText}</div>
            </div>
          </div>
        </div>

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
          <button type="button" className="btn primary" onClick={p.onPrimary}>
            {ICON_CHECK}
            {p.primaryLabel}
          </button>
          <button type="button" className="btn danger" onClick={p.onReject}>
            {ICON_REJECT}
            {p.rejectLabel ?? "Reject"}
          </button>
          <button type="button" className="btn ghost" onClick={p.onChat}>
            {ICON_CHAT}
            Chat with agent
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
      diagramDemo={DEMO_DECISION.diagram}
      evidence={DEMO_DECISION.evidence}
      defaultCountdown={DEMO_DECISION.defaultCountdown}
      primaryLabel="Approve"
      onPrimary={() => {}}
      onReject={() => {}}
      onChat={() => {}}
      onPreviewEvidence={(name) => setPreview(v7DemoPreviewFor(name))}
      preview={preview}
      onClosePreview={() => setPreview(null)}
    />
  )
}
