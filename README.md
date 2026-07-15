# ReplyLane

**X reply opportunity and algorithm risk intelligence by [Talocode](https://talocode.site)**

Score reply opportunities, draft strategic replies, detect deboost risk, and check Grok compatibility — without auto-posting bots.

## What it does

- Score tweets for strategic reply value (timing, author size, competition)
- Rank target accounts in the 5–20x follower sweet spot
- Draft 7 reply types (data, experience, insight, question, contrarian, amplification, resource)
- Score deboost/spam risk before you post
- Check Grok/constructive tone compatibility
- Audit 70/30 reply vs post balance
- Plan Communities → XChat + Custom Timeline migration

> **Human-in-the-loop only.** ReplyLane drafts for human posting. X requires written approval for AI auto-reply bots.

## Install

```bash
npm install @talocode/replylane
```

## CLI

```bash
replylane opportunity --text "We tested reply timing..." --author builder --followers 8000 --your-followers 800 --age-minutes 4
replylane draft --text "How do you grow on X?" --niche "SaaS" --count 3
replylane risk --text "Great post!"
replylane grok-check --text "Here is what we learned shipping in public."
replylane targets --your-followers 800 --file accounts.json
replylane audit --file activity.json
replylane migrate --niche "indie SaaS" --community "SaaS Builders"
replylane --cloud opportunity --text "..." --author builder --followers 8000
```

## Hosted Talocode Cloud API

```bash
export TALOCODE_API_KEY=tc_your_key
export TALOCODE_BASE_URL=https://api.talocode.site
```

```bash
curl https://api.talocode.site/v1/replylane/health

curl -X POST https://api.talocode.site/v1/replylane/opportunity/score \
  -H "Authorization: Bearer $TALOCODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tweetText": "We tested 3 onboarding flows and saw 23% more activations.",
    "authorHandle": "builder",
    "authorFollowers": 8000,
    "replyCount": 5,
    "ageMinutes": 4,
    "yourFollowers": 800,
    "yourNiche": "SaaS"
  }'
```

## SDK

```ts
import { Talocode } from '@talocode/sdk'

const talocode = new Talocode({ apiKey: process.env.TALOCODE_API_KEY })

const score = await talocode.replylane.opportunity.score({
  tweetText: 'We tested reply timing across 50 accounts.',
  authorHandle: 'builder',
  authorFollowers: 8000,
  yourFollowers: 800,
  ageMinutes: 5,
})
```

## Self-hosting

```bash
git clone https://github.com/talocode/replylane.git
cd replylane && npm install && npm run build
export REPLYLANE_ALLOW_LOCAL_UNAUTH=true
npm start
```

Server listens on `http://0.0.0.0:3070`.

## Cross-platform install

- Linux/macOS: `bash install.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File install.ps1`

## Talocode ecosystem

Part of **[Talocode](https://github.com/talocode)** — open-source workflow layers for builders. Explore sibling projects:

| Project | What it is |
|---------|------------|
| **[ScreenLane](https://github.com/talocode/screenlane)** | Screen-aware voice command layer |
| **[Tera](https://github.com/talocode/tera)** | AI chat & assistant |
| **[Codra](https://github.com/talocode/codra)** | Local coding agent |
| **[GateLane](https://github.com/talocode/gatelane)** | MCP gateway & agent tool control plane |
| **[ContextLane](https://github.com/talocode/contextlane)** | Context ingestion for persistent agents |
| **[MemoryLane](https://github.com/talocode/memorylane)** | Persistent agent memory |
| **[SignalLane](https://github.com/talocode/signallane)** | X growth intelligence |
| **[ReplyLane](https://github.com/talocode/replylane)** | X reply opportunity intelligence **(this repo)** |
| **[CrawlerLane](https://github.com/talocode/crawlerlane)** | Crawler / SEO intelligence |
| **[WebDataLane](https://github.com/talocode/webdatalane)** | Web extraction to structured data |
| **[SearchLane](https://github.com/talocode/searchlane)** | Search layer for agents |
| **[InvoiceLane](https://github.com/talocode/invoicelane)** | Invoicing tools |
| **[GeoLane](https://github.com/talocode/geolane)** | Geo intelligence |
| **[UgcLane](https://github.com/talocode/ugclane)** | UGC workflows |
| **[OpenSourceLane](https://github.com/talocode/opensourcelane)** | Open-source distribution tools |
| **[StackLane](https://github.com/talocode/stacklane)** | Builder stack platform |
| **[Tradia](https://github.com/talocode/tradia)** | Trading intelligence |
| **[Agent Browser](https://github.com/talocode/agent-browser)** | Browser automation for agents |
| **[Talocode](https://github.com/talocode/talocode)** | Org home & control plane |
| **[Skills](https://github.com/talocode/skills)** | Shared agent skills |
| **[X Agent](https://github.com/talocode/x-agent)** | X automation agent |
| **[LaunchPix](https://github.com/talocode/launchpix)** | Launch tooling |
| **[ForgeCAD](https://github.com/talocode/forgecad)** | CAD workflows |
| **[WorkLane](https://github.com/talocode/worklane)** | Work automation |
| **[ClipLoop](https://github.com/talocode/cliploop)** | Clip / video loops |

MCP-compatible agents integrate via each product's MCP server where available ([Model Context Protocol](https://modelcontextprotocol.io/)).

More: [github.com/talocode](https://github.com/talocode) · [talocode.site](https://talocode.site) · [docs.talocode.site](https://docs.talocode.site)

## License

MIT — part of the [Talocode](https://talocode.site) ecosystem.

Sponsor: https://github.com/sponsors/Abdulmuiz44