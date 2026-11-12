# Modern Farms Laravel + Inertia

Laravel is the dedicated backend and Svelte with Inertia is the application
UI. All application workflows belong in this Laravel app.
The admin dashboard includes producer approvals, marketplace controls, customer
records, and an order review queue.

## Requirements

- PHP 8.3 or later with SQLite support
- Composer
- Node.js 20.19+ or 22.12+ with npm
- Docker Desktop with Docker Compose (for the Docker workflow)

## Run locally

From this directory, install PHP dependencies, prepare the database, and start
the Laravel backend:

```powershell
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Install frontend dependencies with `npm install` once, then run `npm run dev`
in a second terminal during development. The Laravel app serves the Inertia
landing, login, registration, and role-specific dashboard routes.
Sanctum-protected JSON endpoints provide authentication, farms, products,
orders, messaging, and admin operations.

## Run with Docker

From this directory, prepare a local environment file, build the application
image, generate an application key, and apply the database migrations:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose build
if (-not (Select-String -Path .env -Pattern '^APP_KEY=.+')) {
    docker compose run --rm app php artisan key:generate
}
docker compose run --rm app php artisan migrate --force
docker compose up
```

Open `http://localhost:8000`. Docker Compose keeps the SQLite database and
Laravel storage in named volumes across container rebuilds. The image builds
the frontend assets and serves the Laravel `public` directory through Apache.
The Docker database starts empty. To use a different port, set `APP_PORT` in
`.env` before starting Compose.

New producer accounts remain pending until an administrator approves them. A
multi-farm customer basket creates one fulfillment order per farm, so each
producer updates only their own order; the API returns these in `orders` and
also includes the legacy singular `order` field when there is one farm. API
registration does not issue a bearer token to a producer until approval, and
account status is checked again on protected requests so suspension takes
effect for existing tokens and web sessions. API bearer tokens expire after
seven days by default; login and registration responses include
`token_expires_at`. To appoint the first administrator, promote an existing active
account from the server CLI with
`php artisan app:promote-admin user@example.com`. Verify the account holder's
identity before running the command; it prompts before changing the role. The
account holder should then set or reset their password through the configured
email flow.

For production, create a durable database and configure the following in the
hosting provider's secret store (never commit `.env`):

- A unique `APP_KEY`, `APP_DEBUG=false`, HTTPS `APP_URL`, and `APP_TIMEZONE=UTC`
  for the application.
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

Before deploying, back up the production database, apply migrations, and verify
`/api/health`, password reset email delivery, and each customer, producer, and
admin workflow. `GET /api/health` checks database connectivity and required
migrated tables for readiness. Accounts carried over from an earlier deployment
may need to reset their passwords before signing in.

The SMTP credential that was present in earlier environment templates must be
rotated. `.env.example` is now credential-free. Configure production mail before
enabling account recovery; in local development, Laravel's default `log`
mailer writes reset messages to the application log. In production, verify the
configured transport by completing an actual password reset before cutover.
