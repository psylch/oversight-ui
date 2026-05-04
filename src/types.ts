// Event schema for the Oversight OS UI.
// In the full system this lives in @oversight/protocol and is shared with the
// daemon and CLI. In this UI-only fork we inline a compatible subset so the
// frontend builds standalone — no backend required.

export type Seq = number

export type AgentId = string
export type RunId = string
export type DecisionId = string
export type ClaimId = string
export type ArtifactRef = string

export type AgentState = "working" | "waiting" | "stalled" | "done" | "errored"
export type Urgency = "critical" | "sign-off" | "fyi"
export type Tier = "verified" | "model" | "user" | "unverified"
export type RuntimeKind =
  | "claude"
  | "codex"
  | "opencode"
  | "openclaw"
  | "hermes"
  | "gemini"
  | "pi"
  | "cursor"
  | "copilot"
  | "kimi"

export interface BaseEvent {
  seq: Seq
  ts: number
  agent_id: AgentId
}

export interface AgentStateEvent extends BaseEvent {
  type: "agent.state"
  display_name: string
  state: AgentState
  intent?: string
  elapsed_ms: number
}

export type DecisionShape = "replace" | "comparison" | "diff" | "inspection"

// Shape-specific narrative payload. Free-form per shape so the same protocol
// can carry visual variants without a structural overhaul. Renderers fall
// back to the static demo placeholder when a shape's payload is absent.
export interface ShapePayloadReplace {
  existingText: string
  suggestionText: string
  actionText: string
}
export interface ShapePayloadComparison {
  optionA: { label: string; title: string; metrics: Array<{ k: string; v: string }> }
  optionB: { label: string; title: string; metrics: Array<{ k: string; v: string }> }
  pick: "A" | "B"
  pickReason: string
}
export interface ShapePayloadDiff {
  file: string
  hunks: Array<{ kind: "add" | "del" | "ctx"; text: string }>
  testStatus: { passed: number; total: number; note?: string }
}
export interface ShapePayloadInspection {
  scope: string
  checks: Array<{ label: string; result: string; ok: boolean }>
  conclusion: string
}
export type ShapePayload =
  | ({ kind: "replace" } & ShapePayloadReplace)
  | ({ kind: "comparison" } & ShapePayloadComparison)
  | ({ kind: "diff" } & ShapePayloadDiff)
  | ({ kind: "inspection" } & ShapePayloadInspection)

export interface DecisionOpenEvent extends BaseEvent {
  type: "decision.open"
  decision_id: DecisionId
  urgency: Urgency
  headline: string
  recommendation: string
  default_action: string
  timeout_seconds: number
  evidence: Array<{ ref: ArtifactRef; label: string }>
  actions: Array<{ id: string; label: string }>
  escalated?: boolean
  decision_shape?: DecisionShape
  shape_payload?: ShapePayload
}

export interface DecisionClosedEvent extends BaseEvent {
  type: "decision.closed"
  decision_id: DecisionId
  action_id: string
  annotation?: string
  closed_by: "user" | "timeout" | "auto_approve"
}

export interface ClaimEvent extends BaseEvent {
  type: "claim"
  claim_id: ClaimId
  text: string
  tier: Tier
  source_ref?: ArtifactRef
  context?: string
}

export interface ArtifactAddedEvent extends BaseEvent {
  type: "artifact.added"
  ref: ArtifactRef
  kind: "file" | "url" | "snippet"
  location: string
  label?: string
}

export interface PolicyViolationEvent extends BaseEvent {
  type: "policy.violation"
  rule: string
  blocked_tool_call?: { tool: string; args_summary: string }
  suggested_action?: string
  decision_id?: DecisionId
}

export interface ChatMessageEvent extends BaseEvent {
  type: "chat.message"
  run_id?: RunId
  role: "agent" | "user" | "system"
  text: string
}

export interface AgentRunEvent extends BaseEvent {
  type: "agent.run"
  run_id: RunId
  runtime: RuntimeKind
  mode: "managed" | "external"
  status: "starting" | "running" | "waiting_for_user" | "done" | "failed"
  session_id?: string
  work_dir?: string
  error?: string
}

export type Event =
  | AgentStateEvent
  | DecisionOpenEvent
  | DecisionClosedEvent
  | ClaimEvent
  | ArtifactAddedEvent
  | PolicyViolationEvent
  | ChatMessageEvent
  | AgentRunEvent

// Dispatcher uses these (kept for AgentDispatcher.tsx compatibility)
export interface CreateRunResponse {
  run_id: RunId
  agent_id: AgentId
}
