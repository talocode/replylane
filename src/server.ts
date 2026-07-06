import http from 'node:http'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { config } from './config.js'
import { extractApiKey, requireAuth, validateApiKey } from './auth.js'
import { chargeCredits, PRICING } from './billing.js'
import {
  auditActivity,
  checkGrokCompatibility,
  draftReplies,
  exportJson,
  exportMarkdown,
  planFeedMigration,
  rankTargets,
  scoreOpportunity,
  scoreReplyRisk,
} from './engine.js'
import {
  ReplyLaneAuthError,
  ReplyLaneInsufficientCreditsError,
  ReplyLaneValidationError,
} from './errors.js'
import type { ErrorResponse, HealthResponse, UsageInfo } from './types.js'

const VERSION = config.version
const SERVICE = config.service

function generateId(prefix = 'rl_req_'): string {
  return prefix + crypto.randomBytes(12).toString('hex')
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown, requestId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requestId) headers['x-request-id'] = requestId
  res.writeHead(status, headers)
  res.end(JSON.stringify(data))
}

function errorJson(code: string, message: string, details?: string): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } }
}

function readBody(req: http.IncomingMessage, maxBytes = config.maxBodyBytes): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    const timer = setTimeout(() => {
      const err = new Error('Request timeout')
      ;(err as Error & { code?: string }).code = 'REQUEST_TIMEOUT'
      req.destroy(err)
      reject(err)
    }, config.requestTimeoutMs)

    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > maxBytes) {
        const err = new Error('Request body too large')
        ;(err as Error & { code?: string }).code = 'PAYLOAD_TOO_LARGE'
        req.destroy(err)
        reject(err)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      clearTimeout(timer)
      resolve(Buffer.concat(chunks).toString('utf-8'))
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function buildUsage(action: string): UsageInfo {
  return { credits: PRICING[action] || 0, action }
}

async function maybeCharge(
  isHosted: boolean,
  action: string,
  apiKey: string | null,
  metadata: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; body: ErrorResponse }> {
  if (!isHosted) return { ok: true }

  const credits = PRICING[action]
  const billing = await chargeCredits(action, credits, metadata, apiKey || undefined)
  if (!billing.success) {
    const code = billing.code || 'billing_unavailable'
    const status = code === 'auth_error' ? 401 : code === 'insufficient_credits' ? 402 : 502
    return {
      ok: false,
      status,
      body: errorJson(code, billing.error || 'Billing failed'),
    }
  }
  return { ok: true }
}

export async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const requestId = generateId()

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    const path = url.pathname

    if (method === 'GET' && (path === '/health' || path === '/v1/replylane/health')) {
      const response: HealthResponse = {
        ok: true,
        service: SERVICE,
        version: VERSION,
        timestamp: new Date().toISOString(),
        product: 'ReplyLane',
        status: 'ok',
      }
      return jsonResponse(res, 200, response, requestId)
    }

    if (method !== 'POST') {
      return jsonResponse(res, 405, errorJson('METHOD_NOT_ALLOWED', 'Method not allowed'), requestId)
    }

    const bodyStr = await readBody(req)
    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyStr)
    } catch {
      return jsonResponse(res, 400, errorJson('INVALID_JSON', 'Invalid JSON body'), requestId)
    }

    let apiKey: string | null = null
    if (!config.allowLocalUnauth) {
      apiKey = requireAuth(req)
    } else {
      apiKey = extractApiKey(req)
      if (apiKey && !validateApiKey(apiKey)) apiKey = null
    }

    const isHosted = Boolean(apiKey)

    const routes: Record<string, () => Promise<void>> = {
      '/v1/replylane/opportunity/score': async () => {
        const action = 'replylane.opportunity.score'
        if (!body.tweetText || !body.authorHandle || body.authorFollowers === undefined) {
          return jsonResponse(res, 400, errorJson('validation_error', 'tweetText, authorHandle, and authorFollowers are required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = scoreOpportunity(body as never)
        return jsonResponse(res, 200, { id: generateId(), result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/targets/rank': async () => {
        const action = 'replylane.targets.rank'
        if (!body.yourFollowers || !Array.isArray(body.accounts)) {
          return jsonResponse(res, 400, errorJson('validation_error', 'yourFollowers and accounts[] are required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = rankTargets(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/replies/draft': async () => {
        const action = 'replylane.replies.draft'
        if (!body.tweetText) {
          return jsonResponse(res, 400, errorJson('validation_error', 'tweetText is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = draftReplies(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/replies/risk': async () => {
        const action = 'replylane.replies.risk'
        if (!body.replyText) {
          return jsonResponse(res, 400, errorJson('validation_error', 'replyText is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = scoreReplyRisk(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/posts/grok-check': async () => {
        const action = 'replylane.posts.grok_check'
        if (!body.postText) {
          return jsonResponse(res, 400, errorJson('validation_error', 'postText is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = checkGrokCompatibility(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/activity/audit': async () => {
        const action = 'replylane.activity.audit'
        if (!Array.isArray(body.entries)) {
          return jsonResponse(res, 400, errorJson('validation_error', 'entries[] is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = auditActivity(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/feeds/migrate': async () => {
        const action = 'replylane.feeds.migrate'
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const result = planFeedMigration(body as never)
        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/export/markdown': async () => {
        const action = 'replylane.export.markdown'
        if (!body.data) {
          return jsonResponse(res, 400, errorJson('validation_error', 'data is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const markdown = exportMarkdown({ data: body.data as Record<string, unknown>, title: body.title as string | undefined })
        return jsonResponse(res, 200, { result: { markdown }, usage: buildUsage(action) }, requestId)
      },

      '/v1/replylane/export/json': async () => {
        const action = 'replylane.export.json'
        if (!body.data) {
          return jsonResponse(res, 400, errorJson('validation_error', 'data is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)
        const json = exportJson({ data: body.data as Record<string, unknown>, title: body.title as string | undefined })
        return jsonResponse(res, 200, { result: { json }, usage: buildUsage(action) }, requestId)
      },
    }

    const handler = routes[path]
    if (!handler) {
      return jsonResponse(res, 404, errorJson('NOT_FOUND', 'Not found'), requestId)
    }

    await handler()
  } catch (err) {
    if (err instanceof ReplyLaneAuthError) {
      return jsonResponse(res, 401, errorJson('auth_error', err.message), requestId)
    }
    if (err instanceof ReplyLaneInsufficientCreditsError) {
      return jsonResponse(res, 402, errorJson('insufficient_credits', err.message), requestId)
    }
    if (err instanceof ReplyLaneValidationError) {
      return jsonResponse(res, 400, errorJson('validation_error', err.message), requestId)
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    const code = (err as { code?: string }).code || 'INTERNAL_ERROR'
    return jsonResponse(res, 500, errorJson(code, message), requestId)
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res)
})

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  server.listen(config.port, () => {
    console.log(`ReplyLane v${VERSION} listening on http://0.0.0.0:${config.port}`)
    console.log(`Local unauth: ${config.allowLocalUnauth ? 'enabled' : 'disabled'}`)
  })
}

export { server }