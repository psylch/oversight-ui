import { useState } from "react"
import { useCriticalDecisionCount } from "./store"
import { AgentDispatcher } from "./components/AgentDispatcher"
import { CenterStage } from "./components/CenterStage"
import { Environment } from "./components/Environment"
import { OpsPanel } from "./components/OpsPanel"
import { OsBar } from "./components/OsBar"
import { Sidebar } from "./components/Sidebar"

export function App() {
  const critical = useCriticalDecisionCount()
  const [dispatcherOpen, setDispatcherOpen] = useState(false)

  return (
    <>
      <Environment />
      <OsBar onDispatch={() => setDispatcherOpen(true)} notificationCount={critical} />
      <main className="workspace">
        <Sidebar />
        <CenterStage />
        <OpsPanel />
      </main>
      <AgentDispatcher open={dispatcherOpen} onClose={() => setDispatcherOpen(false)} />
    </>
  )
}
