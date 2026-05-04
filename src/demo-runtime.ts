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

import {
  applyEvent,
  applyEvents,
  readState,
  resetStore,
  setWsConnected,
  type AgentActivityItem
} from "./store"
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

// "Replay demo" — clears the store, then auto-walks the cold-start arc:
// dispatch Research Analyst → wait for the scripted decision to land
// → auto-approve. ~16s end-to-end. Used by the Demo button in OsBar so
// a presenter can rewind without reloading the page.
let demoFlowRunning = false
export function runDemoFlow() {
  if (demoFlowRunning) return
  demoFlowRunning = true
  resetStore()
  setWsConnected(true)

  // small pause so the empty dispatch hub registers visually
  setTimeout(() => {
    const agentId = dispatchAgent({
      display_name: "Research · research",
      intent: "Pull and verify sources for the current brief",
      preset: "research-analyst"
    })

    // wait for the scripted decision to land (12s after dispatch),
    // then auto-approve so the audience sees the close-loop
    setTimeout(() => {
      const open = readState().openDecisions.find((d) => d.agent_id === agentId)
      if (open) sendAction(open.decision_id, "approve")
      demoFlowRunning = false
    }, 13500 * DEMO_PACE)
  }, 1200 * DEMO_PACE)
}

let started = false
export function startDemoRuntime(opts: { skipBoot?: boolean } = {}) {
  if (started) return
  started = true
  setWsConnected(true)
  if (opts.skipBoot) return
  // small delay so React mounts before first events
  setTimeout(bootScenario, 60)
}

// Replaces ws-client's sendAction — closes the decision locally so the UI
// reflects user input. In a real backend this round-trips through the daemon.
export function sendAction(decisionId: string, actionId: string) {
  // Look up the agent that owns this decision from the live store
  const state = readState()
  const open = state.openDecisions.find((d) => d.decision_id === decisionId)
  const ownerId = open?.agent_id ?? NASH
  const owner = state.agents.get(ownerId)
  const displayName = owner?.display_name ?? "Agent"

  emit(decisionClosed(ownerId, decisionId, actionId))
  emit(
    agent(
      ownerId,
      displayName,
      "done",
      actionId === "approve" ? "Decision approved" : "Decision rejected",
      (owner?.elapsed_ms ?? 0) + 1000
    )
  )
  emit(
    chat(
      ownerId,
      "system",
      actionId === "approve"
        ? "Decision approved — action queued for downstream."
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

// Per-preset follow-up scripts so dispatched agents come alive and emit a
// realistic decision after a few seconds. Keeps the demo narrative going
// after the user clicks a preset card.
const FOLLOW_UPS: Record<
  string,
  {
    workingIntent: string
    chats: [string, string]
    decision: {
      headline: string
      recommendation: string
      evidence: Array<{
        ref: string
        label: string
        kind: "url" | "snippet"
        location: string
      }>
    }
  }
> = {
  "research-analyst": {
    workingIntent: "Pulling sources on AI agent ergonomics",
    chats: [
      "Indexed 14 sources, 3 flagged for low trust.",
      "Found 2 corroborating cases for the main claim."
    ],
    decision: {
      headline: "Cite Karpathy 2024 talk as primary anchor for ergonomics section",
      recommendation:
        "Use the Karpathy 'AI agent ergonomics' talk (Nov 2024) as the anchor citation. Drops 2 weaker secondary sources from the brief.",
      evidence: [
        { ref: "k_talk", label: "Karpathy · Agent Ergonomics talk (YouTube)", kind: "url", location: "https://example.com/karpathy-talk" },
        { ref: "yc_post", label: "YC Research · Agent Workflows", kind: "url", location: "https://example.com/yc-agent-workflows" },
        { ref: "tscore", label: "trust-score 0.78", kind: "snippet", location: "trust-score 0.78 — high overlap with peer-reviewed sources" },
        { ref: "hn_skim", label: "HN reactions · mostly positive", kind: "snippet", location: "HN thread: 312 upvotes, 47 comments, no flagged corrections" }
      ]
    }
  },
  "writing-partner": {
    workingIntent: "Drafting introduction",
    chats: [
      "First pass complete (320 words).",
      "Forked between two opening hooks — need your call."
    ],
    decision: {
      headline: "Choose opening hook for the introduction",
      recommendation:
        "Recommend Hook A (concrete scenario about a Friday-evening incident) over Hook B (abstract framing). Stronger pull, matches your prior voice.",
      evidence: [
        { ref: "hook_a", label: "Draft · Hook A (concrete scenario)", kind: "snippet", location: "It's Friday 6pm. Three Claude sessions are open. Each one needs you..." },
        { ref: "hook_b", label: "Draft · Hook B (abstract framing)", kind: "snippet", location: "The supervisor is the new bottleneck in agent workflows..." },
        { ref: "voice", label: "Your past 5 essays · concrete-first ratio 4/5", kind: "snippet", location: "Voice analysis: 4 of 5 prior essays open with a concrete scene." }
      ]
    }
  },
  "qa-reviewer": {
    workingIntent: "Reproducing login redirect issue",
    chats: [
      "Reproduced the loop in 3/3 attempts on Chrome 130.",
      "Found a stale cookie clears it. Fix candidate identified."
    ],
    decision: {
      headline: "Approve fix for issue #842 — clear stale auth cookie on login",
      recommendation:
        "Recommend the cookie-clear approach over a full session reset. Smaller surface, no impact on other auth flows.",
      evidence: [
        { ref: "repro", label: "Repro video · 3 attempts", kind: "snippet", location: "Recording: Chrome → /login → loops to /login → cleared cookie → success." },
        { ref: "diff", label: "diff · auth/login.ts (+12 −3)", kind: "snippet", location: "+ if (req.cookies.session_stale) res.clearCookie('session_stale')" },
        { ref: "tests", label: "All login tests pass (24/24)", kind: "snippet", location: "Test suite: 24 passed, 0 failed, 0 skipped (run: 14:32 UTC)" }
      ]
    }
  },
  "project-scout": {
    workingIntent: "Mapping repo structure",
    chats: [
      "Indexed 142 files across 8 modules.",
      "Identified two refactor candidates with different risk profiles."
    ],
    decision: {
      headline: "Pick refactor target: billing module first, or auth migration?",
      recommendation:
        "Recommend billing module first. Smaller blast radius (4 callers vs 23), fully covered by tests, no schema migration needed.",
      evidence: [
        { ref: "bill", label: "billing/ · 4 internal callers · test coverage 91%", kind: "snippet", location: "billing/ — 4 callers, 91% coverage, no DB schema migration." },
        { ref: "auth", label: "auth/ · 23 callers · schema migration required", kind: "snippet", location: "auth/ — 23 callers, 67% coverage, requires schema migration." },
        { ref: "graph", label: "Dependency graph (snippet)", kind: "snippet", location: "billing → invoice, ledger, customer\nauth → 23 modules incl. session/, api/, gateway/" }
      ]
    }
  }
}

// Stand-in for AgentDispatcher's POST /ui/runs — adds a fake agent locally
// AND schedules a believable follow-up arc (working → chat → decision lands)
// so the dispatched lane doesn't sit empty.
export function dispatchAgent(opts: {
  display_name: string
  intent?: string
  preset?: string
}) {
  const id = `agent_${Math.random().toString(36).slice(2, 8)}`
  const followUp = opts.preset ? FOLLOW_UPS[opts.preset] : undefined
  emit(agent(id, opts.display_name, "working", opts.intent ?? "Starting up", 0))

  if (followUp) {
    setTimeout(() => {
      emit(agent(id, opts.display_name, "working", followUp.workingIntent, 4000))
      emit(chat(id, "agent", followUp.chats[0]))
    }, 4000 * DEMO_PACE)

    setTimeout(() => {
      emit(chat(id, "agent", followUp.chats[1]))
    }, 9000 * DEMO_PACE)

    setTimeout(() => {
      const decisionId = `dec_${id}`
      const evidenceEvents: Event[] = followUp.decision.evidence.map((e) =>
        artifact(id, e.ref, e.kind, e.location, e.label)
      )
      emitMany([
        ...evidenceEvents,
        agent(id, opts.display_name, "stalled", "Awaiting your decision", 12000),
        decisionOpen(
          id,
          decisionId,
          followUp.decision.headline,
          followUp.decision.recommendation,
          followUp.decision.evidence.map((e) => ({ ref: e.ref, label: e.label })),
          "critical"
        )
      ])
    }, 12000 * DEMO_PACE)
  }

  void ({} as AgentActivityItem)
  return id
}
