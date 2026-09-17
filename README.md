# Anaheim Electronics — Approval Request System

ระบบจัดการคำร้องขออนุมัติ / 承認申請システム

**Case study 4 · กานต์ ไชยวิเศษสกุล** · Live: **https://helldriver.csbootstrap.com**

A multi-organization approval workspace built with **Laravel 12, React 18, Inertia 2, Tailwind CSS and Laravel Breeze authentication**. Employees submit leave, budget and document requests; managers approve or reject them; everyone is notified. Every create, read, update and delete goes through a session-authenticated JSON API into MySQL (SQLite for local development). The interface is available in English, Thai and Japanese.

## Assignment requirements

| Requirement | Where it is implemented |
| --- | --- |
| Laravel 12 + React + Inertia | Inertia page shells in `resources/js/Pages/Approvals`, Laravel controllers in `app/Http/Controllers` |
| Data saved through an API | Axios calls to `/api/approvals`, `/api/organization`, `/api/team`; see [JSON API](#json-api) |
| Tailwind CSS UI | Design tokens in `tailwind.config.js`; every page uses Tailwind utility classes; shared primitives in `resources/css/app.css` use `@apply` |
| Laravel Breeze authentication | Breeze controllers in `app/Http/Controllers/Auth`: login, registration, forgot/reset password, email verification, password confirmation |
| CRUD on the database (10 pts) | `ApprovalController` store/index/show/update/destroy; the in-app **How it works → Run real CRUD demo** runs all four against the database and shows each HTTP status |
| Employees send requests | Leave, budget and document forms with server validation |
| Managers approve or reject | Single-manager or sequential multi-stage routes, rejection reasons, reassignment |
| Notify users of decisions | Database notifications, unread badges, instant WebSocket updates with polling fallback |

## Features

**Requests and approvals**
- Drafts, submission, editing with optimistic version checks (stale writes return 409), withdrawal, soft deletion, revision and resubmission.
- Sequential approval routes with 2–4 named reviewers; each stage is recorded, earlier rounds stay visible.
- **Reassign** an open stage: the assigned reviewer can delegate, the organization owner can reroute.
- Private attachments (PDF/JPG/PNG/WebP, 2 MB, up to 5), comments and a full activity timeline.
- Search, filters, sorting, pagination, list and board views, CSV export, insights and charts.

**Organizations (public multi-tenant)**
- Anyone can register and create an organization; each organization gets **its own MySQL database and credentials**.
- Joining requires an invitation key: hashed at rest, single- or multi-use, expiring, revocable, optionally locked to one email and emailed to that address.
- Owners rename, **transfer ownership** and **close** organizations; managers promote, demote or suspend members; members **leave**.
- Failed setups are listed with **Retry** and **Remove**, and do not count toward organization limits.
- Managers get a read-only **Database** explorer of their own organization's business tables.

**Team**
- Employee directory, private direct messages (encrypted at rest), and WebRTC voice and video calls through an authenticated TURN relay.
- **Instant updates** with Laravel Reverb: new messages, approvals and call signals arrive over a private WebSocket channel. Events carry no content, only a hint to refetch through the authorized API.

**Accounts and settings**
- Profile photo, name, department, language, light/dark/system theme, density, rows per page, default view, reduced motion and "restore defaults".
- Password change, forgot/reset password (responses never reveal whether an email exists), and account deletion once organizations are transferred, closed or left.
- **How it works** mode: a visual walkthrough of React → Breeze → organization access → API → MySQL, with per-request server time, SQL query counts and tables (no secrets or bodies recorded).

## Tech stack

| Layer | Choice |
| --- | --- |
| Backend | PHP 8.3, Laravel 12, Breeze (Inertia React), Reverb |
| Frontend | React 18, Inertia 2, Headless UI, Axios, Laravel Echo |
| Styling | Tailwind CSS 3.4 with project tokens and `@tailwindcss/forms` |
| Data | MySQL 8 (central registry + one database per organization); SQLite locally and in tests |
| Realtime and calls | Laravel Reverb (WebSockets), WebRTC with coturn TURN relay |
| CI/CD | GitHub Actions: tests, real MySQL isolation job, build, SSH deployment with backups |

## Run locally

Requirements: PHP 8.2+ with SQLite, Composer, Node.js 20.19+ or 22+, npm.

```powershell
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
New-Item database/database.sqlite -ItemType File
php artisan migrate
php artisan db:seed --class=ApprovalDemoSeeder
npm run build
php artisan serve
```

Open http://127.0.0.1:8000. The seeder creates these local-only accounts (password **`AccordDemo2026!`**) and refuses to run in production:

| Account | Role |
| --- | --- |
| `karn@accord.test` | Manager |
| `finance-reviewer@accord.test` | Manager |
| `maya@accord.test`, `yuki@accord.test`, `narin@accord.test`, `alex@accord.test` | Employees |

Optional modes:
- **Organizations**: set `TENANCY_ENABLED=true`. Locally each new organization gets its own SQLite file under `storage/app/private/tenants`; in production the provisioner creates MySQL databases.
- **Instant updates**: set `BROADCAST_CONNECTION=reverb`, fill the `REVERB_*` values from `.env.example`, and run `php artisan reverb:start`. Without it the app polls.
- **Calls**: set `TURN_URL` and `TURN_SECRET` for a coturn server using `use-auth-secret`.
- **Email** (password reset, verification): the default `MAIL_MAILER=log` writes messages to `storage/logs/laravel.log`. Configure SMTP to deliver them.

## Architecture

```text
Browser (React + Inertia + Tailwind)
  │  Axios JSON + session cookie + XSRF token          Echo WebSocket (private channel)
  ▼                                                     ▼
Laravel web middleware → auth (Breeze) → UseOrganization   Reverb ◄─ WorkspaceChanged hint
  │  membership + organization status checked on every API call
  ▼
Controllers → validation/authorization → transaction
  ├─ Central database: users, organizations, memberships, invites, sessions
  └─ Tenant database (per organization): approval_requests, steps, events,
     notifications, attachments, direct_messages, workspace_calls, call_signals
```

| Source | Purpose |
| --- | --- |
| `routes/approvals.php`, `routes/organizations.php`, `routes/auth.php`, `routes/channels.php` | API, organization, Breeze and broadcast routes |
| `app/Http/Controllers/Api/ApprovalController.php` | Request CRUD, decisions, reassignment, notifications, export |
| `app/Http/Controllers/Api/OrganizationController.php` | Create/join/switch, invites, members, rename, transfer, leave, close, retry |
| `app/Http/Controllers/Api/TeamController.php`, `CallController.php` | Direct messages and WebRTC signaling |
| `app/Services/TenantContext.php`, `OrganizationService.php` | Per-organization database connection and provisioning |
| `app/Support/Realtime.php`, `app/Events/WorkspaceChanged.php` | After-commit, content-free WebSocket hints |
| `resources/js/Pages/Approvals/*.jsx` | Workspace, dashboard, dialogs, workflow, settings, organizations, messages, calls, debug view |
| `resources/js/Pages/Approvals/UI.jsx` | Shared Tailwind components (Modal, Field, Badge, Avatar, PageHeading …) |
| `tailwind.config.js`, `resources/css/app.css` | Design tokens, dark mode variant, component primitives |
| `resources/js/Pages/Approvals/i18n.jsx` | English, Thai and Japanese dictionaries |
| `tests/Feature/*` | Database CRUD, permissions, isolation, workflow, realtime channel and account tests |

## Tailwind design system

- **Tokens** (`tailwind.config.js`): `canvas`, `surface`, `ink`, `muted`, `line`, `brand`, `signal` and `navy` colors resolve to CSS variables, so the same classes render both light and dark themes. Fonts: `font-sans`, `font-technical`, `font-mono`, `font-code`.
- **Variants**: `dark:` follows the workspace theme, `compact:` follows the density setting, `motion-reduced:` follows the reduced-motion setting, and `max-md:`/`max-lg:` breakpoints match the layout.
- **Primitives** (`resources/css/app.css`): `.btn` with `primary`/`secondary`/`ghost`/`danger`, `.icon-button`, `.panel`, `.panel-heading`, `.eyebrow`, `.text-link`. Everything else is utility classes in JSX.

## JSON API

All routes use the same-origin session and CSRF protection; send `Accept: application/json`. Organization routes also require the `X-Organization-ID` header of the active organization.

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/api/approvals` | List (filters, sort, pagination) / create draft or submitted request |
| GET / PUT / DELETE | `/api/approvals/{id}` | Details / owner edit or resubmit / soft delete |
| POST | `/api/approvals/{id}/decision` | Approve or reject (manager, current stage) |
| POST | `/api/approvals/{id}/steps/{step}/reassign` | Hand an open stage to another manager |
| POST | `/api/approvals/{id}/cancel`, `/comments` | Withdraw, comment |
| POST / GET / DELETE | `/api/approvals/{id}/attachments[/{file}]` | Private files |
| GET | `/api/approvals/summary`, `/notifications`, `/export`, `/reviewers` | Metrics, notifications, CSV, eligible managers |
| PATCH / POST | `/api/approvals/preferences`, `/preferences/reset` | Settings |
| GET / POST | `/api/organizations`, `/api/organizations/join` | List (incl. failed setups) / create / join with key |
| POST / DELETE | `/api/organizations/{id}/switch`, `/retry`, `/api/organizations/{id}` | Switch, retry setup, remove failed setup |
| PATCH / DELETE | `/api/organization` | Rename / close (owner) |
| POST | `/api/organization/transfer`, `/leave` | Transfer ownership / leave |
| GET / POST / DELETE | `/api/organization/invites[/{id}]` | Invitation keys (manager) |
| GET / PATCH | `/api/organization/members[/{id}]` | Directory / role and access (owner) |
| GET | `/api/organization/database` | Read-only table explorer (manager) |
| GET / POST | `/api/team/conversations`, `/messages/{peer}` | Direct messages |
| GET / POST / PATCH | `/api/team/calls[/{id}[/signals]]` | Call lifecycle and signaling |

Writes include the last fetched integer `version`; a stale version returns **409**. Owner, role, reviewer and status are assigned by the server, never trusted from the payload.

## Security

- Session authentication with CSRF, secure cookies, encrypted sessions, rate limits on login, registration, password reset, invites, messages and calls.
- Tenant isolation: every organization API call checks an active membership and a matching `X-Organization-ID`; data lives in separate databases with separate credentials.
- Invitation keys stored as SHA-256 hashes; direct messages and call payloads encrypted at rest; attachments and photos served only through authorized routes.
- Password reset responses are identical for known and unknown emails; new passwords need 12+ characters with letters and numbers.
- WebSocket channels are private and authorized per user and organization; broadcasts contain no request or message content.
- CSV export guards against formula injection; document links allow only HTTP/HTTPS; security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).

## Checks

```powershell
npm run check:i18n
npm run build
php artisan test
```

66 tests cover CRUD, permissions, sequential routing and reassignment, attachments, organization isolation and lifecycle, invites, messages, calls, realtime channel authorization and account deletion. `.github/workflows/accord-ci.yml` also runs the isolation and transfer tests against a real MySQL 8 service.

## Deployment

Pushing `main` runs `.github/workflows/deploy.yml`: tests and build on GitHub, then one SSH session that snapshots the application, database and files, enters maintenance mode, fast-forwards to the tested commit, migrates every organization database, configures the TURN relay and Reverb (systemd service plus an Nginx `/app/` WebSocket proxy), rebuilds caches and verifies HTTPS, assets and the WebSocket upgrade. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for recovery steps.

## Limits

- Email needs the `AE_MAIL_USERNAME`/`AE_MAIL_PASSWORD` repository secrets (Gmail SMTP with an App Password) to reach Gmail; without them the server's local mail agent is used and Gmail rejects it because the domain has no SPF/DKIM records.
- Calls need UDP access to the TURN relay; restrictive networks may block media.
- Closing an organization keeps its database for administrator recovery; the app has no permanent purge.
