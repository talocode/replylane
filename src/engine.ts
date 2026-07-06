import type {
  AuditActivityInput,
  DraftRepliesInput,
  FeedMigrateInput,
  ExportInput,
  GrokCheckInput,
  OpportunityLevel,
  RankTargetsInput,
  ReplyType,
  RiskLevel,
  ScoreOpportunityInput,
  ScoreReplyRiskInput,
  TargetAccount,
} from './types.js'

export const DISCLAIMERS = {
  notGrowthGuarantee: 'Heuristic signals only — not a guarantee of reach, followers, or revenue.',
  humanInLoop: 'Human-in-the-loop required. Do not auto-post replies without review.',
  noAutoBot: 'X requires written approval for AI auto-reply bots. ReplyLane drafts for human posting only.',
  grokHeuristic: 'Grok compatibility scores are heuristic approximations — not official X rankings.',
  deboostHeuristic: 'Deboost risk scores are heuristic — X may still hide replies unpredictably.',
} as const

const GENERIC_REPLY_PATTERNS = [
  /^this!+$/i,
  /^100%!?$/i,
  /^great (post|thread)!?$/i,
  /^love this!?$/i,
  /^so true!?$/i,
  /^facts!?$/i,
  /^🔥+$/,
  /^agreed!?$/i,
]

const NEGATIVE_TONE_WORDS = [
  'idiot', 'stupid', 'worst', 'hate', 'trash', 'garbage', 'pathetic', 'clown',
  'scam', 'fraud', 'liar', 'disaster', 'destroy', 'pathetic', 'moron',
]

const CONSTRUCTIVE_INDICATORS = [
  'learned', 'curious', 'question', 'data', 'tested', 'found', 'example',
  'specific', 'experience', 'results', 'because', 'however', 'approach',
]

const SELF_PROMO_PATTERNS = [
  /check out my/i,
  /i wrote about/i,
  /my thread on/i,
  /link in bio/i,
  /sign up for/i,
  /buy my/i,
]

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, '').trim().toLowerCase()
}

function levelFromScore(score: number): OpportunityLevel {
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 45) return 'fair'
  if (score >= 25) return 'poor'
  return 'skip'
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

function timingScore(ageMinutes: number): { score: number; note: string } {
  if (ageMinutes <= 5) return { score: 100, note: 'Within the ideal 5-minute reply window.' }
  if (ageMinutes <= 15) return { score: 80, note: 'Still early — good visibility potential.' }
  if (ageMinutes <= 30) return { score: 50, note: 'Tweet is aging — reduced visibility expected.' }
  return { score: 15, note: 'Tweet likely peaked — skip unless strategic relationship building.' }
}

function authorSizeScore(authorFollowers: number, yourFollowers: number): { score: number; note: string } {
  if (yourFollowers <= 0) {
    return { score: 60, note: 'Set yourFollowers for better target sizing.' }
  }
  const ratio = authorFollowers / yourFollowers
  if (ratio >= 5 && ratio <= 20) {
    return { score: 95, note: `Sweet spot: author is ${ratio.toFixed(1)}x your size.` }
  }
  if (ratio > 20 && ratio <= 50) {
    return { score: 65, note: `Larger account (${ratio.toFixed(1)}x) — reply may get buried.` }
  }
  if (ratio > 50) {
    return { score: 25, note: `Mega-account (${ratio.toFixed(1)}x) — replies disappear fast.` }
  }
  if (ratio >= 2 && ratio < 5) {
    return { score: 55, note: 'Smaller lift audience — still useful for niche relationships.' }
  }
  return { score: 35, note: 'Similar-sized account — limited borrowed reach.' }
}

function replyCountScore(replyCount: number): { score: number; note: string } {
  if (replyCount < 10) return { score: 90, note: 'Low competition — your reply stays visible.' }
  if (replyCount < 20) return { score: 75, note: 'Moderate replies — still worth engaging.' }
  if (replyCount < 50) return { score: 45, note: 'Crowded thread — visibility declining.' }
  return { score: 15, note: 'Heavily replied — likely buried.' }
}

function substanceScore(text: string): { score: number; note: string } {
  let score = 40
  const notes: string[] = []
  if (text.length >= 120) {
    score += 20
    notes.push('Substantive length')
  }
  if (/\?/.test(text)) {
    score += 10
    notes.push('Invites discussion')
  }
  if (/\d+%|\$[\d,]+|\d{2,}/.test(text)) {
    score += 15
    notes.push('Contains data or numbers')
  }
  if (/(how|why|what|when|tested|built|shipped|learned)/i.test(text)) {
    score += 10
    notes.push('Experience-oriented language')
  }
  if (text.length < 40) {
    score -= 20
    notes.push('Very short — harder to add value')
  }
  return { score: clamp(score), note: notes.join('; ') || 'Neutral substance signal.' }
}

function nicheMatchScore(text: string, niche?: string, tags: string[] = []): { score: number; note: string } {
  if (!niche && tags.length === 0) {
    return { score: 50, note: 'No niche provided — neutral match.' }
  }
  const haystack = `${text} ${tags.join(' ')}`.toLowerCase()
  const needles = [niche, ...tags].filter(Boolean).map((t) => String(t).toLowerCase())
  const hits = needles.filter((n) => haystack.includes(n))
  if (hits.length === 0) return { score: 30, note: 'Weak niche overlap.' }
  return { score: clamp(50 + hits.length * 15), note: `Niche overlap: ${hits.join(', ')}` }
}

export function scoreOpportunity(input: ScoreOpportunityInput) {
  const ageMinutes = input.ageMinutes ?? 10
  const replyCount = input.replyCount ?? 0
  const yourFollowers = input.yourFollowers ?? 500

  const timing = timingScore(ageMinutes)
  const author = authorSizeScore(input.authorFollowers, yourFollowers)
  const replies = replyCountScore(replyCount)
  const substance = substanceScore(input.tweetText)
  const niche = nicheMatchScore(input.tweetText, input.yourNiche, input.topicTags)

  const overall = clamp(
    timing.score * 0.3 +
      author.score * 0.25 +
      replies.score * 0.2 +
      substance.score * 0.15 +
      niche.score * 0.1,
  )

  const recommendedReplyTypes: ReplyType[] = []
  if (/\d|%|\$/.test(input.tweetText)) recommendedReplyTypes.push('data', 'experience')
  if (/\?/.test(input.tweetText)) recommendedReplyTypes.push('question', 'insight')
  if (/(wrong|myth|always|never|best|worst)/i.test(input.tweetText)) {
    recommendedReplyTypes.push('contrarian', 'insight')
  }
  if (recommendedReplyTypes.length === 0) {
    recommendedReplyTypes.push('insight', 'question', 'experience')
  }

  return {
    score: overall,
    level: levelFromScore(overall),
    authorHandle: normalizeHandle(input.authorHandle),
    factors: {
      timing: { score: timing.score, weight: 0.3, note: timing.note },
      authorSize: { score: author.score, weight: 0.25, note: author.note },
      replyCompetition: { score: replies.score, weight: 0.2, note: replies.note },
      substance: { score: substance.score, weight: 0.15, note: substance.note },
      nicheMatch: { score: niche.score, weight: 0.1, note: niche.note },
    },
    recommendedReplyTypes: [...new Set(recommendedReplyTypes)].slice(0, 4),
    action: overall >= 65 ? 'reply_now' : overall >= 45 ? 'reply_if_relevant' : 'skip',
    warnings: [DISCLAIMERS.notGrowthGuarantee, DISCLAIMERS.humanInLoop],
  }
}

function targetScore(account: TargetAccount, yourFollowers: number, yourNiche?: string) {
  const ratio = account.followers / Math.max(yourFollowers, 1)
  let score = 50
  const reasons: string[] = []

  if (ratio >= 5 && ratio <= 20) {
    score += 30
    reasons.push('Ideal 5-20x follower ratio for borrowed reach')
  } else if (ratio > 20 && ratio <= 50) {
    score += 10
    reasons.push('Larger account — harder to stay visible')
  } else if (ratio > 50) {
    score -= 25
    reasons.push('Mega-account — replies get buried')
  } else {
    score -= 10
    reasons.push('Limited audience lift')
  }

  if (account.postsPerWeek && account.postsPerWeek >= 3) {
    score += 10
    reasons.push('Active poster — more reply chances')
  }

  if (account.avgRepliesPerPost !== undefined && account.avgRepliesPerPost < 30) {
    score += 10
    reasons.push('Threads not overcrowded')
  }

  if (yourNiche && account.niche) {
    if (account.niche.toLowerCase().includes(yourNiche.toLowerCase()) ||
        yourNiche.toLowerCase().includes(account.niche.toLowerCase())) {
      score += 15
      reasons.push('Niche alignment')
    } else {
      score -= 10
      reasons.push('Weak niche alignment')
    }
  }

  return {
    handle: normalizeHandle(account.handle),
    followers: account.followers,
    ratio: Number(ratio.toFixed(2)),
    score: clamp(score),
    priority: score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low',
    reasons,
    notifyRecommended: score >= 65,
  }
}

export function rankTargets(input: RankTargetsInput) {
  const ranked = input.accounts
    .map((account) => targetScore(account, input.yourFollowers, input.yourNiche))
    .sort((a, b) => b.score - a.score)

  return {
    yourFollowers: input.yourFollowers,
    niche: input.yourNiche || null,
    ranked,
    topTargets: ranked.filter((t) => t.priority === 'high').slice(0, 10),
    dailyReplyBudget: ranked.filter((t) => t.notifyRecommended).length >= 10 ? 20 : 15,
    listStrategy: 'Turn on notifications for top 10-15 accounts. Reply within 5 minutes of new posts.',
    warnings: [DISCLAIMERS.notGrowthGuarantee],
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function buildReplyDraft(type: ReplyType, input: DraftRepliesInput, maxLength: number): string {
  const niche = input.yourNiche || 'this space'
  const exp = input.yourExperience || `building in ${niche}`
  const snippet = truncate(input.tweetText.replace(/\s+/g, ' ').trim(), 80)

  const drafts: Record<ReplyType, string> = {
    data: `We saw something similar while ${exp}: early tests showed a measurable lift when replies went out in the first 10 minutes. Curious if your results held past week one?`,
    experience: `This matches what we learned while ${exp}. The part that surprised us: consistency on replies mattered more than posting volume for the first 60 days.`,
    insight: `One angle worth adding: the 70/30 rule (more strategic replies than original posts) compounds faster than chasing viral threads in ${niche}.`,
    question: `Did you find this worked differently for smaller accounts vs established ones? Asking because we're testing a similar approach in ${niche}.`,
    contrarian: `Counterpoint from ${exp}: daily posting alone didn't move the needle until reply quality improved. Fewer posts + better replies beat volume for us.`,
    amplification: `Strong point on "${snippet}". The downstream effect we noticed: thoughtful replies on mid-sized accounts drove more profile visits than our own timeline posts.`,
    resource: `Related pattern we've been tracking in ${niche}: reply timing + specificity beats generic praise. Happy to share the checklist we use before posting.`,
  }

  return truncate(drafts[type], maxLength)
}

export function draftReplies(input: DraftRepliesInput) {
  const maxLength = input.maxLength ?? 280
  const types = input.replyTypes?.length
    ? input.replyTypes
    : (['insight', 'question', 'experience', 'data'] as ReplyType[])
  const count = Math.min(input.count ?? types.length, types.length)

  const drafts = types.slice(0, count).map((type) => ({
    type,
    text: buildReplyDraft(type, input, maxLength),
    tips: [
      'Avoid links in replies when possible',
      'Add a specific detail from your experience',
      'Do not self-promote in the reply body',
    ],
  }))

  return {
    authorHandle: input.authorHandle ? normalizeHandle(input.authorHandle) : null,
    drafts,
    postingGuidance: {
      replyWithinMinutes: 15,
      maxRepliesPerAccountPerDay: 2,
      avoidGenericPraise: true,
    },
    warnings: [DISCLAIMERS.humanInLoop, DISCLAIMERS.noAutoBot],
  }
}

export function scoreReplyRisk(input: ScoreReplyRiskInput) {
  let riskScore = 0
  const triggers: string[] = []
  const fixes: string[] = []

  const text = input.replyText.trim()
  if (!text) {
    return {
      riskScore: 100,
      riskLevel: 'critical' as RiskLevel,
      triggers: ['Empty reply'],
      fixes: ['Write a substantive reply before posting'],
      safeToPost: false,
      warnings: [DISCLAIMERS.deboostHeuristic],
    }
  }

  for (const pattern of GENERIC_REPLY_PATTERNS) {
    if (pattern.test(text)) {
      riskScore += 35
      triggers.push('Generic low-value reply pattern')
      fixes.push('Replace with a specific insight, question, or data point')
      break
    }
  }

  for (const pattern of SELF_PROMO_PATTERNS) {
    if (pattern.test(text)) {
      riskScore += 40
      triggers.push('Self-promotion detected')
      fixes.push('Remove links and product pitches from reply body')
      break
    }
  }

  if (input.containsLink || /https?:\/\//i.test(text)) {
    riskScore += 30
    triggers.push('External link in reply')
    fixes.push('Post links from your profile or a follow-up post instead')
  }

  if ((input.repliesLastHour ?? 0) > 20) {
    riskScore += 35
    triggers.push('High reply velocity (>20/hour)')
    fixes.push('Slow down — spread replies across the day')
  }

  if ((input.repliesToSameAccountToday ?? 0) >= 3) {
    riskScore += 25
    triggers.push('Too many replies to same account today')
    fixes.push('Limit to 1-2 replies per account per day')
  }

  if ((input.similarRepliesToday ?? 0) >= 3) {
    riskScore += 30
    triggers.push('Repeated similar reply text')
    fixes.push('Vary wording across replies')
  }

  if (text.length < 12) {
    riskScore += 20
    triggers.push('Very short reply')
    fixes.push('Expand with a specific contribution')
  }

  if (/🔥|🚀|💯/.test(text) && text.length < 30) {
    riskScore += 15
    triggers.push('Emoji-only engagement pattern')
    fixes.push('Add words that advance the conversation')
  }

  riskScore = clamp(riskScore)

  return {
    riskScore,
    riskLevel: riskFromScore(riskScore),
    triggers,
    fixes,
    safeToPost: riskScore < 50,
    recoveryAdvice: riskScore >= 50
      ? 'Pause replies 24h, then resume with 5-10 high-quality replies/day.'
      : null,
    warnings: [DISCLAIMERS.deboostHeuristic, DISCLAIMERS.humanInLoop],
  }
}

export function checkGrokCompatibility(input: GrokCheckInput) {
  const text = input.postText.trim()
  let score = 70
  const signals: string[] = []
  const improvements: string[] = []

  const lower = text.toLowerCase()
  const negativeHits = NEGATIVE_TONE_WORDS.filter((w) => lower.includes(w))
  if (negativeHits.length) {
    score -= negativeHits.length * 12
    signals.push(`Negative tone words: ${negativeHits.join(', ')}`)
    improvements.push('Reframe as constructive critique with reasoning')
  }

  if (/[A-Z]{5,}/.test(text.replace(/https?:\/\/\S+/g, ''))) {
    score -= 15
    signals.push('Excessive caps')
    improvements.push('Reduce shouting — use calm, specific language')
  }

  if ((text.match(/!/g) || []).length >= 3) {
    score -= 10
    signals.push('High exclamation density')
    improvements.push('Tone down hype — lead with substance')
  }

  const constructiveHits = CONSTRUCTIVE_INDICATORS.filter((w) => lower.includes(w))
  if (constructiveHits.length) {
    score += Math.min(constructiveHits.length * 5, 20)
    signals.push(`Constructive indicators: ${constructiveHits.slice(0, 3).join(', ')}`)
  }

  if (text.length >= 80 && !negativeHits.length) {
    score += 10
    signals.push('Substantive constructive length')
  }

  if (input.isReply && /check out|buy|sign up/i.test(text)) {
    score -= 25
    signals.push('Promotional reply pattern')
    improvements.push('Keep replies value-first — no pitches')
  }

  score = clamp(score)

  return {
    compatibilityScore: score,
    distributionOutlook: score >= 75 ? 'favorable' : score >= 55 ? 'neutral' : 'at_risk',
    sentiment: score >= 75 ? 'constructive' : score >= 55 ? 'mixed' : 'combative',
    signals,
    improvements,
    goal: input.goal || 'grow audience',
    warnings: [DISCLAIMERS.grokHeuristic, DISCLAIMERS.notGrowthGuarantee],
  }
}

export function auditActivity(input: AuditActivityInput) {
  const posts = input.entries.filter((e) => e.type === 'post').length
  const replies = input.entries.filter((e) => e.type === 'reply').length
  const total = posts + replies
  const replyRatio = total > 0 ? replies / total : 0

  const perAccount: Record<string, number> = {}
  for (const entry of input.entries) {
    if (entry.type === 'reply' && entry.handle) {
      const h = normalizeHandle(entry.handle)
      perAccount[h] = (perAccount[h] || 0) + 1
    }
  }

  const overEngaged = Object.entries(perAccount)
    .filter(([, count]) => count > 2)
    .map(([handle, count]) => ({ handle, count }))

  const targetReplyRatio = 0.7
  const balanceScore = clamp(100 - Math.abs(replyRatio - targetReplyRatio) * 120)

  const periodDays = input.periodDays ?? 7
  const repliesPerDay = replies / Math.max(periodDays, 1)
  const postsPerDay = posts / Math.max(periodDays, 1)

  const recommendations: string[] = []
  if (replyRatio < 0.5) recommendations.push('Increase strategic replies — aim for 70% reply effort.')
  if (replyRatio > 0.85 && posts < 3) recommendations.push('Add more original posts to convert new profile visitors.')
  if (repliesPerDay < 10) recommendations.push('Target 15-20 quality replies per day for compounding growth.')
  if (overEngaged.length) recommendations.push('Reduce repeat replies to the same accounts today.')
  if (postsPerDay > 8 && replyRatio < 0.4) recommendations.push('You may be posting too much without engaging.')

  return {
    periodDays,
    totals: { posts, replies, total },
    perDay: {
      posts: Number(postsPerDay.toFixed(1)),
      replies: Number(repliesPerDay.toFixed(1)),
    },
    replyRatio: Number(replyRatio.toFixed(2)),
    balanceScore,
    seventyThirtyStatus: replyRatio >= 0.6 ? 'on_track' : replyRatio >= 0.4 ? 'needs_more_replies' : 'posting_heavy',
    overEngagedAccounts: overEngaged,
    recommendations,
    warnings: [DISCLAIMERS.notGrowthGuarantee],
  }
}

export function planFeedMigration(input: FeedMigrateInput) {
  const niche = input.niche || input.communityName || 'your niche'
  const topics = input.currentTopics?.length
    ? input.currentTopics
    : [niche, 'founders', 'builders', 'shipping']

  return {
    context: 'X Communities shut down May 2026. Migrate to XChat groups + Custom Timelines.',
    communityName: input.communityName || null,
    memberCount: input.memberCount ?? null,
    migrationPlan: [
      {
        step: 1,
        action: 'Create a joinable XChat group (up to 500 members)',
        detail: `Name: "${niche} Builders" — share join link on your timeline and pin for 7 days.`,
      },
      {
        step: 2,
        action: 'Set up Premium Custom Timeline feeds',
        detail: `Pin feeds: ${topics.slice(0, 3).map((t) => `"${t}"`).join(', ')}`,
      },
      {
        step: 3,
        action: 'Build a reply target list',
        detail: 'Use ReplyLane targets/rank with 10-15 accounts in your niche.',
      },
      {
        step: 4,
        action: 'Weekly ritual',
        detail: 'Share one proof post + host one group chat prompt to replace community threads.',
      },
    ],
    xchat: {
      suggestedName: `${niche} Builders`,
      suggestedTopics: topics.slice(0, 5),
      joinLinkStrategy: 'Pin invite link + mention in weekly proof post',
    },
    customTimelines: topics.slice(0, 4).map((topic) => ({
      name: topic,
      purpose: `Curated feed for ${topic} discussions after Communities sunset`,
    })),
    goal: input.goal || 'preserve niche audience after Communities shutdown',
    warnings: [DISCLAIMERS.notGrowthGuarantee],
  }
}

export function exportMarkdown(input: ExportInput): string {
  const title = input.title || 'ReplyLane Report'
  const lines = [`# ${title}`, '', 'Generated by ReplyLane (Talocode)', '']
  for (const [key, value] of Object.entries(input.data)) {
    lines.push(`## ${key}`, '', '```json', JSON.stringify(value, null, 2), '```', '')
  }
  lines.push('---', DISCLAIMERS.humanInLoop, DISCLAIMERS.notGrowthGuarantee)
  return lines.join('\n')
}

export function exportJson(input: ExportInput): string {
  return JSON.stringify({ title: input.title || 'ReplyLane Report', generatedAt: new Date().toISOString(), ...input.data }, null, 2)
}