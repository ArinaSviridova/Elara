import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { translations } from '../i18n/translations'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(null) // null = главное меню
  const [stats, setStats] = useState(null)
  const [promos, setPromos] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [admins, setAdmins] = useState([])
  const [adminQuery, setAdminQuery] = useState('')
  const [adminSearchResult, setAdminSearchResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Промокод
  const [newCode, setNewCode] = useState('')
  const [newType, setNewType] = useState('free_plus')
  const [discountPercent, setDiscountPercent] = useState(50)
  const [newUses, setNewUses] = useState(1)
  const [newExpiry, setNewExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState('')

  // Языки
  const ALL_LANGS = [
    { code:'ru', label:'Русский 🇷🇺', native:true },
    { code:'be', label:'Беларуская 🇧🇾' }, { code:'en', label:'English 🇬🇧' },
    { code:'uk', label:'Українська 🇺🇦' }, { code:'pl', label:'Polski 🇵🇱' },
    { code:'de', label:'Deutsch 🇩🇪' }, { code:'fr', label:'Français 🇫🇷' },
    { code:'tr', label:'Türkçe 🇹🇷' }, { code:'es', label:'Español 🇪🇸' },
    { code:'kz', label:'Қазақша 🇰🇿' }, { code:'ar', label:'العربية 🇸🇦' },
  ]
  const [enabledLangs, setEnabledLangs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('elara_enabled_langs') || '["ru","be","en"]') } catch { return ['ru','be','en'] }
  })
  const [translating, setTranslating] = useState('')

  // Проверка прав
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => { checkAdmin() }, [user])

  async function checkAdmin() {
    if (!user) return
    const { data } = await supabase.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    setIsAdmin(!!data)
    if (data) { loadStats(); loadPromos(); loadAdmins() }
  }

  async function loadStats() {
    const [{ count: total }, { count: plus }, { count: family }, { count: trial }, { data: recent }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','plus'),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','family'),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','trial'),
      supabase.from('profiles').select('id,name,created_at,language').order('created_at',{ascending:false}).limit(10),
    ])
    setStats({ total, plus, family, trial, recent: recent || [] })
  }

  async function loadPromos() {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at',{ascending:false}).limit(100)
    setPromos(data || [])
  }

  async function loadAdmins() {
    const { data } = await supabase.from('app_admins').select('*, profile:user_id(name)').order('created_at')
    setAdmins(data || [])
  }

  async function banUser(userId) {
    if (!confirm('Заблокировать пользователя?')) return
    const { error } = await supabase.from('profiles').update({ banned: true }).eq('id', userId)
    if (error) { alert('❌ ' + error.message); return }
    alert('✓ Пользователь заблокирован')
    searchUser()
  }

  async function resetUserPassword(email) {
    if (!email || email === 'email не указан') {
      alert('Email пользователя не найден в профиле')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth?mode=reset',
    })
    if (error) { alert('❌ ' + error.message); return }
    alert('✓ Письмо для сброса пароля отправлено на ' + email)
  }

  async function searchUser() {
    const { data } = await supabase.from('profiles')
      .select('*, subscription:subscriptions(*)').or(`name.ilike.%${searchQuery}%`).limit(10)
    setSearchResult(data || [])
  }

  async function searchAdminUser() {
    const { data } = await supabase.from('profiles')
      .select('id, name').or(`name.ilike.%${adminQuery}%`).limit(5)
    setAdminSearchResult(data || [])
  }

  async function addAdmin(userId, name) {
    await supabase.from('app_admins').insert({ user_id: userId, added_by: user.id })
    setAdminSearchResult(null); setAdminQuery('')
    loadAdmins()
    alert(`✓ ${name} добавлен как администратор`)
  }

  async function removeAdmin(userId) {
    if (userId === user.id) { alert('Нельзя удалить себя'); return }
    await supabase.from('app_admins').delete().eq('user_id', userId)
    loadAdmins()
  }

  async function grantSubscription(userId, plan) {
    const { error } = await supabase.from('subscriptions')
      .upsert({ user_id: userId, plan, plan_ends_at: null }, { onConflict:'user_id' })
    if (error) {
      alert('❌ Ошибка: ' + error.message + '\nКод: ' + error.code + '\n\nВероятно RLS блокирует. Запусти admin_rls.sql в Supabase.')
      return
    }
    alert(`✓ Подписка ${plan} выдана`)
    searchUser()
  }

  async function revokeSubscription(userId) {
    const { error } = await supabase.from('subscriptions')
      .update({ plan:'free' }).eq('user_id', userId)
    if (error) {
      alert('❌ Ошибка: ' + error.message)
      return
    }
    alert('✓ Подписка отозвана')
    searchUser()
  }

  async function generatePromo(e) {
    e.preventDefault(); setCreating(true)
    const prefix = newType.includes('plus')?'PLUS':newType.includes('family')?'FAM':'TRIAL'
    const code = newCode.trim().toUpperCase() || `ELARA-${prefix}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
    const finalType = newType.startsWith('discount_custom')
      ? `discount_${discountPercent}_${newType.includes('plus')?'plus':'family'}` : newType
    const { error } = await supabase.from('promo_codes').insert({
      code, type: finalType, created_by: user.id,
      max_uses: parseInt(newUses), expires_at: newExpiry || null,
    })
    if (!error) { setCreated(code); setNewCode(''); loadPromos() }
    setCreating(false)
  }

  async function deletePromo(id) {
    await supabase.from('promo_codes').delete().eq('id', id); loadPromos()
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).catch(() => {
      const el = document.createElement('input'); el.value = code
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    })
    alert(`Скопировано: ${code}`)
  }

  function toggleLang(code) {
    const updated = enabledLangs.includes(code) ? enabledLangs.filter(l=>l!==code) : [...enabledLangs, code]
    setEnabledLangs(updated)
    localStorage.setItem('elara_enabled_langs', JSON.stringify(updated))
  }

  async function generateTranslation(langCode) {
    setTranslating(langCode)
    try {
      const flat = {}
      function walk(obj, prefix='') {
        for (const [k,v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k
          if (typeof v === 'string') flat[key] = v
          else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, key)
        }
      }
      walk(translations.ru || {})
      const entries = Object.entries(flat)
      const allT = {}
      for (let i = 0; i < entries.length; i += 80) {
        const batch = Object.fromEntries(entries.slice(i, i+80))
        const { data } = await supabase.functions.invoke('ai-advisor', {
          body: { userId: user.id, requestType:'translate_ui', targetLang: langCode, strings: batch }
        })
        if (data?.translated) Object.assign(allT, data.translated)
      }
      localStorage.setItem(`elara_t_${langCode}`, JSON.stringify({ data: allT, ts: Date.now() }))
      alert(`✓ Перевод ${langCode} готов!`)
    } catch(e) { alert('Ошибка: ' + e.message) }
    setTranslating('')
  }

  if (!isAdmin) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'var(--text3)' }}>
        <div style={{ fontSize:40 }}>🔒</div>
        <div>Доступ закрыт</div>
        <button onClick={() => navigate('/profile')} style={{ marginTop:8, background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', padding:'8px 16px', cursor:'pointer', fontSize:13 }}>← Назад</button>
      </div>
    )
  }

  const MENU_ITEMS = [
    { id:'stats', emoji:'📊', label:'Статистика' },
    { id:'users', emoji:'👥', label:'Пользователи' },
    { id:'promos', emoji:'🎁', label:'Промокоды' },
    { id:'langs', emoji:'🌍', label:'Языки' },
    { id:'feedback', emoji:'💬', label:'Обратная связь' },
    { id:'admins', emoji:'🔑', label:'Администраторы' },
  ]

  // Главное меню
  if (tab === null) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h2 style={{ fontSize:22 }}>⚡ Elara Admin</h2>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'var(--accent-soft)', color:'var(--accent)' }}>dev</span>
        </div>
        <button onClick={() => navigate('/profile')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', fontSize:12, padding:'6px 12px', cursor:'pointer' }}>
          ← В приложение
        </button>
      </div>
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          {[{l:'Пользователей',v:stats.total,c:'var(--accent)'},{l:'Trial',v:stats.trial,c:'#facc15'},{l:'Plus',v:stats.plus,c:'#a78bfa'},{l:'Family',v:stats.family,c:'#f472b6'}].map((s,i)=>(
            <div key={i} className="card" style={{ padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:26, fontFamily:'Cormorant Garamond,serif', color:s.c }}>{s.v ?? '—'}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {MENU_ITEMS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
            background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)',
            cursor:'pointer', fontSize:14, color:'var(--text)',
          }}>
            <span style={{ fontSize:22 }}>{item.emoji}</span>
            <span>{item.label}</span>
            <span style={{ marginLeft:'auto', color:'var(--text3)', fontSize:16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )

  // Обёртка для вкладок — с кнопкой Назад в меню
  function TabWrapper({ children, title }) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px', gap:12, overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setTab(null)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20, padding:0 }}>‹</button>
          <h3 style={{ fontSize:18 }}>{title}</h3>
          <button onClick={() => navigate('/profile')} style={{ marginLeft:'auto', background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text3)', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>← В приложение</button>
        </div>
        {children}
      </div>
    )
  }

  const PLAN_COLORS = { free:'var(--text3)', trial:'#facc15', plus:'#a78bfa', family:'#f472b6' }

  if (tab === 'stats') return (
    <TabWrapper title="📊 Статистика">
      {stats && (
        <>
          <div className="card" style={{ padding:'12px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>Последние регистрации</div>
            {stats.recent.map(u => (
              <div key={u.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span>{u.name || '—'}</span>
                <span style={{ color:'var(--text3)' }}>{u.language||'ru'} · {new Date(u.created_at).toLocaleDateString('ru')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </TabWrapper>
  )

  if (tab === 'users') return (
    <TabWrapper title="👥 Пользователи">
      <div style={{ display:'flex', gap:8 }}>
        <input placeholder="Поиск по имени..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&searchUser()} style={{ flex:1 }} />
        <button onClick={searchUser} className="btn btn-ghost" style={{ width:'auto', padding:'0 14px', fontSize:12 }}>🔍</button>
      </div>
      {searchResult?.map(u => (
        <div key={u.id} className="card" style={{ padding:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>{u.name||'Без имени'}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{u.id}</div>
            </div>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg3)', color:PLAN_COLORS[u.subscription?.[0]?.plan||'free'] }}>
              {u.subscription?.[0]?.plan||'free'}
            </span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['plus','family'].map(plan=>(
              <button key={plan} onClick={()=>grantSubscription(u.id,plan)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, cursor:'pointer', border:'1px solid var(--border)', background:'transparent', color:'var(--text2)' }}>+ {plan}</button>
            ))}
            <button onClick={()=>revokeSubscription(u.id)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, cursor:'pointer', border:'1px solid var(--border)', background:'transparent', color:'var(--text3)' }}>Отозвать</button>
            <button onClick={()=>resetUserPassword(u.email)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, cursor:'pointer', border:'1px solid rgba(250,204,21,0.4)', background:'rgba(250,204,21,0.08)', color:'#facc15' }}>🔑 Сбросить пароль</button>
            <button onClick={()=>banUser(u.id)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, cursor:'pointer', border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)', color:'#f87171' }}>🚫 Бан</button>
          </div>
        </div>
      ))}
      {searchResult?.length===0 && <p style={{ color:'var(--text3)', fontSize:13 }}>Не найдено</p>}
    </TabWrapper>
  )

  if (tab === 'promos') return (
    <TabWrapper title="🎁 Промокоды">
      <form onSubmit={generatePromo} className="card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>Создать промокод</div>
        <input placeholder="Код (или пустым — авто)" value={newCode} onChange={e=>setNewCode(e.target.value.toUpperCase())} style={{ letterSpacing:'0.1em' }} />
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { val:'free_plus', label:'✦ Plus навсегда' },
            { val:'free_family', label:'🌸 Family навсегда' },
            { val:'discount_custom_plus', label:'% Скидка на Plus' },
            { val:'discount_custom_family', label:'% Скидка на Family' },
            { val:'extra_trial', label:'⏱ +14 дней trial' },
          ].map(opt=>(
            <button key={opt.val} type="button" onClick={()=>setNewType(opt.val)} style={{
              padding:'9px 12px', borderRadius:8, fontSize:12, cursor:'pointer', textAlign:'left',
              border:`1px solid ${newType===opt.val?'var(--accent)':'var(--border)'}`,
              background:newType===opt.val?'var(--accent-soft)':'transparent',
              color:newType===opt.val?'var(--accent)':'var(--text2)',
            }}>{opt.label}</button>
          ))}
        </div>
        {newType.startsWith('discount_custom') && (
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>Скидка: <strong style={{ color:'var(--accent)' }}>{discountPercent}%</strong></div>
            <input type="range" min="5" max="95" step="5" value={discountPercent} onChange={e=>setDiscountPercent(Number(e.target.value))} style={{ width:'100%', accentColor:'var(--accent)' }} />
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Макс. использований</div>
            <input type="number" value={newUses} onChange={e=>setNewUses(e.target.value)} min="1" />
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Срок</div>
            <input type="date" value={newExpiry} onChange={e=>setNewExpiry(e.target.value)} />
          </div>
        </div>
        {created && (
          <div style={{ background:'var(--accent-soft)', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:'monospace', letterSpacing:'0.15em', color:'var(--accent)' }}>{created}</span>
            <button type="button" onClick={()=>copyCode(created)} style={{ background:'none', border:'1px solid var(--accent)', borderRadius:6, color:'var(--accent)', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>Копировать</button>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={creating} style={{ fontSize:12 }}>{creating?'...':'+ Создать'}</button>
      </form>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {promos.map(p=>(
          <div key={p.id} style={{ padding:'10px 12px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:500, fontFamily:'monospace', letterSpacing:'0.08em' }}>{p.code}</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{p.type} · {p.uses}/{p.max_uses} · {p.expires_at?new Date(p.expires_at).toLocaleDateString('ru'):'∞'}</div>
            </div>
            <button onClick={()=>copyCode(p.code)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:11, padding:'4px 8px', cursor:'pointer' }}>Копировать</button>
            <button onClick={()=>deletePromo(p.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18, padding:0 }}>×</button>
          </div>
        ))}
      </div>
    </TabWrapper>
  )

  if (tab === 'langs') return (
    <TabWrapper title="🌍 Языки">
      <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>Включи языки — они появятся у пользователей. AI переводит при первом выборе, кешируется на 7 дней.</div>
      {ALL_LANGS.map(l=>(
        <div key={l.code} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
          <input type="checkbox" checked={enabledLangs.includes(l.code)} onChange={()=>!l.native&&toggleLang(l.code)} disabled={l.native} style={{ width:16, height:16, accentColor:'var(--accent)' }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13 }}>{l.label}</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>{l.native?'✓ Встроенный':'AI-перевод'}</div>
          </div>
          {!l.native && enabledLangs.includes(l.code) && (
            <button onClick={()=>generateTranslation(l.code)} disabled={translating===l.code} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:6, color:'var(--accent)', fontSize:11, padding:'5px 10px', cursor:'pointer' }}>
              {translating===l.code?'⟳ Перевожу...':'↻ Обновить'}
            </button>
          )}
        </div>
      ))}
    </TabWrapper>
  )

  if (tab === 'feedback') return (
    <TabWrapper title="💬 Обратная связь">
      {feedback.length===0
        ? <p style={{ color:'var(--text3)', fontSize:13, textAlign:'center', marginTop:20 }}>Обращений пока нет</p>
        : feedback.map(f=>(
          <div key={f.id} className="card" style={{ padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:500 }}>{f.type==='bug'?'🐛':f.type==='payment'?'💳':f.type==='idea'?'💡':'💬'} {f.user_name||f.user_email}</span>
              <span style={{ fontSize:10, color:'var(--text3)' }}>{new Date(f.created_at).toLocaleDateString('ru')}</span>
            </div>
            <p style={{ fontSize:13, color:'var(--text2)', margin:0, lineHeight:1.5 }}>{f.message}</p>
          </div>
        ))
      }
    </TabWrapper>
  )

  if (tab === 'admins') return (
    <TabWrapper title="🔑 Администраторы">
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {admins.map(a=>(
          <div key={a.user_id} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{a.profile?.name||'Без имени'}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{a.user_id}</div>
            </div>
            {a.user_id !== user.id && (
              <button onClick={()=>removeAdmin(a.user_id)} style={{ background:'none', border:'1px solid rgba(248,113,113,0.3)', borderRadius:6, color:'#f87171', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>Удалить</button>
            )}
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>+ Добавить администратора</div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <input placeholder="Поиск по имени..." value={adminQuery} onChange={e=>setAdminQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&searchAdminUser()} style={{ flex:1 }} />
          <button onClick={searchAdminUser} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8, color:'var(--accent)', fontSize:12, padding:'0 12px', cursor:'pointer' }}>🔍</button>
        </div>
        {adminSearchResult?.map(u=>(
          <div key={u.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13 }}>{u.name}</span>
            <button onClick={()=>addAdmin(u.id, u.name)} style={{ background:'var(--accent-soft)', border:'1px solid var(--accent)', borderRadius:6, color:'var(--accent)', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>+ Добавить</button>
          </div>
        ))}
      </div>
    </TabWrapper>
  )

  return null
}
