import { useEffect, useRef, useState } from "react"
import { useAgents, useOpenDecisions, useReplayStep, useWsConnected } from "../store"
import { ALL_FLOWS, enterFlow, getReplayState } from "../replay-engine"

function formatStamp(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const yyyy = d.getFullYear()
  const mon = months[d.getMonth()]
  const dd = d.getDate()
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${mon} ${dd}, ${yyyy} · ${hh}:${mi}`
}

export function OsBar({
  onOpenDesignSystem
}: {
  onOpenDesignSystem: () => void
}) {
  const connected = useWsConnected()
  const agentCount = useAgents().length
  const openDecisions = useOpenDecisions()
  const openDecisionCount = openDecisions.length
  const criticalCount = openDecisions.filter((d) => d.urgency === "critical").length
  const [now, setNow] = useState<Date>(() => new Date())
  const [demoOpen, setDemoOpen] = useState(false)
  const demoRef = useRef<HTMLDivElement | null>(null)

  // Re-render the popover whenever the replay step changes (engine subscribes
  // through this hook indirectly via the store).
  useReplayStep()
  const replay = getReplayState()
  const hasFlow = replay.flowId !== null
  const totalSteps = replay.flow?.steps.length ?? 0
  const stepNum = replay.stepIdx + 1 // 1-indexed for display

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!demoOpen) return
    const onClick = (e: MouseEvent) => {
      if (!demoRef.current?.contains(e.target as Node)) setDemoOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDemoOpen(false) }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [demoOpen])

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand-stack">
          <div className="header-brand">Oversight OS</div>
          <div className="header-tagline">Control room for many agents</div>
        </div>
      </div>
      <div className="header-center">
        <span className={`live${connected ? "" : " offline"}`} />
        <span>{connected ? "Connected" : "Offline"}</span>
        <span className="sep">·</span>
        <span>{agentCount} agents</span>
        <span className="sep">·</span>
        <span>
          {openDecisionCount === 0
            ? "all clear"
            : `${String(criticalCount).padStart(2, "0")} / ${String(openDecisionCount).padStart(2, "0")} pending`}
        </span>
        <span className="sep">·</span>
        <span className="meta">{formatStamp(now)}</span>
      </div>
      <div className="header-right">
        <button
          className="header-icon-btn has-tip ds-entry-btn"
          type="button"
          aria-label="Open design system"
          data-tip="Design system"
          onClick={onOpenDesignSystem}
        >
          <span className="ds-entry-label">DESIGN</span>
        </button>
        <div className="demo-menu-wrap" ref={demoRef}>
          <button
            className="header-icon-btn has-tip"
            type="button"
            aria-label="Replay demo"
            aria-expanded={demoOpen}
            data-tip={hasFlow ? `${replay.flow?.label} · step ${stepNum}/${totalSteps}` : "Replay demo"}
            onClick={() => setDemoOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
            {hasFlow && <span className="badge">{stepNum}</span>}
          </button>
          {demoOpen && !hasFlow && (
            <div className="demo-menu" role="menu">
              <div className="demo-menu-head">Replay checkpoint</div>
              {ALL_FLOWS.map((f) => (
                <button
                  key={f.id}
                  className="demo-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => { enterFlow(f.id); setDemoOpen(false) }}
                >
                  <span className="demo-menu-label">{f.label}</span>
                  <span className="demo-menu-sub">{f.steps.length} step{f.steps.length === 1 ? "" : "s"} · Space to advance</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="header-avatar" aria-label="User">CL</div>
      </div>

    </header>
  )
}
