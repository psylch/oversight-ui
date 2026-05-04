export type AgentShapeId =
  | "soft-spark"
  | "mint-flower"
  | "puffy-star"
  | "rounded-clover"
  | "bubble-star"
  | "cloud-spark"

export type AgentExpressionId =
  | "confident"
  | "curious"
  | "focused"
  | "cheerful"
  | "sleepy"
  | "surprised"
  | "skeptical"
  | "calm"
  | "excited"
  | "concerned"

export interface AgentColorSwatch {
  id: string
  name: string
  hex: string
  ink: "dark" | "light"
}

export interface AgentShapeAsset {
  id: AgentShapeId
  label: string
  assetUrl: string
}

export interface AgentExpressionAsset {
  id: AgentExpressionId
  label: string
  assetUrl: string
  sourcePngUrl: string
}

export interface AgentIdentityRecipe {
  id: string
  label: string
  shapeId: AgentShapeId
  expressionId: AgentExpressionId
  colorId: string
}

export const agentCandyPalette: AgentColorSwatch[] = [
  { id: "sprout", name: "Sprout", hex: "#A8FF7A", ink: "dark" },
  { id: "bubblegum", name: "Bubblegum", hex: "#FFC8D8", ink: "dark" },
  { id: "sky-pop", name: "Sky Pop", hex: "#A9E3FF", ink: "dark" },
  { id: "mango", name: "Mango", hex: "#FFD56A", ink: "dark" },
  { id: "lilac", name: "Lilac", hex: "#C7B5FF", ink: "dark" },
  { id: "melon", name: "Melon", hex: "#8FF2C7", ink: "dark" },
  { id: "coral", name: "Coral", hex: "#FF9A8C", ink: "dark" },
  { id: "blueberry", name: "Blueberry", hex: "#7EA7FF", ink: "dark" }
]

export const agentShapeAssets: AgentShapeAsset[] = [
  { id: "soft-spark", label: "Soft spark", assetUrl: new URL("./agent-identities/shapes/soft-spark.svg", import.meta.url).href },
  { id: "mint-flower", label: "Mint flower", assetUrl: new URL("./agent-identities/shapes/mint-flower.svg", import.meta.url).href },
  { id: "puffy-star", label: "Puffy star", assetUrl: new URL("./agent-identities/shapes/puffy-star.svg", import.meta.url).href },
  { id: "rounded-clover", label: "Rounded clover", assetUrl: new URL("./agent-identities/shapes/rounded-clover.svg", import.meta.url).href },
  { id: "bubble-star", label: "Bubble star", assetUrl: new URL("./agent-identities/shapes/bubble-star.svg", import.meta.url).href },
  { id: "cloud-spark", label: "Cloud spark", assetUrl: new URL("./agent-identities/shapes/cloud-spark.svg", import.meta.url).href }
]

export const agentExpressionAssets: AgentExpressionAsset[] = [
  { id: "confident", label: "Confident", assetUrl: new URL("./agent-identities/expressions/confident.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/confident.png", import.meta.url).href },
  { id: "curious", label: "Curious", assetUrl: new URL("./agent-identities/expressions/curious.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/curious.png", import.meta.url).href },
  { id: "focused", label: "Focused", assetUrl: new URL("./agent-identities/expressions/focused.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/focused.png", import.meta.url).href },
  { id: "cheerful", label: "Cheerful", assetUrl: new URL("./agent-identities/expressions/cheerful.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/cheerful.png", import.meta.url).href },
  { id: "sleepy", label: "Sleepy", assetUrl: new URL("./agent-identities/expressions/sleepy.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/sleepy.png", import.meta.url).href },
  { id: "surprised", label: "Surprised", assetUrl: new URL("./agent-identities/expressions/surprised.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/surprised.png", import.meta.url).href },
  { id: "skeptical", label: "Skeptical", assetUrl: new URL("./agent-identities/expressions/skeptical.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/skeptical.png", import.meta.url).href },
  { id: "calm", label: "Calm", assetUrl: new URL("./agent-identities/expressions/calm.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/calm.png", import.meta.url).href },
  { id: "excited", label: "Excited", assetUrl: new URL("./agent-identities/expressions/excited.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/excited.png", import.meta.url).href },
  { id: "concerned", label: "Concerned", assetUrl: new URL("./agent-identities/expressions/concerned.svg", import.meta.url).href, sourcePngUrl: new URL("./agent-identities/expression-pngs/concerned.png", import.meta.url).href }
]

export const agentIdentityRecipes: AgentIdentityRecipe[] = [
  { id: "navigator", label: "Navigator", shapeId: "soft-spark", expressionId: "confident", colorId: "sprout" },
  { id: "researcher", label: "Researcher", shapeId: "puffy-star", expressionId: "curious", colorId: "sky-pop" },
  { id: "operator", label: "Operator", shapeId: "rounded-clover", expressionId: "focused", colorId: "mango" },
  { id: "host", label: "Host", shapeId: "mint-flower", expressionId: "cheerful", colorId: "bubblegum" },
  { id: "nightwatch", label: "Nightwatch", shapeId: "bubble-star", expressionId: "sleepy", colorId: "lilac" },
  { id: "sentinel", label: "Sentinel", shapeId: "cloud-spark", expressionId: "surprised", colorId: "coral" },
  { id: "critic", label: "Critic", shapeId: "soft-spark", expressionId: "skeptical", colorId: "blueberry" },
  { id: "planner", label: "Planner", shapeId: "puffy-star", expressionId: "calm", colorId: "melon" },
  { id: "spark", label: "Spark", shapeId: "mint-flower", expressionId: "excited", colorId: "mango" },
  { id: "guardian", label: "Guardian", shapeId: "rounded-clover", expressionId: "concerned", colorId: "sky-pop" }
]

export const agentIdentityKitUrl = new URL("./agent-identities/agent-identity-kit.svg", import.meta.url).href
export const agentExpressionSourceUrl = new URL("./agent-expression-source.png", import.meta.url).href
