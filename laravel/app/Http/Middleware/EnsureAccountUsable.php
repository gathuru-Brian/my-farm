<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountUsable
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $isPendingProducer = $user?->role === 'producer' && $user->status === 'pending';
        $isPendingDashboardRead = $request->routeIs('dashboard') && $request->isMethod('GET');

        if ($user && $user->status !== 'active' && ! ($isPendingProducer && $isPendingDashboardRead)) {
            abort(403, 'This account is not available.');
        }

        return $next($request);
    }
}
