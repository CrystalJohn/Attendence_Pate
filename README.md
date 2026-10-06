# NEST · NTC PATE

NEST là không gian quản lý và tương tác nội bộ cho nhóm sinh viên `NTC PATE`.

> Kết nối thật, lớn lên cùng nhau.

## Trạng thái hiện tại

Đây là bản nâng cấp của codebase Vite hiện có. UI chạy ngay bằng local demo state để có thể review flow khi chưa có Supabase credentials. Lớp Supabase, RLS và Edge Functions đã được dựng theo contract bảo mật, nhưng chưa được xem là production-ready cho đến khi project Supabase thật được migrate, cấu hình Auth, bật Realtime và chạy integration tests.

Các surface chính:

- `/room/today`: dashboard phòng, QR check-in, khu rừng hiện diện, chat và pulse.
- `/check-in/:token`: guest check-in với tìm kiếm tên, nhập tên mới ở trạng thái pending, duplicate và closed-session states.
- `/session/:sessionId`: trang buổi nhóm công khai. Draft hiển thị đúng empty state và không lộ nội dung nội bộ.
- `/room/activities`: Word Cloud, Poll, Open-ended, Quiz và Reaction Board.
- `/present/:sessionId`: màn hình trình chiếu lớn cho TV hoặc projector, chỉ hiển thị dữ liệu công khai.
- `/management/members`, `/management/sessions`, `/management/follow-ups`: khu vực Management; Guest bị chặn ở UI và phải tiếp tục được bảo vệ bởi RLS.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://127.0.0.1:5173/room/today](http://127.0.0.1:5173/room/today).

```bash
npm run lint
npm test
npm run build
npm run preview
```

Role switcher trên topbar chỉ là công cụ review local. Nó không thay thế Supabase Auth.

## Cấu hình Supabase

1. Tạo project Supabase và copy `.env.example` thành `.env.local`.
2. Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`. Alias `VITE_SUPABASE_ANON_KEY` vẫn được đọc để hỗ trợ project cũ.
3. Chạy migration `supabase/migrations/20260917000000_ntc_pate.sql` bằng Supabase CLI, hoặc chạy `supabase/schema.sql` trong SQL Editor, sau đó chạy `supabase/seed.sql`.
4. Tạo Auth user cho Ban điều hành, tạo row `profiles`, rồi thêm row tương ứng vào `group_management`.
5. Deploy bốn Edge Functions trong `supabase/functions/` (`guest-checkin`, `guest-session`, `guest-activity`, `guest-message`) và đặt `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ở server-side secrets. Không đưa service role key vào Vite client.
6. Bật Realtime cho các bảng an toàn: `sessions`, `attendance`, `activities`, `messages`, `reactions`. Client helper nằm ở `src/lib/realtime.ts`.

### Vì sao nội dung nội bộ được tách bảng

RLS bảo vệ theo row, không ẩn được một cột riêng trong một row đã cấp quyền đọc. Vì vậy `sessions` chỉ chứa public fields; kế hoạch nội bộ ở `session_internal_plans`, ghi chú assignment ở `session_assignment_internal`, còn dữ liệu vắng, contact info và follow-up chỉ nằm trong các bảng Management-only. Guest đọc và ghi qua Edge Function gateway có token ngắn hạn.

### Các nguyên tắc dữ liệu

- Chỉ dùng hai quyền nghiệp vụ: `MANAGEMENT` và `GUEST`.
- Session có lifecycle `draft`, `published`, `live`, `closed`.
- QR/access token chỉ lưu hash trong database.
- `attendance` có unique constraint theo `(session_id, member_id)` để duplicate check-in là trạng thái có chủ đích.
- Tên tự nhập tạo `members.status = 'pending'`, không tự động trở thành Management.
- Guest không được đọc contact info, private note, attendance absence list, follow-up hay moderation log.

## Cấu trúc chính

- `src/App.tsx`: shell, router, UI states và local fallback.
- `src/domain/checkinRules.ts`: quyết định check-in và role privacy.
- `src/domain/checkinSchema.ts`: schema validation bằng Zod.
- `src/lib/supabase.ts`: client boundary với session persistence và auto refresh.
- `src/lib/realtime.ts`: subscription helper theo session.
- `src/styles.css`: token CSS, light/dark, responsive và reduced-motion.
- `supabase/schema.sql`: schema, internal/public split, helper functions và RLS.
- `supabase/migrations/20260917000000_ntc_pate.sql`: migration canonical cho Supabase CLI.
- `supabase/seed.sql`: NTC PATE demo data, không chứa mật khẩu hoặc secret.
- `supabase/functions/guest-checkin`: validate token, session window, pending member và idempotent attendance.
- `supabase/functions/guest-session`: trả public session và public assignments theo guest token.
- `supabase/functions/guest-activity`: trả activity definitions/options an toàn theo guest token, không trả responses thô.
- `supabase/functions/guest-message`: gửi chat công khai hoặc ẩn danh theo guest session, với moderation status mặc định visible.
- `vercel.json`: rewrite để deep link của Vite SPA hoạt động trên Vercel.

## Deploy Vercel

Import project vào Vercel, chọn Vite, build command `npm run build`, output directory `dist`, rồi thêm các biến môi trường public từ `.env.local`. Deep links được rewrite về `index.html` bằng `vercel.json`.

## Checklist bàn giao

- [x] React Router deep links và Vercel SPA rewrite.
- [x] Guest/Management surfaces, management guard và public/private UI separation.
- [x] Searchable guest check-in, pending member flow, duplicate và closed states.
- [x] Activity hub và presentation route với public-only data.
- [x] Supabase schema/RLS split, client boundary, Realtime helper và Edge Function contracts.
- [x] Local fallback được ghi rõ, không giả vờ là backend live.
- [ ] Supabase project thật, Auth provider, Realtime publication và production rate limiting.
- [ ] Integration/E2E tests chạy với project Supabase staging.
