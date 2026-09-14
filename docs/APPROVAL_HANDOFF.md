# Approval workspace handoff

Application completed locally on 14 September 2026, with profile and account settings added on 15 September. The working checkout is now `C:\laravel12-react`; the user subsequently authorized GitHub publication and VPS deployment.

## Delivered

Laravel 12, React, Inertia, and Tailwind approval system with database-backed JSON CRUD. Employees create leave, budget, and document requests. Managers approve or reject other users' submitted requests; employees receive persistent in-app notifications.

The workspace includes drafts, revision and resubmission, withdrawal, audit history, comments, optimistic concurrency checks, role and ownership enforcement, search, filtering, pagination, list/board views, CSV export, overview metrics, insights, preferences, and an in-app guide. English, Thai, and Japanese each contain 258 translation keys.

The latest theme is Anaheim Electronics: an original AE vector monogram, navy/white surfaces, crimson accents, angular panels, and schematic illustrations. Login, registration, and the approval workspace support light/dark appearance and mobile layouts.

## Verification

- `php artisan test`: **80 passed, 375 assertions**, including 16 approval and 4 profile/settings feature tests.
- `npm run check:i18n`: passed for all three languages and static translation references.
- `npm run build`: passed after the final mobile CSS fix (1,019 modules).
- Browser: manager login, approval decision and history, employee notification, form validation, persistent draft creation/edit/submission, language switching, list/board navigation, light/dark appearance, and responsive navigation checked.
- Japanese mobile dashboard checked at 390 × 844. Fixed an absolutely positioned screen-reader table label escaping its scroll container; document width now stays within the viewport while the wide table scrolls inside its panel.
- No warning/error console entries during the final browser check.

The application has also been deployed to https://helldriver.csbootstrap.com. Live HTTPS checks verified manager login and role, summary and notification APIs, and create/read/update/soft-delete against the server SQLite database. The disposable verification draft is soft-deleted, with its audit retained. The pipeline checks that the served application bundles exactly match the tested build.

## Profile and settings update

The top-right avatar opens an accessible account dropdown. Settings now support profile photo preview/upload/removal, system appearance, display density, request page size, preferred list/board view, reduced motion, and password changes. All labels are provided in English, Thai, and Japanese (287 keys each). Saved appearance and interface language take precedence over older browser preferences after sign-in.

Uploaded photos are validated on the server and stored on the private local disk under `storage/app/private/avatars`. The authenticated image route sends a MIME type and `nosniff`; generated avatar URLs change after replacement to avoid stale caches. The deployment leaves this storage directory in place. No public storage symlink is required.

## Live access

Open https://helldriver.csbootstrap.com/login. The manager is `karn@accord.test`, as designated by the user. A new account was created with a separate random live password, saved privately on this computer in `storage/app/private/live-manager-access.json`; it is excluded from Git. Local demo passwords are not used on the public service.

The original failed workflow used the nonexistent `laravel12-app` directory. The corrected path is `/var/www/Helldriver.csbootstrap.com/laravel12-react`. Deployment uses one SSH connection to avoid repeated connection timeouts, takes private backups, preserves the existing database and APP_KEY, sets production/HTTPS configuration, migrates, and caches the application.

The first deployed Anaheim application commit was `59d809fd912cae40fbbe32cfdbb1c0675079cc0c`. Its pre-deployment snapshot is `/var/www/Helldriver.csbootstrap.com/.anaheim-backups/20260914T192346Z-59d809fd912c`. Each subsequent deployment logs its own snapshot and SHA. See [deployment operations](DEPLOYMENT.md).

PHP dependencies now resolve against PHP 8.2 and pass PHP 8.3 CI. Compatible PHP and npm security patches were applied; both dependency audits reported zero vulnerabilities after the changes.

## Run locally and demonstrate

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

The checkout is connected to `https://github.com/Hans21223/laravel12-react`, preserving both the original repository history and the locally completed app. CI runs in `.github/workflows/accord-ci.yml`; `.github/workflows/deploy.yml` tests and deploys pushes to `main`. Read the latest GitHub Actions result for the currently deployed commit.
