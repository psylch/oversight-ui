import { useState } from "react"
import { AgentDispatcher } from "./components/AgentDispatcher"
import { CenterStage } from "./components/CenterStage"
import { DesignSystem } from "./components/DesignSystem"
import { Environment } from "./components/Environment"
import { OpsPanel } from "./components/OpsPanel"
import { OsBar } from "./components/OsBar"
import { Sidebar } from "./components/Sidebar"

export function App() {
  const [dispatcherOpen, setDispatcherOpen] = useState(false)
  const [dsOpen, setDsOpen] = useState(false)

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
    </>
  )
}
