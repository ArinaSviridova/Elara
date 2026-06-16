import { supabase } from './supabase'

export async function syncGroupMembers(groupId) {
  if (!groupId) return { ok:false, skipped:true }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok:false, error:'no_session' }
    const res = await fetch('/.netlify/functions/sync-group-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ groupId }),
    })
    if (!res.ok) return { ok:false, error:`http_${res.status}` }
    return await res.json().catch(() => ({ ok:true }))
  } catch (e) {
    console.warn('syncGroupMembers failed', e)
    return { ok:false, error:e?.message || 'failed' }
  }
}
