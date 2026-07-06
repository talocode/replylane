import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chargeCredits } from '../src/billing.js'

describe('chargeCredits', () => {
  it('fails without api key', async () => {
    const prev = process.env.TALOCODE_API_KEY
    delete process.env.TALOCODE_API_KEY
    const result = await chargeCredits('replylane.opportunity.score', 15)
    assert.equal(result.success, false)
    assert.equal(result.code, 'auth_error')
    if (prev) process.env.TALOCODE_API_KEY = prev
  })
})