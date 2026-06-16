// Страница ответа на запрос партнёрства в подготовке к беременности
import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { createNotification } from '../lib/useNotifications'

export default function PregnancyPartnerResponsePage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const pathRequestId = location.pathname.split('/').filter(Boolean)[1]
  const requestId = params.get('request') || pathRequestId || ''

  const [request, setRequest] = useState(null)
  const [fromUser, setFromUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answering, setAnswering] = useState(false)
  const [done, setDone] = useState(null) // 'accepted' | 'declined'

  useEffect(() => {
    if (!user?.id) return
    if (!requestId || requestId === 'undefined' || requestId === 'null') {
      setLoading(false)
      return
    }
    async function load() {
      const { data: req } = await supabase
        .from('pregnancy_partner_requests')
        .select('*, from_user:from_user_id(id, name, avatar_color)')
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .single()
      if (req) {
        setRequest(req)
        setFromUser(req.from_user)
      }
      setLoading(false)
    }
    load()
  }, [requestId, user?.id])

  async function answer(accept) {
    if (!request) return
    setAnswering(true)
    const status = accept ? 'accepted' : 'declined'

    // Обновляем запрос
    await supabase.from('pregnancy_partner_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id)

    if (accept) {
      // Обновляем pregnancy_planning_profiles отправителя - теперь linked_pregnancy_partner_id
      await supabase.from('pregnancy_planning_profiles').upsert({
        user_id: request.from_user_id,
        linked_pregnancy_partner_id: user.id,
        partner_status: 'accepted',
      }, { onConflict: 'user_id' })
    }

    // Уведомление отправителю
    const { data: me } = await supabase.from('profiles').select('name').eq('id', user.id).single()
    await createNotification(request.from_user_id, {
      type: 'pregnancy_task',
      title: accept
        ? `${me?.name || 'Партнёр'} принял(а) приглашение к подготовке 🌱`
        : `${me?.name || 'Партнёр'} отклонил(а) приглашение к подготовке`,
      body: accept
        ? rl('Вы теперь вместе готовитесь к беременности!', 'You are now planning pregnancy together!')
        : rl('Вы всегда можете отправить новое приглашение позже.', 'You can always send a new invitation later.'),
      emoji: accept ? '🌱' : '💙',
      sourceType: 'pregnancy',
      actionUrl: '/pregnancy',
      priority: accept ? 'high' : 'normal',
    })

    setDone(status)
    setAnswering(false)
  }

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>⟳</div>
  )

  if (!request) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:12 }}>
      <div style={{ fontSize:32 }}>🔍</div>
      <div style={{ color:'var(--text2)', textAlign:'center' }}>{rl('Запрос не найден или уже обработан','Request not found or already handled')}</div>
      <button onClick={() => navigate('/pregnancy')} className="btn btn-primary" style={{ width:'auto', padding:'10px 24px' }}>
        {rl('К беременности','To pregnancy')}
      </button>
    </div>
  )

  if (done) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
      <div style={{ fontSize:48 }}>{done === 'accepted' ? '🌱' : '💙'}</div>
      <div style={{ fontSize:18, fontWeight:500, textAlign:'center', color:'var(--text)' }}>
        {done === 'accepted'
          ? rl('Приглашение принято!', 'Invitation accepted!')
          : rl('Приглашение отклонено', 'Invitation declined')}
      </div>
      <p style={{ color:'var(--text2)', textAlign:'center', lineHeight:1.6, margin:0 }}>
        {done === 'accepted'
          ? rl(`${fromUser?.name} получит уведомление. Вы теперь готовитесь вместе.`,
               `${fromUser?.name} will be notified. You are planning together now.`)
          : rl(`${fromUser?.name} получит уведомление. Приглашение можно отправить снова позже.`,
               `${fromUser?.name} will be notified.`)}
      </p>
      <button onClick={() => navigate('/pregnancy')} className="btn btn-primary" style={{ width:'auto', padding:'12px 28px' }}>
        {rl('Открыть раздел беременности','Open pregnancy section')} →
      </button>
    </div>
  )

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'32px 20px', gap:20, maxWidth:440, margin:'0 auto', alignItems:'center', justifyContent:'center' }}>
      {/* Аватар отправителя */}
      <div style={{ width:72, height:72, borderRadius:'50%', background:fromUser?.avatar_color||'var(--accent)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, color:'#fff' }}>
        {fromUser?.name?.[0]?.toUpperCase() || '?'}
      </div>

      <div style={{ textAlign:'center' }}>
        <h2 style={{ fontSize:20, margin:'0 0 8px' }}>
          🌱 {rl('Приглашение к совместной подготовке','Pregnancy planning invitation')}
        </h2>
        <p style={{ color:'var(--text2)', lineHeight:1.6, margin:0 }}>
          <strong>{fromUser?.name}</strong> {rl('приглашает вас вместе готовиться к беременности в Elara.',
            'invites you to plan pregnancy together in Elara.')}
        </p>
      </div>

      <div style={{ padding:'14px 16px', background:'rgba(167,139,250,0.08)', borderRadius:12, fontSize:12, color:'var(--text2)', lineHeight:1.6, width:'100%' }}>
        {rl('Это означает: вы сможете видеть совместные задачи, рекомендации и прогресс подготовки. Ваши личные данные остаются приватными — только то, что вы открыли.',
           'This means: you will see shared tasks, tips and preparation progress. Your personal data stays private.')}
      </div>

      <div style={{ display:'flex', gap:10, width:'100%' }}>
        <button onClick={() => answer(true)} disabled={answering} className="btn btn-primary" style={{ flex:1, padding:'13px' }}>
          {answering ? '⟳' : `✓ ${rl('Принять','Accept')}`}
        </button>
        <button onClick={() => answer(false)} disabled={answering} className="btn btn-ghost" style={{ flex:1, padding:'13px' }}>
          {rl('Отклонить','Decline')}
        </button>
      </div>
    </div>
  )
}
