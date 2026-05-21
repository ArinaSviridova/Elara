import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LangContext'

const RELATION_TYPES = {
  group:       { emoji: '👥', labelRu: 'Группа подруг',    labelEn: 'Group of friends' },
  friend:      { emoji: '👯', labelRu: 'Подруга / Друг',   labelEn: 'Friend' },
  partner_any: { emoji: '💛', labelRu: 'Партнёр',           labelEn: 'Partner' },
}

const FRIEND_COLORS = [
  '#f472b6','#fb923c','#facc15','#4ade80',
  '#22d3ee','#a78bfa','#f87171','#94a3b8',
  '#34d399','#60a5fa','#e879f9','#fbbf24',
]

export default function FriendsPage() {
  const { user, profile } = useAuth()
  const { t, lang } = useLang()

  const [groups, setGroups] = useState([])
  const [individualConnections, setIndividualConnections] = useState([])
  const [view, setView] = useState('main') // main | invite | create-group | join | group-detail | privacy
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)

  // Форма создания группы
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  // Форма присоединения
  const [joinCode, setJoinCode] = useState('')
  const [joinRelation, setJoinRelation] = useState('friend')
  const [joinColor, setJoinColor] = useState('#f472b6')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [copied, setCopied] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    // Мои группы
    const { data: myGroups } = await supabase
      .from('groups')
      .select('*, members:group_members(*, user:user_id(id, name, invite_code))')
      .eq('owner_id', user.id)

    // Группы где я участник
    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('*, group:group_id(*, owner:owner_id(id, name))')
      .eq('user_id', user.id)

    // Индивидуальные связи (старая система friendships)
    const { data: friends } = await supabase
      .from('friendships')
      .select('*, friend:friend_id(id, name, invite_code)')
      .eq('owner_id', user.id)

    // Объединяем все группы
    const allGroups = []
    ;(myGroups || []).forEach(g => {
      allGroups.push({ ...g, isOwner: true, members: g.members || [] })
    })
    ;(memberGroups || []).forEach(mg => {
      if (!allGroups.find(g => g.id === mg.group_id)) {
        allGroups.push({ ...mg.group, isOwner: false, members: [], myMembership: mg })
      }
    })

    setGroups(allGroups)
    setIndividualConnections(friends || [])
  }

  async function createGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreating(true)
    const { data: group } = await supabase
      .from('groups')
      .insert({ owner_id: user.id, name: newGroupName.trim() })
      .select().single()
    setCreating(false)
    setNewGroupName('')
    setView('main')
    fetchAll()
    if (group) {
      setSelectedGroup(group)
      setView('group-detail')
    }
  }

  async function joinByCode(e) {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    const code = joinCode.trim().toUpperCase()

    // Если выбрана «Группа» — ищем только групповой код
    if (joinRelation === 'group') {
      const { data: group } = await supabase
        .from('groups').select('*').eq('invite_code', code).maybeSingle()

      if (!group) {
        setJoinError(rl('Группа с таким кодом не найдена','Group with this code not found'))
        setJoining(false); return
      }
      if (group.owner_id === user.id) {
        setJoinError(rl('Это твоя собственная группа','This is your own group'))
        setJoining(false); return
      }
      const { error } = await supabase.from('group_members').insert({
        group_id: group.id, user_id: user.id,
        relation_type: 'friend', member_color: joinColor,
      })
      if (error) {
        setJoinError(rl('Ты уже в этой группе','Already in this group'))
      } else {
        setJoinCode(''); setJoinRelation('group'); setView('main'); fetchAll()
      }
      setJoining(false); return
    }

    // Личный код — ищем человека
    const { data: group } = await supabase
      .from('groups').select('*').eq('invite_code', code).maybeSingle()

    if (group) {
      // Нашли группу — присоединяемся
      if (group.owner_id === user.id) {
        setJoinError(rl('Это твоя группа','This is your own group'))
        setJoining(false); return
      }
      const { error } = await supabase.from('group_members').insert({
        group_id: group.id, user_id: user.id,
        relation_type: joinRelation, member_color: joinColor,
      })
      if (error) {
        setJoinError(rl('Уже в этой группе','Already in this group'))
      } else {
        setJoinCode(''); setView('main'); fetchAll()
      }
      setJoining(false); return
    }

    // Персональный код человека
    const { data: person } = await supabase
      .from('profiles').select('id, name').eq('invite_code', code).maybeSingle()

    if (!person) {
      setJoinError(rl('Код не найден — проверь правильность','Code not found — check spelling'))
      setJoining(false); return
    }
    if (person.id === user.id) {
      setJoinError(rl('Это твой собственный код 😄',"That's your own code 😄"))
      setJoining(false); return
    }

    const { error } = await supabase.from('friendships').insert({
      owner_id: user.id, friend_id: person.id, friend_color: joinColor,
    })
    if (error) {
      setJoinError(rl('Уже добавлен','Already added'))
    } else {
      setJoinCode(''); setView('main'); fetchAll()
    }
    setJoining(false)
  }

  async function copyCode(code, key) {
    // Fallback для HTTP (IP-адрес)
    if (!navigator.clipboard) {
      const el = document.createElement("textarea")
      el.value = code; document.body.appendChild(el); el.select()
      document.execCommand("copy"); document.body.removeChild(el)
      setCopied(key); setTimeout(() => setCopied(""), 2000); return
    }
    await navigator.clipboard.writeText(code)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  async function removeMember(memberId) {
    await supabase.from('group_members').delete().eq('id', memberId)
    fetchAll()
    if (selectedGroup) {
      const updated = groups.find(g => g.id === selectedGroup.id)
      if (updated) setSelectedGroup(updated)
    }
  }

  async function deleteGroup(groupId) {
    const msg = lang==='en'?'Delete this group?':'Удалить группу?'
    if (!confirm(msg)) return
    await supabase.from('groups').delete().eq('id', groupId)
    setView('main'); fetchAll()
  }

  async function updatePrivacy(type, value) {
    if (!selectedMember) return
    const field = type
    if (selectedMember.source === 'friendship') {
      await supabase.from('friendships').update({ is_visible: value }).eq('id', selectedMember.id)
    } else {
      await supabase.from('group_members').update({ [field]: value }).eq('id', selectedMember.id)
    }
    fetchAll()
    // Обновляем локально
    setSelectedMember(prev => ({ ...prev, [field]: value }))
  }

  const usedColors = [
    ...individualConnections.map(f => f.friend_color),
  ]

  function rl(ru, en) { return lang==='en' ? en : ru }

  // ===== VIEWS =====

  if (view === 'invite') return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:20, overflowY:'auto' }}>
      <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
        ‹ {rl('Назад','Back')}
      </button>
      <h2 style={{ fontSize:28 }}>{rl('Пригласить','Invite')}</h2>

      {/* Мой персональный код */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
          {rl('Мой личный код','My personal code')}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, letterSpacing:'0.3em', fontSize:30, fontFamily:'Cormorant Garamond, serif', color:'var(--accent)' }}>
            {profile?.invite_code}
          </div>
          <button onClick={() => copyCode(profile?.invite_code, 'personal')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 14px', fontSize:12 }}>
            {copied==='personal' ? '✓' : rl('Копировать','Copy')}
          </button>
        </div>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:8, lineHeight:1.5 }}>
          {rl('Отправь этот код — человек введёт его и увидит тебя в своём круге','Share this code — they enter it to add you to their circle')}
        </p>
      </div>

      {/* Коды групп */}
      {groups.filter(g => g.isOwner).length > 0 && (
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            {rl('Коды групп','Group codes')}
          </div>
          {groups.filter(g => g.isOwner).map(g => (
            <div key={g.id} className="card" style={{ marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--text)' }}>{g.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.2em', marginTop:2 }}>{g.invite_code}</div>
                </div>
                <button onClick={() => copyCode(g.invite_code, g.id)} className="btn btn-ghost" style={{ width:'auto', padding:'8px 14px', fontSize:12 }}>
                  {copied===g.id ? '✓' : rl('Копировать','Copy')}
                </button>
              </div>
              <p style={{ fontSize:11, color:'var(--text3)' }}>
                {rl('Любой с этим кодом может присоединиться к группе','Anyone with this code can join the group')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:1, background:'var(--border)' }} />

      {/* Создать новую группу */}
      <button onClick={() => setView('create-group')} className="btn btn-ghost" style={{ gap:8 }}>
        + {rl('Создать новую группу','Create new group')}
      </button>
    </div>
  )

  if (view === 'create-group') return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:20 }}>
      <button onClick={() => setView('invite')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
        ‹ {rl('Назад','Back')}
      </button>
      <h2 style={{ fontSize:28 }}>{rl('Новая группа','New group')}</h2>
      <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6 }}>
        {rl('Создай группу и поделись её кодом — все кто введут код окажутся в одной группе и смогут видеть общий календарь.',
            'Create a group and share its code — everyone who enters it joins the same group and can see a shared calendar.')}
      </p>
      <form onSubmit={createGroup} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input
          placeholder={rl('Название группы (например: Подруги, Пара)','Group name (e.g. Friends, Us)')}
          value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={creating || !newGroupName.trim()}>
          {creating ? '...' : rl('Создать и получить код','Create & get code')}
        </button>
      </form>
    </div>
  )

  if (view === 'join') return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:20, overflowY:'auto' }}>
      <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
        ‹ {rl('Назад','Back')}
      </button>
      <h2 style={{ fontSize:28 }}>{rl('Добавить по коду','Add by code')}</h2>

      <form onSubmit={joinByCode} style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Поле кода */}
        <div>
          <input
            placeholder={rl('Код (6 символов)','Code (6 characters)')}
            value={joinCode} onChange={e => setJoinCode(e.target.value)}
            maxLength={6} style={{ letterSpacing:'0.25em', textTransform:'uppercase', fontSize:22, textAlign:'center', padding:'16px' }}
            autoFocus
          />
          {joinCode.length === 6 && (
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:6, textAlign:'center' }}>
              {rl('Это может быть личный код или код группы — оба работают','Could be a personal or group code — both work')}
            </div>
          )}
        </div>

        {/* Выбор кто это */}
        <div>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>
            {rl('Это кто?','Who is this?')}
          </div>

          {/* Группа — отдельно, большая */}
          <button type="button" onClick={() => setJoinRelation('group')} style={{
            width:'100%', padding:'14px 16px', borderRadius:12, fontSize:14, cursor:'pointer', textAlign:'left',
            border:`1.5px solid ${joinRelation==='group'?'#4ade80':'var(--border)'}`,
            background:joinRelation==='group'?'rgba(74,222,128,0.1)':'var(--bg2)',
            color:'var(--text)', display:'flex', alignItems:'center', gap:10, marginBottom:8,
          }}>
            <span style={{ fontSize:24 }}>👥</span>
            <div>
              <div style={{ fontWeight:500 }}>{rl('Группа подруг','Group of friends')}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                {rl('Код от подруги/подруг — присоединяюсь к группе','A code from friends — joining their group')}
              </div>
            </div>
            {joinRelation==='group' && <span style={{ marginLeft:'auto', color:'#4ade80' }}>✓</span>}
          </button>

          {/* Остальные типы */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {Object.entries(RELATION_TYPES).filter(([k]) => k !== 'group').map(([key, meta]) => (
              <button key={key} type="button" onClick={() => setJoinRelation(key)} style={{
                padding:'11px 12px', borderRadius:10, fontSize:12, cursor:'pointer', textAlign:'left',
                border:`1px solid ${joinRelation===key?'var(--accent)':'var(--border)'}`,
                background:joinRelation===key?'var(--accent-soft)':'transparent',
                color:'var(--text)', display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{ fontSize:18 }}>{meta.emoji}</span>
                <span style={{ color:joinRelation===key?'var(--accent)':'var(--text2)', fontSize:12 }}>
                  {lang==='en'?meta.labelEn:meta.labelRu}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Цвет — только если не группа */}
        {joinRelation !== 'group' && (
          <div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>{rl('Цвет на календаре','Color on calendar')}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {FRIEND_COLORS.map(c => {
                const taken = usedColors.includes(c)
                return (
                  <button key={c} type="button" disabled={taken} onClick={() => setJoinColor(c)} style={{
                    width:32, height:32, borderRadius:'50%', background:c, cursor:taken?'not-allowed':'pointer',
                    border:joinColor===c?'2.5px solid var(--text)':'2px solid transparent',
                    opacity:taken?0.2:1, transition:'all 0.15s', outline:'none',
                  }} />
                )
              })}
            </div>
          </div>
        )}

        {joinError && <p style={{ color:'#f87171', fontSize:13 }}>{joinError}</p>}

        <button type="submit" className="btn btn-primary" disabled={joining || !joinCode.trim() || !joinRelation}>
          {joining ? '...' : rl('Добавить','Add')}
        </button>
      </form>
    </div>
  )

  if (view === 'group-detail' && selectedGroup) {
    const group = groups.find(g => g.id === selectedGroup.id) || selectedGroup
    return (
      <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
        <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
          ‹ {rl('Назад','Back')}
        </button>
        <h2 style={{ fontSize:28 }}>{group.name}</h2>

        {/* Код группы */}
        <div className="card">
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>{rl('Код группы','Group code')}</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, letterSpacing:'0.3em', fontSize:28, fontFamily:'Cormorant Garamond, serif', color:'var(--accent)' }}>
              {group.invite_code}
            </div>
            <button onClick={() => copyCode(group.invite_code, 'group')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 14px', fontSize:12 }}>
              {copied==='group' ? '✓' : rl('Копировать','Copy')}
            </button>
          </div>
        </div>

        {/* Участники */}
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            {rl('Участники','Members')} ({(group.members||[]).length})
          </div>
          {(group.members||[]).length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text3)', textAlign:'center', padding:'20px 0' }}>
              {rl('Пока никого — поделись кодом!','No one yet — share the code!')}
            </p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(group.members||[]).map(m => (
                <div key={m.id} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:m.member_color||'var(--accent-soft)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {RELATION_TYPES[m.relation_type]?.emoji || '👤'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, color:'var(--text)' }}>{m.user?.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                      {lang==='en' ? RELATION_TYPES[m.relation_type]?.labelEn : RELATION_TYPES[m.relation_type]?.labelRu}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedMember({...m, source:'group_member'}); setView('privacy') }}
                    style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:11, padding:'5px 10px', cursor:'pointer' }}
                  >
                    {rl('Доступ','Access')}
                  </button>
                  {group.isOwner && (
                    <button onClick={() => removeMember(m.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {group.isOwner && (
          <button onClick={() => deleteGroup(group.id)} style={{ background:'none', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, color:'#f87171', fontSize:12, padding:'10px', cursor:'pointer', marginTop:8 }}>
            {rl('Удалить группу','Delete group')}
          </button>
        )}
      </div>
    )
  }

  if (view === 'privacy' && selectedMember) {
    const memberName = selectedMember.user?.name || selectedMember.friend?.name || '?'
    const aiEnabled = selectedMember.can_receive_ai_advice
    const currentSource = selectedMember.advice_source || 'calendar'
    const currentDetail = selectedMember.advice_detail || 'general'

    const SOURCES = [
      {
        key: 'calendar',
        icon: '📅',
        labelRu: 'Только календарь',
        labelEn: 'Calendar only',
        descRu: 'Советы на основе фазы цикла и примерного настроения',
        descEn: 'Advice based on cycle phase and approximate mood',
      },
      {
        key: 'calendar_tags',
        icon: '🏷',
        labelRu: 'Календарь + теги',
        labelEn: 'Calendar + tags',
        descRu: 'Партнёр видит твои дневниковые теги (стресс, радость и т.п.)',
        descEn: 'Partner sees your diary tags (stress, joy, etc.)',
      },
      {
        key: 'calendar_tags_diary',
        icon: '📖',
        labelRu: 'Календарь + теги + дневник',
        labelEn: 'Calendar + tags + diary',
        descRu: 'AI читает и дневник — советы максимально точные. Текст партнёр не видит',
        descEn: 'AI reads diary too — most personalized advice. Partner never sees your text',
      },
    ]

    const DETAILS = [
      {
        key: 'general',
        labelRu: 'Максимально общие',
        labelEn: 'Very general',
        descRu: 'Общие советы заботы — ничего конкретного',
        descEn: 'General care tips — nothing specific',
        color: '#94a3b8',
      },
      {
        key: 'situational',
        labelRu: 'С учётом ситуации',
        labelEn: 'Situational',
        descRu: 'Учитывает общий контекст, без деталей',
        descEn: 'Considers general context, no details',
        color: '#4ade80',
      },
      {
        key: 'approximate',
        labelRu: 'Примерные',
        labelEn: 'Approximate',
        descRu: 'Конкретнее, но без точных деталей дневника',
        descEn: 'More specific, but no exact diary details',
        color: '#facc15',
      },
      {
        key: 'exact',
        labelRu: 'Точные',
        labelEn: 'Exact',
        descRu: 'Максимально персональные — AI использует все данные',
        descEn: 'Most personal — AI uses all available data',
        color: '#f472b6',
      },
    ]

    function Toggle({ value, onChange }) {
      return (
        <button onClick={() => onChange(!value)} style={{
          width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
          background: value ? 'var(--accent)' : 'var(--bg3)', position:'relative', transition:'all 0.2s',
        }}>
          <div style={{
            position:'absolute', top:2, left: value ? 22 : 2,
            width:20, height:20, borderRadius:'50%', background:'#fff',
            transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      )
    }

    return (
      <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
        <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
          ‹ {rl('Назад','Back')}
        </button>
        <div>
          <h2 style={{ fontSize:28 }}>{rl('Приватность','Privacy')}</h2>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>{memberName}</p>
        </div>

        {/* Базовые переключатели */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { key:'can_see_calendar', icon:'📅', ru:'Видит мой календарь', en:'Can see my calendar' },
            { key:'can_receive_cycle_notifs', icon:'🔔', ru:'Получает уведомления о цикле', en:'Gets cycle notifications' },
            { key:'can_receive_ai_advice', icon:'✦', ru:'Получает AI-советы обо мне', en:'Gets AI advice about me' },
            { key:'can_see_pregnancy', icon:'🌸', ru:'Видит трекер беременности', en:'Can see pregnancy tracker' },
          ].map(item => (
            <div key={item.key} className="card" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <div style={{ flex:1, fontSize:13, color:'var(--text)' }}>{lang==='en'?item.en:item.ru}</div>
              <Toggle
                value={!!selectedMember[item.key]}
                onChange={v => updatePrivacy(item.key, v)}
              />
            </div>
          ))}
        </div>

        {/* Настройки AI советов — только если включены */}
        {aiEnabled && (
          <>
            {/* Источник данных */}
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                {rl('На основе чего давать советы партнёру','What data to use for partner advice')}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {SOURCES.map(s => (
                  <button key={s.key} onClick={() => updatePrivacy('advice_source', s.key)}
                    style={{
                      padding:'13px 14px', borderRadius:12, cursor:'pointer', textAlign:'left',
                      border:`1.5px solid ${currentSource===s.key?'var(--accent)':'var(--border)'}`,
                      background: currentSource===s.key ? 'var(--accent-soft)' : 'var(--bg2)',
                      display:'flex', alignItems:'flex-start', gap:12, transition:'all 0.15s',
                    }}>
                    <span style={{ fontSize:20, marginTop:1 }}>{s.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color: currentSource===s.key?'var(--accent)':'var(--text)', fontWeight: currentSource===s.key?500:400 }}>
                        {lang==='en'?s.labelEn:s.labelRu}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, lineHeight:1.4 }}>
                        {lang==='en'?s.descEn:s.descRu}
                      </div>
                    </div>
                    {currentSource===s.key && <span style={{ color:'var(--accent)', fontSize:14, marginTop:2 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Точность советов */}
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                {rl('Насколько точные советы получает партнёр','How specific should partner advice be')}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {DETAILS.map(d => (
                  <button key={d.key} onClick={() => updatePrivacy('advice_detail', d.key)}
                    style={{
                      padding:'13px 14px', borderRadius:12, cursor:'pointer', textAlign:'left',
                      border:`1.5px solid ${currentDetail===d.key ? d.color : 'var(--border)'}`,
                      background: currentDetail===d.key ? d.color+'18' : 'var(--bg2)',
                      display:'flex', alignItems:'center', gap:12, transition:'all 0.15s',
                    }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'var(--text)', fontWeight: currentDetail===d.key?500:400 }}>
                        {lang==='en'?d.labelEn:d.labelRu}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                        {lang==='en'?d.descEn:d.descRu}
                      </div>
                    </div>
                    {currentDetail===d.key && <span style={{ color:d.color, fontSize:14 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Итоговая сводка */}
            <div style={{ background:'var(--bg2)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                {rl('Итого','Summary')}
              </div>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
                {lang==='en'
                  ? `${memberName} receives ${DETAILS.find(d=>d.key===currentDetail)?.labelEn?.toLowerCase()} advice based on ${SOURCES.find(s=>s.key===currentSource)?.labelEn?.toLowerCase()}.`
                  : `${memberName} получает ${DETAILS.find(d=>d.key===currentDetail)?.labelRu?.toLowerCase()} советы на основе: ${SOURCES.find(s=>s.key===currentSource)?.labelRu?.toLowerCase()}.`
                }
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // MAIN VIEW
  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:16, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:30 }}>{rl('Мой круг','My Circle')}</h2>
      </div>

      {/* Две главные кнопки */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <button onClick={() => setView('invite')} style={{
          padding:'16px 12px', borderRadius:14, cursor:'pointer', textAlign:'center',
          border:'1px solid var(--border)', background:'var(--bg2)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        }}>
          <span style={{ fontSize:24 }}>✉️</span>
          <span style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{rl('Пригласить','Invite')}</span>
          <span style={{ fontSize:11, color:'var(--text3)', lineHeight:1.4 }}>
            {rl('Поделиться кодом','Share your code')}
          </span>
        </button>
        <button onClick={() => setView('join')} style={{
          padding:'16px 12px', borderRadius:14, cursor:'pointer', textAlign:'center',
          border:'1px solid var(--accent)', background:'var(--accent-soft)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        }}>
          <span style={{ fontSize:24 }}>🔑</span>
          <span style={{ fontSize:13, color:'var(--accent)', fontWeight:500 }}>{rl('Добавить','Add person')}</span>
          <span style={{ fontSize:11, color:'var(--text3)', lineHeight:1.4 }}>
            {rl('Ввести чей-то код','Enter someone\'s code')}
          </span>
        </button>
      </div>

      {/* Группы */}
      {groups.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            {rl('Группы','Groups')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {groups.map(g => (
              <button key={g.id} onClick={() => { setSelectedGroup(g); setView('group-detail') }}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {g.isOwner ? '👑' : '✦'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{g.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                    {g.isOwner
                      ? `${(g.members||[]).length} ${rl('участн.','members')} · ${g.invite_code}`
                      : rl('Участник','Member')}
                  </div>
                </div>
                <span style={{ color:'var(--text3)', fontSize:18 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Индивидуальные связи */}
      {individualConnections.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            {rl('Отдельные','Individual')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {individualConnections.map(f => (
              <div key={f.id} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:f.friend_color, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#0a0a0a', fontWeight:600 }}>
                  {f.friend?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--text)' }}>{f.friend?.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                    {f.is_visible ? rl('Цикл виден','Cycle visible') : rl('Цикл скрыт','Cycle hidden')}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedMember({...f, source:'friendship', user:{name:f.friend?.name}, can_see_calendar:f.is_visible}); setView('privacy') }}
                  style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:11, padding:'5px 10px', cursor:'pointer' }}
                >
                  {rl('Доступ','Access')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && individualConnections.length === 0 && (
        <div style={{ textAlign:'center', color:'var(--text3)', fontSize:14, padding:'40px 20px', lineHeight:2 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌙</div>
          {rl('Твой круг пока пуст','Your circle is empty')}
          <div style={{ fontSize:12, marginTop:4 }}>
            {rl('Пригласи подруг или добавь партнёра','Invite friends or add a partner')}
          </div>
        </div>
      )}
    </div>
  )
}
