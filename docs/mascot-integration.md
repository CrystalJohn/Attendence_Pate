# Mascot integration

Source: Figma Make `Wq0Bb48fPraK03FQMNgwVX`, downloaded on 2026-10-06.
Original character geometry and five poses are preserved in `src/domain/mascots.tsx`
and `src/components/Mascot.tsx`. Leaf and glow resource IDs are isolated per instance.
No Tailwind or Rive dependency is needed.

`mascotId` is optional for legacy demo records; missing or invalid values display
their existing animal emoji. The `companion` field still means a small group.
The local storage format is additive: no reset or invented animal-to-mascot mapping.
SVG state is presentation only. All avatars default to still rendering.

The picker stages a draft and confirms explicitly. The check-in handler validates
the six IDs and saves a first choice on the member profile. Returning members see
their saved companion locked in the attendance flow; each attendance row stores a
snapshot so Room Today can render the same character that checked in.

Attendance in the local demo is stored as `(sessionId, memberId)` records. Each
session has its own QR token, opening a new session closes the old one and resets
only the current-presence view, and the old attendance rows remain as history.
Room Today counts and lists only rows for the current session. The existing dev
`/api/sync` polling carries arrivals to Room Today screens and triggers a short
mascot spotlight. The device-local check-in name remains convenience context,
not authenticated identity.

## Backend boundary

The current app still uses its existing local demo state and dev-only `/api/sync`.
The management and Room Today UI are not yet wired to production Supabase reads or
writes. Migration `20261006000000_mascot_choices.sql` adds nullable member defaults
and attendance snapshots; the base attendance table already has the unique
`(session_id, member_id)` constraint. Run the migration and deploy the updated
guest-checkin function before using that backend path. Neither action has been
performed by this change.

The Edge contract accepts `mascotId` from the six-ID allowlist or a legacy animal;
invalid explicit mascot IDs fail validation. The updated function saves the first
valid choice to `members.default_mascot_id`, uses that saved value for future
attendance snapshots, and returns the stored snapshot on duplicate check-in.
Production still needs the existing UI connected to Edge functions, guest token
restoration, and safe public attendance data for the TV.

## Verification

`npm test` exercises every character/state and repeated SVG instances, checks
resource isolation and validation, alongside existing acceptance tests.
Use `npm run lint` and `npm run build` before delivery.

The square wrapper preserves the original 200×228 art without distortion. This
does not certify the proposed 1024 master / 92% baseline export specification.
Raster export and measured high-density display optimization remain separate work.
