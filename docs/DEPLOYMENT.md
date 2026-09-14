# Helldriver deployment operations

Repository: https://github.com/Hans21223/laravel12-react

Site: https://helldriver.csbootstrap.com

Verified Nginx application directory: `/var/www/Helldriver.csbootstrap.com/laravel12-react`. The old workflow failed because it used `laravel12-app`. Linux path case matters.

## Pipeline

Pushing `main`, or manually running **Deploy Anaheim Electronics**, installs locked dependencies on PHP 8.3, checks translations, builds assets with Node 22, and runs the test suite. Only a passing build is transferred over SSH. Pull requests run checks without deployment.

Existing GitHub repository secrets: `SSH_HOST`, `SSH_USER`, and `SSH_PRIVATE_KEY`. These are consumed by Actions and are not stored in source. An initial manager hash may be supplied through the temporary `AE_INITIAL_MANAGER_HASH` secret; the plaintext password is never sent to GitHub or printed in workflow logs.

The server script refuses modified tracked source (ignoring permission-only changes) and requires the deployed SHA to descend from the server's current commit. It creates a private snapshot, enters maintenance mode, snapshots SQLite using `VACUUM INTO`, fast-forwards to the tested SHA, installs production PHP dependencies, copies the tested frontend assets, runs migrations, and rebuilds caches. It does not run the demo seeder or reset the database.

`APP_KEY`, database configuration, and existing passwords are preserved. The deployment sets the application name, production mode, public HTTPS URL, disabled debug output, and secure session cookies. It adjusts only application storage/cache and SQLite ownership for `www-data`; Nginx configuration and other hosted applications are untouched.

The user designated `karn@accord.test` as manager. If absent, the first deployment provisions that account with a separately generated live password; if present, it preserves the existing password. New public registrations remain employees. Local demo credentials are not deployed.

## Backups and failure recovery

Snapshots are stored outside the document root under `/var/www/Helldriver.csbootstrap.com/.anaheim-backups/<UTC timestamp>-<commit>/` with private directory permissions. Each contains:

- `application.tar.gz`: previous source, Git metadata, vendor dependencies, configuration, and frontend assets; excludes node_modules and mutable storage.
- `database.sqlite`: consistent SQLite snapshot.
- `database-path.txt` and `previous-commit.txt`: recovery references.

The deployment output records the exact backup path and deployed SHA. Uploaded files and sessions in `storage` are retained in place. Frontend asset files from earlier releases remain available so open browser tabs can finish loading their chunks.

If deployment fails after entering maintenance, it stays in maintenance mode to avoid serving partially updated code. Read the failed step and repair or rerun it. If a tracked source edit is reported, inspect and preserve it before retrying; do not force reset the server. A rerun at the same SHA is supported.

For rollback, use an authenticated server session and inspect the recorded snapshot before restoring the app archive in the verified application directory. Run cache clearing and `php artisan up` after checking dependencies. Database restoration is a separate deliberate step: never overwrite the live database with an older snapshot after users have resumed writing. Additive migrations normally allow reverting application code while retaining the current database. Snapshots contain credentials and organizational data; never publish them or place them under `public`.

## Validation

The pipeline checks `/up` and verifies that the public root renders the `Approvals/Auth` Inertia page. Test coverage exercises CRUD, role isolation, approvals, resubmission, notifications, validation, conflict handling, and export. Live verification results are recorded in `APPROVAL_HANDOFF.md`.
