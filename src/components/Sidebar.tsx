import type { AgentStateEvent } from "../types"
import {
  setSelectedAgent,
  useAgentsByGroup,
  useOpenDecisions,
  useSelectedAgentId
} from "../store"

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
  name: string
  sub: string
  elapsed: string
  selected: boolean
  variant?: "needs" | "flight"
  onClick: () => void
}

function Row({ name, sub, elapsed, selected, variant = "needs", onClick }: RowProps) {
  const cls = ["queue-row"]
  if (selected) {
    cls.push("selected")
    if (variant === "flight") cls.push("flight")
  }
  return (
    <button type="button" className={cls.join(" ")} onClick={onClick}>
      <div>
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

const DEMO_QUEUE = {
  needs: [
    { id: "demo-nash", name: "Nash · research", sub: "Q3 brief Plaid claim", elapsed: "04:21" },
    { id: "demo-morrow", name: "Morrow · data", sub: "Perm denied warehouse", elapsed: "02:14" }
  ],
  running: [
    { id: "demo-corwin", name: "Corwin · pricing", sub: "Q3 model retune", elapsed: "14m" },
    { id: "demo-harlow", name: "Harlow · monitor", sub: "Soak test tail 7 of 12", elapsed: "03:11" }
  ],
  awaiting: [
    { id: "demo-tilden", name: "Tilden · eng", sub: "Merge release/2.4", elapsed: "00:48" }
  ],
  background: [
    { id: "demo-bain", name: "Bain · archive", sub: "Weekly index pass", elapsed: "1h 22m" }
  ]
} as const

export function Sidebar() {
  const groups = useAgentsByGroup()
  const selectedId = useSelectedAgentId()
  const openDecisions = useOpenDecisions()
  const total =
    groups.needsYou.length +
    groups.running.length +
    groups.awaitingSignoff.length +
    groups.background.length

  const isDemo = total === 0
  const demoTotal =
    DEMO_QUEUE.needs.length +
    DEMO_QUEUE.running.length +
    DEMO_QUEUE.awaiting.length +
    DEMO_QUEUE.background.length

  // sub-text helper for live agent: prefer the freshest open decision headline
  const subFor = (a: AgentStateEvent) => {
    const open = openDecisions.find((d) => d.agent_id === a.agent_id)
    return open?.headline ?? a.intent ?? a.state
  }

  return (
    <aside className="queue">
      <div className="queue-top">
        <div className="queue-title">
          Decision queue
          <span className="queue-count">{isDemo ? demoTotal : total}</span>
        </div>
        <button className="queue-filter" type="button" aria-label="Filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
        </button>
      </div>

      <div className="queue-sections">
      {isDemo ? (
        <>
          <Section label="Needs review" variant="needs" count={DEMO_QUEUE.needs.length}>
            {DEMO_QUEUE.needs.map((r, i) => (
              <Row
                key={r.id}
                name={r.name}
                sub={r.sub}
                elapsed={r.elapsed}
                selected={i === 0}
                variant="needs"
                onClick={() => {}}
              />
            ))}
          </Section>
          <Section label="Running" variant="running" count={DEMO_QUEUE.running.length}>
            {DEMO_QUEUE.running.map((r) => (
              <Row
                key={r.id}
                name={r.name}
                sub={r.sub}
                elapsed={r.elapsed}
                selected={false}
                variant="flight"
                onClick={() => {}}
              />
            ))}
          </Section>
          <Section label="Awaiting decision" variant="awaiting" count={DEMO_QUEUE.awaiting.length}>
            {DEMO_QUEUE.awaiting.map((r) => (
              <Row
                key={r.id}
                name={r.name}
                sub={r.sub}
                elapsed={r.elapsed}
                selected={false}
                variant="needs"
                onClick={() => {}}
              />
            ))}
          </Section>
          <Section label="Background" variant="" count={DEMO_QUEUE.background.length}>
            {DEMO_QUEUE.background.map((r) => (
              <Row
                key={r.id}
                name={r.name}
                sub={r.sub}
                elapsed={r.elapsed}
                selected={false}
                variant="needs"
                onClick={() => {}}
              />
            ))}
          </Section>
        </>
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
