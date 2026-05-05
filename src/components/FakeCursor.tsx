import { useEffect, useState } from "react"
import { useReplayStep } from "../store"

// Renders a fake cursor that follows the active replay step's target
// element. Also adds a `.step-pulse` class to the target so the recorder can
// see what's about to move.
//
// The store's `replayStep` carries the data-step-target value (e.g.
// "lane:agent_nash"); we look up the element by that attr.
export function FakeCursor() {
  const target = useReplayStep()
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  })

  useEffect(() => {
    if (!target) {
      setPos((p) => ({ ...p, visible: false }))
      return
    }
    const tryFind = () => {
      const el = document.querySelector<HTMLElement>(`[data-step-target="${target}"]`)
      if (!el) return false
      const r = el.getBoundingClientRect()
      const x = r.left + Math.min(28, r.width / 2)
      const y = r.top + Math.min(28, r.height / 2)
      setPos({ x, y, visible: true })
      el.classList.add("step-pulse")
      cleanupRef.current = () => el.classList.remove("step-pulse")
      return true
    }
    // First attempt; if the target was rendered just-now, retry next tick.
    let cleanupRef: { current: (() => void) | null } = { current: null }
    if (!tryFind()) {
      const t = setTimeout(() => tryFind(), 80)
      return () => {
        clearTimeout(t)
        cleanupRef.current?.()
      }
    }
    return () => { cleanupRef.current?.() }
  }, [target])

  if (!pos.visible) return null
  return (
    <div
      className="fake-cursor"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M5 3 L5 19 L9 15 L11.5 21 L14 20 L11.5 14 L17 14 Z"
          fill="#fafafa" stroke="#0b0b0c" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
