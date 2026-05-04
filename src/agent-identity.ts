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
}

const COLORS = [
  "#a8ff7a",
  "#ffc8d8",
  "#a9e3ff",
  "#ffd56a",
  "#c7b5ff",
  "#8ff2c7",
  "#ff9a8c",
  "#7ea7ff"
] as const

// Deliberate identity assignments for the 6 demo agents + 4 dispatcher presets.
// Pairings reflect each agent's role and current state in the demo scenario.
const CATALOG: Record<string, AgentIdentity> = {
  // 6 demo agents
  agent_nash: { color: "#ffd56a", shape: "rounded-clover", expression: "concerned" },
  agent_morrow: { color: "#7ea7ff", shape: "soft-spark", expression: "skeptical" },
  agent_corwin: { color: "#c7b5ff", shape: "puffy-star", expression: "focused" },
  agent_harlow: { color: "#a8ff7a", shape: "soft-spark", expression: "confident" },
  agent_tilden: { color: "#a9e3ff", shape: "bubble-star", expression: "curious" },
  agent_bain: { color: "#8ff2c7", shape: "mint-flower", expression: "calm" },

  // Dispatcher presets
  "research-analyst": { color: "#a9e3ff", shape: "puffy-star", expression: "curious" },
  "writing-partner": { color: "#c7b5ff", shape: "bubble-star", expression: "cheerful" },
  "qa-reviewer": { color: "#ffd56a", shape: "rounded-clover", expression: "focused" },
  "project-scout": { color: "#a8ff7a", shape: "soft-spark", expression: "confident" }
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
  if (hit) return hit
  const h = hash(agentId || "anon")
  return {
    color: COLORS[h % COLORS.length]!,
    shape: SHAPE_KEYS[(h >> 3) % SHAPE_KEYS.length]!,
    expression: EXPRESSION_KEYS[(h >> 7) % EXPRESSION_KEYS.length]!
  }
}
