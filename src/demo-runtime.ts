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

const COLE_DECISION_ID = "dec_demo_compare_fluff"
const ECHO_DECISION_ID = "dec_demo_echo_retract"

function bootScenario() {
  // 1) register five launch-week agents
  const initialAgents: Event[] = [
    agent(ARIA, "Aria · drafts", "waiting", "12 launch-week posts ready for review", 6 * 60 * 1000 + 12 * 1000),
    agent(BECK, "Beck · outreach", "waiting", "14 of 40 creators awaiting approval", 18 * 60 * 1000 + 4 * 1000),
    agent(COLE, "Cole · comparison", "stalled", "Compare page · low-confidence sentence", 3 * 60 * 1000 + 21 * 1000),
    agent(DALE, "Dale · ab-test", "working", "Analyzing last night's email A/B (n=4,200)", 9 * 60 * 1000),
    agent(ECHO, "Echo · social", "stalled", "6 overnight auto-replies, 1 flagged casual", 7 * 60 * 1000 + 41 * 1000)
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

  // 3) trickle chat + audit over time
  let t = 1500
  const trickle = [
    () => emit(chat(COLE, "agent", "Flagged the sentence as marketing-style (score 0.87).")),
    () => emit(chat(COLE, "agent", "Pulled benchmark numbers from last week's build log — ready to swap.")),
    () => emit(chat(ECHO, "agent", "Tone score 0.91 vs. account class ‘enterprise prospect’ — over threshold.")),
    () => emit(chat(DALE, "agent", "A/B test (n=4,200) — variant B +18% click-through. Drafting summary.")),
    () => emit(chat(BECK, "agent", "10 of the 14 pending creators score ≥ 0.8 fit — batch-approve candidates.")),
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
      shape: DecisionShape
      shape_payload: ShapePayload
    }
  }
> = {
  // Outreach Scout — finds creators, scores fit, drafts personalized DMs
  "research-analyst": {
    workingIntent: "Scanning developer-tool creators on YouTube + GitHub",
    chats: [
      "Indexed 40 candidates, 14 awaiting your approval.",
      "Top 10 score ≥ 0.8 fit — batch-approve candidates ready."
    ],
    decision: {
      headline: "Batch-approve the 10 high-fit creators in the outreach queue",
      recommendation:
        "Of 14 creators awaiting approval, 10 score ≥ 0.8 fit (audience overlap with developer-tools, recent posting cadence). Approve the batch; flag the remaining 4 to personalize.",
      evidence: [
        { ref: "fit", label: "Fit-score distribution · 10 ≥ 0.8 · 4 < 0.8", kind: "snippet", location: "Fit-score is audience overlap × posting cadence × topical relevance.\n10 candidates ≥ 0.8 — strong batch-approve signal.\n4 candidates 0.55–0.78 — flag for personalization." },
        { ref: "src", label: "Where AI found each creator (sample)", kind: "snippet", location: "8 from YouTube dev-tool reviews\n4 from GitHub trending (devtools topic)\n2 from HN 'Show HN' commenters" },
        { ref: "rate", label: "Reply-rate prior · 23% (last 90d)", kind: "snippet", location: "Outreach baseline: 23% reply rate on similar batches.\nProjected replies on 10 approvals: ~2.3." },
        { ref: "policy", label: "DM template · brand voice check passed", kind: "snippet", location: "DM template scored 0.18 informal — within enterprise-safe range." }
      ],
      shape: "comparison",
      shape_payload: {
        kind: "comparison",
        optionA: {
          label: "Batch-approve",
          title: "Approve all 10 high-fit creators",
          metrics: [
            { k: "Count", v: "10" },
            { k: "Median fit", v: "0.86" },
            { k: "ETA", v: "DMs send in 2m" }
          ]
        },
        optionB: {
          label: "One-by-one",
          title: "Review each card individually",
          metrics: [
            { k: "Count", v: "10" },
            { k: "Median fit", v: "0.86" },
            { k: "ETA", v: "~25m of your time" }
          ]
        },
        pick: "A",
        pickReason: "All 10 cleared the 0.8 threshold; batch-approve gets DMs out today."
      }
    }
  },
  // Drafter — turns rough angles into ready-to-post drafts
  "writing-partner": {
    workingIntent: "Drafting 12 launch-week LinkedIn posts",
    chats: [
      "12 drafts ready, tagged by audience angle.",
      "Draft #7 ('builders / migration story') is the weakest — wants a benchmark."
    ],
    decision: {
      headline: "Pick the launch-day post: builder-migration angle or founder-letter angle",
      recommendation:
        "Recommend the builder-migration draft (concrete, has the benchmark you published last month) over the founder-letter draft. Stronger pull on technical audience, matches your past voice.",
      evidence: [
        { ref: "draft_a", label: "Draft · builder-migration angle", kind: "snippet", location: "We rebuilt our CI runner from scratch. Median build dropped from 6.4s to 2.1s. Here's what we threw out..." },
        { ref: "draft_b", label: "Draft · founder-letter angle", kind: "snippet", location: "Six days ago I wrote on a napkin what I wanted this product to feel like..." },
        { ref: "voice", label: "Past 8 posts · concrete-first ratio 6/8", kind: "snippet", location: "Voice analysis: 6 of 8 prior posts open with a concrete number or scene.\nFounder-letter style: 1/8." }
      ],
      shape: "comparison",
      shape_payload: {
        kind: "comparison",
        optionA: {
          label: "Builder-migration",
          title: "Concrete · benchmark-led",
          metrics: [
            { k: "Pull", v: "Strong" },
            { k: "Voice match", v: "6/8 prior" },
            { k: "Length", v: "182 words" }
          ]
        },
        optionB: {
          label: "Founder-letter",
          title: "Reflective · narrative-led",
          metrics: [
            { k: "Pull", v: "Medium" },
            { k: "Voice match", v: "1/8 prior" },
            { k: "Length", v: "240 words" }
          ]
        },
        pick: "A",
        pickReason: "Concrete number up front; matches your past voice."
      }
    }
  },
  // Comparison Builder — builds competitor comparison pages with sourced claims
  "qa-reviewer": {
    workingIntent: "Auditing /compare/launch for unsourced claims",
    chats: [
      "Scanned 11 sentences, 1 flagged as marketing-style with no citation.",
      "Pulled benchmark numbers from build log — ready to swap."
    ],
    decision: {
      headline: "Replace the unsourced fluff sentence on /compare/launch",
      recommendation:
        "Replace \"Built for teams who actually ship — unlike legacy tools that slow you down.\" (no citation, marketing-style score 0.87) with a sourced benchmark from last week's build log.",
      evidence: [
        { ref: "bench", label: "Build benchmark · last week n=412", kind: "snippet", location: "Median build 2.1s · p95 4.7s.\nSource: ci/build-log.json · week of 2026-04-27." },
        { ref: "comp", label: "Competitor build-time public docs", kind: "url", location: "https://example.com/competitor/docs/build-times" },
        { ref: "score", label: "marketing-style score 0.87", kind: "snippet", location: "Flags: superlative phrasing, no number, vague comparison." },
        { ref: "origin", label: "Original sentence · no source attached", kind: "snippet", location: "Generated by page-writer at 07:58.\nNo upstream citation. [flagged]" }
      ],
      shape: "replace",
      shape_payload: {
        kind: "replace",
        existingText: "“Built for teams who actually ship — unlike legacy tools that slow you down.”",
        suggestionText: "“Median build 2.1s vs. competitor average 6.4s (last week, n=412 builds).”",
        actionText: "Update /compare/launch and re-render"
      }
    }
  },
  // Social Monitor — watches X/HN/Reddit, auto-replies low-stakes, flags risky
  "project-scout": {
    workingIntent: "Reviewing overnight auto-replies on X / HN / Reddit",
    chats: [
      "6 replies sent overnight while you were asleep.",
      "1 flagged: tone score 0.91 vs. account class 'enterprise prospect'."
    ],
    decision: {
      headline: "Retract the overnight auto-reply on @yc-prospect-acme",
      recommendation:
        "Reply at 02:41 was \"lol same here 😅\" — too casual for an enterprise prospect (sales tier 1, ~$180k ACV). Spread is still low (1 quote-tweet). Retract within X's 30-day window and re-send formal.",
      evidence: [
        { ref: "thread", label: "X thread · @yc-prospect-acme · 02:41", kind: "snippet", location: "@yc-prospect-acme: anyone else having flaky CI on the new runner?\nEcho (auto): lol same here 😅" },
        { ref: "acct", label: "Account class · enterprise prospect", kind: "snippet", location: "Sales pipeline tier 1.\nLast touch 2026-04-30 by sales@.\nACV est. $180k." },
        { ref: "tone", label: "Tone score 0.91 · over policy threshold", kind: "snippet", location: "Markers: emoji, lowercase, 'lol'.\nPolicy threshold for enterprise accounts: ≤ 0.30." },
        { ref: "spread", label: "Spread so far · 1 QT, 0 replies", kind: "snippet", location: "Low blast radius — retraction window still open." }
      ],
      shape: "comparison",
      shape_payload: {
        kind: "comparison",
        optionA: {
          label: "Retract + rewrite",
          title: "Delete and re-send formal",
          metrics: [
            { k: "Window", v: "28d left" },
            { k: "Spread", v: "1 QT only" },
            { k: "Cost", v: "1 click" }
          ]
        },
        optionB: {
          label: "Leave as-is",
          title: "Accept the casual reply",
          metrics: [
            { k: "Risk", v: "Brand tone" },
            { k: "Account", v: "Tier 1 · $180k" },
            { k: "Cost", v: "Reputational" }
          ]
        },
        pick: "A",
        pickReason: "Cheap to fix now; the 8-hour gap isn't fatal while the window is open."
      }
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
          "critical",
          followUp.decision.shape,
          followUp.decision.shape_payload
        )
      ])
    }, 12000 * DEMO_PACE)
  }

  void ({} as AgentActivityItem)
  return id
}
