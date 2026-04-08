This folder contains route-level UI ("pages").

In this codebase, Vite still boots from `src/main.tsx`, but the route components are organized under `src/app/`
to keep a clear separation between:

- `src/app` – route-level UI
- `src/components` – reusable UI components
- `src/lib` – clients/helpers (Supabase, API helpers)
- `supabase/functions` – Supabase Edge Functions (AI chat handler)

