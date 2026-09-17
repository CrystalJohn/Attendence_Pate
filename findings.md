# NEST findings

## Initial discovery
- `D:\Attendence_Pate` was empty at task start.
- Node.js v20.20.2, npm 10.8.2, and git 2.54.0 are available.
- Python is not installed, so the ui-ux-pro-max search script cannot run.
- The brief explicitly requests Vietnamese UI, desktop room dashboard, mobile 390px support, dark mode, realtime behavior, role-aware access, QR, and gentle community microcopy.

## Decisions
- Use Vite + React + TypeScript for an immediately runnable local prototype because no existing framework exists in the workspace.
- Use `@phosphor-icons/react` for structural icons and `qrcode.react` for a real scannable QR render.
- Implement localStorage-backed demo state so interactions feel real without pretending Supabase is configured.
- Keep Supabase SQL schema and RLS guidance in `supabase/schema.sql`; README will clearly label integration boundaries.

