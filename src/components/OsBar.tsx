import { useEffect, useState } from "react"
import { useAgents, useOpenDecisions, useWsConnected } from "../store"

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
  onDispatch,
  notificationCount
}: {
  onDispatch: () => void
  notificationCount: number
}) {
  const connected = useWsConnected()
  const agentCount = useAgents().length
  const openDecisions = useOpenDecisions()
  const openDecisionCount = openDecisions.length
  const criticalCount = openDecisions.filter((d) => d.urgency === "critical").length
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-brand">Oversight OS</div>
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
        <button className="header-icon-btn" type="button" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
        <button
          className="header-icon-btn has-tip"
          type="button"
          aria-label="Dispatch agent"
          data-tip="New agent"
          onClick={onDispatch}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button className="header-icon-btn" type="button" aria-label="Theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
          </svg>
        </button>
        <button className="header-icon-btn" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {notificationCount > 0 && <span className="badge">{notificationCount}</span>}
        </button>
        <div className="header-avatar" aria-label="User">CL</div>
      </div>
    </header>
  )
}
