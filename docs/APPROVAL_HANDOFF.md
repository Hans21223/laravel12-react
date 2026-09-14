# Approval workspace handoff

Completed locally on 14 September 2026 in `C:\laravel12-react-main`.

## Delivered

Laravel 12, React, Inertia, and Tailwind approval system with database-backed JSON CRUD. Employees create leave, budget, and document requests. Managers approve or reject other users' submitted requests; employees receive persistent in-app notifications.

The workspace includes drafts, revision and resubmission, withdrawal, audit history, comments, optimistic concurrency checks, role and ownership enforcement, search, filtering, pagination, list/board views, CSV export, overview metrics, insights, preferences, and an in-app guide. English, Thai, and Japanese each contain 258 translation keys.

The latest theme is Anaheim Electronics: an original AE vector monogram, navy/white surfaces, crimson accents, angular panels, and schematic illustrations. Login, registration, and the approval workspace support light/dark appearance and mobile layouts.

## Verification

- `php artisan test`: **76 passed, 341 assertions**, including 16 approval feature tests.
- `npm run check:i18n`: passed for all three languages and static translation references.
- `npm run build`: passed after the final mobile CSS fix (1,019 modules).
- Browser: manager login, approval decision and history, employee notification, form validation, persistent draft creation/edit/submission, language switching, list/board navigation, light/dark appearance, and responsive navigation checked.
- Japanese mobile dashboard checked at 390 × 844. Fixed an absolutely positioned screen-reader table label escaping its scroll container; document width now stays within the viewport while the wide table scrolls inside its panel.
- No warning/error console entries during the final browser check.

These checks cover the local SQLite application. External hosting and production infrastructure have not been validated.

## Run and demonstrate

Open http://127.0.0.1:8000/approvals. A local PHP server was started on port 8000; if it stops, run:

```powershell
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

Server logs from the background preview are in `storage/logs/ae-server.log` and `storage/logs/ae-server-error.log`. Compiled assets are present; no Vite dev server is needed for the preview.

Demo manager: `karn@accord.test`. Demo employee: `maya@accord.test`. Both use `AccordDemo2026!`. Credentials retain their original demo names after the visual rebrand. See [README](../README.md) for all accounts, clean installation, API documentation, rubric mapping, and the classroom demonstration.

The explicit demo seeder is repeatable and refuses production. Browser QA approved the original sample “Brand refresh · creative production” and created/submitted “Brand guidelines · final sign-off”; those demonstration records remain available locally.

## Data and scope

The existing database was backed up to `storage/app/approval-before-20260914.sqlite` before migration. No reset or destructive fresh migration was used. Existing fleet and simulator routes remain available; the root, login, dashboard, and approval routes lead into the new approval experience.

Notifications refresh every 15 seconds while the page is visible. This version uses a single organization and one manager decision, document links rather than uploaded attachments, and THB budget amounts. It does not include email delivery or WebSockets. Open detail dialogs are snapshots; stale writes return a conflict and require reopening.

The supplied local folder has no Git metadata. No remote push or deployment was performed. A CI workflow is included in `.github/workflows/accord-ci.yml`, but has only been prepared locally. Production requires environment configuration, migration, secure manager provisioning, and hosting setup as described in the README.
