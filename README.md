# New Leaders of Tomorrow Platform

A bilingual, RTL-aware Next.js platform for event discovery, registration, secure ticket delivery, QR validation, membership, content, and administrative operations.

The application uses MUI and MariaDB/MySQL. Operational data is stored in normalized InnoDB tables; there is no mock, JSON-snapshot, or temporary persistence fallback.

## Local setup

```powershell
npm install
npm run db:migrate
npm run db:test
npm run admin:create
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`. The protected console route uses the 64-character `ADMIN_PORTAL_SLUG` from the local environment.

See [WampServer setup](docs/WAMPSERVER_SETUP.md) for the complete Windows/MariaDB procedure and [database schema](docs/DATABASE_SCHEMA.md) for tables, relationships, indexes, and transactional scan behavior.

## Main routes

- `/{locale}/events` and `/{locale}/events/{slug}`: database-backed event discovery.
- `/{locale}/events/{slug}/register`: ticket-type selection and registration.
- `/{locale}/tickets/{code}?token=...`: compact ticket preview and direct download.
- `/api/events/{eventId}/scan`: authenticated, event-authorized transactional validation.
- `/api/events/{eventId}/scan-logs` and `/scan-summary`: filtered logs and statistics.
- `/{ADMIN_PORTAL_SLUG}/console`: event, ticket type, scanner, logs, access, membership, content, role, and audit operations.

## Verification

```powershell
npm run lint
npm test
npm run build
```

With the app running on port 4173:

```powershell
$env:WORKFLOW_BASE_URL='http://127.0.0.1:4173'
npm run test:workflow
```

The end-to-end script verifies a ticket attachment, a valid scan, an already-used rejection, both scan logs, and event statistics, then removes its temporary records.

## Production boundaries

Before a public production launch, configure TLS, managed secrets, private object storage and malware scanning for applicant uploads, durable rate limiting, CSRF protection, session rotation/revocation, database backups, monitoring, and enforced MFA.
