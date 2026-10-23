<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    /**
     * Show the public contact page.
     * Renders resources/js/pages/Contact.svelte
     */
    public function show(): Response
    {
        return Inertia::render('Contact');
    }

    /**
     * Validate and handle a contact form submission.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'topic' => ['required', 'string', 'max:80'],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        // For now, messages are written to storage/logs/laravel.log.
        // To receive them by email, set your MAIL_* values in .env and replace
        // the line below with: Mail::to('you@example.com')->send(new ContactMessage($data));
        Log::info('Contact message received', $data);

        return back();
    }
}