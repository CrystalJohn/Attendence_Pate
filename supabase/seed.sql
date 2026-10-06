-- NTC PATE demo seed. This creates content only; create an Auth user, profile,
-- and group_management row separately before testing Management screens.

do $$
declare
  group_id uuid := '11111111-1111-4111-8111-111111111111';
  session_id uuid := '22222222-2222-4222-8222-222222222222';
begin
  insert into public.groups (id, name, tagline, timezone, default_start_time, default_end_time, default_checkin_time)
  values (group_id, 'NTC PATE', 'Kết nối thật, lớn lên cùng nhau.', 'Asia/Ho_Chi_Minh', '19:00', '21:00', '19:15')
  on conflict (id) do update set name = excluded.name, tagline = excluded.tagline;

  insert into public.members (group_id, full_name, display_name, default_animal, companion_group, status, reminder_opt_in)
  select group_id, name, name,
    (array['panda','fox','penguin','rabbit','tiger','frog']::text[])[((idx - 1) % 6) + 1],
    (array['Nhóm Hạt giống','Nhóm Mầm xanh','Nhóm Cùng bước']::text[])[((idx - 1) % 3) + 1],
    'active', name not in ('Thảo', 'Yến')
  from unnest(array['An','Minh','Khoa','Vy','Phúc','Nguyên','Linh','Huyền','Tuấn','Mai','Thảo','Quân','Trâm','Duy','Trang','Khánh','Hà','Đức','Nhi','Long','Yến','Bình','Tâm','Hương','Sơn','My','Tín','Hiếu','Lam','Quỳnh']::text[]) with ordinality as values(name, idx)
  on conflict do nothing;

  insert into public.sessions (id, group_id, title, public_description, session_date, start_at, end_at, checkin_start_at, checkin_end_at, location, status, published_at)
  values (session_id, group_id, 'Tối thứ tư trong tổ', 'Kết nối thật, lớn lên cùng nhau.', '2026-09-17', '2026-09-17 19:00:00+07', '2026-09-17 21:00:00+07', '2026-09-17 18:30:00+07', '2026-09-17 20:30:00+07', 'Phòng sinh hoạt NTC PATE', 'live', now())
  on conflict (id) do update set status = excluded.status, published_at = excluded.published_at;

  insert into public.session_internal_plans (session_id, internal_plan, private_note)
  values (session_id, 'Đón nhau, mở lời, chia nhóm nhỏ, tổng kết.', 'Sau buổi nhóm, kiểm tra các lời hỏi thăm cần gửi.')
  on conflict (session_id) do nothing;

  insert into public.session_assignments (session_id, title, scheduled_at, public_note, sort_order)
  values
    (session_id, 'Đón nhau và check-in', '2026-09-17 19:00:00+07', 'Mọi người cùng đến và chọn một linh vật cho tối nay.', 1),
    (session_id, 'Một câu hỏi để mở lời', '2026-09-17 19:20:00+07', 'Một câu hỏi nhỏ, một câu trả lời thật.', 2),
    (session_id, 'Chia sẻ trong nhóm nhỏ', '2026-09-17 19:45:00+07', 'Lắng nghe nhau theo nhịp vừa đủ.', 3),
    (session_id, 'Tổng kết và cầu nguyện', '2026-09-17 20:30:00+07', 'Mang một điều lành về cùng nhau.', 4)
  on conflict do nothing;

  insert into public.activities (session_id, activity_type, title, prompt, visibility, is_published)
  values
    (session_id, 'poll', 'Tối nay bạn cần điều gì nhất?', 'Chọn điều đang đúng với bạn.', 'anonymous', true),
    (session_id, 'word_cloud', 'Một từ cho buổi tối nay', 'Một từ mô tả tâm trạng của bạn.', 'public', true),
    (session_id, 'open_ended', 'Điều làm bạn mỉm cười', 'Tuần này điều gì làm bạn mỉm cười?', 'group', true),
    (session_id, 'quiz', 'Đố vui để cùng nhớ', 'Điều gì giúp một buổi nhóm có ý nghĩa hơn?', 'public', true),
    (session_id, 'reaction_board', 'Gửi một chút điều lành', 'Chọn một phản hồi nhanh.', 'public', true);
end $$;

-- Attendance is intentionally left empty in the seed so the demo can exercise
-- duplicate and closed-session handling. Add rows through the Edge Function or
-- a Management session after authentication is configured.
