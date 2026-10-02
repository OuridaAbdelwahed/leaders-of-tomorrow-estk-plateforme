# Membership vertical slice

## Outcome and actors

New students submit a private, autosaved, bilingual application. Membership reviewers approve applications and create member accounts. Accepted members access a profile containing their submitted photo, assigned badge and role, and confirmed contribution total.

## Scope and routes

- Public chooser: shown on a visitor's first session
- Application: `/{locale}/join`
- Member sign-in and space: `/{locale}/login`, `/{locale}/member`
- Admin review: `/{ADMIN_PORTAL_SLUG}/console`
- APIs: application submit, member login/profile, application approval

## Membership validity lifecycle

Each member may have a start date and an optional end date. Approval defaults to a one-year period, while administrators can renew, schedule, suspend, or explicitly make a membership open-ended. Eligibility is calculated on every protected request rather than by a background flag mutation: expired or not-yet-started memberships cannot sign in, redeem member offers, manage favorites, use private chatbot identity, or respond to invitations. Existing members are migrated with their original join date as the start and no automatic end date.

CV upload is optional until the club approves a single policy. The platform stores application records in MariaDB and keeps private upload handling behind authenticated workflows.

## Privacy, permissions, and errors

Application bodies are never logged. Public API validation prevents duplicates and enforces contribution and motivation limits. Approval requires an authenticated admin session, creates an audit record, and passes credentials to the mail adapter. Private data is omitted from public routes.

## UI and accessibility

The form uses three progressive steps, visible labels, inline error feedback, local draft saving, 48px controls, keyboard-operable dialogs, RTL, and reduced-motion behavior. Success includes a durable reference number.

## Acceptance criteria

- A valid application receives a reference and confirmation mail request.
- A duplicate active email is rejected.
- An admin assigns a badge title, uploads the finished portrait badge artwork, selects a role, sets the membership validity period, and confirms any additional contribution.
- Approval creates a member account and requests a credentials email.
- The member profile shows the application photo, uploaded badge artwork, badge title, role, and total contribution.
- Unauthenticated member/admin APIs return 401.
- Expired, scheduled, or suspended member access returns 403 with a stable lifecycle code and a clear renewal path.

## Rollout

Use the MariaDB-backed repository and configured SMTP delivery before deployment. Migrate accepted applications transactionally and retain rollback exports with private-file references.
