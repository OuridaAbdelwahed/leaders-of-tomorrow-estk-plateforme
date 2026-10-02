# Member event invitations vertical slice

Admins invite an active member to represent the club at an event. The system requests an email notification. The member accepts or declines inside the platform; decline requires a reason and automatically offers the place to the next eligible active member.

## Privacy and authorization

Only authenticated admins create invitations. Only the invited authenticated member can respond. Reasons are visible to authorized operations users and are included in the append-only audit trail without unrelated personal data.

## States and accessibility

Pending, accepted, rejected/reassigned, loading, error, and empty states are explicit. The decline dialog is keyboard accessible, requires a reason, and uses text plus icon/color for status.

## Acceptance criteria

- Duplicate pending invitations are rejected.
- Email delivery is requested at invitation creation and reassignment.
- Acceptance is final for the pending invitation.
- Decline requires a reason and selects another eligible member when available.
- Every response creates an audit event.
