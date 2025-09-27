# Daily Alerts Digest Cron

This document explains how to schedule the daily email digest for alerts using the `/alerts/digest` endpoint.

The repository includes a small runner script that you can schedule once per day.

- Script path: `apps/api/scripts/alerts-digest.mjs`
- NPM script: `npm -w apps/api run cron:alerts`

## Environment Variables

Set the following variables for the runner:

- `API_URL` (optional): Backend base URL. Default `http://localhost:4000`.
- `CRON_BEARER` (required): Bearer token for a service/admin account to authorize the request.
- `CRON_COMPANY` (optional): Company code sent as `x-company` header (tenant resolution).
- `CRON_TO` (optional): Email address to send preview to.
- `CRON_DAYS` (optional): Time window in days. Default `30`.
- `CRON_SECTOR` (optional): Sector filter. Default `all`.

Example one-off run:

```bash
API_URL="https://api.example.com" \
CRON_BEARER="<your_access_token>" \
CRON_COMPANY="<your_company_code>" \
CRON_TO="owner@example.com" \
node apps/api/scripts/alerts-digest.mjs
```

Or with npm script:

```bash
API_URL="https://api.example.com" \
CRON_BEARER="<your_access_token>" \
CRON_COMPANY="<your_company_code>" \
CRON_TO="owner@example.com" \
npm -w apps/api run cron:alerts
```

> Tip: You can also use env names `AFRIGEST_CRON_BEARER` and `AFRIGEST_COMPANY` instead of `CRON_BEARER` and `CRON_COMPANY`.

## Scheduling Options

### Linux: cron

Edit your crontab with `crontab -e` and add an entry, e.g. run every day at 07:00:

```
0 7 * * * API_URL=https://api.example.com CRON_BEARER=*** CRON_COMPANY=acme CRON_TO=owner@example.com /usr/bin/node /path/to/repo/apps/api/scripts/alerts-digest.mjs >> /var/log/afrigest-alerts-cron.log 2>&1
```

### Linux: systemd timer (recommended)

Create `/etc/systemd/system/afrigest-alerts.service`:

```
[Unit]
Description=AfriGest Alerts Digest

[Service]
Environment=API_URL=https://api.example.com
Environment=CRON_BEARER=***
Environment=CRON_COMPANY=acme
Environment=CRON_TO=owner@example.com
WorkingDirectory=/path/to/repo
ExecStart=/usr/bin/node apps/api/scripts/alerts-digest.mjs
```

Create `/etc/systemd/system/afrigest-alerts.timer`:

```
[Unit]
Description=Run AfriGest Alerts Digest daily at 07:00

[Timer]
OnCalendar=*-*-* 07:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now afrigest-alerts.timer
```

### PM2 (Node process manager)

```bash
pm2 start apps/api/scripts/alerts-digest.mjs --name afrigest-alerts --cron "0 7 * * *" --env API_URL=https://api.example.com --env CRON_BEARER=*** --env CRON_COMPANY=acme --env CRON_TO=owner@example.com
pm2 save
```

### Windows Task Scheduler

1. Open Task Scheduler and create a Basic Task (e.g., "AfriGest Alerts Digest").
2. Trigger: Daily at your preferred time (e.g., 07:00).
3. Action: Start a program.
4. Program/script: `node`
5. Add arguments: `apps\api\scripts\alerts-digest.mjs`
6. Start in: `C:\path\to\repo`
7. On the General tab, check "Run whether user is logged on or not" if desired.
8. In the task's "Actions" tab, click the action, then "Edit..." and add environment variables in the "Start in" folder via a `.env.bat` or wrap with a small `.cmd` file, e.g.:

   Create `C:\path\to\repo\run-alerts.cmd`:
   ```cmd
   @echo off
   set API_URL=https://api.example.com
   set CRON_BEARER=***
   set CRON_COMPANY=acme
   set CRON_TO=owner@example.com
   node apps\api\scripts\alerts-digest.mjs
   ```

   Then set Program/script to `C:\path\to\repo\run-alerts.cmd` and leave Arguments empty.

## Notes

- The backend endpoint implementation is located in `apps/api/src/routes/alerts.ts` at route `GET /alerts/digest`.
- The web client helper is `apps/web/src/api/client_clean.ts` via `sendAlertsDigest()`.
- The export for "ventes du jour" CSV format is also available in the UI: `apps/web/src/pages/Dashboard.tsx` and duplicated in POS (`apps/web/src/pages/Pos.tsx`).
