// Shared card chrome — corner sticker + meta eyebrow + title + default-action
// countdown. Every center-stage card variant composes these instead of
// redrawing the chrome, so headers/footers stay aligned by construction.

import type { ReactNode } from "react"
import { AgentAvatar } from "./AgentAvatar"

const ICON_CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export type PillKind = "needs" | "signoff" | "fyi"

interface CardHeaderProps {
  agentId: string
  agentName: string
  /** Extra meta segments rendered between agent and pill — e.g. ts, category. */
  meta?: ReactNode
  title: ReactNode
  pillKind?: PillKind
  pillLabel?: string
}

function pillClass(k?: PillKind): string {
  if (k === "signoff") return "pill signoff"
  if (k === "fyi") return "pill fyi"
  return "pill"
}

export function CardHeader({
  agentId,
  agentName,
  meta,
  title,
  pillKind,
  pillLabel
}: CardHeaderProps) {
  return (
    <>
      <span className="card-sticker">
        <AgentAvatar agentId={agentId} size="md" title={agentName} />
      </span>
      <header className="card-meta">
        <span className="agent">{agentName}</span>
        {meta}
        {pillLabel && <span className={pillClass(pillKind)}>{pillLabel}</span>}
      </header>
      {typeof title === "string" ? <h2 className="card-title">{title}</h2> : title}
    </>
  )
}

interface CardDefaultProps {
  /** Microcopy label on the left, e.g. "Default if no action". */
  label?: string
  /** Mono-font value on the right, e.g. "Approve in 05:00". */
  value: string
}

/** Countdown row that sits between body and action buttons. Same row used
 *  by DossierCard so all card variants resolve their fallback action the
 *  same way. */
export function CardDefault({ label = "Default if no action", value }: CardDefaultProps) {
  return (
    <div className="card-default">
      <span className="lab">{ICON_CLOCK} {label}</span>
      <span className="countdown">{value}</span>
    </div>
  )
}
