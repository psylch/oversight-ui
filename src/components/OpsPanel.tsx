import { useEffect, useMemo, useRef, useState } from "react"
import type { ChatMessageEvent } from "../types"
import {
  useActivityForAgent,
  useAgent,
  useAgents,
  useChatForAgent,
  useManagedRunForAgent,
  useSelectedAgentId,
  useStore
} from "../store"

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

function initials(name: string): string {
  const parts = name.split(/\s|·|-/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase()
  const a = parts[0]?.[0] ?? "?"
  const b = parts[1]?.[0] ?? ""
  return (a + b).toUpperCase()
}

const DEMO_AUDIT = [
  { ts: "04:21", desc: "Recommendation drafted · brief v2 ready", flag: "recent" },
  { ts: "04:09", desc: "trust-score 0.42 → source #4 flagged", flag: "flagged" },
  { ts: "03:58", desc: "source #4 (HN) marked unverified", flag: "" },
  { ts: "03:51", desc: "evidence pulled · CB Insights State of Fintech", flag: "" },
  { ts: "03:40", desc: "evidence pulled · plaid.com/customers", flag: "" },
  { ts: "03:22", desc: "agent.run started · external · claude", flag: "" },
  { ts: "03:12", desc: "agent registered as nash-research", flag: "" }
]

const DEMO_CHAT = [
  { initial: "RB", name: "Research bot", ts: "22:20", msg: "Updated trust-score after new HN flags.", flagged: false },
  { initial: "N", name: "Nash", ts: "22:18", msg: "Check source #4 — sample bias risk on the 60% claim.", flagged: true },
  { initial: "M", name: "Morrow", ts: "22:11", msg: "Data pull complete. No schema issues found.", flagged: false },
  { initial: "C", name: "Corwin", ts: "21:58", msg: "Q3 model retune in progress. ETA 14m.", flagged: false }
]

const DEMO_FILES = [
  { kind: "doc", label: "DOC", name: "Q3 brief draft v2.docx", meta: "edited 04:21 · 24 KB", chev: ICON_CHEV },
  { kind: "pdf", label: "PDF", name: "Plaid_customers_snapshot.pdf", meta: "attached 03:40 · 1.2 MB", chev: ICON_CHEV },
  { kind: "sheet", label: "XLS", name: "trust-score-output.xlsx", meta: "generated 04:09 · 38 KB", chev: ICON_CHEV },
  { kind: "deck", label: "LNK", name: "Q3 deck thread", meta: "linked 04:21 · external", chev: ICON_EXT }
]

function fileKindFor(location: string): { kind: string; label: string } {
  const l = location.toLowerCase()
  if (l.endsWith(".pdf")) return { kind: "pdf", label: "PDF" }
  if (l.endsWith(".xlsx") || l.endsWith(".csv")) return { kind: "sheet", label: "XLS" }
  if (l.endsWith(".docx") || l.endsWith(".doc")) return { kind: "doc", label: "DOC" }
  if (l.startsWith("http")) return { kind: "deck", label: "LNK" }
  return { kind: "doc", label: "DOC" }
}

export function OpsPanel() {
  const [tab, setTab] = useState<Tab>("audit")
  const selectedId = useSelectedAgentId()
  const agent = useAgent(selectedId)
  const allAgents = useAgents()
  const chatMessages = useChatForAgent(selectedId)
  const activity = useActivityForAgent(selectedId)
  const managedRun = useManagedRunForAgent(selectedId)

  const artifactsList = useStore((s) => Array.from(s.artifacts.values()))

  const [draft, setDraft] = useState("")
  const feedRef = useRef<HTMLDivElement | null>(null)

  const isDemo = allAgents.length === 0

  const auditCount = isDemo ? DEMO_AUDIT.length : activity.length
  const chatCount = isDemo ? DEMO_CHAT.length : chatMessages.length
  const fileCount = isDemo ? DEMO_FILES.length : artifactsList.length

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
            {isDemo ? (
              DEMO_AUDIT.map((row, i) => (
                <button key={i} type="button" className={`audit-row ${row.flag}`}>
                  <span className="dot" />
                  <span className="ts">{row.ts}</span>
                  <span className="desc">{row.desc}</span>
                </button>
              ))
            ) : activity.length === 0 ? (
              <div className="panel-empty">No activity yet for this agent.</div>
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
          <div className="body" ref={feedRef}>
            {isDemo ? (
              DEMO_CHAT.map((row, i) => (
                <button key={i} type="button" className="chat-row">
                  <div className={`chat-avatar${row.flagged ? " flagged" : ""}`}>{row.initial}</div>
                  <div className="chat-content">
                    <div className="top">
                      <span className="name">{row.name}</span>
                      <span className="ts">{row.ts}</span>
                    </div>
                    <div className="msg">{row.msg}</div>
                  </div>
                </button>
              ))
            ) : chatMessages.length === 0 ? (
              <div className="panel-empty">
                {agent
                  ? "No chat yet. CLI-emitted chat and agent replies will appear here."
                  : "Select an agent to inspect its conversation."}
              </div>
            ) : (
              chatMessages.map((m: ChatMessageEvent) => (
                <button key={m.seq} type="button" className="chat-row">
                  <div className={`chat-avatar${m.role === "user" ? " user" : ""}`}>
                    {m.role === "user" ? "ME" : initials(agent?.display_name ?? "Agent")}
                  </div>
                  <div className="chat-content">
                    <div className="top">
                      <span className="name">
                        {m.role === "user" ? "You" : agent?.display_name ?? "Agent"}
                      </span>
                      <span className="ts">{formatTime(m.ts)}</span>
                    </div>
                    <div className="msg">{m.text}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          {!isDemo && (
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
          )}
        </div>

        {/* FILES */}
        <div className={`tab-section${tab === "files" ? " active" : ""}`} role="tabpanel">
          <div className="body">
            {isDemo ? (
              DEMO_FILES.map((row, i) => (
                <button key={i} type="button" className="deliv-row">
                  <div className={`deliv-icon ${row.kind}`}>{row.label}</div>
                  <div className="deliv-content">
                    <div className="name">{row.name}</div>
                    <div className="meta">{row.meta}</div>
                  </div>
                  <span className="chev">{row.chev}</span>
                </button>
              ))
            ) : artifactsList.length === 0 ? (
              <div className="panel-empty">No deliverables yet for this lane.</div>
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
