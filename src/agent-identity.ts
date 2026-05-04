// Visual identity for an agent: color × shape × expression.
// Catalog covers the 6 demo agents and the 4 dispatcher presets.
// Unknown agent_ids fall back to a deterministic hash so anything new still
// gets a stable identity instead of a letter blob.

import softSpark from "./assets/agent-identities/shapes/soft-spark.svg"
import puffyStar from "./assets/agent-identities/shapes/puffy-star.svg"
import roundedClover from "./assets/agent-identities/shapes/rounded-clover.svg"
import mintFlower from "./assets/agent-identities/shapes/mint-flower.svg"
import bubbleStar from "./assets/agent-identities/shapes/bubble-star.svg"
import cloudSpark from "./assets/agent-identities/shapes/cloud-spark.svg"

import calm from "./assets/agent-identities/expressions/calm.svg"
import cheerful from "./assets/agent-identities/expressions/cheerful.svg"
import concerned from "./assets/agent-identities/expressions/concerned.svg"
import confident from "./assets/agent-identities/expressions/confident.svg"
import curious from "./assets/agent-identities/expressions/curious.svg"
import excited from "./assets/agent-identities/expressions/excited.svg"
import focused from "./assets/agent-identities/expressions/focused.svg"
import skeptical from "./assets/agent-identities/expressions/skeptical.svg"
import sleepy from "./assets/agent-identities/expressions/sleepy.svg"
import surprised from "./assets/agent-identities/expressions/surprised.svg"

export const SHAPES = {
  "soft-spark": softSpark,
  "puffy-star": puffyStar,
  "rounded-clover": roundedClover,
  "mint-flower": mintFlower,
  "bubble-star": bubbleStar,
  "cloud-spark": cloudSpark
} as const
export type ShapeKey = keyof typeof SHAPES

export const EXPRESSIONS = {
  calm,
  cheerful,
  concerned,
  confident,
  curious,
  excited,
  focused,
  skeptical,
  sleepy,
  surprised
} as const
export type ExpressionKey = keyof typeof EXPRESSIONS

export interface AgentIdentity {
  color: string
  shape: ShapeKey
  expression: ExpressionKey
  /** oklch hue (0–360) — derived from `color`, exposed for the ambient atmosphere */
  ambientHue: number
}

// sRGB hex → Oklab hue (degrees). Single source of truth for "what color is
// this agent": edit `color` and ambient hue follows automatically.
function hexToOklchHue(hex: string): number {
  const m = hex.replace("#", "")
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const lr = lin(r), lg = lin(g), lb = lin(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const mm = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l), m_ = Math.cbrt(mm), s_ = Math.cbrt(s)
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  const h = (Math.atan2(bb, a) * 180) / Math.PI
  return h < 0 ? h + 360 : h
}

const COLORS = [
  "#7dff3a", // lime
  "#ff5c8a", // pink
  "#3fb6ff", // sky
  "#ffb524", // amber
  "#9b7dff", // violet
  "#3fd9a0", // mint
  "#ff6b58", // coral
  "#4d7fff"  // blue
] as const

// Deliberate identity assignments for the 6 demo agents + 4 dispatcher presets.
// Pairings reflect each agent's role and current state in the demo scenario.
type CatalogEntry = Omit<AgentIdentity, "ambientHue">

const CATALOG: Record<string, CatalogEntry> = {
  // 6 demo agents
  agent_nash: { color: "#ffb524", shape: "rounded-clover", expression: "concerned" },
  agent_morrow: { color: "#4d7fff", shape: "soft-spark", expression: "skeptical" },
  agent_corwin: { color: "#9b7dff", shape: "puffy-star", expression: "focused" },
  agent_harlow: { color: "#7dff3a", shape: "soft-spark", expression: "confident" },
  agent_tilden: { color: "#3fb6ff", shape: "bubble-star", expression: "curious" },
  agent_bain: { color: "#3fd9a0", shape: "mint-flower", expression: "calm" },

  // Dispatcher presets
  "research-analyst": { color: "#3fb6ff", shape: "puffy-star", expression: "curious" },
  "writing-partner": { color: "#9b7dff", shape: "bubble-star", expression: "cheerful" },
  "qa-reviewer": { color: "#ffb524", shape: "rounded-clover", expression: "focused" },
  "project-scout": { color: "#7dff3a", shape: "soft-spark", expression: "confident" }
}

const SHAPE_KEYS = Object.keys(SHAPES) as ShapeKey[]
const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as ExpressionKey[]

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function getIdentity(agentId: string): AgentIdentity {
  const hit = CATALOG[agentId]
  if (hit) return { ...hit, ambientHue: hexToOklchHue(hit.color) }
  const h = hash(agentId || "anon")
  const color = COLORS[h % COLORS.length]!
  return {
    color,
    shape: SHAPE_KEYS[(h >> 3) % SHAPE_KEYS.length]!,
    expression: EXPRESSION_KEYS[(h >> 7) % EXPRESSION_KEYS.length]!,
    ambientHue: hexToOklchHue(color)
  }
}
