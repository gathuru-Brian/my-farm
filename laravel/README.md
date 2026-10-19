# Modern Farms Laravel + Inertia

Laravel is the designated backend and Svelte with Inertia is the application
UI. The Flask application at the repository root is a temporary migration
source and fallback; new application workflows belong in this Laravel app.
The admin dashboard includes producer approvals, marketplace controls, customer
records, and an order review queue.

## Requirements

- PHP 8.3 or later with SQLite support
- Composer
- Node.js 20.19+ or 22.12+ with npm

## Run locally

From this directory:

```powershell
composer install
php artisan key:generate
php artisan migrate
npm install
npm run dev
```

In a second terminal, run `php artisan serve`, or start the same Laravel server
from the repository root with `python run.py`. The Laravel app serves the
Inertia landing, login, registration, and role-specific dashboard routes.
Sanctum-protected JSON endpoints retain the existing `/api` surface for
authentication, farms, products, orders, messaging, and admin operations.
New producer accounts remain pending until an administrator approves them. A
multi-farm customer basket creates one fulfillment order per farm, so each
producer updates only their own order; the API returns these in `orders` and
also includes the legacy singular `order` field when there is one farm. API
registration does not issue a bearer token to a producer until approval, and
account status is checked again on protected requests so suspension takes
effect for existing tokens and web sessions. API bearer tokens expire after
seven days by default; login and registration responses include
`token_expires_at`. To appoint the first administrator
after importing users (or for a fresh deployment), promote an existing active
account from the server CLI with
`php artisan app:promote-admin user@example.com`. Verify the account holder's
identity before running the command; it prompts before changing the role. The
account holder should then set or reset their password through the configured
email flow.

The schema is initialized in this Laravel application's SQLite database. To
move records from the Flask database, first preview the import:

```powershell
php artisan legacy:import-flask-data --source=../database/modern_farms.db
```

On an empty Laravel database, apply it with `--apply`. The importer preserves
record IDs and refuses to write if any destination business table already has
rows. Back up the Laravel database before importing. Users with Werkzeug scrypt
or PBKDF2 password hashes must reset their passwords in Laravel.

The local Laravel database has been imported in the development workspace.
Before production cutover, create a durable production database and configure
the following in the hosting provider's secret store (never commit `.env`):

- A unique `APP_KEY`, `APP_DEBUG=false`, HTTPS `APP_URL`, and `APP_TIMEZONE=UTC`
  to preserve Flask timestamps.
- Production `DB_*` connection values, `SESSION_SECURE_COOKIE=true`, and a
  production mail transport. Keep `SESSION_DRIVER` and `CACHE_STORE` on durable
  services if the host runs more than one app instance.
- `SANCTUM_EXPIRATION=10080` (seven days) for API bearer tokens, and a scheduler
  invoking `php artisan schedule:run` every minute so expired tokens are pruned.
- Persistent writable `storage` and `bootstrap/cache` directories, and a web
  server document root pointing only to Laravel's `public` directory.

Build and deploy from this directory (the exact PHP/Node versions should match
the hosting platform):

```sh
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
```

Take and reconcile a production backup before importing legacy records. The
importer refuses nonempty destination business tables; run it against a fresh
production schema only after reviewing its preview. The preview reports both
inventory arithmetic discrepancies and differences between recorded sales and
non-cancelled, non-rejected order lines. By default, `--apply` refuses while
these discrepancies remain. To preserve the source quantities after an operator
has reviewed and accepted them, pass `--allow-inventory-variance`. To reconcile
the imported stock while preserving current on-hand quantities, preview the
proposed values and apply with `--reconcile-inventory-from-orders`; this raises
posted stock when current on-hand stock exceeds it and reserves eligible order
lines. The reconciliation changes only Laravel's import and leaves the Flask
source untouched. The command refuses reconciliation if eligible order
quantities exceed available stock. Then verify `/api/health`,
password reset email delivery, and each customer, producer, and admin workflow
before switching traffic. Keep Flask available during that verification and
until imported users have reset their passwords. `GET /api/health` checks
database connectivity and required migrated tables for readiness.

The SMTP credential that was present in earlier environment templates must be
rotated. `.env.example` is now credential-free. Configure production mail before
enabling account recovery; in local development, Laravel's default `log`
mailer writes reset messages to the application log. In production, verify the
configured transport by completing an actual password reset before cutover.
