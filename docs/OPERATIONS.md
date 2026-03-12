# Operations Runbook

## Scope
This runbook covers backup, restore, log rotation, and incident handling for the booking app.

## Prerequisites
- Node.js 20+
- Access to the host machine running the app
- Access to `.env` values (kept outside git)

## Daily Checks
1. Confirm the app is reachable (`/` and `/admin/login`).
2. Confirm recent booking records are visible in admin.
3. Confirm outbox emails are being sent from `/admin/emails`.
4. Check disk free space (database and logs).

## Backup Procedure
1. Run `npm run backup`.
2. Verify a new file exists in `data/backups/`.
3. Keep backups off-machine (cloud drive or external storage) at least daily.

## Restore Procedure
1. Stop the app process.
2. Copy the selected backup over `data/app.sqlite`.
3. Start the app (`npm run start` or service restart).
4. Validate:
   - login works
   - bookings are present
   - admin pages load

## Email Outbox Recovery
1. Open `/admin/emails` and inspect failed items.
2. Fix SMTP settings in `.env` if needed.
3. Re-run worker: `npm run emails:worker`.
4. Optionally relaunch specific failed entries from `/admin/emails`.

## Log Rotation
If running with redirected logs:
1. Rotate files weekly (`next-start.out.log`, `next-start.err.log`).
2. Keep last 4 archives.
3. Remove archives older than 30 days.

Example PowerShell rotation pattern:
```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
if (Test-Path "next-start.out.log") { Move-Item "next-start.out.log" "logs/next-start.out-$ts.log" }
if (Test-Path "next-start.err.log") { Move-Item "next-start.err.log" "logs/next-start.err-$ts.log" }
```

## Incident Response
1. Classify severity:
   - Sev1: full outage, no bookings possible
   - Sev2: major feature degraded (auth, admin, email)
   - Sev3: minor UI/API issue
2. Contain:
   - Stop risky changes/deploys
   - Preserve database snapshot before remediation
3. Diagnose:
   - Check logs and `/admin/audit`
   - Check `/admin/emails` for SMTP failures
   - Validate env and connectivity
4. Recover:
   - Roll back config/code
   - Restore DB from backup if needed
5. Postmortem:
   - timeline
   - root cause
   - corrective actions with owners

## Security Rotation
- Rotate `SESSION_SECRET`, `NEXTAUTH_SECRET`, SMTP credentials, and admin password periodically.
- Enable `ADMIN_COOKIE_SECURE=true` in HTTPS environments.
- Enable `TRUST_PROXY_HEADERS=true` only behind trusted reverse proxies.

## Multi-Instance Notes
- Configure `RATE_LIMIT_REDIS_URL` for shared rate-limits across instances.
- Without Redis, rate-limits are per-instance in memory.
