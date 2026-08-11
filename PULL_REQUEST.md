# Fix prize-distribution correctness, remove dead Mongo, harden security

Four independent fixes to the backend, surfaced while auditing the money path. Each is its own commit and can be reviewed in isolation.

## Summary

| # | Area | Severity | Commit |
|---|------|----------|--------|
| 1 | Prize distribution — tie/zero-score payout bug | High | `2928993` |
| 2 | Prize distribution — atomicity & idempotency | High | `5293bc3` |
| 3 | Dead MongoDB/Mongoose boot dependency | Medium | `e73a5d4` |
| 4 | CORS reflection + hard-coded WhatsApp secrets | Security | `abf4491` |

---

## 1. Tie/zero-score payout bug (`2928993`)

**Problem.** Prize tiers in `approveCredits` were computed with a `|| 0` fallback:

```js
secondPlaceScore = bets.find(b => b.score < firstPlaceScore)?.score || 0;
```

When fewer than three distinct scores existed (e.g. everyone tied at the top), the 2nd/3rd place scores collapsed to `0`, so any bet that **genuinely scored 0** was classified as a 2nd/3rd-place winner and paid a prize — while also being excluded from the losers list.

**Fix.** Rank by distinct sorted scores; an absent tier stays `undefined` (empty) rather than `0`. Winner tiers, the results message (`Score: -` fallback), and the losers filter all handle a missing tier consistently.

## 2. Atomic & idempotent prize distribution (`5293bc3`)

**Problem.** `approveCredits` performed dozens of independent `prisma` writes (winner credits, referral bonuses, house-cut credits, `Transaction` rows, `Bet` result flags, `Winners` records, and the final `prizeShareStatus` flip) with **no transaction**. A crash mid-loop left credits partially distributed while `prizeShareStatus` stayed `false`, and the guard then blocked any safe retry.

**Fix.**
- Wrap every balance mutation for the match in a single `prisma.$transaction` (`maxWait` 15s, `timeout` 120s). Any throw rolls the whole payout back.
- Atomically claim the match via `updateMany` where `prizeShareStatus: false`. If a concurrent request already distributed, it matches 0 rows and throws, rolling back the duplicate payout — surfaced as **HTTP 409** instead of a misleading 500.
- Collect WhatsApp messages in a buffer during the transaction and enqueue them only **after commit**, so a rollback never notifies anyone about money that was not actually moved.

## 3. Remove dead MongoDB/Mongoose dependency (`e73a5d4`)

**Problem.** The app runs entirely on Prisma/Postgres, yet `server.js` still opened a MongoDB connection on boot (`config/db.js`) that called `process.exit(1)` on failure — so an unreachable Mongo blocked startup for a database that was never queried.

**Fix.**
- `server.js`: drop the `connectDB` import and call.
- `winnerRoutes.js`: the `GET /winners/group/:groupId` route was still using the Mongoose `Winners` model (querying the empty Mongo — effectively broken). Ported to Prisma; the winner JSON already embeds `firstName`/`lastName`, so no relation populate is needed.
- `matchRoutes.js`: remove the unused Mongoose `Match` import.
- Delete `config/db.js`, the dead `models/*.js` Mongoose schemas, and the obsolete `scripts/UpdateCredits.js` one-off Mongo migration.
- `package.json`: drop the `mongoose` dependency.

## 4. Harden CORS and externalize secrets (`abf4491`)

**Problem — CORS.** The `origin` callback reflected **every** origin (both branches returned `callback(null, true)`) while `credentials: true` was set, so any website could make credentialed cross-origin requests.

**Problem — secrets.** The WhatsApp `appkey`/`authkey` were hard-coded in source in two places (`services/queueService.js` and `controllers/clubController.js`).

**Fix.**
- CORS now allows only the whitelisted origins (plus optional `CORS_ORIGINS` env). Requests with no `Origin` header (mobile/curl/server-to-server) still pass; disallowed browser origins are rejected.
- Both WhatsApp senders now read `WHATSAPP_APPKEY` / `WHATSAPP_AUTHKEY` (and optional `WHATSAPP_API_URL`) from the environment and fail clearly if unset.
- Added `backend/.env.example` documenting all required config.

---

## ⚠️ Required follow-up (not covered by this PR)

The WhatsApp `appkey`/`authkey` were previously committed and remain in git history. **They must be rotated with the provider** — removing them from source does not revoke them.

## Testing notes

- Verified statically: `node --check` passes on every edited file; a call-site audit confirms all writes inside `approveCredits` use the transaction client (`tx`) and the only queue call is the post-commit flush; a full-tree scan confirms no hard-coded WhatsApp keys remain in loaded source.
- **Not** exercised at runtime — there is no test suite, and a full run needs live Postgres + Redis. A prize-distribution run on staging (including a tie scenario and a concurrent double-submit) is the recommended final gate before merge.
