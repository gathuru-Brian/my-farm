# Modern Farms frontend migration

The active application UI is Svelte 5 with Inertia in `../laravel/resources/js`.
This directory contains the earlier static frontend and is retained as
reference material; Laravel does not serve it. Start the Laravel application
from the `laravel` directory:

```powershell
php artisan serve
```

To run the Vite development server alongside it, use a second terminal:

```powershell
Set-Location laravel
npm run dev
```

New frontend changes belong in Laravel's `resources/js` directory and are
compiled with `npm run build` from `laravel`. Do not use this folder's Vite
configuration for new work.
