import { useSyncExternalStore } from "react"
import type {
  AgentId,
  AgentRunEvent,
  AgentStateEvent,
  ArtifactAddedEvent,
  ArtifactRef,
  ChatMessageEvent,
  ClaimEvent,
  DecisionClosedEvent,
  DecisionId,
  DecisionOpenEvent,
  Event,
  PolicyViolationEvent,
  Tier
} from "./types"

type Listener = () => void

export interface AgentActivityItem {
  seq: number
  ts: number
  agent_id: AgentId
  kind: "state" | "decision" | "artifact" | "policy"
  text: string
  decision_id?: DecisionId
  artifact_ref?: ArtifactRef
}

interface State {
  agents: Map<AgentId, AgentStateEvent>
  openDecisions: DecisionOpenEvent[]
  claims: ClaimEvent[]
  artifacts: Map<ArtifactRef, ArtifactAddedEvent>
  chatMessages: ChatMessageEvent[]
  runs: Map<string, AgentRunEvent>
  activity: AgentActivityItem[]
  selectedAgentId: AgentId | null
  opsTab: OpsTab
  wsConnected: boolean
  seenSeqs: Set<number>
}

export type OpsTab = "audit" | "chat" | "files"

const listeners = new Set<Listener>()

const state: State = {
  agents: new Map(),
  openDecisions: [],
  claims: [],
  artifacts: new Map(),
  chatMessages: [],
  runs: new Map(),
  activity: [],
  selectedAgentId: null,
  opsTab: "audit",
  wsConnected: false,
  seenSeqs: new Set()
}

let snapshot: State = state

function emit() {
  snapshot = { ...state }
  for (const l of listeners) l()
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return snapshot
}

// Synchronous read for non-React callers (e.g. demo-runtime side effects).
export function readState(): Readonly<State> {
  return snapshot
}

// Wipe the store back to first-mount state. Used by the "Replay demo" action
// in OsBar so a presenter can return the page to cold start without reload.
export function resetStore() {
  state.agents.clear()
  state.openDecisions = []
  state.claims = []
  state.artifacts.clear()
  state.chatMessages = []
  state.runs.clear()
  state.activity = []
  state.selectedAgentId = null
  state.seenSeqs.clear()
  emit()
}

function pushActivity(item: AgentActivityItem) {
  state.activity.push(item)
  if (state.activity.length > 500) {
    state.activity.splice(0, state.activity.length - 500)
  }
}

export function applyEvent(ev: Event) {
  if (state.seenSeqs.has(ev.seq)) return
  state.seenSeqs.add(ev.seq)

  switch (ev.type) {
    case "agent.state": {
      const prev = state.agents.get(ev.agent_id)
      if (!prev || ev.seq >= prev.seq) {
        state.agents.set(ev.agent_id, ev)
      }
      if (!state.selectedAgentId) {
        state.selectedAgentId = ev.agent_id
      }
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "state",
        text: ev.intent ? `${ev.state}: ${ev.intent}` : `state changed to ${ev.state}`
      })
      break
    }
    case "decision.open": {
      const idx = state.openDecisions.findIndex((d) => d.decision_id === ev.decision_id)
      if (idx === -1) state.openDecisions.push(ev)
      else state.openDecisions[idx] = ev
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "decision",
        decision_id: ev.decision_id,
        text: `${ev.urgency} decision opened: ${ev.headline}`
      })
      break
    }
    case "decision.closed": {
      state.openDecisions = state.openDecisions.filter(
        (d) => d.decision_id !== (ev as DecisionClosedEvent).decision_id
      )
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "decision",
        decision_id: ev.decision_id,
        text: `decision closed by ${ev.closed_by}: ${ev.action_id}`
      })
      break
    }
    case "claim": {
      state.claims.push(ev)
      break
    }
    case "artifact.added": {
      state.artifacts.set(ev.ref, ev)
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "artifact",
        artifact_ref: ev.ref,
        text: `artifact added: ${ev.label ?? ev.location}`
      })
      break
    }
    case "chat.message": {
      state.chatMessages.push(ev)
      break
    }
    case "agent.run": {
      state.runs.set(ev.run_id, ev)
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "state",
        text: `managed ${ev.runtime} run ${ev.status}`
      })
      break
    }
    case "policy.violation": {
      const policy = ev as PolicyViolationEvent
      pushActivity({
        seq: ev.seq,
        ts: ev.ts,
        agent_id: ev.agent_id,
        kind: "policy",
        decision_id: policy.decision_id,
        text: `policy event: ${policy.rule}`
      })
      break
    }
  }
  emit()
}

export function applyEvents(events: Event[]) {
  const sorted = [...events].sort((a, b) => a.seq - b.seq)
  for (const ev of sorted) applyEvent(ev)
}

export function setWsConnected(connected: boolean) {
  state.wsConnected = connected
  emit()
}

export function setSelectedAgent(agentId: AgentId | null) {
  state.selectedAgentId = agentId
  emit()
}

export function setOpsTab(tab: OpsTab) {
  state.opsTab = tab
  emit()
}

export function useOpsTab(): OpsTab {
  return useStore((s) => s.opsTab)
}

export function useStore<T>(selector: (s: State) => T): T {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return selector(current)
}

export function useAgents(): AgentStateEvent[] {
  return useStore((s) => Array.from(s.agents.values()))
}

export function useSelectedAgentId(): AgentId | null {
  return useStore((s) => s.selectedAgentId)
}

export function useAgent(agentId: AgentId | null): AgentStateEvent | null {
  return useStore((s) => (agentId ? s.agents.get(agentId) ?? null : null))
}

export function useDecisionsForAgent(agentId: AgentId | null): DecisionOpenEvent[] {
  return useStore((s) =>
    agentId ? s.openDecisions.filter((d) => d.agent_id === agentId) : []
  )
}

export function useLatestDecisionForAgent(agentId: AgentId | null): DecisionOpenEvent | null {
  return useStore((s) => {
    if (!agentId) return null
    const forAgent = s.openDecisions.filter((d) => d.agent_id === agentId)
    if (forAgent.length === 0) return null
    return forAgent.reduce((a, b) => (a.seq > b.seq ? a : b))
  })
}

export function useArtifact(ref: ArtifactRef | null): ArtifactAddedEvent | null {
  return useStore((s) => (ref ? s.artifacts.get(ref) ?? null : null))
}

export function useArtifactsByRefs(refs: ArtifactRef[]): Array<ArtifactAddedEvent | null> {
  return useStore((s) => refs.map((r) => s.artifacts.get(r) ?? null))
}

export function useChatForAgent(agentId: AgentId | null): ChatMessageEvent[] {
  return useStore((s) =>
    agentId ? s.chatMessages.filter((m) => m.agent_id === agentId) : []
  )
}

export function useManagedRunForAgent(agentId: AgentId | null): AgentRunEvent | null {
  return useStore((s) => {
    if (!agentId) return null
    const runs = Array.from(s.runs.values()).filter(
      (r) => r.agent_id === agentId && r.mode === "managed"
    )
    if (runs.length === 0) return null
    return runs.reduce((a, b) => (a.seq > b.seq ? a : b))
  })
}

export function useActivityForAgent(agentId: AgentId | null): AgentActivityItem[] {
  return useStore((s) =>
    agentId ? s.activity.filter((m) => m.agent_id === agentId) : []
  )
}

export function useWsConnected(): boolean {
  return useStore((s) => s.wsConnected)
}

export function useOpenDecisions(): DecisionOpenEvent[] {
  return useStore((s) => s.openDecisions)
}

export function useCriticalDecisionCount(): number {
  return useStore((s) => s.openDecisions.filter((d) => d.urgency === "critical").length)
}

export interface AgentGroups {
  needsYou: AgentStateEvent[]
  running: AgentStateEvent[]
  awaitingSignoff: AgentStateEvent[]
  background: AgentStateEvent[]
}

export function useAgentsByGroup(): AgentGroups {
  return useStore((s) => {
    const groups: AgentGroups = {
      needsYou: [],
      running: [],
      awaitingSignoff: [],
      background: []
    }
    const decisionsByAgent = new Map<AgentId, DecisionOpenEvent[]>()
    for (const d of s.openDecisions) {
      const arr = decisionsByAgent.get(d.agent_id) ?? []
      arr.push(d)
      decisionsByAgent.set(d.agent_id, arr)
    }

    const agents = Array.from(s.agents.values())
    for (const a of agents) {
      const open = decisionsByAgent.get(a.agent_id) ?? []
      const hasCritical = open.some((d) => d.urgency === "critical")
      const hasSignoff = open.some((d) => d.urgency === "sign-off")

      // Decision urgency wins over state. A stalled agent with a sign-off
      // decision belongs in Awaiting (cyan), not Needs review (red).
      if (hasCritical) {
        groups.needsYou.push(a)
      } else if (hasSignoff) {
        groups.awaitingSignoff.push(a)
      } else if (a.state === "stalled" || a.state === "errored") {
        groups.needsYou.push(a)
      } else if (a.state === "working") {
        groups.running.push(a)
      } else {
        // waiting / done
        groups.background.push(a)
      }
    }
    return groups
  })
}

export function useClaimsForAgent(agentId: AgentId | null): ClaimEvent[] {
  return useStore((s) =>
    agentId ? s.claims.filter((c) => c.agent_id === agentId) : []
  )
}

/**
 * v1 mapping from artifact kind → provenance tier.
 * The protocol's evidence array does not carry tier per item; ClaimEvents do.
 * Until decisions explicitly tag evidence with tiers, we derive a sensible
 * default from artifact.kind so the UI can color-code context nodes.
 *   url     → verified  (external citation)
 *   snippet → model     (model-generated excerpt)
 *   file    → user      (user-supplied artifact)
 *   missing → unverified
 */
export function tierForArtifact(art: ArtifactAddedEvent | null): Tier {
  if (!art) return "unverified"
  switch (art.kind) {
    case "url":
      return "verified"
    case "snippet":
      return "model"
    case "file":
      return "user"
    default:
      return "unverified"
  }
}

export type { DecisionId }
