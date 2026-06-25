/**
 * SwarmAlpha v9.5 — Financial Collective Intelligence Laboratory
 *
 * 入口模块。在 v9.3 结果之上叠加:
 *   1. Agent 社交互动层
 *   2. 共识度量计算
 *   3. 互动前后对比
 *
 * 纯增量架构 — 不修改任何 v9.3 代码。
 */

export { runInteraction, buildSocialProfiles, formatInteractionSummary } from "./interaction";
export { computeAllMetrics, computeConsensusScore, computePolarizationScore, computeFragilityScore, computeInteractionEffect } from "./metrics";
export type { SocialProfile, InteractionRound, InteractionResult, ConsensusMetrics, V9_5Extension } from "./types";
export { SOCIAL_ALPHAS } from "./types";
