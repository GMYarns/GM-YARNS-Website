# GM YARNS Website

Mobile-friendly product catalogue and owner product manager. Built with Vite + React + Supabase.

## Current Supabase project
The existing owner app uses this project URL: `https://wrjnlpcfyhskawomicje.supabase.co`.
Set the publishable key in `.env` locally (never commit secrets):

```env
VITE_SUPABASE_URL=https://wrjnlpcfyhskawomicje.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_WHATSAPP_NUMBER=919489973418
```

The publishable/anon key is intended for browser use only when Supabase Row Level Security is correctly enabled. Never put a service-role key in this project.

## Existing database expectations
The existing Flutter owner app reads/writes `products` with: `id`, `name`, `yarn_type`, `yarn_count`, `price_per_kg`, `stock_kg`, `image_url`. It uploads photos to the `product-images` storage bucket. This site uses the same fields and adds `is_active` for Hide/Show.

Before publishing, add the `is_active` boolean column to `products` (default true), then verify RLS policies:
- Public visitors can SELECT active products only.
- Authenticated owner/admin can SELECT all products and INSERT/UPDATE/DELETE.
- Storage bucket `product-images` permits public reads of product images and authenticated owner uploads/deletes.
- Do not disable RLS or expose the service-role key.

Example schema change only (review against the existing schema before running):

```sql
alter table public.products
add column if not exists is_active boolean not null default true;
```

The existing Flutter app must also be updated to preserve the `is_active` field on edits and provide Hide/Show. Until that update is made, avoid editing existing products in the old app if it overwrites the entire row without `is_active`.

## Run locally

```bash
npm install
cp .env.example .env
# Fill in the Supabase values in .env
npm run dev
```

## Free hosting
Build with `npm run build`. Deploy the `dist` folder to a static hosting provider with free tier and configure the three environment variables there. Add the production site URL to Supabase Auth redirect URLs. Connect `gmyarns.in` only after deployment is tested; do not delete existing GoDaddy DNS records until the host provides exact DNS values.
