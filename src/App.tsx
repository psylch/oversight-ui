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

export function App() {
  const [dispatcherOpen, setDispatcherOpen] = useState(false)
  const [dsOpen, setDsOpen] = useState(false)

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
