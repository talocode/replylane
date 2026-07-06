import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreOpportunity, scoreReplyRisk, draftReplies } from '../src/engine.js'

describe('engine edge cases', () => {
  it('is deterministic for same input', () => {
    const input = {
      tweetText: 'Shipping in public beats perfect launches.',
      authorHandle: 'founder',
      authorFollowers: 5000,
      replyCount: 8,
      ageMinutes: 6,
      yourFollowers: 600,
    }
    const a = scoreOpportunity(input)
    const b = scoreOpportunity(input)
    assert.deepEqual(a, b)
  })

  it('flags links in replies', () => {
    const result = scoreReplyRisk({
      replyText: 'Check this out https://example.com/guide',
      containsLink: true,
    })
    assert.ok(result.triggers.some((t) => t.includes('link')))
  })

  it('respects maxLength in drafts', () => {
    const result = draftReplies({
      tweetText: 'Long discussion about growth strategy on X for indie builders.',
      maxLength: 120,
      count: 2,
    })
    assert.ok(result.drafts.every((d) => d.text.length <= 120))
  })
})