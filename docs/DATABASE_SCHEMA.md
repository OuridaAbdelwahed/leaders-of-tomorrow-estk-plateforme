# Database schema and relationships

The canonical schema is `database/schema.mysql.sql`; versioned migrations live in `database/migrations`.

## Identity and authorization

- `users` stores platform and administrative identities; `email` is unique and indexed.
- `roles` and `permissions` define capabilities.
- `user_roles` and `role_permissions` are many-to-many junction tables.
- `scanner_event_access` limits scanner users to selected events.
- `event_managers` allows a user to manage multiple events and an event to have multiple managers.

## Events and ticketing

- `event_categories` → `events`: one category can classify many events.
- `venues` → `events`: one venue can host many events.
- `events` → `event_images`: one-to-many.
- `events` → `ticket_types`: one-to-many; every ticket type belongs to exactly one event.
- `orders` belongs to a user or member and has many `order_items`.
- `order_items` references one ticket type.
- `tickets` belongs to one event and one ticket type, and optionally to one order, user, or member.
- `tickets.qr_token_hash` stores a SHA-256 hash of the secure random QR token. Sequential database IDs and participant data are never placed in the QR value.
- `payments` belongs to an order; `refunds` belongs to a payment and optionally a ticket.
- `cancellations` can reference an event, ticket, or order.

## Scanning

- `scan_logs` belongs to one event, optionally one ticket, and one scanner user.
- Every accepted or rejected attempt is logged with result, reason, time, device/browser, and IP when available.
- Validation locks the matching ticket row inside a transaction before checking and updating status.
- The atomic `UPDATE ... WHERE status='ACTIVE'` is a second guard against simultaneous successful validation.

Supported scan results:

```text
valid
invalid
not_found
already_used
cancelled
refunded
wrong_event
expired
not_yet_valid
unauthorized
duplicate
error
```

## Membership, content, and platform data

- `members` optionally links to `users`; `member_skills` normalizes the member skill list.
- `membership_applications` stores membership submissions and decisions.
- `event_invitations` joins events and members.
- `posts`, `gallery_items`, and `sponsors` back public content management.
- `notifications`, `settings`, and `audit_logs` support platform operations.

## Important indexes

The schema includes unique or search indexes for `users.email`, `events.slug`, `tickets.ticket_code`, `tickets.qr_token_hash`, `tickets.event_id`, all required `scan_logs` foreign keys/results/timestamps, `orders.order_number`, and `payments.payment_reference`. Composite indexes cover event/status ticket counts and event/date scan-log pagination.
