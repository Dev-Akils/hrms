# HRMS: HR Management System (Next.js + MongoDB)

One Next.js 14 app (App Router, TypeScript). The API lives in `src/app/api/*` as route
handlers, and the UI is in `src/app/(app)/*`. There is no separate Express server.

## Run

```bash
cp .env.example .env.local     # set MONGO_URI and a long random JWT_ACCESS_SECRET
npm install
npm run seed                   # demo accounts, development only
npm run dev                    # http://localhost:3000
```

Demo logins created by the seed:

| Role | Email | Password |
|---|---|---|
| admin | admin@company.com | Admin@12345 |
| hr | hr@company.com | Hr@12345678 |
| manager | manager@company.com | Manager@12345 |
| employee | employee@company.com | Employee@12345 |

The employee reports to the manager, so you can test the approval flow end to end.
Never use these accounts in production.

## Who can do what

| | admin | hr | manager | employee |
|---|---|---|---|---|
| Employees: list / view | all | all | self + reports | self |
| Employees: create / edit | yes | yes | no | no |
| Employees: deactivate | yes | no | no | no |
| Salary visible | yes | yes | own only | own only |
| Attendance: check in/out | own | own | own | own |
| Attendance: view | all | all | self + reports | self |
| Leave: apply / cancel | own | own | own | own |
| Leave: approve / reject | anyone's (not own) | anyone's (not own) | direct reports | no |
| Payroll: generate / mark paid | yes | yes | no | no |
| Payroll: view | all | all | own | own |
| Audit log | yes | no | no | no |

## Design notes

- **Auth:** a 15-minute access JWT and a rotating refresh token, both in `httpOnly` cookies.
  Only the SHA-256 hash of the refresh token is stored. Reusing a rotated token revokes the whole session family.
- **CSRF:** `SameSite=Lax` cookies, plus a same-origin check on every write request (`lib/api.ts`).
- **Leave:** working days only (Mon–Fri), overlap check, balance check on apply and again on approve.
  Approval claims the request atomically, so two reviewers cannot both act on it.
  Nobody can review their own request. Cancelling an approved future leave refunds the balance.
- **Payroll:** net = basic + allowances − 12% PF on basic − loss of pay (approved unpaid leave days that fall in the month).
  There is one payslip per employee per month, enforced by a unique index. Re-running a month skips existing ones.
- **Attendance:** "today" uses `WORK_TZ`, one record per employee per day.
- **Audit:** append-only model, written by `audit()` on logins, employee changes, leave actions and payroll actions.

## Before production

- The login rate limiter is in memory. Use Redis/Upstash if you run more than one instance or deploy serverless.
- MongoDB transactions need a replica set. The code uses atomic single-document updates instead, so a standalone Mongo works.
- Add email notifications for leave decisions, an admin password-reset flow, and tests.
