import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ReplyLaneClient, createReplyLaneClient } from '../src/client.js'

describe('client', () => {
  it('creates client with defaults', () => {
    const client = createReplyLaneClient()
    assert.ok(client instanceof ReplyLaneClient)
    assert.equal(typeof client.opportunity.score, 'function')
    assert.equal(typeof client.replies.draft, 'function')
    assert.equal(typeof client.posts.grokCheck, 'function')
  })
})