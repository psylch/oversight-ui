import type { AgentStateEvent } from "../types"
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

interface RowProps {
  agentId: string
  name: string
  sub: string
  elapsed: string
  selected: boolean
  variant?: "needs" | "flight"
  onClick: () => void
}

function Row({ agentId, name, sub, elapsed, selected, variant = "needs", onClick }: RowProps) {
  const cls = ["queue-row"]
  if (selected) {
    cls.push("selected")
    if (variant === "flight") cls.push("flight")
  }
  return (
    <button type="button" className={cls.join(" ")} onClick={onClick}>
      <AgentAvatar agentId={agentId} size="sm" title={name} />
      <div className="queue-row-text">
        <div className="name">{name}</div>
        <div className="sub">{sub}</div>
      </div>
      <span className="elapsed">{elapsed}</span>
    </button>
  )
}

function AgentRow({
  agent,
  selected,
  variant,
  sub
}: {
  agent: AgentStateEvent
  selected: boolean
  variant: "needs" | "flight"
  sub: string
}) {
  return (
    <Row
      agentId={agent.agent_id}
      name={agent.display_name}
      sub={sub}
      elapsed={formatElapsed(agent.elapsed_ms)}
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

export function Sidebar() {
  const groups = useAgentsByGroup()
  const selectedId = useSelectedAgentId()
  const openDecisions = useOpenDecisions()
  const total =
    groups.needsYou.length +
    groups.running.length +
    groups.awaitingSignoff.length +
    groups.background.length

  // sub-text helper: prefer the freshest open decision headline
  const subFor = (a: AgentStateEvent) => {
    const open = openDecisions.find((d) => d.agent_id === a.agent_id)
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
                  variant="needs"
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
                  variant="needs"
                  sub={subFor(a)}
                />
              ))}
            </Section>
          </>
        )}
      </div>
    </aside>
  )
}
