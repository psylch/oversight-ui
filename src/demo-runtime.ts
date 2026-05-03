// Demo runtime — replaces the WebSocket client.
//
// Emits a believable agent lifecycle into the store so the UI looks alive
// when no backend is present. This file is the ONLY place in the UI that
// pretends to be a backend; everything downstream (store, components) is
// the same code that would run against a real daemon.
//
// Scenario:
//   1. Six agents register (Nash, Morrow, Corwin, Harlow, Tilden, Bain)
//   2. Two open a critical/sign-off decision
//   3. Chat messages and audit events stream in
//   4. Approve / Reject actions close the decision and ack via chat
//
// Tweak DEMO_PACE to slow down or speed up.

import { applyEvent, applyEvents, setWsConnected, type AgentActivityItem } from "./store"
import type {
  AgentStateEvent,
  ArtifactAddedEvent,
  ChatMessageEvent,
  DecisionClosedEvent,
  DecisionId,
  DecisionOpenEvent,
  Event
} from "./types"

const DEMO_PACE = 1 // multiply all delays by this

let seq = 0
const now = () => Date.now()
const next = () => (seq += 1)

function emit(ev: Event) {
  applyEvent(ev)
}
function emitMany(events: Event[]) {
  applyEvents(events)
}

// Helper builders
function agent(
  id: string,
  display: string,
  state: AgentStateEvent["state"],
  intent: string,
  elapsedMs: number
): AgentStateEvent {
  return {
    seq: next(),
    ts: now(),
    agent_id: id,
    type: "agent.state",
    display_name: display,
    state,
    intent,
    elapsed_ms: elapsedMs
  }
}

function chat(
  id: string,
  role: ChatMessageEvent["role"],
  text: string
): ChatMessageEvent {
  return {
    seq: next(),
    ts: now(),
    agent_id: id,
    type: "chat.message",
    role,
    text
  }
}

function artifact(
  id: string,
  ref: string,
  kind: ArtifactAddedEvent["kind"],
  location: string,
  label: string
): ArtifactAddedEvent {
  return {
    seq: next(),
    ts: now(),
    agent_id: id,
    type: "artifact.added",
    ref,
    kind,
    location,
    label
  }
}

function decisionOpen(
  id: string,
  decisionId: DecisionId,
  headline: string,
  recommendation: string,
  evidence: DecisionOpenEvent["evidence"],
  urgency: DecisionOpenEvent["urgency"] = "critical"
): DecisionOpenEvent {
  return {
    seq: next(),
    ts: now(),
    agent_id: id,
    type: "decision.open",
    decision_id: decisionId,
    urgency,
    headline,
    recommendation,
    default_action: "approve",
    timeout_seconds: 360,
    evidence,
    actions: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" }
    ]
  }
}

function decisionClosed(
  id: string,
  decisionId: DecisionId,
  actionId: string
): DecisionClosedEvent {
  return {
    seq: next(),
    ts: now(),
    agent_id: id,
    type: "decision.closed",
    decision_id: decisionId,
    action_id: actionId,
    closed_by: "user"
  }
}

const DECISION_ID = "dec_demo_q3_brief"
const NASH = "agent_nash"

function bootScenario() {
  // 1) register six agents in different states
  const initialAgents: Event[] = [
    agent(NASH, "Nash · research", "stalled", "Q3 brief Plaid claim", 4 * 60 * 1000 + 21 * 1000),
    agent("agent_morrow", "Morrow · data", "stalled", "Perm denied warehouse", 2 * 60 * 1000 + 14 * 1000),
    agent("agent_corwin", "Corwin · pricing", "working", "Q3 model retune", 14 * 60 * 1000),
    agent("agent_harlow", "Harlow · monitor", "working", "Soak test tail 7 of 12", 3 * 60 * 1000 + 11 * 1000),
    agent("agent_tilden", "Tilden · eng", "waiting", "Merge release/2.4", 48 * 1000),
    agent("agent_bain", "Bain · archive", "working", "Weekly index pass", 82 * 60 * 1000)
  ]
  emitMany(initialAgents)

  // 2) Nash opens a critical decision with 4 pieces of evidence
  emitMany([
    artifact(NASH, "art_cb", "url", "https://www.cbinsights.com/research/state-of-fintech", "CB Insights · State of Fintech Q2"),
    artifact(NASH, "art_plaid", "url", "https://plaid.com/customers/", "Plaid customers page"),
    artifact(NASH, "art_score", "snippet", "trust-score 0.42\n\nDerived from 12 corroborating sources, 1 flagged, 2 model-generated.", "trust-score 0.42"),
    artifact(NASH, "art_hn", "snippet", "HN comments thread (excerpt)\n\n> sample is heavily skewed toward US-only Series-B; the 60% figure does not generalize.\n\n[flagged · trust-score 0.42]", "HN thread #2024-1119 · flagged"),
    decisionOpen(
      NASH,
      DECISION_ID,
      "Approve Q3 brief draft v2 with revised Plaid claim",
      "Replace the unverified \"60% of Series-B fintechs use Plaid\" with \"majority of Series-B fintechs (no single dataset covers all regions)\", then ship v2 to the brief channel.",
      [
        { ref: "art_cb", label: "CB Insights · State of Fintech Q2" },
        { ref: "art_plaid", label: "Plaid customers page" },
        { ref: "art_score", label: "trust-score 0.42" },
        { ref: "art_hn", label: "HN thread #2024-1119 · flagged" }
      ],
      "critical"
    )
  ])

  // 3) trickle chat + audit over time
  let t = 1500
  const trickle = [
    () => emit(chat(NASH, "agent", "Updated trust-score after new HN flags.")),
    () => emit(chat(NASH, "agent", "Check source #4 — sample bias risk on the 60% claim.")),
    () => emit(chat("agent_morrow", "agent", "Data pull complete. No schema issues found.")),
    () => emit(chat("agent_corwin", "agent", "Q3 model retune in progress. ETA 14m.")),
    // tick elapsed for Nash so the queue counter moves
    () => emit(agent(NASH, "Nash · research", "stalled", "Q3 brief Plaid claim", 4 * 60 * 1000 + 38 * 1000))
  ]
  for (const fn of trickle) {
    setTimeout(fn, t * DEMO_PACE)
    t += 2200
  }
}

let started = false
export function startDemoRuntime() {
  if (started) return
  started = true
  setWsConnected(true)
  // small delay so React mounts before first events
  setTimeout(bootScenario, 60)
}

// Replaces ws-client's sendAction — closes the decision locally so the UI
// reflects user input. In a real backend this round-trips through the daemon.
export function sendAction(decisionId: string, actionId: string) {
  emit(decisionClosed(NASH, decisionId, actionId))
  emit(
    agent(
      NASH,
      "Nash · research",
      "done",
      actionId === "approve" ? "Brief shipped" : "Brief rejected — awaiting next step",
      5 * 60 * 1000
    )
  )
  emit(
    chat(
      NASH,
      "system",
      actionId === "approve"
        ? "Decision approved — v2 shipped to #q3-brief."
        : "Decision rejected — agent paused for direction."
    )
  )
}

// Stand-in for chat composer (no real backend). Echoes the message into the
// store so designers can see their input flow.
export function sendChatInput(agentId: string, text: string) {
  emit(chat(agentId, "user", text))
  setTimeout(() => {
    emit(chat(agentId, "agent", `(demo reply) noted: ${text}`))
  }, 700)
}

// Stand-in for AgentDispatcher's POST /ui/runs — adds a fake agent locally.
export function dispatchAgent(opts: {
  display_name: string
  intent?: string
}) {
  const id = `agent_${Math.random().toString(36).slice(2, 8)}`
  emit(agent(id, opts.display_name, "working", opts.intent ?? "Starting up", 0))
  // unused activity hint for typing
  void ({} as AgentActivityItem)
  return id
}
