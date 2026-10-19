<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

#[Signature('app:deployment-readiness-check')]
#[Description('Check production configuration and application readiness without displaying secrets')]
class DeploymentReadinessCheck extends Command
{
    public function handle(): int
    {
        $checks = [
            ['Production environment', config('app.env') === 'production', 'APP_ENV must be production.'],
            ['Debug mode disabled', config('app.debug') === false, 'APP_DEBUG must be false.'],
            ['Application encryption key valid', $this->hasValidEncryptionKey(), 'APP_KEY must match the configured cipher and key length.'],
            ['HTTPS application URL', $this->hasHttpsApplicationUrl(), 'APP_URL must use HTTPS and include a host.'],
            ['UTC timezone', config('app.timezone') === 'UTC', 'APP_TIMEZONE must be UTC for imported timestamps.'],
            ['Production database', config('database.default') !== 'sqlite', 'Use the provisioned production database connection.'],
            [
                'Production mail transport', $this->hasProductionMailConfiguration(),
                'Configure a real mail transport without log or array fallbacks and a valid sender address.',
            ],
            ['Secure session cookies', config('session.secure') === true, 'SESSION_SECURE_COOKIE must be true.'],
            ['Persistent session storage', ! in_array(config('session.driver'), ['array', 'cookie'], true), 'Use a persistent session driver.'],
            ['Persistent cache store', config('cache.default') !== 'array', 'Use a persistent cache store.'],
            ['API token expiry configured', (int) config('sanctum.expiration', 0) > 0, 'SANCTUM_EXPIRATION must be a positive number of minutes.'],
            [
                'Expired-token pruning scheduled', $this->hasTokenPruningSchedule(),
                'Schedule sanctum:prune-expired daily and invoke schedule:run every minute on the host.',
            ],
            ['Writable runtime directories', is_writable(storage_path()) && is_writable(base_path('bootstrap/cache')), 'storage and bootstrap/cache must be writable.'],
        ];

        try {
            DB::connection()->getPdo();
            $databaseConnected = true;
        } catch (\Throwable) {
            $databaseConnected = false;
        }

        $checks[] = ['Database connection', $databaseConnected, 'Laravel must be able to connect to the configured database.'];

        $requiredTables = [
            'users', 'farms', 'products', 'orders', 'order_items', 'conversations',
            'direct_messages', 'personal_access_tokens', 'password_reset_tokens',
        ];
        $missingTables = $databaseConnected
            ? collect($requiredTables)->reject(fn (string $table): bool => Schema::hasTable($table))->all()
            : $requiredTables;
        $checks[] = [
            'Application tables', $missingTables === [],
            $missingTables === [] ? 'All required tables are present.' : 'Unavailable or missing: '.implode(', ', $missingTables),
        ];

        $migrationFiles = collect(glob(database_path('migrations/*.php')) ?: [])
            ->map(fn (string $path): string => pathinfo($path, PATHINFO_FILENAME));
        $appliedMigrations = $databaseConnected && Schema::hasTable('migrations')
            ? DB::table('migrations')->pluck('migration')->all()
            : [];
        $pendingMigrations = $migrationFiles->diff($appliedMigrations)->values();
        $checks[] = [
            'Database migrations', $pendingMigrations->isEmpty(),
            $pendingMigrations->isEmpty() ? 'All migration files have been applied.' : 'Pending: '.$pendingMigrations->implode(', '),
        ];

        $this->table(
            ['Check', 'Status', 'Details'],
            collect($checks)->map(fn (array $check): array => [$check[0], $check[1] ? 'PASS' : 'FAIL', $check[2]])->all(),
        );

        $failedChecks = collect($checks)->filter(fn (array $check): bool => ! $check[1])->count();

        if ($failedChecks > 0) {
            $this->components->error("Deployment readiness failed: {$failedChecks} check(s) need attention.");

            return self::FAILURE;
        }

        $this->components->info('Deployment readiness checks passed.');

        return self::SUCCESS;
    }

    private function hasHttpsApplicationUrl(): bool
    {
        $url = parse_url((string) config('app.url'));

        return ($url['scheme'] ?? null) === 'https' && filled($url['host'] ?? null);
    }

    private function hasValidEncryptionKey(): bool
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7), true);
        }

        return is_string($key) && Encrypter::supported($key, (string) config('app.cipher'));
    }

    private function hasProductionMailConfiguration(): bool
    {
        $fromAddress = (string) config('mail.from.address');

        return $this->mailerHasDeliverableTransport((string) config('mail.default'))
            && filter_var($fromAddress, FILTER_VALIDATE_EMAIL) !== false
            && ! str_ends_with(strtolower($fromAddress), '@example.com');
    }

    private function hasTokenPruningSchedule(): bool
    {
        return collect(app(Schedule::class)->events())->contains(
            fn ($event): bool => str_contains((string) $event->command, 'sanctum:prune-expired --hours=24'),
        );
    }

    private function mailerHasDeliverableTransport(string $mailer, array $visited = []): bool
    {
        if (in_array($mailer, $visited, true) || in_array($mailer, ['log', 'array'], true)) {
            return false;
        }

        $mailerConfig = config("mail.mailers.{$mailer}");

        if (! is_array($mailerConfig)) {
            return false;
        }

        $transport = $mailerConfig['transport'] ?? null;

        if (! is_string($transport) || in_array($transport, ['log', 'array'], true)) {
            return false;
        }

        if (in_array($transport, ['failover', 'roundrobin'], true)) {
            $fallbackMailers = $mailerConfig['mailers'] ?? [];

            return $fallbackMailers !== []
                && collect($fallbackMailers)->every(
                    fn (string $fallback): bool => $this->mailerHasDeliverableTransport(
                        $fallback,
                        [...$visited, $mailer],
                    ),
                );
        }

        return true;
    }
}
