import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  scoreOpportunity,
  rankTargets,
  draftReplies,
  scoreReplyRisk,
  checkGrokCompatibility,
  auditActivity,
  planFeedMigration,
  exportMarkdown,
  exportJson,
  DISCLAIMERS,
} from '../src/engine.js'

describe('scoreOpportunity', () => {
  it('scores early substantive tweets highly', () => {
    const result = scoreOpportunity({
      tweetText: 'We tested 3 onboarding flows and saw 23% more activations when replies went out in 10 minutes.',
      authorHandle: 'builder',
      authorFollowers: 8000,
      replyCount: 5,
      ageMinutes: 4,
      yourFollowers: 800,
      yourNiche: 'SaaS',
    })
    assert.ok(result.score >= 70)
    assert.equal(result.level, 'excellent')
    assert.equal(result.action, 'reply_now')
    assert.ok(result.recommendedReplyTypes.includes('data'))
  })

  it('skips old crowded mega-account tweets', () => {
    const result = scoreOpportunity({
      tweetText: 'Hot take',
      authorHandle: 'mega',
      authorFollowers: 500000,
      replyCount: 120,
      ageMinutes: 45,
      yourFollowers: 500,
    })
    assert.ok(result.score < 45)
    assert.equal(result.action, 'skip')
  })
})

describe('rankTargets', () => {
  it('ranks sweet-spot accounts first', () => {
    const result = rankTargets({
      yourFollowers: 1000,
      yourNiche: 'SaaS',
      accounts: [
        { handle: 'small', followers: 1200, niche: 'SaaS', postsPerWeek: 5 },
        { handle: 'mega', followers: 900000, niche: 'tech' },
        { handle: 'sweet', followers: 10000, niche: 'SaaS', postsPerWeek: 4, avgRepliesPerPost: 12 },
      ],
    })
    assert.equal(result.ranked[0].handle, 'sweet')
    assert.ok(result.topTargets.length >= 1)
  })
})

describe('draftReplies', () => {
  it('generates multiple reply drafts', () => {
    const result = draftReplies({
      tweetText: 'How do you grow on X in 2026?',
      yourNiche: 'indie SaaS',
      count: 3,
    })
    assert.equal(result.drafts.length, 3)
    assert.ok(result.drafts.every((d) => d.text.length > 20))
    assert.ok(result.warnings.includes(DISCLAIMERS.humanInLoop))
  })
})

describe('scoreReplyRisk', () => {
  it('flags generic replies as risky', () => {
    const result = scoreReplyRisk({ replyText: 'Great post!' })
    assert.ok(result.riskScore >= 25)
    assert.equal(result.safeToPost, false)
  })

  it('accepts substantive replies', () => {
    const result = scoreReplyRisk({
      replyText: 'We saw a similar pattern while shipping our onboarding flow — early replies drove more profile visits than our own posts for the first month.',
      repliesLastHour: 5,
    })
    assert.equal(result.safeToPost, true)
  })
})

describe('checkGrokCompatibility', () => {
  it('penalizes combative tone', () => {
    const result = checkGrokCompatibility({
      postText: 'This is the WORST take ever. Total garbage from idiots.',
    })
    assert.ok(result.compatibilityScore < 55)
    assert.equal(result.distributionOutlook, 'at_risk')
  })

  it('rewards constructive posts', () => {
    const result = checkGrokCompatibility({
      postText: 'We tested this for 30 days and learned that specific replies with data outperformed generic praise.',
    })
    assert.ok(result.compatibilityScore >= 70)
  })
})

describe('auditActivity', () => {
  it('detects posting-heavy imbalance', () => {
    const result = auditActivity({
      entries: [
        { type: 'post' }, { type: 'post' }, { type: 'post' }, { type: 'post' },
        { type: 'reply', handle: 'a' },
      ],
      periodDays: 7,
    })
    assert.equal(result.seventyThirtyStatus, 'posting_heavy')
    assert.ok(result.recommendations.some((r) => r.includes('replies')))
  })
})

describe('planFeedMigration', () => {
  it('returns communities migration plan', () => {
    const result = planFeedMigration({
      communityName: 'SaaS Builders',
      niche: 'SaaS',
      memberCount: 240,
    })
    assert.ok(result.migrationPlan.length >= 4)
    assert.ok(result.xchat.suggestedName.includes('SaaS'))
  })
})

describe('export', () => {
  it('exports markdown and json', () => {
    const data = { score: 88 }
    const md = exportMarkdown({ data, title: 'Test' })
    const json = exportJson({ data, title: 'Test' })
    assert.ok(md.includes('# Test'))
    assert.ok(json.includes('"score": 88'))
  })
})