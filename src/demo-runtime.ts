// Demo runtime — replaces the WebSocket client.
//
// Emits a believable agent lifecycle into the store so the UI looks alive
// when no backend is present. This file is the ONLY place in the UI that
// pretends to be a backend; everything downstream (store, components) is
// the same code that would run against a real daemon.
//
// Scenario — Alex, marketing lead, six days from launch:
//   1. Five agents register (Aria drafts, Beck outreach, Cole comparison,
//      Dale A/B test, Echo social monitor). Three are warm (waiting on Alex),
//      two are cool (running on their own).
//   2. Cole opens a critical decision — replace an unsourced fluff sentence
//      on the comparison page. Echo opens a sign-off decision — retract an
//      overnight auto-reply that was too casual for an enterprise prospect.
//   3. Chat messages stream in: trust scores, A/B results, approval queues.
//   4. Approve / Reject actions close the decision and ack via chat.
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
  DecisionShape,
  Event,
  ShapePayload
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
  urgency: DecisionOpenEvent["urgency"] = "critical",
  shape?: DecisionShape,
  shapePayload?: ShapePayload
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
    ],
    decision_shape: shape,
    shape_payload: shapePayload
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

// agent_ids stay stable so identity catalog (color/shape) keeps working;
// only display names + role labels change.
const COLE = "agent_nash"      // comparison-page builder
const ECHO = "agent_morrow"    // social monitor
const DALE = "agent_corwin"    // A/B test analyst
const BECK = "agent_harlow"    // creator-outreach scout
const ARIA = "agent_tilden"    // launch-post drafter
const FAYE = "agent_faye"      // inbound-reply reviewer (rich drill-down card)

const COLE_DECISION_ID = "dec_demo_compare_fluff"
const ECHO_DECISION_ID = "dec_demo_echo_retract"
const BECK_DECISION_ID = "dec_demo_beck_batch_approve"
export const FAYE_DECISION_ID = "dec_demo_faye_autoreply"
export const FAYE_AGENT_ID = FAYE

function bootScenario() {
  // 1) register five launch-week agents
  const initialAgents: Event[] = [
    agent(ARIA, "Aria · drafts", "waiting", "12 launch-week posts ready for review", 6 * 60 * 1000 + 12 * 1000),
    agent(BECK, "Beck · outreach", "stalled", "14 of 40 creators awaiting approval", 18 * 60 * 1000 + 4 * 1000),
    agent(COLE, "Cole · comparison", "stalled", "Compare page · low-confidence sentence", 3 * 60 * 1000 + 21 * 1000),
    agent(DALE, "Dale · ab-test", "working", "Analyzing last night's email A/B (n=4,200)", 9 * 60 * 1000),
    agent(ECHO, "Echo · social", "stalled", "6 overnight auto-replies, 1 flagged casual", 7 * 60 * 1000 + 41 * 1000),
    agent(FAYE, "Faye · replies", "stalled", "Auto-reply on @raj_builds thread · 4 claims to verify", 17 * 60 * 1000 + 8 * 1000)
  ]
  emitMany(initialAgents)

  // 2) Cole opens a critical decision — unsourced fluff on the compare page
  emitMany([
    artifact(COLE, "art_bench", "snippet", "Build benchmark · last week\n\nMedian build time 2.1s across 412 builds. p95 4.7s. Source: ci/build-log.json (week of 2026-04-27).", "Build benchmark · last week n=412"),
    artifact(COLE, "art_competitor", "url", "https://example.com/competitor/docs/build-times", "Competitor build-time public docs"),
    artifact(COLE, "art_score", "snippet", "marketing-style score 0.87\n\nFlags: superlative phrasing, no number, vague comparison. Two corroborating cues: 'actually ship', 'slow you down'.", "marketing-style score 0.87"),
    artifact(COLE, "art_origin", "snippet", "Original sentence · provenance trace\n\nNo upstream source attached. Generated by the page-writer step at 07:58 with prompt slot 'tone: punchy'.\n\n[flagged · no citation]", "Original sentence · no source attached"),
    decisionOpen(
      COLE,
      COLE_DECISION_ID,
      "Replace the unsourced fluff sentence on /compare/launch",
      "Cole flagged \"Built for teams who actually ship — unlike legacy tools that slow you down.\" as marketing-style with no citation. Replace with the build-time benchmark from last week's run, then re-render the comparison page.",
      [
        { ref: "art_bench", label: "Build benchmark · last week n=412" },
        { ref: "art_competitor", label: "Competitor build-time public docs" },
        { ref: "art_score", label: "marketing-style score 0.87" },
        { ref: "art_origin", label: "Original sentence · no source attached" }
      ],
      "critical",
      "replace",
      {
        kind: "replace",
        existingText: "“Built for teams who actually ship — unlike legacy tools that slow you down.”",
        suggestionText:
          "“Median build 2.1s vs. competitor average 6.4s (last week, n=412 builds).”",
        actionText: "Update /compare/launch and re-render"
      }
    )
  ])

  // Echo's decision — sign-off, retract overnight auto-reply
  emitMany([
    artifact(ECHO, "art_thread", "snippet", "X thread · 02:41 last night\n\n@yc-prospect-acme: \"anyone else having flaky CI on the new runner?\"\nEcho (auto): \"lol same here 😅\"", "X thread · @yc-prospect-acme"),
    artifact(ECHO, "art_account", "snippet", "Account class: enterprise prospect\n\nIn sales pipeline tier 1 (last touch 2026-04-30 by sales@). Annual contract value est. $180k.", "Account class · enterprise prospect"),
    artifact(ECHO, "art_tone", "snippet", "Reply tone score: 0.91 informal\n\nMarkers: emoji, lowercase, 'lol'. Echo's policy threshold for enterprise accounts: ≤ 0.30 informal.", "Tone score 0.91 · over policy threshold"),
    artifact(ECHO, "art_window", "url", "https://help.x.com/en/using-x/delete-posts", "X delete-and-repost policy · 30d window"),
    decisionOpen(
      ECHO,
      ECHO_DECISION_ID,
      "Retract Echo's overnight auto-reply on @yc-prospect-acme",
      "Echo replied at 02:41 with \"lol same here 😅\" — too casual for an enterprise prospect (sales tier 1, ~$180k ACV). Spread is still low (1 quote-tweet). Recommend retract and re-send in a professional tone within X's 30-day window.",
      [
        { ref: "art_thread", label: "X thread · @yc-prospect-acme" },
        { ref: "art_account", label: "Account class · enterprise prospect" },
        { ref: "art_tone", label: "Tone score 0.91 · over policy threshold" },
        { ref: "art_window", label: "X delete-and-repost policy · 30d window" }
      ],
      "sign-off",
      "inspection",
      {
        kind: "inspection",
        scope: "Auto-reply retraction · @yc-prospect-acme · X.com",
        checks: [
          { label: "Account class", result: "enterprise prospect · sales tier 1", ok: false },
          { label: "Reply tone", result: "informal score 0.91 (policy threshold 0.30)", ok: false },
          { label: "Spread so far", result: "1 quote-tweet, 0 replies — low blast radius", ok: true },
          { label: "Retraction window", result: "28d remaining (X delete + repost)", ok: true }
        ],
        conclusion: "Retract and re-send in professional tone — low cost to fix, high reputational risk if left."
      }
    )
  ])

  // Beck's decision — comparison shape, sign-off urgency. Two paths for the
  // outreach queue: batch-approve the 10 that already cleared the fit threshold,
  // or hand-review every card individually.
  emitMany([
    artifact(BECK, "art_fit", "snippet", "Fit-score distribution\n\n10 candidates ≥ 0.8 fit (audience overlap × posting cadence × topical relevance).\n4 candidates 0.55–0.78 — flagged for personalization.", "Fit-score distribution · 10 ≥ 0.8 · 4 < 0.8"),
    artifact(BECK, "art_src", "snippet", "Where Beck found each creator (sample)\n\n8 from YouTube dev-tool reviews\n4 from GitHub trending (devtools topic)\n2 from HN 'Show HN' commenters", "Sourcing breakdown · 14 candidates"),
    artifact(BECK, "art_rate", "snippet", "Outreach baseline · 23% reply rate (last 90d)\n\nProjected replies on 10 approvals: ~2.3.\nProjected DM-to-call conversion: ~0.4 calls.", "Reply-rate prior · 23% (last 90d)"),
    artifact(BECK, "art_template", "snippet", "DM template · brand voice check passed\n\nTemplate scored 0.18 informal — within enterprise-safe range. Per-creator personalization slot already filled from each creator's last public post.", "DM template · brand voice check passed"),
    decisionOpen(
      BECK,
      BECK_DECISION_ID,
      "Batch-approve the 10 high-fit creators in the outreach queue",
      "Of 14 creators awaiting approval, 10 cleared 0.8 fit. Batch-approve them so DMs go out today; flag the remaining 4 for personalization. Alternative: review every card individually (~25m of your time).",
      [
        { ref: "art_fit",      label: "Fit-score distribution · 10 ≥ 0.8 · 4 < 0.8" },
        { ref: "art_src",      label: "Sourcing breakdown · 14 candidates" },
        { ref: "art_rate",     label: "Reply-rate prior · 23% (last 90d)" },
        { ref: "art_template", label: "DM template · brand voice check passed" }
      ],
      "sign-off",
      "comparison",
      {
        kind: "comparison",
        optionA: {
          label: "Batch-approve",
          title: "Approve all 10 high-fit creators",
          metrics: [
            { k: "Count",      v: "10" },
            { k: "Median fit", v: "0.86" },
            { k: "Time cost",  v: "DMs send in 2m" }
          ]
        },
        optionB: {
          label: "Review individually",
          title: "Open each card one by one",
          metrics: [
            { k: "Count",      v: "10" },
            { k: "Median fit", v: "0.86" },
            { k: "Time cost",  v: "~25m of your time" }
          ]
        },
        pick: "A",
        pickReason: "All 10 cleared the 0.8 threshold; batch-approve gets DMs out today."
      }
    )
  ])

  // Faye's decision — drill-down variant card (rendered by AutoReplyCard).
  // The agent decided this scenario is rich enough (4 claims with mixed
  // provenance) to escalate from a standard decision card into a custom
  // claim-attribution view. Evidence array stays minimal — the rich
  // breakdown lives inside AutoReplyCard itself.
  emitMany([
    artifact(FAYE, "art_thread2", "snippet", "X thread · 2h ago\n\n@raj_builds: \"is your thing actually faster than Riverbend for folks on enterprise plans? or is that a benchmark thing\"", "X thread · @raj_builds"),
    artifact(FAYE, "art_conf", "snippet", "Overall confidence 62%\n\n3 of 4 claims cited.\n1 low-confidence claim (no source, casual tone).\nBelow your 80% auto-send threshold.", "Overall confidence 62% · below threshold"),
    decisionOpen(
      FAYE,
      FAYE_DECISION_ID,
      "Auto-reply on @raj_builds thread — 1 of 4 claims uncited",
      "Faye drafted a reply with 4 claims: build benchmark, public benchmark date, competitor pricing tier, and a casual DM offer. Claim ❹ has no source and reads casual for an enterprise prospect. Confidence 62% — below your 80% auto-send threshold.",
      [
        { ref: "art_thread2", label: "X thread · @raj_builds" },
        { ref: "art_conf", label: "Overall confidence 62% · below threshold" }
      ],
      "critical"
    )
  ])

  // 3) trickle chat + audit over time
  let t = 1500
  const trickle = [
    () => emit(chat(COLE, "agent", "Flagged the sentence as marketing-style (score 0.87).")),
    () => emit(chat(COLE, "agent", "Pulled benchmark numbers from last week's build log — ready to swap.")),
    () => emit(chat(ECHO, "agent", "Tone score 0.91 vs. account class ‘enterprise prospect’ — over threshold.")),
    () => emit(chat(DALE, "agent", "A/B test (n=4,200) — variant B +18% click-through. Drafting summary.")),
    () => emit(chat(BECK, "agent", "10 of the 14 pending creators score ≥ 0.8 fit — batch-approve candidates.")),
    () => emit(chat(FAYE, "agent", "Drafted reply has 4 claims; ❹ has no source and reads casual.")),
    () => emit(chat(FAYE, "user",  "Hold on — claim ❹ is the only one with no source. Why did you draft it at all?")),
    () => emit(chat(FAYE, "agent", "Raj asking “or is that a benchmark thing” reads as an implicit ask for raw data. The “happy to DM” line lets me back the public claims without bloating the public reply. But the line itself is a template — no upstream source.")),
    () => emit(chat(FAYE, "user",  "What's the risk if I just leave ❹ in?")),
    () => emit(chat(FAYE, "agent", "Two. (1) Tone — “happy to DM” lands light for the tier-1 prospects lurking in this thread. (2) The trace itself isn't shippable yet; only the internal-perf one exists, and that has unredacted customer IDs.")),
    () => emit(chat(FAYE, "user",  "What do you actually recommend?")),
    () => emit(chat(FAYE, "agent", "Either edit ❹ to “Drop me a note if you want the methodology — happy to share the script.” Same offer, drops the casual tone, shifts the burden from a private trace to a doc. Or decline; @raj_builds has 1.2k followers — not high-leverage for launch.")),
    () => emit(chat(FAYE, "user",  "Edit. Keep ❶ ❷ ❸. Send.")),
    () => emit(chat(FAYE, "system", "Sent at 08:43. Saved “no model-only claim → ask first” as a rule.")),
    // tick elapsed for Cole so the queue counter moves
    () => emit(agent(COLE, "Cole · comparison", "stalled", "Compare page · low-confidence sentence", 3 * 60 * 1000 + 38 * 1000))
  ]
  for (const fn of trickle) {
    setTimeout(fn, t * DEMO_PACE)
    t += 2200
  }
}

// "Load populated demo" — clears the store and replays the boot scenario
// so a presenter can flip from the cold-start hub straight into the busy
// dashboard (Nash's Plaid card + Morrow's permission card + 6 lanes).
export function loadPopulatedDemo() {
  resetStore()
  setWsConnected(true)
  setTimeout(bootScenario, 60)
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
  const ownerId = open?.agent_id ?? COLE
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
        ? "Approved. Action queued downstream."
        : "Rejected. Agent paused — next step required from you."
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

// Per-preset follow-up scripts — keep dispatched agents alive (working state +
// two chat lines) so the lane shows progress. No auto-spawned decision card:
// dispatched agents present as in-flight; the supervisor drives any next move
// from chat, not from a duplicated dossier of the demo lineup.
const FOLLOW_UPS: Record<
  string,
  { workingIntent: string; chats: [string, string] }
> = {
  // Outreach Scout — finds creators, scores fit, drafts personalized DMs
  "research-analyst": {
    workingIntent: "Scanning developer-tool creators on YouTube + GitHub",
    chats: [
      "Indexed 40 candidates, scoring fit on audience × cadence × topic.",
      "Top 10 cleared 0.8 fit; 4 marginal candidates flagged for personalization."
    ]
  },
  // Drafter — turns rough angles into ready-to-post drafts
  "writing-partner": {
    workingIntent: "Drafting launch-week posts across 4 audience angles",
    chats: [
      "12 drafts shaped, tagged by audience.",
      "Draft #7 (builders / migration) wants a benchmark to land — pulling numbers."
    ]
  },
  // Comparison Builder — competitor comparison pages with sourced claims
  "qa-reviewer": {
    workingIntent: "Auditing competitor comparison pages for unsourced claims",
    chats: [
      "Scanned 11 sentences across /compare; flagged 1 marketing-style line.",
      "Pulled benchmark numbers — ready to swap when you want a draft."
    ]
  },
  // Social Monitor — watches public mentions, auto-replies low-stakes
  "project-scout": {
    workingIntent: "Watching X / HN / Reddit for product mentions",
    chats: [
      "Watching 14 keywords across 3 platforms.",
      "0 high-stakes mentions in the last hour — surfacing summaries on request."
    ]
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
  }

  void ({} as AgentActivityItem)
  return id
}
