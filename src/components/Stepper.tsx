import { useReplayStep } from "../store"
import { getReplayState, nextStep, resetReplay } from "../replay-engine"

// Floating stepper dock pinned to the viewport's bottom-right. Rendered at the
// App root (not inside the header) to avoid getting trapped in a containing
// block created by header transforms/backdrop-filters.
export function Stepper() {
  // Subscribe to replay step changes so this re-renders on advance.
  useReplayStep()
  const replay = getReplayState()
  if (!replay.flowId) return null
  const totalSteps = replay.flow?.steps.length ?? 0
  const stepNum = replay.stepIdx + 1
  const atEnd = replay.stepIdx >= totalSteps - 1

  return (
    <div className="stepper-dock" role="dialog" aria-label="Replay stepper">
      <div className="stepper-head">
        <span className="stepper-flow">{replay.flow?.label}</span>
        <span className="stepper-progress">{stepNum}/{totalSteps}</span>
      </div>
      <div className="stepper-step">
        {replay.step ? replay.step.label : <span style={{ opacity: 0.6 }}>Press Next or Space to start</span>}
      </div>
      <div className="stepper-actions">
        <button
          className="demo-menu-btn primary"
          type="button"
          onClick={() => nextStep()}
          disabled={atEnd}
        >
          {replay.stepIdx < 0 ? "Start" : atEnd ? "Done" : "Next"}
        </button>
        <button
          className="demo-menu-btn"
          type="button"
          onClick={() => resetReplay()}
        >
          Exit
        </button>
      </div>
      <div className="stepper-hint">Space advances</div>
    </div>
  )
}
