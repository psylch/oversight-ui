import { getIdentity, SHAPES, EXPRESSIONS } from "../agent-identity"

type Size = "sm" | "md" | "lg"

interface Props {
  agentId: string
  size?: Size
  title?: string
}

export function AgentAvatar({ agentId, size = "sm", title }: Props) {
  const id = getIdentity(agentId)
  const shapeUrl = SHAPES[id.shape]
  const faceUrl = EXPRESSIONS[id.expression]
  const style = {
    "--agent-color": id.color,
    "--shape-url": `url(${shapeUrl})`
  } as React.CSSProperties
  return (
    <span className={`agent-avatar size-${size}`} style={style} title={title} aria-hidden="true">
      <span className="agent-avatar-shape" />
      <img className="agent-avatar-face" src={faceUrl} alt="" />
    </span>
  )
}
