import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { redactApiKey } from '../src/auth.js'

describe('auth', () => {
  it('redacts api keys', () => {
    assert.equal(redactApiKey('tc_test_abcdefghijklmnop'), 'tc_t...mnop')
  })
})