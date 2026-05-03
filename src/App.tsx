import { useState } from "react"
import { useAgents, useCriticalDecisionCount } from "./store"
import { AgentDispatcher } from "./components/AgentDispatcher"
import { CenterStage, DemoDossier } from "./components/CenterStage"
import { Environment } from "./components/Environment"
import { OpsPanel } from "./components/OpsPanel"
import { OsBar } from "./components/OsBar"
import { Sidebar } from "./components/Sidebar"

export function App() {
  const agents = useAgents()
  const critical = useCriticalDecisionCount()
  const [dispatcherOpen, setDispatcherOpen] = useState(false)

  // Notification badge: live = critical decisions; demo = 3 (matches v7)
  const notificationCount = agents.length === 0 ? 3 : critical

  return (
    <>
      <Environment />
      <OsBar onDispatch={() => setDispatcherOpen(true)} notificationCount={notificationCount} />
      <main className="workspace">
        <Sidebar />
        {agents.length === 0 ? <DemoDossier /> : <CenterStage />}
        <OpsPanel />
      </main>
      <AgentDispatcher open={dispatcherOpen} onClose={() => setDispatcherOpen(false)} />
    </>
  )
}
