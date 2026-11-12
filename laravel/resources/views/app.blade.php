<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#174b32">
        <x-inertia::head />
        @vite('resources/js/app.js')
    </head>
    <body class="antialiased">
        <x-inertia::app />
    </body>
</html>
