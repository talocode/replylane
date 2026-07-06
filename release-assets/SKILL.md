# ReplyLane Skill

Use ReplyLane for strategic X (Twitter) reply growth without auto-posting bots.

## When to use

- User wants to grow on X through strategic replies
- User needs reply opportunity scoring or deboost risk checks
- User wants Grok/constructive tone checks before posting
- User is migrating from X Communities to XChat groups

## Commands

```bash
replylane opportunity --text "tweet text" --author handle --followers 8000 --your-followers 800 --age-minutes 4
replylane draft --text "tweet text" --niche "SaaS" --count 3
replylane risk --text "reply draft"
replylane grok-check --text "post draft"
replylane targets --your-followers 800 --file accounts.json
```

## Boundaries

- Human-in-the-loop only — never auto-post replies
- Heuristic scores — not guaranteed reach or followers
- Not affiliated with X — Grok scores are approximations

Sponsor: https://github.com/sponsors/Abdulmuiz44