import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as pkg from '../src/index.js'

describe('index exports', () => {
  it('exports engine functions', () => {
    assert.equal(typeof pkg.scoreOpportunity, 'function')
    assert.equal(typeof pkg.rankTargets, 'function')
    assert.equal(typeof pkg.draftReplies, 'function')
    assert.equal(typeof pkg.scoreReplyRisk, 'function')
    assert.equal(typeof pkg.checkGrokCompatibility, 'function')
  })

  it('exports client and errors', () => {
    assert.equal(typeof pkg.ReplyLaneClient, 'function')
    assert.equal(typeof pkg.ReplyLaneAuthError, 'function')
    assert.equal(typeof pkg.PRICING, 'object')
  })
})