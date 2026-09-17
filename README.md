# NEST

NEST là workspace prototype cho app điểm danh và kết nối nhóm sinh viên Tin Lành.

> Kết nối thật, lớn lên cùng nhau.

## Đã có trong bản này

- Dashboard phòng sinh hoạt với QR thật từ `qrcode.react`.
- Check-in route `/check-in/:token`, chọn tên, linh vật và tâm trạng.
- Chặn duplicate check-in trong cùng session ở state demo.
- Số liệu tự đổi theo số người đã check-in, ví dụ `6/30` và `24 chưa đến`.
- Khu rừng thành viên, hoạt động nhanh, chat công khai và ẩn danh.
- Leader/Admin moderation cơ bản và luồng hỏi thăm người vắng.
- Leader pages: `/leader/members`, `/leader/sessions`, `/leader/follow-ups`.
- Role switcher để kiểm tra nhanh quyền Member/Leader/Admin.
- Dark mode, responsive layout và reduced-motion fallback.
- `supabase/schema.sql` với enum, unique constraint `session_id + profile_id`, Realtime-ready tables và RLS policy.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://127.0.0.1:5173/room/today](http://127.0.0.1:5173/room/today).

Build production:

```bash
npm run build
npm run preview
```

## Supabase

1. Tạo project Supabase.
2. Copy `.env.example` thành `.env.local` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Chạy `supabase/schema.sql` trong SQL Editor hoặc qua Supabase CLI.
4. Cấu hình Auth bằng magic link hoặc Google OAuth.
5. Tạo seed profiles/group/session/attendance trong migration seed riêng. Không dùng service key trong browser.
6. Bật Realtime cho `attendance`, `activities`, `messages` và subscribe theo `session_id`.

Token QR phải là token ngẫu nhiên theo từng session. Chỉ lưu hash trong database, validate ở server/Edge Function, kiểm tra `status = 'open'` và thời hạn trước khi insert attendance.

## Kiến trúc ngắn gọn

- `src/App.tsx`: app shell, local demo state, route switching và các screen/component.
- `src/styles.css`: token CSS, responsive layout, dark mode, focus state, reduced motion.
- `supabase/schema.sql`: data model + helper functions + RLS.
- UI dùng localStorage để demo không cần credential. Khi nối Supabase, thay `usePersistedState` bằng data hooks và giữ nguyên contract của các component.

## Seed demo

State demo tạo một nhóm 30 người, session hôm nay lúc 19:15, 6 người đã đến, 2 tin nhắn mẫu và các hoạt động gần nhất. Trạng thái mới được lưu dưới key `nest-demo-state-v1` trong localStorage. Xóa key này để reset seed.

## Kiểm tra nhanh

- [x] `npm run build` pass.
- [x] QR render thật và mở route check-in.
- [x] Submit check-in mới hiển thị success.
- [x] Submit lại cùng member hiển thị duplicate.
- [x] Count chuyển từ 6/30 sang 7/30 và 23 chưa đến.
- [x] Chat public/anonymous append message vào state.
- [x] Leader moderation ẩn message khỏi phòng.
- [x] Member không thấy khu vực Hỏi thăm hoặc danh sách người vắng.
- [x] Dark mode đổi token surface/text.
- [x] `npm test` pass với duplicate check-in, session đóng/inactive và role authorization.
- [ ] Supabase Auth/Realtime/RLS live, email và Messenger/Zalo provider cần cấu hình project.
- [ ] Integration test với Supabase cần bổ sung khi data hooks/backend được nối thật.

## Deploy Vercel

Import repository vào Vercel, chọn framework Vite, build command `npm run build`, output directory `dist`, sau đó thêm biến môi trường từ `.env.local`. Nếu dùng Supabase, chỉ đưa URL và anon key vào client; mọi thao tác privileged dùng server route/Edge Function.
