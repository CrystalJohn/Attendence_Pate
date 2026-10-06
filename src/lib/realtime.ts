import { supabase } from './supabase';

export function subscribeToSession(sessionId: string, onChange: () => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel(`session:${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_responses', filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
