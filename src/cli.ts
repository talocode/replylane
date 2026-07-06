#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { config } from './config.js'
import { createReplyLaneClient } from './client.js'
import {
  auditActivity,
  checkGrokCompatibility,
  draftReplies,
  exportJson,
  exportMarkdown,
  planFeedMigration,
  rankTargets,
  scoreOpportunity,
  scoreReplyRisk,
} from './engine.js'

const VERSION = config.version

function usage() {
  console.error(`ReplyLane v${VERSION} — X reply intelligence by Talocode`)
  console.error('')
  console.error('Usage:')
  console.error('  replylane opportunity --text "tweet..." --author handle --followers 12000 --your-followers 800 --age-minutes 4')
  console.error('  replylane targets --your-followers 800 --file accounts.json')
  console.error('  replylane draft --text "tweet..." --niche "SaaS" --count 3')
  console.error('  replylane risk --text "your reply draft"')
  console.error('  replylane grok-check --text "post draft"')
  console.error('  replylane audit --file activity.json')
  console.error('  replylane migrate --niche "indie SaaS" --community "SaaS Builders"')
  console.error('  replylane export-markdown --file report.json')
  console.error('  replylane export-json --file report.json')
  console.error('  replylane config')
  console.error('  replylane --help')
  console.error('  replylane --version')
  console.error('')
  console.error('Flags: --cloud (use Talocode Cloud API with TALOCODE_API_KEY)')
  console.error('Sponsor: https://github.com/sponsors/Abdulmuiz44')
  process.exit(1)
}

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2)
  if (args.length === 0) usage()
  if (args[0] === '--help' || args[0] === '-h') usage()
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(VERSION)
    process.exit(0)
  }

  const parsed: Record<string, string> = {}
  let command = ''
  for (let i = 0; i < args.length; i++) {
    if (!command && !args[i].startsWith('--')) {
      command = args[i]
      continue
    }
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        parsed[key] = next
        i++
      } else {
        parsed[key] = 'true'
      }
    }
  }
  parsed.command = command
  return parsed
}

function writeOutput(data: unknown, output?: string, format = 'json') {
  const text = format === 'markdown' && typeof data === 'object' && data && 'markdown' in (data as object)
    ? String((data as { markdown: string }).markdown)
    : typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)

  if (output) {
    writeFileSync(output, text + '\n', 'utf-8')
  } else {
    process.stdout.write(text + '\n')
  }
}

function readJson(file?: string): Record<string, unknown> {
  const raw = file && file !== '-' ? readFileSync(file, 'utf-8') : readFileSync(0, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

async function main() {
  const args = parseArgs()
  const command = args.command
  const useCloud = args.cloud === 'true'

  if (command === 'config') {
    writeOutput({
      version: VERSION,
      baseUrl: config.talocodeBaseUrl,
      allowLocalUnauth: config.allowLocalUnauth,
      hasApiKey: Boolean(config.talocodeApiKey),
      port: config.port,
    })
    return
  }

  if (useCloud) {
    const client = createReplyLaneClient()
    const map: Record<string, () => Promise<unknown>> = {
      opportunity: () => client.opportunity.score({
        tweetText: args.text || '',
        authorHandle: args.author || 'unknown',
        authorFollowers: Number(args.followers || 0),
        yourFollowers: args['your-followers'] ? Number(args['your-followers']) : undefined,
        ageMinutes: args['age-minutes'] ? Number(args['age-minutes']) : undefined,
        yourNiche: args.niche,
      }),
      draft: () => client.replies.draft({
        tweetText: args.text || '',
        yourNiche: args.niche,
        count: args.count ? Number(args.count) : undefined,
      }),
      risk: () => client.replies.risk({ replyText: args.text || '' }),
      'grok-check': () => client.posts.grokCheck({ postText: args.text || '' }),
      migrate: () => client.feeds.migrate({
        niche: args.niche,
        communityName: args.community,
      }),
    }
    const fn = map[command]
    if (!fn) usage()
    writeOutput(await fn())
    return
  }

  switch (command) {
    case 'opportunity':
      writeOutput(scoreOpportunity({
        tweetText: args.text || '',
        authorHandle: args.author || 'unknown',
        authorFollowers: Number(args.followers || 0),
        yourFollowers: args['your-followers'] ? Number(args['your-followers']) : undefined,
        ageMinutes: args['age-minutes'] ? Number(args['age-minutes']) : undefined,
        yourNiche: args.niche,
      }))
      break
    case 'targets':
      writeOutput(rankTargets(readJson(args.file) as never))
      break
    case 'draft':
      writeOutput(draftReplies({
        tweetText: args.text || '',
        yourNiche: args.niche,
        count: args.count ? Number(args.count) : undefined,
      }))
      break
    case 'risk':
      writeOutput(scoreReplyRisk({ replyText: args.text || '' }))
      break
    case 'grok-check':
      writeOutput(checkGrokCompatibility({ postText: args.text || '' }))
      break
    case 'audit':
      writeOutput(auditActivity(readJson(args.file) as never))
      break
    case 'migrate':
      writeOutput(planFeedMigration({
        niche: args.niche,
        communityName: args.community,
      }))
      break
    case 'export-markdown': {
      const data = readJson(args.file)
      writeOutput({ markdown: exportMarkdown({ data, title: args.title }) }, args.output, args.format || 'markdown')
      break
    }
    case 'export-json': {
      const data = readJson(args.file)
      writeOutput({ json: exportJson({ data, title: args.title }) })
      break
    }
    default:
      usage()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})