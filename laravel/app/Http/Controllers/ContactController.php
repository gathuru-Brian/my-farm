<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

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

        $contactMessage = ContactMessage::create($data);

        $recipient = (string) config('services.contact.address');
        if (filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            try {
                Mail::raw(
                    "From: {$data['name']} <{$data['email']}>\nPhone: ".($data['phone'] ?? 'Not provided').
                    "\nTopic: {$data['topic']}\n\n{$data['message']}",
                    fn ($message) => $message
                        ->to($recipient)
                        ->replyTo($data['email'], $data['name'])
                        ->subject('[Modern Farms Contact] '.$data['topic']),
                );
                $contactMessage->update(['email_status' => 'sent']);
            } catch (TransportExceptionInterface $exception) {
                report($exception);
                $contactMessage->update([
                    'email_status' => 'failed',
                    'email_error' => 'Contact notification delivery failed.',
                ]);
            }
        } else {
            $contactMessage->update(['email_status' => 'not_configured']);
        }

        return back()->with('status', 'Your message was received. Our team will reply by email within one working day.');
    }
}
