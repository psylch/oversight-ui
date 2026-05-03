import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"
import { startDemoRuntime } from "./demo-runtime"
import "./index.css"

class MountErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI render failed", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ color: "white", padding: 24 }}>
          UI render failed: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

startDemoRuntime()

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("#root not found")

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <MountErrorBoundary>
      <App />
    </MountErrorBoundary>
  </React.StrictMode>
)
