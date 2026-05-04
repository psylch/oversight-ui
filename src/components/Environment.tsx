import { useSelectedAgentId } from "../store"
import { getIdentity } from "../agent-identity"

const DEFAULT_HUE = 280

export function Environment() {
  const selectedId = useSelectedAgentId()
  const hue = selectedId ? getIdentity(selectedId).ambientHue : DEFAULT_HUE
  const style = { "--amb-hue": String(hue) } as React.CSSProperties
  return (
    <>
      <div className="environment" style={style} />
      <div className="grain" />
    </>
  )
}
