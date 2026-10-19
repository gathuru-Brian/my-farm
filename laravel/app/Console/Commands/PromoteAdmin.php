<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdmin extends Command
{
    protected $signature = 'app:promote-admin {email : Email address of the existing active account} {--force : Skip the interactive confirmation}';

    protected $description = 'Promote an existing active account to the Modern Farms administrator role';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            $this->components->error('No account was found for that email address.');

            return self::FAILURE;
        }

        if ($user->status !== 'active') {
            $this->components->error('Only an active account can be promoted.');

            return self::FAILURE;
        }

        $this->components->info("Account: {$user->full_name} <{$user->email}> (current role: {$user->role})");

        if (! $this->option('force') && ! $this->confirm('Promote this account to administrator?')) {
            $this->components->warn('No changes were made.');

            return self::SUCCESS;
        }

        $user->role = 'admin';
        $user->save();

        $this->components->info('Account promoted to administrator.');

        return self::SUCCESS;
    }
}
