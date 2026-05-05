// Replay engine — step-through runner for the demo flows. Drives the
// FakeCursor + step-pulse highlight + sequential state changes so a recorder
// can step through a flow one beat at a time.
//
// Each step:
//   - sets `replayStep` in the store (FakeCursor + .step-pulse react to this)
//   - runs an action (select agent, switch ops tab, emit chat, close decision)
//
// The cursor finds an element via `[data-step-target="<step.target>"]`.

import { setOpsTab, setReplayStep, setSelectedAgent, useStore } from "./store"
import {
  BECK,
  BECK_DECISION_ID,
  COLE,
  COLE_DECISION_ID,
  ECHO,
  ECHO_DECISION_ID,
  FAYE_AGENT_ID,
  replayCloseDecision,
  replayFlow1,
  replayFlow2,
  replayFlow3,
  replayPlayAll,
  replayPushChat,
} from "./demo-runtime"

// --- DOM helpers used by step.run() bodies ---
function findTarget(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-step-target="${target}"]`)
}

function clickTarget(target: string) {
  findTarget(target)?.click()
}

// Use the native value setter so React picks up the change on textarea/input.
function fillTarget(target: string, value: string) {
  const el = findTarget(target) as HTMLTextAreaElement | HTMLInputElement | null
  if (!el) return
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

export type ReplayStep = {
  id: string
  label: string
  target: string // DOM data-step-target value
  run?: () => void
}

export type ReplayFlow = {
  id: "flow1" | "flow2" | "flow3" | "all"
  label: string
  init: () => void // runs once on entering the flow (resets store, boots agents)
  steps: ReplayStep[]
}

// --- Flow 1 · card decisions (full implementation) ---
const FLOW1: ReplayFlow = {
  id: "flow1",
  label: "Flow 1 · cards",
  init: () => {
    replayFlow1()
    // replayFlow1 already auto-selects Cole at +60ms. Override to nothing so
    // the first step does the selection visibly.
    setTimeout(() => setSelectedAgent(null), 80)
  },
  steps: [
    // --- Cole: open card → approve ---
    {
      id: "flow1.cole-show",
      label: "Cole · open the comparison-page card",
      target: `lane:${COLE}`,
      run: () => {
        setSelectedAgent(COLE)
        setOpsTab("audit")
        replayPushChat(
          COLE,
          "agent",
          "Hey — caught a sentence on /compare/launch that reads like marketing fluff: \"actually ship — unlike legacy tools that slow you down.\" There's no source behind it. I've got last week's build benchmark ready as a swap.",
        )
      },
    },
    {
      id: "flow1.cole-approve",
      label: "Cole · ship the replacement",
      target: "card-primary",
      run: () => replayCloseDecision(COLE_DECISION_ID, "approve"),
    },

    // --- Echo: open card → retract ---
    {
      id: "flow1.echo-show",
      label: "Echo · open the auto-reply retract card",
      target: `lane:${ECHO}`,
      run: () => {
        setSelectedAgent(ECHO)
        replayPushChat(
          ECHO,
          "agent",
          "About my reply on the @yc-prospect-acme thread last night — \"lol same here 😅\". They're an enterprise prospect, sales tier 1. Tone's way over what we'd normally use. We're still inside the 30-day retract window.",
        )
      },
    },
    {
      id: "flow1.echo-approve",
      label: "Echo · retract and re-send",
      target: "card-primary",
      run: () => replayCloseDecision(ECHO_DECISION_ID, "approve"),
    },

    // --- Beck: open card → user pauses → asks chat → resolves ---
    {
      id: "flow1.beck-show",
      label: "Beck · open the outreach batch card",
      target: `lane:${BECK}`,
      run: () => {
        setSelectedAgent(BECK)
        replayPushChat(
          BECK,
          "agent",
          "Heads up — 10 of the 14 pending creators are above your 0.8 fit cutoff. Want me to batch them, or look one by one?",
        )
      },
    },
    {
      id: "flow1.chat-tab",
      label: "Alex hesitates — opens chat",
      target: "ops-tab:chat",
      run: () => setOpsTab("chat"),
    },
    {
      id: "flow1.alex-asks",
      label: "Alex: show me a borderline one first",
      target: "chat-composer",
      run: () => replayPushChat(BECK, "user", "show me a borderline one first"),
    },
    {
      id: "flow1.beck-replies",
      label: "Beck: @devtools_dana, 0.81 fit",
      target: "chat-composer",
      run: () =>
        replayPushChat(
          BECK,
          "agent",
          "Sure — @devtools_dana sits at 0.81. Eight YouTube dev-tool reviews, last post four days ago. Solid fit, just right at the edge.",
        ),
    },
    {
      id: "flow1.alex-confirms",
      label: "Alex: ok, approve all ten",
      target: "chat-composer",
      run: () => replayPushChat(BECK, "user", "ok, approve all ten"),
    },
    {
      id: "flow1.beck-resolve",
      label: "Beck · batch-approve",
      target: "card-primary",
      run: () => {
        setOpsTab("audit")
        setSelectedAgent(BECK)
        replayCloseDecision(BECK_DECISION_ID, "approve")
        replayPushChat(BECK, "system", "Sent 10 DMs · 4 flagged for personalization.")
      },
    },
  ],
}

// --- Flow 2 · dispatch ---
const FLOW2: ReplayFlow = {
  id: "flow2",
  label: "Flow 2 · dispatch",
  init: () => replayFlow2(),
  steps: [
    {
      id: "flow2.slot",
      label: "Alex opens dispatch slot",
      target: "dispatch-slot",
      run: () => clickTarget("dispatch-slot"),
    },
    {
      id: "flow2.intent",
      label: "Type the new agent's task",
      target: "dispatcher-intent",
      run: () =>
        fillTarget(
          "dispatcher-intent",
          "Personalize DMs for the 4 borderline creators Beck flagged earlier today.",
        ),
    },
    {
      id: "flow2.preset",
      label: "Pick a preset",
      target: "dispatcher-preset-first",
      run: () => clickTarget("dispatcher-preset-first"),
    },
    {
      id: "flow2.confirm",
      label: "Dispatch — new lane appears",
      target: "dispatcher-confirm",
      run: () => clickTarget("dispatcher-confirm"),
    },
  ],
}

// --- Flow 3 · drill-down ---
const FLOW3: ReplayFlow = {
  id: "flow3",
  label: "Flow 3 · drill-down",
  init: () => replayFlow3(),
  steps: [
    {
      id: "flow3.faye-show",
      label: "Faye · critical, AutoReplyCard open",
      target: `lane:${FAYE_AGENT_ID}`,
      run: () => {
        setSelectedAgent(FAYE_AGENT_ID)
        setOpsTab("audit")
      },
    },
    {
      id: "flow3.ring",
      label: "Confidence ring · 96% on the surface",
      target: "ar-ring",
    },
    {
      id: "flow3.tree-toggle",
      label: "Trace decision path — expand the tree",
      target: "ar-tree-toggle",
      run: () => clickTarget("ar-tree-toggle"),
    },
    {
      id: "flow3.tree-svg",
      label: "Ten nodes, three layers — chosen vs flagged",
      target: "ar-tree-svg",
    },
  ],
}

// --- "Play all" — walks Flow 1 → 2 → 3 in sequence on a single boot. ---
// State persists across flows: Flow 1 resolves Cole/Echo/Beck cards; Flow 2
// then dispatches a new lane; Flow 3 finally opens Faye's drill-down (her
// decision was emitted at boot but unresolved until now).
const FLOW_ALL: ReplayFlow = {
  id: "all",
  label: "Play all",
  init: () => replayPlayAll(),
  steps: [...FLOW1.steps, ...FLOW2.steps, ...FLOW3.steps],
}

const FLOWS: Record<ReplayFlow["id"], ReplayFlow> = {
  all: FLOW_ALL,
  flow1: FLOW1,
  flow2: FLOW2,
  flow3: FLOW3,
}

// --- Active flow + step state (lives in module, drives store via setReplayStep) ---
let activeFlowId: ReplayFlow["id"] | null = null
let stepIdx = -1
const listeners = new Set<() => void>()
function notify() { for (const l of listeners) l() }

export function subscribeReplay(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getReplayState() {
  return {
    flowId: activeFlowId,
    stepIdx,
    flow: activeFlowId ? FLOWS[activeFlowId] : null,
    step: activeFlowId && stepIdx >= 0 ? FLOWS[activeFlowId].steps[stepIdx] ?? null : null,
  }
}

export function enterFlow(id: ReplayFlow["id"]) {
  const flow = FLOWS[id]
  activeFlowId = id
  stepIdx = -1
  flow.init()
  setReplayStep(null)
  notify()
}

export function nextStep() {
  if (!activeFlowId) return
  const flow = FLOWS[activeFlowId]
  const next = stepIdx + 1
  if (next >= flow.steps.length) {
    // end — remain on last step's pulse, or exit
    return
  }
  const step = flow.steps[next]
  if (!step) return
  stepIdx = next
  // Move the cursor to the target FIRST so it visibly lands + pulses, then
  // fire the action ~600ms later. Without this delay, an action that unmounts
  // the target (e.g. closing a decision) happens in the same render frame
  // and the cursor never has a chance to appear on it.
  setReplayStep(step.target)
  notify()
  if (step.run) {
    setTimeout(() => { step.run?.() }, 600)
  }
}

export function resetReplay() {
  activeFlowId = null
  stepIdx = -1
  setReplayStep(null)
  notify()
}

export const ALL_FLOWS = Object.values(FLOWS)

// React hook so OsBar (and any future stepper UI) can render based on engine state
export function useReplayEngineState() {
  return useStore((s) => s.replayStep) // forces re-render on step change
}
