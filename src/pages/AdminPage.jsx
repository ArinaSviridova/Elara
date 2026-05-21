import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'krimikarina@gmail.com' // замени на свой email

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [promos, setPromos] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Форма создания промокода
  const [newCode, setNewCode] = useState('')
  const [newType, setNewType] = useState('free_plus')
  const [newUses, setNewUses] = useState(1)
  const [newExpiry, setNewExpiry] = useState('')
  const [creating, setCreating] = useState(false)

  if (user?.email !== ADMIN_EMAIL) {
    return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>403</div>
  }

  useEffect(() => { loadStats(); loadPromos() }, [])

  async function loadStats() {
    setLoading(true)
    const [{ count: totalUsers }, { count: plusUsers }, { count: familyUsers }, { count: trialUsers }, { data: recent }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','plus'),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','family'),
      supabase.from('subscriptions').select('*', { count:'exact', head:true }).eq('plan','trial'),
      supabase.from('profiles').select('id,name,email:id,created_at').order('created_at', { ascending:false }).limit(5),
    ])
    setStats({ totalUsers, plusUsers, familyUsers, trialUsers })
    setUsers(recent || [])
    setLoading(false)
  }

  async function loadPromos() {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending:false }).limit(50)
    setPromos(data || [])
  }

  async function searchUser() {
    if (!searchQuery.trim()) return
    const { data } = await supabase
      .from('profiles').select('*, subscription:subscriptions(*)')
      .or(`name.ilike.%${searchQuery}%`)
      .limit(5)
    setSearchResult(data || [])
  }

  async function grantSubscription(userId, plan) {
    await supabase.from('subscriptions').upsert(
      { user_id: userId, plan, plan_ends_at: null },
      { onConflict: 'user_id' }
    )
    alert(`Подписка ${plan} выдана`)
    if (searchResult) searchUser()
  }

  async function generatePromo(e) {
    e.preventDefault()
    setCreating(true)
    const code = newCode.trim().toUpperCase() || `ELARA-${Date.now().toString(36).toUpperCase()}`
    await supabase.from('promo_codes').insert({
      code,
      type: newType,
      created_by: user.id,
      max_uses: parseInt(newUses),
      expires_at: newExpiry || null,
    })
    setNewCode(''); setCreating(false)
    loadPromos()
    alert(`Промокод создан: ${code}`)
  }

  const PLAN_COLORS = { free:'var(--text3)', trial:'#facc15', plus:'#a78bfa', family:'#f472b6' }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <h2 style={{ fontSize:24 }}>⚡ Админка</h2>
        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'var(--accent-soft)', color:'var(--accent)' }}>dev</span>
      </div>

      {/* Табы */}
      <div style={{ display:'flex', gap:6, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[['stats','📊 Статистика'],['users','👥 Пользователи'],['promos','🎁 Промокоды']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontSize:12,
            color:tab===id?'var(--accent)':'var(--text3)',
            borderBottom:tab===id?'2px solid var(--accent)':'2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {/* Статистика */}
      {tab === 'stats' && stats && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'Всего пользователей', value:stats.totalUsers, color:'var(--accent)' },
              { label:'Trial', value:stats.trialUsers, color:'#facc15' },
              { label:'Plus', value:stats.plusUsers, color:'#a78bfa' },
              { label:'Family', value:stats.familyUsers, color:'#f472b6' },
            ].map((s,i) => (
              <div key={i} className="card" style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:28, fontFamily:'Cormorant Garamond, serif', color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>Последние регистрации</div>
            {users.map(u => (
              <div key={u.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span>{u.name || 'Без имени'}</span>
                <span style={{ color:'var(--text3)' }}>{new Date(u.created_at).toLocaleDateString('ru')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пользователи */}
      {tab === 'users' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Поиск по имени..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key==='Enter' && searchUser()} style={{ flex:1 }} />
            <button onClick={searchUser} className="btn btn-ghost" style={{ width:'auto', padding:'0 14px', fontSize:12 }}>Найти</button>
          </div>
          {searchResult?.map(u => (
            <div key={u.id} className="card" style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{u.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>ID: {u.id.slice(0,8)}...</div>
                </div>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg3)',
                  color: PLAN_COLORS[u.subscription?.[0]?.plan || 'free'] }}>
                  {u.subscription?.[0]?.plan || 'free'}
                </span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {['plus','family'].map(plan => (
                  <button key={plan} onClick={() => grantSubscription(u.id, plan)} style={{
                    padding:'6px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
                    border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text2)',
                  }}>Выдать {plan}</button>
                ))}
              </div>
            </div>
          ))}
          {searchResult?.length === 0 && <p style={{ color:'var(--text3)', fontSize:13 }}>Не найдено</p>}
        </div>
      )}

      {/* Промокоды */}
      {tab === 'promos' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Создать */}
          <form onSubmit={generatePromo} className="card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Создать промокод</div>
            <input placeholder="Код (или оставь пустым для авто)" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
              style={{ letterSpacing:'0.1em' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                style={{ padding:'10px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12 }}>
                <option value="free_plus">Plus навсегда</option>
                <option value="free_family">Family навсегда</option>
                <option value="discount_50_plus">Скидка 50% Plus</option>
                <option value="discount_50_family">Скидка 50% Family</option>
                <option value="extra_trial">+14 дней trial</option>
              </select>
              <div>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Макс. использований</div>
                <input type="number" value={newUses} onChange={e => setNewUses(e.target.value)} min="1" />
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Срок (необязательно)</div>
              <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ fontSize:12 }}>
              {creating ? '...' : '+ Создать'}
            </button>
          </form>

          {/* Список */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {promos.map(p => (
              <div key={p.id} style={{ padding:'10px 12px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, letterSpacing:'0.1em' }}>{p.code}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{p.type} · {p.uses}/{p.max_uses} использ.</div>
                </div>
                <button onClick={async () => {
                  if (!navigator.clipboard) { const el = document.createElement('input'); el.value = p.code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }
                  else await navigator.clipboard.writeText(p.code)
                  alert(`Скопировано: ${p.code}`)
                }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:11, padding:'4px 8px', cursor:'pointer' }}>
                  Копировать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
