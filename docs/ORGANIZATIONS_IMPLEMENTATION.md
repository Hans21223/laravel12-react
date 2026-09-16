# Public organizations implementation

User-approved scope: public organization creation; joining existing organizations only through invitation keys; MySQL with a separate database per organization; employee directory, private direct messages, optional voice/video, a read-only manager database view, visual request diagnostics, stronger security, and interface settings reset. Keep Laravel 12, React, Inertia, Tailwind, and Breeze.

## Architecture being implemented

- Central MySQL registry: accounts, organizations, memberships, hashed invitations, sessions, password-reset tokens.
- Separate MySQL database and credentials per organization for approval requests, steps, files, events, notifications, direct messages, and call signaling.
- Membership determines the role in the active organization. Creating a new organization never grants access to another one.
- Tenant selection is checked on every API call. Old tabs must reload after an organization switch.
- Existing accounts and approval history are migrated with backups and row-count verification. Local SQLite remains available only for development/testing.
- Managers can browse an allowlisted view of their own organization's business tables; passwords, keys, sessions, private messages, and connection secrets are excluded.
- Direct messages and signaling are limited to active coworkers; media permissions are requested only on explicit call/accept actions. Calls need verified TURN connectivity.

## Status

Built and verified locally: tenant schema and routing, public onboarding and invitation management, directory/messages/calls, database and debug views, MySQL provisioning/migration and backup support, tenant isolation and concurrency tests (95 tests / 574 assertions; the real MySQL transfer runs in CI), TypeScript 6 check without deprecation suppression, and a headless browser pass (registration, organization creation, directory, CRUD demo, database view, settings reset, mobile layout).

Work remaining: merge to `main` to deploy, then live verification. Deployment migrates the live SQLite data to MySQL (with backups) and enables organizations.

The previously deployed workflow upgrade is commit `47a9cb4`. Its 88 tests / 499 assertions and live two-stage approval check passed. The public-organization change is developed on `feat/public-organizations` until it is ready to deploy.
