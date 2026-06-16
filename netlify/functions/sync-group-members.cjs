const { createClient } = require('@supabase/supabase-js')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fdquuhnkwhmohweiudlx.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }) }
  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}
  const groupId = body.groupId || body.group_id
  if (!groupId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'groupId is required' }) }
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth:{ persistSession:false, autoRefreshToken:false } })
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  const actorId = authData?.user?.id
  if (authError || !actorId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid auth token' }) }

  const { data: group, error: groupError } = await supabase.from('groups').select('id, owner_id, name').eq('id', groupId).maybeSingle()
  if (groupError || !group) return { statusCode: 404, headers, body: JSON.stringify({ error: groupError?.message || 'Group not found' }) }

  const { data: members } = await supabase.from('group_members').select('user_id, relation_type, member_color').eq('group_id', groupId)
  const userIds = Array.from(new Set([group.owner_id, ...(members || []).map(m => m.user_id)].filter(Boolean)))
  if (!userIds.includes(actorId)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not a group member' }) }

  const friendships = []
  const permissions = []
  for (const ownerId of userIds) {
    for (const viewerId of userIds) {
      if (!ownerId || !viewerId || ownerId === viewerId) continue
      friendships.push({ owner_id: ownerId, friend_id: viewerId, relation_type: ownerId === group.owner_id || viewerId === group.owner_id ? 'friend' : 'friend', friend_color: '#a78bfa', is_visible: true })
      permissions.push({
        owner_id: ownerId,
        viewer_id: viewerId,
        can_view_status: true,
        can_view_availability: true,
        can_view_calendar: true,
        can_view_mood: true,
        can_view_sport: true,
        can_view_cycle_summary: true,
        can_view_period_days: false,
        can_view_notes: false,
        can_view_medications: false,
        can_view_pregnancy: false,
        can_receive_cycle_notifs: true,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (friendships.length) await supabase.from('friendships').upsert(friendships, { onConflict: 'owner_id,friend_id' })
  if (permissions.length) await supabase.from('sharing_permissions').upsert(permissions, { onConflict: 'owner_id,viewer_id' })

  return { statusCode: 200, headers, body: JSON.stringify({ ok:true, groupId, users:userIds.length, links:friendships.length }) }
}
