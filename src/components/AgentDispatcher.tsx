import { useMemo, useState } from "react"
import type { AgentStateEvent, CreateRunResponse, RuntimeKind } from "../types"
import { setSelectedAgent, useAgents } from "../store"

type DispatchMode = "quick" | "picker"

interface AgentPreset {
  id: string
  name: string
  description: string
  runtime: RuntimeKind
  color: string
  mark: string
  identity: string
  tools: string
  model: string
}

const MODE_KEY = "oversight.dispatcher.mode"

const RUNTIMES: RuntimeKind[] = ["claude", "codex", "gemini", "opencode"]

const PRESETS: AgentPreset[] = [
  {
    id: "research-analyst",
    name: "Research Analyst",
    description: "Finds sources, checks claims, and returns evidence-backed notes.",
    runtime: "claude",
    color: "cyan",
    mark: "R",
    identity: "You are a research analyst. Register sources before citing them and record non-trivial claims.",
    tools: "browser, files, artifact register, claim add",
    model: "Claude"
  },
  {
    id: "writing-partner",
    name: "Writing Partner",
    description: "Turns rough direction into structured drafts and asks for sign-off at forks.",
    runtime: "claude",
    color: "violet",
    mark: "W",
    identity: "You are a writing partner. Preserve the user's voice and surface draft-choice decisions.",
    tools: "files, artifact register, card add",
    model: "Claude"
  },
  {
    id: "qa-reviewer",
    name: "QA Reviewer",
    description: "Runs through a product flow, reports broken states, and verifies fixes.",
    runtime: "claude",
    color: "amber",
    mark: "Q",
    identity: "You are a QA reviewer. Reproduce issues concretely and separate findings from guesses.",
    tools: "browser, files, chat emit",
    model: "Claude"
  },
  {
    id: "project-scout",
    name: "Project Scout",
    description: "Reads the workspace, maps context, and proposes the next concrete move.",
    runtime: "claude",
    color: "green",
    mark: "S",
    identity: "You are a project scout. Build context first, then summarize options and tradeoffs.",
    tools: "files, search, artifact register",
    model: "Claude"
  }
]

function initialMode(): DispatchMode {
  if (typeof window === "undefined") return "quick"
  const saved = window.localStorage.getItem(MODE_KEY)
  return saved === "picker" ? "picker" : "quick"
}

interface AgentDispatcherProps {
  open: boolean
  onClose: () => void
}

export function AgentDispatcher({ open, onClose }: AgentDispatcherProps) {
  const recentAgents = useAgents().slice(-3).reverse()
  const [mode, setMode] = useState<DispatchMode>(initialMode)
  const [quickText, setQuickText] = useState("")
  const [quickReviewed, setQuickReviewed] = useState(false)
  const [customName, setCustomName] = useState("Custom Agent")
  const [customIdentity, setCustomIdentity] = useState("")
  const [customTools, setCustomTools] = useState("oversight chat, artifact register, claim add")
  const [customRuntime, setCustomRuntime] = useState<RuntimeKind>("claude")
  const [pickerText, setPickerText] = useState("")
  const [selectedPickerId, setSelectedPickerId] = useState(`preset:${PRESETS[0]!.id}`)
  const [workDir, setWorkDir] = useState("")
  const [extraContext, setExtraContext] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPicker = useMemo(() => {
    const [kind, id] = selectedPickerId.split(":")
    if (kind === "recent") {
      const agent = recentAgents.find((item) => item.agent_id === id)
      if (agent) return recentAgentToPreset(agent)
    }
    return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0]!
  }, [recentAgents, selectedPickerId])

  const quickCandidates = useMemo(() => {
    const recent = recentAgents.slice(0, 2).map((agent, index) => ({
      id: `recent:${agent.agent_id}`,
      source: "Recent",
      match: index === 0 ? "Best recent match" : "Reusable pattern",
      preset: recentAgentToPreset(agent)
    }))
    const preset = pickPresetCandidates(quickText).map((item, index) => ({
      id: `preset:${item.id}`,
      source: "Preset",
      match: index === 0 ? "Recommended preset" : "Close preset",
      preset: item
    }))
    return [...recent, ...preset].slice(0, 4)
  }, [quickText, recentAgents])

  if (!open) return null

  function switchMode(next: DispatchMode) {
    setMode(next)
    window.localStorage.setItem(MODE_KEY, next)
    setError(null)
  }

  function closeAndReset() {
    onClose()
  }

  async function createRun(body: {
    runtime: RuntimeKind
    goal: string
    context?: string
    work_dir?: string
  }) {
    setSubmitting(true)
    setError(null)
    try {
      // Demo-only: stand up a fake agent locally instead of POSTing to a daemon.
      const { dispatchAgent } = await import("../demo-runtime")
      const newId = dispatchAgent({
        display_name: body.goal.split("\n")[0]?.slice(0, 40) || `Agent (${body.runtime})`,
        intent: body.goal
      })
      setSelectedAgent(newId)
      closeAndReset()
      setQuickText("")
      setQuickReviewed(false)
      setPickerText("")
      setExtraContext("")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  function reviewQuick() {
    const goal = quickText.trim()
    if (!goal) return
    if (!customIdentity.trim()) {
      setCustomIdentity(draftIdentity(goal))
    }
    setQuickReviewed(true)
  }

  function dispatchQuickCandidate(preset: AgentPreset) {
    const goal = quickText.trim()
    if (!goal) return
    void createRun({
      runtime: preset.runtime,
      goal,
      context: [
        `Quick Dispatcher matched this task to ${preset.name}.`,
        `Identity: ${preset.identity}`,
        `Tool set: ${preset.tools}`,
        `Model preference: ${preset.model}`,
        extraContext.trim() ? `Additional context:\n${extraContext.trim()}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      work_dir: workDir.trim() || undefined
    })
  }

  function createCustomFromQuick() {
    const goal = quickText.trim()
    if (!goal) return
    void createRun({
      runtime: customRuntime,
      goal,
      context: [
        `Quick Dispatcher drafted a new agent profile: ${customName.trim() || "Custom Agent"}.`,
        `Identity: ${customIdentity.trim() || draftIdentity(goal)}`,
        `Tool set: ${customTools.trim() || "oversight chat"}`,
        `Model preference: ${customRuntime}`,
        extraContext.trim() ? `Additional context:\n${extraContext.trim()}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      work_dir: workDir.trim() || undefined
    })
  }

  function submitPreset() {
    const task = pickerText.trim()
    if (!task) return
    const presetContext = [
      `Agent preset: ${selectedPicker.name}`,
      `Identity: ${selectedPicker.identity}`,
      `Tool set: ${selectedPicker.tools}`,
      `Model preference: ${selectedPicker.model}`,
      extraContext.trim() ? `Additional context:\n${extraContext.trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n")
    void createRun({
      runtime: selectedPicker.runtime,
      goal: task,
      context: presetContext,
      work_dir: workDir.trim() || undefined
    })
  }

  return (
    <div className="dispatcher-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dispatcher-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatcher-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <header className="dispatcher-head">
          <div>
            <div className="panel-head">Agent Dispatcher</div>
            <h2 id="dispatcher-title">Dispatch a new agent</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </header>

        <div className="dispatcher-tabs" role="tablist" aria-label="Dispatch mode">
          <button
            type="button"
            className={mode === "quick" ? "active" : ""}
            onClick={() => switchMode("quick")}
          >
            Quick Dispatch
          </button>
          <button
            type="button"
            className={mode === "picker" ? "active" : ""}
            onClick={() => switchMode("picker")}
          >
            Agent Picker
          </button>
        </div>

        {mode === "quick" ? (
          <div className="dispatch-panel">
            <label className="field-label" htmlFor="quick-task">
              Task to dispatch
            </label>
            <textarea
              id="quick-task"
              className="dispatch-textarea"
              value={quickText}
              onChange={(ev) => {
                setQuickText(ev.target.value)
                setQuickReviewed(false)
              }}
              placeholder="Describe the job. The dispatcher will check recent and preset agents first."
              rows={6}
            />
            {!quickReviewed ? (
              <div className="quick-intent-card">
                <span>1</span>
                <p>Review recent agents and presets before creating anything new.</p>
              </div>
            ) : (
              <div className="quick-review">
                <div className="quick-review-head">
                  <div>
                    <div className="field-label">Dispatch review</div>
                    <strong>Use an existing agent if one fits.</strong>
                  </div>
                  <button type="button" className="ghost-btn mini" onClick={() => setQuickReviewed(false)}>
                    Edit task
                  </button>
                </div>
                <div className="quick-candidates">
                  {quickCandidates.map((candidate) => (
                    <div key={candidate.id} className="quick-candidate">
                      <span className={`preset-avatar ${candidate.preset.color}`}>{candidate.preset.mark}</span>
                      <div className="candidate-copy">
                        <span className="candidate-source">{candidate.source} · {candidate.match}</span>
                        <strong>{candidate.preset.name}</strong>
                        <p>{candidate.preset.description}</p>
                      </div>
                      <button
                        type="button"
                        className="candidate-dispatch"
                        disabled={submitting}
                        onClick={() => dispatchQuickCandidate(candidate.preset)}
                      >
                        Dispatch
                      </button>
                    </div>
                  ))}
                </div>
                <div className="custom-agent-draft">
                  <div className="quick-review-head">
                    <div>
                      <div className="field-label">No clean fit?</div>
                      <strong>Create a new agent profile.</strong>
                    </div>
                  </div>
                  <div className="custom-grid">
                    <label>
                      <span className="field-label">Name</span>
                      <input value={customName} onChange={(ev) => setCustomName(ev.target.value)} />
                    </label>
                    <label>
                      <span className="field-label">Runtime</span>
                      <select
                        value={customRuntime}
                        onChange={(ev) => setCustomRuntime(ev.target.value as RuntimeKind)}
                      >
                        {RUNTIMES.map((runtime) => (
                          <option key={runtime} value={runtime}>{runtime}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    <span className="field-label">Identity</span>
                    <textarea
                      value={customIdentity}
                      onChange={(ev) => setCustomIdentity(ev.target.value)}
                      rows={3}
                    />
                  </label>
                  <label>
                    <span className="field-label">Tools</span>
                    <input value={customTools} onChange={(ev) => setCustomTools(ev.target.value)} />
                  </label>
                  <button
                    type="button"
                    className="primary-btn custom-create"
                    disabled={submitting}
                    onClick={createCustomFromQuick}
                  >
                    Create agent and dispatch
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dispatch-panel">
            {recentAgents.length > 0 && (
              <div className="picker-section">
                <div className="field-label">Recent</div>
                <div className="recent-grid">
                  {recentAgents.map((agent) => {
                    const id = `recent:${agent.agent_id}`
                    return (
                      <button
                        key={agent.agent_id}
                        type="button"
                        className={`recent-card ${selectedPickerId === id ? "selected" : ""}`}
                        onClick={() => setSelectedPickerId(id)}
                      >
                        <span className={`state-dot ${agent.state}`} aria-hidden="true" />
                        <span>
                          <span className="recent-name">{agent.display_name}</span>
                          <span className="recent-intent">{agent.intent ?? agent.state}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="field-label">Presets</div>
            <div className="preset-grid">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${selectedPickerId === `preset:${preset.id}` ? "selected" : ""}`}
                  onClick={() => setSelectedPickerId(`preset:${preset.id}`)}
                >
                  <span className={`preset-avatar ${preset.color}`}>{preset.mark}</span>
                  <span className="preset-copy">
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-desc">{preset.description}</span>
                    <span className="preset-meta">
                      Identity · Tools · {preset.model}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="picker-task">
              Task for {selectedPicker.name}
            </label>
            <textarea
              id="picker-task"
              className="dispatch-textarea"
              value={pickerText}
              onChange={(ev) => setPickerText(ev.target.value)}
              placeholder="Describe the task for this agent..."
              rows={4}
            />
          </div>
        )}

        <button
          className="details-toggle"
          type="button"
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? "Hide details" : "Details"}
        </button>
        {showDetails && (
          <div className="dispatch-details">
            <label className="field-label" htmlFor="work-dir">
              Workspace
            </label>
            <input
              id="work-dir"
              value={workDir}
              onChange={(ev) => setWorkDir(ev.target.value)}
              placeholder="/absolute/project/path"
            />
            <label className="field-label" htmlFor="extra-context">
              Additional context
            </label>
            <textarea
              id="extra-context"
              value={extraContext}
              onChange={(ev) => setExtraContext(ev.target.value)}
              placeholder="Paste source notes, constraints, or background."
              rows={3}
            />
          </div>
        )}

        {error && <div className="dispatch-error">{error}</div>}

        <footer className="dispatcher-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={submitting || (mode === "quick" ? !quickText.trim() : !pickerText.trim())}
            onClick={mode === "quick" ? reviewQuick : submitPreset}
          >
            {submitting ? "Dispatching..." : mode === "quick" ? quickReviewed ? "Review again" : "Review agents" : "Dispatch"}
          </button>
        </footer>
      </section>
    </div>
  )
}

function pickPresetCandidates(text: string): AgentPreset[] {
  const lower = text.toLowerCase()
  const ranked = PRESETS.map((preset) => {
    const haystack = `${preset.name} ${preset.description} ${preset.identity} ${preset.tools}`.toLowerCase()
    const score = lower
      .split(/\W+/)
      .filter((word) => word.length > 3 && haystack.includes(word)).length
    return { preset, score }
  })
  ranked.sort((a, b) => b.score - a.score)
  return ranked.map((item) => item.preset)
}

function draftIdentity(goal: string): string {
  return `You are a focused task agent created for this dispatch. Complete the task clearly, surface user decisions with oversight cards, and cite artifacts when using sources. Task: ${goal.slice(0, 180)}`
}

function recentAgentToPreset(agent: AgentStateEvent): AgentPreset {
  return {
    id: agent.agent_id,
    name: agent.display_name,
    description: agent.intent ?? "Recently used agent",
    runtime: "claude",
    color: "cyan",
    mark: agent.display_name.slice(0, 1).toUpperCase() || "A",
    identity: `Continue with the working style of the recent agent named ${agent.display_name}.`,
    tools: "same oversight chat and decision protocol",
    model: "Recent"
  }
}
