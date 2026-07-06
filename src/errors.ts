export class ReplyLaneError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status = 500) {
    super(message)
    this.name = 'ReplyLaneError'
    this.code = code
    this.status = status
  }
}

export class ReplyLaneAuthError extends ReplyLaneError {
  constructor(message = 'Unauthorized') {
    super(message, 'auth_error', 401)
    this.name = 'ReplyLaneAuthError'
  }
}

export class ReplyLaneInsufficientCreditsError extends ReplyLaneError {
  constructor(message = 'Insufficient credits') {
    super(message, 'insufficient_credits', 402)
    this.name = 'ReplyLaneInsufficientCreditsError'
  }
}

export class ReplyLaneValidationError extends ReplyLaneError {
  constructor(message: string) {
    super(message, 'validation_error', 400)
    this.name = 'ReplyLaneValidationError'
  }
}

export class ReplyLaneRateLimitError extends ReplyLaneError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'rate_limited', 429)
    this.name = 'ReplyLaneRateLimitError'
  }
}