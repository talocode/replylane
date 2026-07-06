import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PRICING } from '../src/billing.js'

describe('billing pricing', () => {
  it('has all replylane actions', () => {
    assert.equal(PRICING['replylane.opportunity.score'], 15)
    assert.equal(PRICING['replylane.targets.rank'], 25)
    assert.equal(PRICING['replylane.replies.draft'], 30)
    assert.equal(PRICING['replylane.replies.risk'], 20)
    assert.equal(PRICING['replylane.posts.grok_check'], 20)
    assert.equal(PRICING['replylane.activity.audit'], 35)
    assert.equal(PRICING['replylane.feeds.migrate'], 40)
    assert.equal(PRICING['replylane.export.markdown'], 5)
    assert.equal(PRICING['replylane.export.json'], 5)
  })

  it('has 9 priced actions', () => {
    assert.equal(Object.keys(PRICING).length, 9)
  })
})