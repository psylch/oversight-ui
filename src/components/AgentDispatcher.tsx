import { useEffect, useRef, useState } from "react"
import { setSelectedAgent } from "../store"
import { AgentAvatar } from "./AgentAvatar"

interface AgentPreset {
  id: string
  name: string
  description: string
}

interface AgentPresetWithPersona extends AgentPreset {
  /** Sidebar lane label, in the same "Persona · role" form as the demo agents. */
  displayName: string
}

const PRESETS: AgentPresetWithPersona[] = [
  {
    id: "research-analyst",
    displayName: "Iris · outreach",
    name: "Outreach Scout",
    description: "Finds creators, scores fit, drafts personalized DMs."
  },
  {
    id: "writing-partner",
    displayName: "Juno · drafts",
    name: "Drafter",
    description: "Turns rough angles into ready-to-post drafts; tags by audience."
  },
  {
    id: "qa-reviewer",
    displayName: "Kai · comparison",
    name: "Comparison Builder",
    description: "Builds competitor comparison pages with sourced claims."
  },
  {
    id: "project-scout",
    displayName: "Lyra · social",
    name: "Social Monitor",
    description: "Watches X / HN / Reddit; auto-replies low-stakes; flags risky."
  }
]

interface AgentDispatcherProps {
  open: boolean
  onClose: () => void
}

export function AgentDispatcher({ open, onClose }: AgentDispatcherProps) {
  const [intent, setIntent] = useState("")
  const [presetId, setPresetId] = useState<string>(PRESETS[0]!.id)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open) return
    setIntent("")
    setPresetId(PRESETS[0]!.id)
    setSubmitting(false)
    const t = setTimeout(() => textareaRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const selected = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!

  async function dispatch() {
    const goal = intent.trim()
    if (!goal || submitting) return
    setSubmitting(true)
    const { dispatchAgent } = await import("../demo-runtime")
    const id = dispatchAgent({
      display_name: selected.displayName,
      intent: goal,
      preset: selected.id
    })
    setSelectedAgent(id)
    setSubmitting(false)
    onClose()
  }

  function onTextareaKey(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
      ev.preventDefault()
      void dispatch()
    }
  }

  return (
    <div className="dispatcher-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dispatcher-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatcher-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <header className="dispatcher-head">
          <div>
            <div className="panel-head">Dispatch</div>
            <h2 id="dispatcher-title">Send a new agent into the room.</h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="dispatch-panel">
          <label className="field-label" htmlFor="dispatch-intent">
            Task
          </label>
          <textarea
            id="dispatch-intent"
            ref={textareaRef}
            className="dispatch-textarea"
            value={intent}
            onChange={(ev) => setIntent(ev.target.value)}
            onKeyDown={onTextareaKey}
            placeholder="What should this agent do? One or two sentences."
            rows={4}
            data-step-target="dispatcher-intent"
          />

          <div>
            <span className="field-label">Preset</span>
            <div className="preset-grid">
              {PRESETS.map((preset, i) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${presetId === preset.id ? "selected" : ""}`}
                  onClick={() => setPresetId(preset.id)}
                  data-step-target={i === 0 ? "dispatcher-preset-first" : undefined}
                >
                  <span className="preset-avatar">
                    <AgentAvatar agentId={preset.id} size="md" />
                  </span>
                  <span className="preset-copy">
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-desc">{preset.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="dispatcher-actions">
          <span className="dispatcher-hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span>to dispatch</span>
          </span>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={submitting || !intent.trim()}
            onClick={dispatch}
            data-step-target="dispatcher-confirm"
          >
            {submitting ? "Dispatching…" : "Dispatch"}
          </button>
        </footer>
      </section>
    </div>
  )
}
