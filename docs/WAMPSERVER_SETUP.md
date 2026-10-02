# WampServer and MariaDB setup

## 1. Start WampServer

1. Open WampServer.
2. Wait until the tray icon is green.
3. From the tray menu, confirm that **Apache** and **MariaDB** are running.
4. If another service already uses port 80 or 3306, resolve that conflict before continuing.

## 2. Create the database

Open `http://localhost/phpmyadmin`, select **Databases**, and create:

```text
leaders_db
```

Choose `utf8mb4_unicode_ci`. The migration command also creates the database with UTF-8 MB4 when the configured MariaDB user has permission.

## 3. Configure the environment

Copy `.env.example` to `.env` (or `.env.local`) and use these local WampServer values:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=leaders_db
DB_USERNAME=root
DB_PASSWORD=
DB_CONNECTION_LIMIT=5
MYSQL_SSL=false
```

An empty `DB_PASSWORD` is supported. Do not commit `.env` or `.env.local`.

Set the application security variables as well:

```env
ADMIN_PORTAL_SLUG=<64-character-random-hex-value>
SESSION_SECRET=<at-least-32-random-bytes>
COOKIE_SECURE=false
ADMIN_EMAIL=admin@example.org
ADMIN_PASSWORD=<strong-password-with-at-least-12-characters>
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are used by the administrator creation command and can also provide local emergency login. They are never embedded in client code.

## 4. Install and migrate

From the project directory:

```powershell
npm install
npm run db:migrate
npm run db:test
```

Expected connection output includes `leaders_db` and `utf8mb4`.

## 5. Create the first administrator

Using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from the local environment:

```powershell
npm run admin:create
```

Or pass the values for a one-time local command:

```powershell
npm run admin:create -- --email=admin@example.org --name="Platform administrator" --password="A-strong-local-password"
```

The command hashes the password with scrypt and assigns only the built-in administrator role. It does not print the password.

## 6. Start the application

Development:

```powershell
npm run dev
```

Production verification:

```powershell
npm run build
npm start
```

Open the public site at `http://localhost:3000/en`. The protected console route uses the configured `ADMIN_PORTAL_SLUG`.

## 7. Verify ticketing

1. Sign in as the database-backed administrator.
2. Create an event.
3. Create at least one active ticket type for that event.
4. Register a participant from the public event page.
5. Download the ticket and confirm the browser saves an SVG attachment named `ticket-event-slug-ticket-code.svg`.
6. Open **Scanner**, choose the event, and allow camera access.
7. Scan once and confirm `Billet validé avec succès.`
8. Scan again and confirm `Ce billet a déjà été utilisé.`
9. Open **Scan logs** and confirm both attempts are present.

Automated local route/database verification (requires the app on port 4173):

```powershell
$env:WORKFLOW_BASE_URL='http://127.0.0.1:4173'
npm run test:workflow
```

The workflow creates uniquely named temporary records, validates download and both scan outcomes, verifies logs/statistics, and removes all temporary records in `finally` cleanup.

## Scanner accounts

Create an administrative user with the built-in Scanner role, then use **Scanner access** to assign only the events that user may scan. The Scanner role does not have administrator, scan-log, export, content, member, or finance permissions. Add `scan_logs.view` explicitly to a custom role only when scan history is required.

## Import the supplied club members

Set `MEMBER_ASSETS_ROOT` only if the source image folder is moved, then run:

```powershell
$env:MEMBER_ASSETS_ROOT='C:\Users\ourid\Desktop\club leaders of tomorrow'
npm run db:import-members
```

The importer is repeatable and updates the 26 matching member records without deleting other members. Badge and profile images are stored inside MariaDB and streamed through the application when needed.

## Export and import for hosting

Create a portable UTF-8 MB4 dump from WampServer:

```powershell
mysqldump --host=127.0.0.1 --port=3306 --user=root --password= --default-character-set=utf8mb4 --single-transaction --routines --triggers --result-file=leaders_db.sql leaders_db
```

You can also select `leaders_db` in phpMyAdmin, choose **Export**, then use the custom SQL export with all tables selected. Compression is recommended because member photos and badges are kept in the database.

On the hosting provider, create an empty UTF-8 MB4 database and import `leaders_db.sql` through its phpMyAdmin or database import tool. Configure the deployed application with the provider's actual database name, host, port, username, and password; the hosted database name does not have to remain `leaders_db`.
