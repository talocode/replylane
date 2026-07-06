import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { handleRequest } from '../src/server.js'

function request(port: number, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}') })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

describe('server routes', () => {
  let port = 0
  let server: http.Server

  before(async () => {
    process.env.REPLYLANE_ALLOW_LOCAL_UNAUTH = 'true'
    server = http.createServer((req, res) => { void handleRequest(req, res) })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    port = typeof address === 'object' && address ? address.port : 0
  })

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('health returns version', async () => {
    const res = await request(port, 'GET', '/v1/replylane/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.service, 'replylane')
    assert.equal(res.body.product, 'ReplyLane')
  })

  it('opportunity score works', async () => {
    const res = await request(port, 'POST', '/v1/replylane/opportunity/score', {
      tweetText: 'We tested reply timing across 50 accounts.',
      authorHandle: 'builder',
      authorFollowers: 8000,
      replyCount: 6,
      ageMinutes: 5,
      yourFollowers: 800,
    })
    assert.equal(res.status, 200)
    assert.ok((res.body.result as { score: number }).score > 0)
  })

  it('replies draft works', async () => {
    const res = await request(port, 'POST', '/v1/replylane/replies/draft', {
      tweetText: 'How do you grow on X?',
      yourNiche: 'SaaS',
      count: 2,
    })
    assert.equal(res.status, 200)
    assert.equal((res.body.result as { drafts: unknown[] }).drafts.length, 2)
  })

  it('replies risk works', async () => {
    const res = await request(port, 'POST', '/v1/replylane/replies/risk', {
      replyText: 'Great post!',
    })
    assert.equal(res.status, 200)
    assert.equal((res.body.result as { safeToPost: boolean }).safeToPost, false)
  })

  it('grok check works', async () => {
    const res = await request(port, 'POST', '/v1/replylane/posts/grok-check', {
      postText: 'Here is what we learned while shipping in public this month.',
    })
    assert.equal(res.status, 200)
    assert.ok((res.body.result as { compatibilityScore: number }).compatibilityScore >= 60)
  })

  it('returns 404 for unknown route', async () => {
    const res = await request(port, 'POST', '/v1/replylane/unknown', {})
    assert.equal(res.status, 404)
  })
})