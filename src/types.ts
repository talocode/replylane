export type ReplyType =
  | 'data'
  | 'experience'
  | 'insight'
  | 'question'
  | 'contrarian'
  | 'amplification'
  | 'resource'

export type OpportunityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'skip'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ScoreOpportunityInput {
  tweetText: string
  authorHandle: string
  authorFollowers: number
  replyCount?: number
  likeCount?: number
  ageMinutes?: number
  yourFollowers?: number
  yourNiche?: string
  topicTags?: string[]
}

export interface TargetAccount {
  handle: string
  followers: number
  niche?: string
  avgRepliesPerPost?: number
  postsPerWeek?: number
}

export interface RankTargetsInput {
  yourFollowers: number
  yourNiche?: string
  accounts: TargetAccount[]
}

export interface DraftRepliesInput {
  tweetText: string
  authorHandle?: string
  yourNiche?: string
  yourExperience?: string
  replyTypes?: ReplyType[]
  count?: number
  maxLength?: number
}

export interface ScoreReplyRiskInput {
  replyText: string
  targetHandle?: string
  repliesLastHour?: number
  repliesToSameAccountToday?: number
  similarRepliesToday?: number
  containsLink?: boolean
}

export interface GrokCheckInput {
  postText: string
  isReply?: boolean
  goal?: string
}

export interface ActivityEntry {
  type: 'post' | 'reply'
  handle?: string
  timestamp?: string
}

export interface AuditActivityInput {
  entries: ActivityEntry[]
  periodDays?: number
  targetRepliesPerDay?: number
  targetPostsPerDay?: number
}

export interface FeedMigrateInput {
  communityName?: string
  niche?: string
  memberCount?: number
  currentTopics?: string[]
  goal?: string
}

export interface ExportInput {
  data: Record<string, unknown>
  title?: string
}

export interface ClientConfig {
  apiKey?: string
  baseUrl?: string
}

export interface UsageInfo {
  credits: number
  action: string
}

export interface HealthResponse {
  ok: boolean
  service: string
  version: string
  timestamp: string
  product: string
  status: string
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: string
  }
}

export interface BillingResult {
  success: boolean
  error?: string
  code?: string
  remainingCredits?: number
}