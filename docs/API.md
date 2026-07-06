# ReplyLane API

Base path: `/v1/replylane/*`

## Endpoints

| Method | Path | Credits |
|--------|------|---------|
| GET | `/v1/replylane/health` | — |
| POST | `/v1/replylane/opportunity/score` | 15 |
| POST | `/v1/replylane/targets/rank` | 25 |
| POST | `/v1/replylane/replies/draft` | 30 |
| POST | `/v1/replylane/replies/risk` | 20 |
| POST | `/v1/replylane/posts/grok-check` | 20 |
| POST | `/v1/replylane/activity/audit` | 35 |
| POST | `/v1/replylane/feeds/migrate` | 40 |
| POST | `/v1/replylane/export/markdown` | 5 |
| POST | `/v1/replylane/export/json` | 5 |

Auth: `Authorization: Bearer $TALOCODE_API_KEY` or `X-Api-Key: $TALOCODE_API_KEY`