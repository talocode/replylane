export { ReplyLaneClient, createReplyLaneClient } from './client.js'
export {
  scoreOpportunity,
  rankTargets,
  draftReplies,
  scoreReplyRisk,
  checkGrokCompatibility,
  auditActivity,
  planFeedMigration,
  exportMarkdown,
  exportJson,
  DISCLAIMERS,
} from './engine.js'
export { redactApiKey } from './auth.js'
export { PRICING } from './billing.js'
export { config } from './config.js'

export type {
  ScoreOpportunityInput,
  RankTargetsInput,
  DraftRepliesInput,
  ScoreReplyRiskInput,
  GrokCheckInput,
  AuditActivityInput,
  FeedMigrateInput,
  ExportInput,
  ClientConfig,
  ReplyType,
  OpportunityLevel,
  RiskLevel,
  HealthResponse,
  UsageInfo,
} from './types.js'

export {
  ReplyLaneError,
  ReplyLaneAuthError,
  ReplyLaneInsufficientCreditsError,
  ReplyLaneValidationError,
  ReplyLaneRateLimitError,
} from './errors.js'