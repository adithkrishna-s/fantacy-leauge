# Deploy Checklist — Fantasy League 7

Covers deploying the recent backend + frontend changes to the production server
(`/var/www/fantacy-leauge`, Node backend under **pm2**, React frontend built and
served statically).

Changes in this batch:
- Prize distribution: tie/zero-score fix + atomic, idempotent payout
- Removed dead MongoDB/Mongoose dependency
- Tightened CORS; WhatsApp secrets moved to env
- **Disabled WhatsApp + Redis** (queue is now a no-op; worker removed; `bull` dropped)
- Club delete blocks with a message; match/group delete cascades + **refunds open bets**

---

## 0. Before you start
- [ ] All changes are committed on `main` locally.
- [ ] Decide how code reaches the server. Your GitHub account is **read-only** on
      `adithkrishnaa/fantacy-leauge`, so `git push` (and therefore `git pull` on the
      server) won't work until that's fixed. Pick one:
  - **A — Fix access:** get write access (or use an account that has it), `git push origin main`, then `git pull` on the server.
  - **B — Copy directly:** `rsync`/`scp` the working tree to the server (skip `node_modules`, `.env`, `.git`):
    ```bash
    rsync -av --exclude node_modules --exclude .env --exclude .git \
      ./backend/  user@server:/var/www/fantacy-leauge/backend/
    ```
- [ ] Take a quick rollback note: on the server, run `git rev-parse HEAD` (or back up
      the folder) so you can revert if needed.

---

## 1. Backend (on the server: `/var/www/fantacy-leauge/backend`)
- [ ] Get the new code there (git pull for option A, or rsync landed for option B).
- [ ] Install deps — **use `npm install`, not `npm ci`** (package.json changed:
      `mongoose` and `bull` removed; lockfile will reconcile):
      ```bash
      npm install
      npm prune            # optional: drop now-unused bull/ioredis/mongoose from node_modules
      ```
- [ ] Regenerate the Prisma client (safe even if unchanged):
      ```bash
      npx prisma generate
      ```
- [ ] **Remove the obsolete WhatsApp worker from pm2** if it was running (the file
      `workers/whatsappWorker.js` is deleted, so that process would now crash-loop):
      ```bash
      pm2 list                         # find the worker process name/id, if any
      pm2 delete whatsapp-worker       # use the actual name shown; skip if none
      ```
- [ ] Restart the API process (find its name in `pm2 list`; it runs `server.js`):
      ```bash
      pm2 restart <backend-process-name> --update-env
      pm2 save                         # persist the new process list
      ```
- [ ] Watch the logs — expect `Server running on port 5001` and the Postgres SSL
      notice; **no** MongoDB, Redis, or `bull` errors:
      ```bash
      pm2 logs <backend-process-name> --lines 50
      ```

### Env note
No new required variables. `MONGO_URI` is no longer used (safe to leave or remove).
Redis/WhatsApp vars are not needed while notifications are disabled. `CORS_ORIGINS`
is optional (defaults already include the production domains).

---

## 2. Frontend (React build)
- [ ] Build (the app calls `https://fantacyleauge.com` directly, so building on the
      server is fine):
      ```bash
      cd /var/www/fantacy-leauge/frontend
      npm install
      npm run build
      ```
- [ ] Publish `build/` to wherever nginx serves the site (confirm your web root),
      then reload nginx if needed:
      ```bash
      # example — adjust to your actual web root:
      # rsync -av --delete build/ /var/www/fantacy-leauge/frontend/build/
      sudo nginx -t && sudo systemctl reload nginx
      ```
- [ ] Hard-refresh the browser (Ctrl+Shift+R) to bypass cached JS.

---

## 3. Smoke test (production)
- [ ] **Club (block):** delete a club that has matches → expect the friendly message
      *"Cannot delete '…' while it still has N matches…"*, not a Prisma error.
- [ ] **Match (cascade + refund):** delete a match that has **open** (un-settled) bets
      → success toast reports *"Refunded RS X across N open bet(s)."*
  - [ ] Verify a bettor's wallet increased and a **REFUND** row appears in Wallet History.
  - [ ] Delete an already-**settled** match → no refund (correct).
- [ ] **Group (cascade + refund):** same check at group level.
- [ ] Confirm the server logs are clean (no Redis/Mongo noise).

---

## 4. Rollback (if needed)
```bash
# on the server, in the backend folder:
git checkout <previous-commit>     # or restore the backed-up folder
npm install
npx prisma generate
pm2 restart <backend-process-name>
```
pm2 keeps the previous process running until you restart, so a bad deploy is quick to
revert. (No database migrations are involved in this batch, so rollback is code-only.)
