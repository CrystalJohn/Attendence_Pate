# NEST build plan

## Goal
Build a polished, responsive Vietnamese NEST attendance/community app prototype that demonstrates the room dashboard, realtime-like check-in and chat interactions, leader follow-up, and role-aware navigation. Keep the code ready for Supabase integration and document the production data model.

## Phases

### Phase 1: Foundation and design system
Status: complete
- [x] Scaffold Vite React TypeScript app
- [x] Define tokens, typography, layout shell, icon family, and responsive rules
- [x] Add seed data and local app state

### Phase 2: Room dashboard and interaction states
Status: complete
- [x] Build room overview, QR panel, member forest, attendance stats, chat, quick activities
- [x] Add functional check-in simulation, copy link, fullscreen QR, activity and chat submit
- [x] Cover loading, empty, closed, disconnected, and duplicate-check-in states

### Phase 3: Leader surfaces
Status: complete
- [x] Build leader dashboard, follow-up modal, member management, sessions view
- [x] Add role-aware nav and private absence data behavior

### Phase 4: Verification and handoff
Status: complete
- [x] Run typecheck/build
- [x] Inspect responsive layout at desktop and compact/mobile layout
- [x] Add README, schema, seed notes, and test checklist
- [x] Log known mocked integrations and next steps

## Design read
Daily community app for Gen Z Christian students. Warm off-white canvas, ink text, soft purple brand accent, lime action accent, border-led surfaces, asymmetric desktop workspace, single-column mobile collapse, playful mascots used sparingly and motion gated by reduced-motion.

## Errors encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| Python executable unavailable | 1 | Used brief-driven fallback for UI/UX system generation; no code dependency required. |
| git status failed because workspace has no .git directory | 1 | Treated the workspace as a standalone app; recorded files and verification in README instead. |
