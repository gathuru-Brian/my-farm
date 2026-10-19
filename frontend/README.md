# Modern Farms frontend migration

The active application UI is Svelte 5 with Inertia in `../laravel/resources/js`.
Build and serve it through the Laravel app; this directory contains the earlier
Flask/Vite frontend and is retained only as migration reference material.

From the repository root, start Laravel for local development with:

```powershell
python run.py
```

This requires PHP 8.3 or later and a configured `laravel/.env`. To run the
Laravel Vite development server alongside it, use a second terminal:

```powershell
Set-Location laravel
npm run dev
```

New frontend changes belong in Laravel's `resources/js` directory and are
compiled with `npm run build` from `laravel`. Do not use this folder's Vite
configuration for new work. The Flask application remains available only as a
temporary fallback via `python backend/run.py`.
