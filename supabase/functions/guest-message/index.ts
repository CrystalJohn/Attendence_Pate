import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await request.json() as { guestToken?: string; content?: string; displayMode?: 'public' | 'anonymous' };
    const content = body.content?.trim() ?? '';
    if (content.length < 1 || content.length > 280 || !['public', 'anonymous'].includes(body.displayMode ?? '')) return json({ error: 'Tin nhắn chưa hợp lệ.' }, 400);
    const { data: guest } = await supabase.from('guest_sessions').select('id, session_id, member_id, expires_at, revoked_at').eq('token_hash', await sha256(body.guestToken?.trim() ?? '')).maybeSingle();
    if (!guest || guest.revoked_at || Date.parse(guest.expires_at) < Date.now()) return json({ error: 'Phiên khách đã hết hạn.' }, 401);
    const { data: session } = await supabase.from('sessions').select('id, status').eq('id', guest.session_id).single();
    if (!session || !['published', 'live'].includes(session.status)) return json({ error: 'Phòng chat hiện đã đóng.' }, 409);
    const { data: message, error } = await supabase.from('messages').insert({ session_id: session.id, member_id: body.displayMode === 'anonymous' ? null : guest.member_id, guest_session_id: guest.id, content, display_mode: body.displayMode, moderation_status: 'visible' }).select('id, content, display_mode, moderation_status, created_at').single();
    if (error) return json({ error: 'Không thể gửi tin nhắn lúc này.' }, 500);
    return json({ message });
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ.' }, 400);
  }
});
