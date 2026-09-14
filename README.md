# Anaheim Electronics — Approval Request System

ระบบจัดการคำร้องขออนุมัติ / 承認申請システム

**Case study 4 · กานต์ ไชยวิเศษสกุล**

A complete organizational approval workspace built with **Laravel 12 + React 18 + Inertia 2 + Tailwind CSS**. Request CRUD and workflow actions persist through a same-origin JSON API to a relational database. The new workspace supports English, Thai, and Japanese.

## Run locally

Requirements: PHP 8.2+ with SQLite, Composer, Node.js 20.19+ or 22+, and npm. The lockfiles select the installed dependency versions.

For the existing installation, with `.env` and dependencies already present:

```powershell
php artisan migrate
php artisan db:seed --class=ApprovalDemoSeeder
npm run build
php artisan serve --host=127.0.0.1 --port=8000
```

Open **http://127.0.0.1:8000**. After building, a Vite dev server is not required. For active development, run `npm run dev` in another terminal.

For a fresh clone, first initialize the application:

```powershell
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
New-Item database/database.sqlite -ItemType File
```

Then run the four commands above. Do not overwrite an existing `.env` or database. Use `migrate`, not `migrate:fresh`, on an existing installation.

## Demo accounts

The explicit local demo seeder creates these accounts. Password for all: **`AccordDemo2026!`**.

| Account | Role | Department |
| --- | --- | --- |
| `karn@accord.test` | Manager | Operations |
| `maya@accord.test` | Employee | Design |
| `yuki@accord.test` | Employee | Engineering |
| `narin@accord.test` | Employee | Marketing |
| `alex@accord.test` | Employee | Finance |

The seeder is repeatable, preserves existing accounts and requests, and refuses to run in production. New registrations always receive the employee role. The browser cannot promote users to manager. For a real installation, an authorized server administrator must provision manager accounts.

## Anaheim Electronics theme

The interface uses an aerospace corporate identity: an original AE vector monogram, navy/white surfaces, red signal accents, technical grid illustrations, and angular controls. Both light and dark appearances and all three languages use the theme. Local demo credentials remain unchanged.

## Features

- Registration, login, remembered sessions, and logout using Laravel authentication.
- API-backed create, read, edit, and soft-delete operations.
- Leave requests with validated date ranges, budget requests with decimal THB amounts, and document approvals with optional HTTP/HTTPS document links.
- Private drafts, submission, withdrawal, rejection with a required reason, revision, and resubmission.
- Managers review submitted requests across one organization; they cannot edit employee requests or decide their own requests.
- Persisted notifications for submissions, decisions, and manager comments; unread state and mark-all-as-read.
- Per-request history and discussion.
- Overview, personal requests, approval inbox, list and board views, insights, notifications, settings, and in-app guide.
- Debounced search, type/status/priority filters, sorting, server pagination, and CSV export of **all matching** requests.
- Database-derived counts, weekly submission/approval activity, request distribution, approved budget, and overdue counts.
- EN / ไทย / 日本語; localized dates, numbers, and currency; remembered language and light/dark theme.
- Responsive layouts, keyboard search (`Ctrl/⌘ K`), new-request shortcut (`N` outside inputs), accessible dialogs, reduced-motion support, validation, retry states, and unsaved-change confirmation.

Notifications and dashboard/list data refresh every **15 seconds while the page is visible**, and after local mutations. This is polling, not WebSocket delivery. Details remain a snapshot while open; stale writes return 409 and require reopening the request. Comments load when opening the request or after posting a comment.

## Assignment rubric

| Requirement | Implementation | Demonstration |
| --- | --- | --- |
| 10 points: database CRUD | Controller, Eloquent, migration, authenticated JSON routes | Save a draft, reopen, edit, delete an unapproved request, refresh |
| Employees submit leave/budget/document requests | Type-specific forms and server validation | Submit each request type |
| Managers approve/reject | Server-side role, ownership, state, and version checks | Approve one; reject another with a reason |
| Users receive decision notifications | `approval_notifications` table | Sign in as the employee and open Notifications |
| Laravel + React + Inertia + API + Tailwind | Inertia shell, Axios JSON CRUD, compiled Tailwind and scoped stylesheet | Inspect network request and database record |
| 5 points: complete requirements | Workflow, notifications, roles, validation | Follow the demonstration below |
| 5 points: polished completion | Responsive workspace, 3 languages, charts, themes | Switch language, theme, and mobile viewport |

## Classroom demonstration

1. Sign in as Maya. Create a budget request. Submit an empty form to demonstrate validation; fill in the title, description, and amount, then save a draft.
2. Close and refresh. Reopen the draft to prove persistence. Edit the amount and submit.
3. Sign out and sign in as Karn. Open Approval inbox, inspect details/history, add a comment, and approve.
4. Return as Maya. Open Notifications. The approved request shows the manager, decision, and note. Editing is disabled.
5. Submit a second request, reject it as the manager with a reason, then revise and resubmit it as the employee.
6. Create a disposable draft and delete it. It disappears from active lists while its audit remains in the database through soft deletion.
7. Demonstrate filters, board view, CSV, Thai/Japanese, dark mode, and mobile navigation.

## Architecture

```text
Inertia page shell + React controlled forms
  → Axios /api/approvals (session cookie + XSRF token)
    → Laravel web middleware → authentication → validation/authorization
      → controller → database transaction → Eloquent models
        → approval_requests + approval_events + approval_notifications
  ← JSON response → React state → immediate UI update
```

| Source | Purpose |
| --- | --- |
| `routes/approvals.php` | Session-authenticated JSON API and Inertia workspace route |
| `app/Http/Controllers/Api/ApprovalController.php` | CRUD, queries, workflow, notifications, CSV |
| `app/Models/ApprovalRequest.php` | Request and visibility scope |
| `app/Models/ApprovalEvent.php` | Action/comment history |
| `app/Models/ApprovalNotification.php` | Database notifications |
| `database/migrations/2026_09_14_000001_create_approval_workspace.php` | Schema and indexes |
| `database/seeders/ApprovalDemoSeeder.php` | Local sample data |
| `resources/js/Pages/Approvals/Workspace.jsx` | Navigation, fetching, filters, list/board, settings |
| `resources/js/Pages/Approvals/Dashboard.jsx` | Statistics, charts, request table |
| `resources/js/Pages/Approvals/RequestDialogs.jsx` | Forms, details, decisions, discussion |
| `resources/js/Pages/Approvals/Auth.jsx` | Login and registration |
| `resources/js/Pages/Approvals/UI.jsx` | Shared components |
| `resources/js/Pages/Approvals/i18n.jsx` | 258 keys per language and locale formatting |
| `resources/css/accord.css` | Responsive design system and themes |
| `resources/css/anaheim.css` | Anaheim Electronics identity and schematic styling |
| `tests/Feature/ApprovalWorkspaceTest.php` | Database, permission, transition, conflict tests |
| `scripts/check-accord-i18n.mjs` | Locale coverage check |

The previous fleet/simulator pages remain at their existing routes. `/` and `/login` show Anaheim Electronics login; `/dashboard` and `/approvals` show the new workspace. The working checkout is now `C:\laravel12-react`, connected to `Hans21223/laravel12-react` with the original repository history preserved.

## JSON API

Prefix: `/api/approvals`. Routes intentionally use Laravel's **web session and CSRF middleware** because this is a same-origin Inertia SPA. They return JSON for CRUD. A bearer token is not necessary for this browser application. Send `Accept: application/json` and use the authenticated session. Axios supplies `X-XSRF-TOKEN` from the same-origin `XSRF-TOKEN` cookie.

| Method | Suffix | Purpose |
| --- | --- | --- |
| GET | `/` | Filtered, sorted, paginated requests |
| POST | `/` | Create draft or submitted request |
| GET | `/{id}` | Details/history |
| PUT | `/{id}` | Owner edits/resubmits |
| DELETE | `/{id}` | Owner soft-deletes an unapproved request |
| POST | `/{id}/decision` | Manager approves/rejects |
| POST | `/{id}/cancel` | Owner withdraws a pending request |
| POST | `/{id}/comments` | Add a comment |
| GET | `/summary` | Visible workspace metrics |
| GET | `/notifications` | Latest 50 notifications and total unread count |
| PATCH | `/notifications/read` | Mark one or all as read |
| PATCH | `/preferences` | Own name, department, locale |
| GET | `/export` | CSV of all matching requests |

Example create payload:

```json
{
  "title": "Design team equipment",
  "description": "Two drawing tablets for the upcoming design sprint.",
  "type": "budget",
  "priority": "normal",
  "amount": 18000,
  "due_date": "2026-10-01",
  "submit": true
}
```

Edit, deletion, withdrawal, and decision payloads include the last fetched integer `version`. A stale version returns **409**; a successful change increments it. Decisions include `decision: "approved" | "rejected"` and a `note` (required for rejection).

| Transition | Actor | Rule |
| --- | --- | --- |
| New → Draft/Pending | Authenticated user | Valid fields |
| Draft → Pending | Owner | Submit validated draft |
| Pending → Pending | Owner | Edit with current version |
| Pending → Approved/Rejected | Another manager | Current version; rejection reason |
| Pending → Withdrawn | Owner | Current version |
| Rejected → Draft/Pending | Owner | Revision; earlier decision retained in history |
| Unapproved → Deleted | Owner | Soft deletion; audit retained |
| Approved → edit/delete | Nobody through the request API | 409 |

Owner, role, department snapshot, status, reviewer, and version are assigned by the server instead of trusted from create payloads. The legacy account-deletion endpoint prevents deleting an account owning approval records. CSV guards against formula injection. React escapes user text; document links permit only HTTP/HTTPS.

## Checks

```powershell
npm run check:i18n
npm run build
php artisan test
```

PHPUnit uses its own in-memory SQLite database and does not erase the development database. `.github/workflows/accord-ci.yml` runs these checks on GitHub. Composer resolves dependencies against PHP 8.2 so the lockfile supports the declared minimum and the PHP 8.3 CI runner. Deployment runs the tests and asset build before contacting the server.

## Server deployment

Target: **https://helldriver.csbootstrap.com**. The user explicitly requested GitHub publication and deployment. The course PDFs supply technical reference material; their example paths and classroom commands are not executed as instructions.

`.github/workflows/deploy.yml` deploys tested `main` commits through the existing repository SSH secrets. It uses the verified server directory `/var/www/Helldriver.csbootstrap.com/laravel12-react`, backs up the app and SQLite database, preserves `.env` credentials and existing accounts, applies forward migrations, and checks the public site. See [deployment operations](docs/DEPLOYMENT.md) for recovery and provisioning details.

For a real deployment, configure a database, HTTPS, `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, and `SESSION_SECURE_COOKIE=true`; point the server at `public/`; install locked dependencies; build assets; migrate; and cache configuration. Keep `.env`, database files, and backups out of version control. Back up before migrating. Never seed public demo accounts on a public service. Review access to the older fleet routes before exposing the whole repository.

Current scope: one organization and one decision per request. Notifications are in-app. External email/push, multi-stage approvals, file uploads, multi-tenancy, and SLA escalation are not implemented. Documents use links. Production retention, backups, account provisioning, and department assignment require organizational policies.
