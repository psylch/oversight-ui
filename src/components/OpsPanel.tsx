import { useEffect, useMemo, useRef, useState } from "react"
import type { ChatMessageEvent } from "../types"
import {
  setOpsTab,
  useActivityForAgent,
  useAgent,
  useAgents,
  useChatForAgent,
  useManagedRunForAgent,
  useOpsTab,
  useSelectedAgentId,
  useStore
} from "../store"
import { AgentAvatar } from "./AgentAvatar"

type Tab = "audit" | "chat" | "files"

const ICON_AUDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 8v4l3 2" />
    <circle cx="12" cy="12" r="10" />
  </svg>
)
const ICON_CHAT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
  </svg>
)
const ICON_FILE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
)
const ICON_ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const ICON_CHEV = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 6 6 6-6 6" />
  </svg>
)
const ICON_EXT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17 17 7M7 7h10v10" />
  </svg>
)

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

interface ChatTurn { role: ChatMessageEvent["role"]; messages: ChatMessageEvent[] }

function groupTurns(messages: ChatMessageEvent[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const m of messages) {
    const last = turns[turns.length - 1]
    if (last && last.role === m.role && m.role !== "system") last.messages.push(m)
    else turns.push({ role: m.role, messages: [m] })
  }
  return turns
}



function fileKindFor(location: string): { kind: string; label: string } {
  const l = location.toLowerCase()
  if (l.endsWith(".pdf")) return { kind: "pdf", label: "PDF" }
  if (l.endsWith(".xlsx") || l.endsWith(".csv")) return { kind: "sheet", label: "XLS" }
  if (l.endsWith(".docx") || l.endsWith(".doc")) return { kind: "doc", label: "DOC" }
  if (l.startsWith("http")) return { kind: "deck", label: "LNK" }
  return { kind: "doc", label: "DOC" }
}

export function OpsPanel() {
  const tab = useOpsTab()
  const setTab = (t: Tab) => setOpsTab(t)
  const selectedId = useSelectedAgentId()
  const agent = useAgent(selectedId)
  const allAgents = useAgents()
  const chatMessages = useChatForAgent(selectedId)
  const activity = useActivityForAgent(selectedId)
  const managedRun = useManagedRunForAgent(selectedId)

  const artifactsList = useStore((s) => Array.from(s.artifacts.values()))

  const [draft, setDraft] = useState("")
  const feedRef = useRef<HTMLDivElement | null>(null)

  const auditCount = activity.length
  const chatCount = chatMessages.length
  const fileCount = artifactsList.length
  void allAgents // retained for future "global activity" rollup

  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    feed.scrollTop = feed.scrollHeight
  }, [chatMessages.length, tab, selectedId])

  // In demo-only mode the chat composer is always available against the
  // selected agent; messages echo through demo-runtime's sendChatInput.
  const inputEnabled = Boolean(agent)

  async function sendMessage(text: string) {
    if (!agent) return
    const { sendChatInput } = await import("../demo-runtime")
    sendChatInput(agent.agent_id, text)
  }

  return (
    <aside className="right-col">
      <section className="panel">
        <nav className="panel-tabs" role="tablist">
          <button
            role="tab"
            type="button"
            className={`tab${tab === "audit" ? " active" : ""}`}
            onClick={() => setTab("audit")}
          >
            {ICON_AUDIT}
            Audit
            <span className="count">{auditCount}</span>
          </button>
          <button
            role="tab"
            type="button"
            className={`tab${tab === "chat" ? " active" : ""}`}
            onClick={() => setTab("chat")}
          >
            {ICON_CHAT}
            Chat
            <span className={`count${chatCount > 0 && tab !== "chat" ? " new" : ""}`}>{chatCount}</span>
          </button>
          <button
            role="tab"
            type="button"
            className={`tab${tab === "files" ? " active" : ""}`}
            onClick={() => setTab("files")}
          >
            {ICON_FILE}
            Files
            <span className="count">{fileCount}</span>
          </button>
        </nav>

        {/* AUDIT */}
        <div className={`tab-section${tab === "audit" ? " active" : ""}`} role="tabpanel">
          <div className="body">
            {activity.length === 0 ? (
              <div className="panel-empty">No activity yet.</div>
            ) : (
              activity
                .slice()
                .reverse()
                .map((item, i) => {
                  const flag = item.kind === "policy" ? "flagged" : i === 0 ? "recent" : ""
                  return (
                    <button key={item.seq} type="button" className={`audit-row ${flag}`}>
                      <span className="dot" />
                      <span className="ts">{formatTime(item.ts)}</span>
                      <span className="desc">{item.text}</span>
                    </button>
                  )
                })
            )}
          </div>
          <div className="panel-foot">
            <a href="#" onClick={(e) => e.preventDefault()}>
              View all activity {ICON_ARROW}
            </a>
          </div>
        </div>

        {/* CHAT */}
        <div className={`tab-section${tab === "chat" ? " active" : ""}`} role="tabpanel">
          {agent && (
            <header className="chat-thread-head">
              <AgentAvatar agentId={agent.agent_id} size="md" title={agent.display_name} />
              <div className="chat-thread-id">
                <div className="name">{agent.display_name}</div>
                <div className="state">
                  <span className={`state-dot ${agent.state}`} />
                  <span className="state-text">{agent.intent ?? agent.state}</span>
                </div>
              </div>
            </header>
          )}
          <div className="body chat-thread" ref={feedRef}>
            {chatMessages.length === 0 ? (
              <div className="panel-empty">
                {agent
                  ? "No messages yet. Type below to talk to this agent."
                  : "Select an agent to start a conversation."}
              </div>
            ) : (
              <>
                <div className="chat-day-divider">Today</div>
                {groupTurns(chatMessages).map((turn, ti) => {
                  if (turn.role === "system") {
                    const m = turn.messages[0]!
                    return (
                      <div key={`sys-${ti}`} className="chat-bubble system">
                        <span className="dot" />
                        <span>{m.text}</span>
                      </div>
                    )
                  }
                  return (
                    <div key={`turn-${ti}`} className={`chat-turn ${turn.role}`}>
                      {turn.messages.map((m, mi) => (
                        <div key={m.seq} className={`chat-bubble ${turn.role}`}>
                          {m.text}
                          {mi === turn.messages.length - 1 && (
                            <span className="chat-bubble-tail">{formatTime(m.ts)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
          <form
              className="chat-composer"
              onSubmit={(ev) => {
                ev.preventDefault()
                const text = draft.trim()
                if (!inputEnabled || text.length === 0) return
                setDraft("")
                void sendMessage(text)
              }}
            >
              <textarea
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                disabled={!inputEnabled}
                placeholder={
                  agent
                    ? inputEnabled
                      ? "Message this agent"
                      : "Available when this agent is daemon-managed"
                    : "Select an agent to chat"
                }
                rows={2}
              />
              <button type="submit" disabled={!inputEnabled || draft.trim().length === 0}>
                Send
              </button>
            </form>
        </div>

        {/* FILES */}
        <div className={`tab-section${tab === "files" ? " active" : ""}`} role="tabpanel">
          <div className="body">
            {artifactsList.length === 0 ? (
              <div className="panel-empty">No files attached yet.</div>
            ) : (
              artifactsList.map((art, i) => {
                const k = fileKindFor(art.location)
                return (
                  <button key={`${art.ref}-${i}`} type="button" className="deliv-row">
                    <div className={`deliv-icon ${k.kind}`}>{k.label}</div>
                    <div className="deliv-content">
                      <div className="name">{art.label ?? art.location}</div>
                      <div className="meta">{formatTime(art.ts)} · {art.kind}</div>
                    </div>
                    <span className="chev">{art.kind === "url" ? ICON_EXT : ICON_CHEV}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </section>
    </aside>
  )
}
