import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

describe('cli', () => {
  it('prints version', () => {
    if (!existsSync('dist/cli.js')) {
      execFileSync('npm', ['run', 'build'], { stdio: 'pipe' })
    }
    const out = execFileSync('node', ['dist/cli.js', '--version'], { encoding: 'utf-8' })
    assert.match(out.trim(), /^0\.1\.0$/)
  })
})