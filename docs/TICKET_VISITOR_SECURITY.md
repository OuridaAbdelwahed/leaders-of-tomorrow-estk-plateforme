# Ticket visitor verification and restriction workflow

This platform now protects public event ticket creation with a no-login email OTP workflow.

## Flow

1. Visitor fills the event registration form.
2. Browser sends email, device cookie hash, browser fingerprint, IP hash, and Cloudflare Turnstile token to the backend.
3. Backend rate-limits the email/device/IP and sends a 6-digit OTP by SMTP.
4. Visitor enters the OTP in the branded Leaders of Tomorrow OTP card.
5. Backend verifies the OTP and marks the verification session as verified.
6. Ticket creation is allowed only with the verified token, from the same browser/device cookie.
7. The ticket is created inside a database transaction and linked to the verification record.
8. Security events are written for OTP requests, verification, allowed tickets, blocked duplicate browser attempts, rate limits, and Turnstile failures.

## Database migration

Run this after the earlier migrations:

```bash
mysql -u root leaders_db < database/migrations/004_ticket_visitor_security.sql
```

For a fresh host import, use `database/schema.mysql.sql`; it includes the same tables and ticket columns.

## Required environment variables

Copy `.env.example` to `.env.local` and set:

```env
DB_DATABASE=leaders_db
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TICKET_DEVICE_POLICY=strict
OTP_HASH_SECRET=replace-with-a-unique-random-secret
VERIFICATION_TOKEN_HASH_SECRET=replace-with-a-unique-random-secret
DEVICE_TOKEN_HASH_SECRET=replace-with-a-unique-random-secret
FINGERPRINT_HASH_SECRET=replace-with-a-unique-random-secret
IP_HASH_SECRET=replace-with-a-unique-random-secret
EMAIL_HASH_SECRET=replace-with-a-unique-random-secret
```

In local development, if `TURNSTILE_SECRET_KEY` is empty, the backend skips Turnstile. In production, configure Cloudflare Turnstile before launch.

## SMTP

The OTP email uses the existing SMTP settings:

```env
MAIL_SERVER=smtp.example.org
MAIL_PORT=587
MAIL_TLS=true
MAIL_USERNAME=members@example.org
MAIL_PASSWORD=replace-with-an-app-password
MAIL_FROM=New Leaders of Tomorrow <members@example.org>
```

If SMTP is not configured, local development logs the email send event but does not deliver a real message.

## Admin review

Admins with `ticket_security.view` can open:

```text
Admin console → Ticket security
```

The page shows security events by event, action, blocked/allowed status, risk score, flags, and reason.

## Export/import deployment note

Before deployment, export the full MariaDB database from phpMyAdmin or `mysqldump`. The ticket restriction state is stored in:

- `email_verifications`
- `ticket_security_events`
- `rate_limit_events`
- new security columns on `tickets`

Importing those tables on the hosting provider preserves issued tickets and their verification/security audit records.
