import { config } from './config.js'
import {
  ReplyLaneAuthError,
  ReplyLaneInsufficientCreditsError,
  ReplyLaneRateLimitError,
  ReplyLaneValidationError,
} from './errors.js'
import type {
  AuditActivityInput,
  ClientConfig,
  DraftRepliesInput,
  ErrorResponse,
  ExportInput,
  FeedMigrateInput,
  GrokCheckInput,
  HealthResponse,
  RankTargetsInput,
  ScoreOpportunityInput,
  ScoreReplyRiskInput,
} from './types.js'

export class ReplyLaneClient {
  private apiKey: string
  private baseUrl: string

  constructor(opts?: ClientConfig) {
    this.apiKey = opts?.apiKey || config.talocodeApiKey
    this.baseUrl = (opts?.baseUrl || config.talocodeBaseUrl).replace(/\/+$/, '')
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ErrorResponse
      const message = errorBody.error?.message || `HTTP ${response.status}`
      switch (response.status) {
        case 401:
          throw new ReplyLaneAuthError(message)
        case 402:
          throw new ReplyLaneInsufficientCreditsError(message)
        case 400:
          throw new ReplyLaneValidationError(message)
        case 429:
          throw new ReplyLaneRateLimitError(message)
        default:
          throw new Error(message)
      }
    }

    return response.json() as Promise<T>
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/v1/replylane/health')
  }

  opportunity = {
    score: (input: ScoreOpportunityInput) =>
      this.request('POST', '/v1/replylane/opportunity/score', input),
  }

  targets = {
    rank: (input: RankTargetsInput) =>
      this.request('POST', '/v1/replylane/targets/rank', input),
  }

  replies = {
    draft: (input: DraftRepliesInput) =>
      this.request('POST', '/v1/replylane/replies/draft', input),
    risk: (input: ScoreReplyRiskInput) =>
      this.request('POST', '/v1/replylane/replies/risk', input),
  }

  posts = {
    grokCheck: (input: GrokCheckInput) =>
      this.request('POST', '/v1/replylane/posts/grok-check', input),
  }

  activity = {
    audit: (input: AuditActivityInput) =>
      this.request('POST', '/v1/replylane/activity/audit', input),
  }

  feeds = {
    migrate: (input: FeedMigrateInput) =>
      this.request('POST', '/v1/replylane/feeds/migrate', input),
  }

  export = {
    markdown: (input: ExportInput) =>
      this.request('POST', '/v1/replylane/export/markdown', input),
    json: (input: ExportInput) =>
      this.request('POST', '/v1/replylane/export/json', input),
  }
}

export function createReplyLaneClient(opts?: ClientConfig): ReplyLaneClient {
  return new ReplyLaneClient(opts)
}