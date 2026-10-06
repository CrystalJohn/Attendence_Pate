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
    const body = await request.json() as { guestToken?: string };
    const guestToken = body.guestToken?.trim() ?? '';
    if (guestToken.length < 20) return json({ error: 'Phiên khách không hợp lệ.' }, 401);
    const { data: guest, error } = await supabase.from('guest_sessions').select('id, session_id, member_id, expires_at, revoked_at').eq('token_hash', await sha256(guestToken)).maybeSingle();
    if (error || !guest || guest.revoked_at || Date.parse(guest.expires_at) < Date.now()) return json({ error: 'Phiên khách đã hết hạn.' }, 401);
    const { data: session, error: sessionError } = await supabase.from('sessions').select('id, title, public_description, session_date, start_at, end_at, location, status').eq('id', guest.session_id).single();
    if (sessionError || !session || session.status === 'draft') return json({ error: 'Buổi nhóm chưa được công bố.' }, 404);
    const { data: assignments } = await supabase.from('session_assignments').select('id, title, scheduled_at, public_note, sort_order').eq('session_id', guest.session_id).order('sort_order');
    return json({ session, assignments: assignments ?? [], guestSessionId: guest.id });
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ.' }, 400);
  }
});
