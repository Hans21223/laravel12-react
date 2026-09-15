# Sequential approval and private attachments

The existing single-manager route remains available. Choose **Sequential approval** in the request form to select 2–4 different managers in order. This is an optional request route, not an automatic budget or company policy engine.

## What happens

1. Save a draft. Its stages wait for submission.
2. Add supporting PDF, JPG, PNG, or WebP files in request details. Maximum 2 MB per file, five files per request.
3. Edit and submit. The first manager receives an in-app notification and sees the request in their approval inbox.
4. Approving a stage advances to the next manager. The request stays pending until the final stage approves.
5. Rejection stops the remaining stages. The owner can revise and resubmit.

The detail view shows progress, each named reviewer, decision notes, and previous rounds. List and board cards show compact stage progress and attachment counts. English, Thai, Japanese, light/dark themes, and mobile layouts are supported.

## Data and permissions

- `approval_requests`: request data, route mode, current round, status, and optimistic version.
- `approval_steps`: ordered reviewers, round, status, note, and decision timestamp. Previous review rounds remain in SQL.
- `approval_attachments`: original filename, MIME type, size, uploader, and private storage path. The API never serializes the storage path.
- `approval_events`: request changes, file changes, comments, and decisions.
- `approval_notifications`: persisted notifications scoped to their recipient.

Only the assigned manager can decide the active stage. Duplicate reviewers, self-review, non-manager reviewers, stale versions, and out-of-order decisions are rejected. Pending edits restart sequential review; decisions from earlier rounds remain available. The final request is immutable after approval.

Attachments can be added or removed only by their owner while the request is a draft or rejected. Submitted files remain fixed during review. Every download passes the same request visibility check. Files are stored under `storage/app/private/approval-attachments`, downloaded with `nosniff`, and never exposed through a public storage link. Removing an attachment physically deletes its SQL row and stored file; deleting a request soft-deletes the request and retains its audit/files under restricted access.

Validation checks file size, extension, and detected MIME type; this is not malware scanning. Company policies, delegation, external email delivery, and automatic escalation are not implemented in this update.

## Demonstration accounts

Use an employee account to submit, `karn@accord.test` for the first review, and the dedicated `finance-reviewer@accord.test` for the final review. Live passwords are unique and stored only in the ignored private account files on the owner's computer.

The manual `demo-reviewer.yml` workflow provisions only this dedicated account using the administrator-supplied `AE_DEMO_REVIEWER_HASH` secret. It refuses to overwrite a conflicting account. Remove the temporary hash secret after provisioning; normal deployments do not require it.

## Verification

Automated tests cover sequential completion, rejection/resubmission, retained rounds, inbox scoping, invalid route selection, stale decisions, private download authorization, file limits, upload rollback, physical file deletion, and existing CRUD behavior. See `tests/Feature/ApprovalRoutingTest.php`, `ApprovalAttachmentTest.php`, `ApprovalOperationsTest.php`, and `ApprovalWorkspaceTest.php`.
