import { useEffect, useState } from "react"
import { AgentDispatcher } from "./components/AgentDispatcher"
import { CenterStage } from "./components/CenterStage"
import { DesignSystem } from "./components/DesignSystem"
import { Environment } from "./components/Environment"
import { FakeCursor } from "./components/FakeCursor"
import { OpsPanel } from "./components/OpsPanel"
import { OsBar } from "./components/OsBar"
import { Sidebar } from "./components/Sidebar"
import { Stepper } from "./components/Stepper"
import { nextStep } from "./replay-engine"

// Lightweight path-based routing for the design system deep-link.
// CLAUDE.md forbids a routing library — this is a single boolean derived
// from window.location, kept in sync with browser back/forward via the
// popstate event. Visiting /ds opens the Design System overlay; closing it
// (or clicking back) restores the dashboard at /.
function readDsFromPath() {
  if (typeof window === "undefined") return false
  return window.location.pathname.replace(/\/+$/, "") === "/ds"
}

export function App() {
  const [dispatcherOpen, setDispatcherOpen] = useState(false)
  const [dsOpen, setDsOpen] = useState<boolean>(readDsFromPath)

  // Keep dsOpen in sync with the URL (browser back / forward, manual edits)
  useEffect(() => {
    const onPop = () => setDsOpen(readDsFromPath())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // When dsOpen toggles via UI (OsBar click / close), reflect it into the URL
  // so the deep link stays accurate and the back button works.
  useEffect(() => {
    const target = dsOpen ? "/ds" : "/"
    if (window.location.pathname !== target) {
      window.history.pushState({}, "", target)
    }
  }, [dsOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Space advances the replay step. Skip when typing in inputs.
      if (e.key !== " ") return
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return
      e.preventDefault()
      nextStep()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <Environment />
      <OsBar onOpenDesignSystem={() => setDsOpen(true)} />
      <main className="workspace">
        <Sidebar onDispatch={() => setDispatcherOpen(true)} />
        <CenterStage />
        <OpsPanel />
      </main>
      <AgentDispatcher open={dispatcherOpen} onClose={() => setDispatcherOpen(false)} />
      <DesignSystem open={dsOpen} onClose={() => setDsOpen(false)} />
      <FakeCursor />
      <Stepper />
    </>
  )
}
