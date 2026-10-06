import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function isOpenWindow(session: { status: string; checkin_start_at: string; checkin_end_at: string | null }) {
  const now = Date.now();
  const start = Date.parse(session.checkin_start_at);
  const end = session.checkin_end_at ? Date.parse(session.checkin_end_at) : Number.POSITIVE_INFINITY;
  return ['published', 'live'].includes(session.status) && now >= start && now <= end;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json() as { token?: string; displayName?: string; animal?: string; mascotId?: string; mood?: string; deviceFingerprint?: string };
    const token = body.token?.trim() ?? '';
    const displayName = body.displayName?.trim().replace(/\s+/g, ' ') ?? '';
    const animal = body.animal?.trim() ?? '';
    const mascotId = body.mascotId?.trim();
    const allowedMascots = new Set(['pip', 'dew', 'spark', 'peb', 'breeze', 'bloom']);
    const validMascot = mascotId !== undefined && allowedMascots.has(mascotId);
    const mood = body.mood?.trim() ?? '';
    const allowedAnimals = new Set(['panda', 'fox', 'penguin', 'rabbit', 'tiger', 'frog']);
    if (token.length < 12 || token.length > 256 || displayName.length < 1 || displayName.length > 80 || (mascotId !== undefined && !validMascot) || (!validMascot && !allowedAnimals.has(animal)) || mood.length < 1 || mood.length > 80) {
      return json({ error: 'Thông tin check-in chưa hợp lệ.' }, 400);
    }

    const tokenHash = await sha256(token);
    const { data: accessToken, error: tokenError } = await supabase
      .from('session_access_tokens')
      .select('session_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (tokenError || !accessToken || accessToken.revoked_at || Date.parse(accessToken.expires_at) < Date.now()) return json({ error: 'Link check-in không còn hiệu lực.' }, 410);

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, group_id, status, checkin_start_at, checkin_end_at, end_at')
      .eq('id', accessToken.session_id)
      .single();
    if (sessionError || !session || !isOpenWindow(session)) return json({ error: 'Phiên check-in đã đóng.' }, 409);

    let { data: member } = await supabase.from('members').select('id, status, default_mascot_id').eq('group_id', session.group_id).eq('full_name', displayName).maybeSingle();
    if (!member) {
      const created = await supabase.from('members').insert({ group_id: session.group_id, full_name: displayName, display_name: displayName, status: 'pending', default_animal: allowedAnimals.has(animal) ? animal : 'panda', default_mascot_id: mascotId ?? null, reminder_opt_in: false }).select('id, status, default_mascot_id').single();
      if (created.error) {
        const retry = await supabase.from('members').select('id, status, default_mascot_id').eq('group_id', session.group_id).eq('full_name', displayName).maybeSingle();
        member = retry.data;
      } else member = created.data;
    }
    if (!member || member.status === 'inactive') return json({ error: 'Tên này hiện chưa thể check-in.' }, 403);

    // A companion is a profile choice. A later session may only reuse it, not replace it.
    if (!member.default_mascot_id && validMascot) {
      const saved = await supabase.from('members').update({ default_mascot_id: mascotId }).eq('id', member.id).is('default_mascot_id', null).select('default_mascot_id').maybeSingle();
      if (saved.error) return json({ error: 'Không thể lưu bạn đồng hành vào hồ sơ.' }, 500);
      if (saved.data?.default_mascot_id) member.default_mascot_id = saved.data.default_mascot_id;
      else {
        const refreshed = await supabase.from('members').select('default_mascot_id').eq('id', member.id).single();
        if (refreshed.error) return json({ error: 'Không thể đọc bạn đồng hành từ hồ sơ.' }, 500);
        if (refreshed.data?.default_mascot_id) member.default_mascot_id = refreshed.data.default_mascot_id;
      }
    }
    const savedMascotId = member.default_mascot_id ?? (validMascot ? mascotId : null);

    const { data: existing } = await supabase.from('attendance').select('checked_in_at, mascot_id').eq('session_id', session.id).eq('member_id', member.id).maybeSingle();
    if (existing) return json({ status: 'duplicate', checkedInAt: existing.checked_in_at, mascotId: existing.mascot_id ?? savedMascotId, sessionId: session.id });

    const { data: attendance, error: attendanceError } = await supabase.from('attendance').insert({ session_id: session.id, member_id: member.id, guest_display_name: displayName, animal: allowedAnimals.has(animal) ? animal : 'panda', mascot_id: savedMascotId, mood, checkin_method: 'guest_link', device_fingerprint_hash: body.deviceFingerprint ? await sha256(body.deviceFingerprint) : null }).select('checked_in_at').single();
    if (attendanceError?.code === '23505') {
      const duplicate = await supabase.from('attendance').select('checked_in_at, mascot_id').eq('session_id', session.id).eq('member_id', member.id).single();
      if (duplicate.data) return json({ status: 'duplicate', checkedInAt: duplicate.data.checked_in_at, mascotId: duplicate.data.mascot_id ?? savedMascotId, sessionId: session.id });
    }
    if (attendanceError) return json({ error: 'Không thể ghi nhận check-in lúc này.' }, 500);

    const guestToken = crypto.randomUUID();
    const { error: guestError } = await supabase.from('guest_sessions').insert({ session_id: session.id, member_id: member.id, token_hash: await sha256(guestToken), expires_at: session.end_at });
    if (guestError) return json({ error: 'Không thể tạo phiên khách.' }, 500);
    // Add rate limiting and bot protection at the Edge gateway before production launch.
    return json({ status: 'created', sessionId: session.id, guestToken, mascotId: savedMascotId, checkedInAt: attendance.checked_in_at }, 201);
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ.' }, 400);
  }
});
