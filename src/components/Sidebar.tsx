import { useEffect, useState } from "react"
import type { AgentStateEvent, DecisionOpenEvent } from "../types"
import {
  setSelectedAgent,
  useAgentsByGroup,
  useOpenDecisions,
  useSelectedAgentId
} from "../store"
import { AgentAvatar } from "./AgentAvatar"

function formatElapsed(ms: number): string {
  if (ms < 1000) return "0s"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s.toString().padStart(2, "0")}s`
  const m = Math.floor(s / 60)
  if (m < 60) {
    const rem = s % 60
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`
  }
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Live countdown to a decision's auto-default. Re-renders every second. */
function Countdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, Math.floor((deadline - now) / 1000))
  return <>{formatRemaining(left)}</>
}

interface RowProps {
  agentId: string
  name: string
  sub: string
  selected: boolean
  variant?: "needs" | "flight"
  /** sign-off → countdown to auto-default · critical (blocking) → nothing
   *  · no decision → elapsed runtime */
  rightCell: "countdown" | "blocking" | "elapsed"
  deadline?: number
  elapsedMs?: number
  onClick: () => void
}

function Row({ agentId, name, sub, rightCell, deadline, elapsedMs, selected, variant = "needs", onClick }: RowProps) {
  const cls = ["queue-row"]
  if (selected) {
    cls.push("selected")
    if (variant === "flight") cls.push("flight")
  }
  let right: React.ReactNode = null
  if (rightCell === "countdown" && deadline) {
    right = <span className="elapsed countdown"><Countdown deadline={deadline} /></span>
  } else if (rightCell === "elapsed") {
    right = <span className="elapsed">{formatElapsed(elapsedMs ?? 0)}</span>
  }
  return (
    <button type="button" className={cls.join(" ")} onClick={onClick} data-step-target={`lane:${agentId}`}>
      <AgentAvatar agentId={agentId} size="sm" title={name} />
      <div className="queue-row-text">
        <div className="name">{name}</div>
        <div className="sub">{sub}</div>
      </div>
      {right}
    </button>
  )
}

function AgentRow({
  agent,
  selected,
  variant,
  sub,
  decision
}: {
  agent: AgentStateEvent
  selected: boolean
  variant: "needs" | "flight"
  sub: string
  decision?: DecisionOpenEvent
}) {
  // Critical decisions are hard-blocking — no countdown, no elapsed clutter.
  // Sign-off decisions auto-default after a timeout — show countdown.
  // Otherwise (running / background / waiting) — show elapsed runtime.
  let rightCell: "countdown" | "blocking" | "elapsed" = "elapsed"
  let deadline: number | undefined
  if (decision?.urgency === "critical") {
    rightCell = "blocking"
  } else if (decision?.urgency === "sign-off") {
    rightCell = "countdown"
    deadline = decision.ts + decision.timeout_seconds * 1000
  }
  return (
    <Row
      agentId={agent.agent_id}
      name={agent.display_name}
      sub={sub}
      rightCell={rightCell}
      deadline={deadline}
      elapsedMs={agent.elapsed_ms}
      selected={selected}
      variant={variant}
      onClick={() => setSelectedAgent(agent.agent_id)}
    />
  )
}

interface SectionProps {
  label: string
  variant: "needs" | "running" | "awaiting" | ""
  count: number
  children: React.ReactNode
}

function Section({ label, variant, count, children }: SectionProps) {
  if (count === 0) return null
  const headCls = ["queue-head"]
  if (variant) headCls.push(variant)
  return (
    <div className="queue-section">
      <div className={headCls.join(" ")}>
        <span className="dot" />
        {label}
        <span className="num">{count}</span>
      </div>
      {children}
    </div>
  )
}

export function Sidebar({ onDispatch }: { onDispatch: () => void }) {
  const groups = useAgentsByGroup()
  const selectedId = useSelectedAgentId()
  const openDecisions = useOpenDecisions()
  const total =
    groups.needsYou.length +
    groups.running.length +
    groups.awaitingSignoff.length +
    groups.background.length

  const decisionFor = (a: AgentStateEvent) =>
    openDecisions.find((d) => d.agent_id === a.agent_id)

  const subFor = (a: AgentStateEvent) => {
    const open = decisionFor(a)
    return open?.headline ?? a.intent ?? a.state
  }

  return (
    <aside className="queue">
      <div className="queue-top">
        <div className="queue-title">
          Decision queue
          <span className="queue-count">{total}</span>
        </div>
        <button className="queue-filter" type="button" aria-label="Filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
        </button>
      </div>

      <div className="queue-sections">
        {total === 0 ? (
          <div className="queue-empty">
            No agents in flight.
            <br />
            Dispatch one from the center stage.
          </div>
        ) : (
          <>
            <Section label="Needs review" variant="needs" count={groups.needsYou.length}>
              {groups.needsYou.map((a) => (
                <AgentRow
                  key={a.agent_id}
                  agent={a}
                  selected={a.agent_id === selectedId}
                  variant="needs"
                  sub={subFor(a)}
                  decision={decisionFor(a)}
                />
              ))}
            </Section>
            <Section
              label="Awaiting decision"
              variant="awaiting"
              count={groups.awaitingSignoff.length}
            >
              {groups.awaitingSignoff.map((a) => (
                <AgentRow
                  key={a.agent_id}
                  agent={a}
                  selected={a.agent_id === selectedId}
                  variant="flight"
                  sub={subFor(a)}
                  decision={decisionFor(a)}
                />
              ))}
            </Section>
            <Section label="Running" variant="running" count={groups.running.length}>
              {groups.running.map((a) => (
                <AgentRow
                  key={a.agent_id}
                  agent={a}
                  selected={a.agent_id === selectedId}
                  variant="flight"
                  sub={subFor(a)}
                />
              ))}
            </Section>
            <Section label="Background" variant="" count={groups.background.length}>
              {groups.background.map((a) => (
                <AgentRow
                  key={a.agent_id}
                  agent={a}
                  selected={a.agent_id === selectedId}
                  variant="flight"
                  sub={subFor(a)}
                />
              ))}
            </Section>
          </>
        )}
      </div>
      <button type="button" className="queue-dispatch-slot" onClick={onDispatch} data-step-target="dispatch-slot">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Dispatch agent</span>
      </button>
    </aside>
  )
}
