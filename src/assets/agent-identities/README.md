# Agent Identity Assets

This folder contains the experimental identity kit for representing multiple agents with three reusable parts:

- `shapes/`: code-generated soft star/blob SVG silhouettes.
- `expression-pngs/`: cropped face expressions extracted from `../agent-expression-source.png`.
- `expressions/`: SVG wrappers around the cropped expression PNGs, so app code can reference SVG assets.
- `agent-identity-kit.svg`: a static overview sheet for quick visual review.

The metadata lives in `../agent-identities.ts`. Use that file from React code instead of importing files from this folder one by one. It exports:

- `agentCandyPalette`
- `agentShapeAssets`
- `agentExpressionAssets`
- `agentIdentityRecipes`
- `agentIdentityKitUrl`
- `agentExpressionSourceUrl`

Regenerate these assets with:

```bash
node scripts/generate-agent-identity-assets.mjs
```

The generator intentionally keeps shape geometry in code and extracts expressions from the PNG source, so expressions stay faithful to the imagegen output while shapes remain easy to tune.
