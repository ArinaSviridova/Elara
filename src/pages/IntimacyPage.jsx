import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import InfoTooltip from '../components/InfoTooltip'
import { predictCycle, analyzeLibido } from '../lib/cyclePredictor'

const CONTRACEPTION_USED = [
  { key:'condom', ru:'🛡 Презерватив', en:'🛡 Condom' },
  { key:'pill', ru:'💊 Таблетки', en:'💊 Pill' },
  { key:'interrupted', ru:'⏸ Прерванный ПА', en:'⏸ Interrupted' },
  { key:'iud', ru:'🌀 Спираль', en:'🌀 IUD' },
  { key:'none', ru:'❌ Без защиты', en:'❌ No protection' },
  { key:'other', ru:'✦ Другое', en:'✦ Other' },
]

// Настройки для подростков — что показывать
const DEFAULT_TEEN_SETTINGS = {
  show_masturbation: false,
  show_sex: false,
  show_gender_identity: true,
  show_partner: false,
}

const SEX_TYPES = [
  { key:'protected', ru:'Защищённый', en:'Protected', emoji:'🟢' },
  { key:'unprotected', ru:'Незащищённый', en:'Unprotected', emoji:'🔴' },
  { key:'interrupted', ru:'Прерванный', en:'Interrupted', emoji:'🟡' },
  { key:'oral_giving', ru:'Оральный (даю)', en:'Oral (giving)', emoji:'💋' },
  { key:'oral_receiving', ru:'Оральный (получаю)', en:'Oral (receiving)', emoji:'🫦' },
  { key:'anal_active', ru:'Анальный (активный)', en:'Anal (active)', emoji:'🔥' },
  { key:'anal_passive', ru:'Анальный (пассивный)', en:'Anal (passive)', emoji:'🫗' },
  { key:'manual_giving', ru:'Руками (даю)', en:'Manual (giving)', emoji:'🤝' },
  { key:'manual_receiving', ru:'Руками (получаю)', en:'Manual (receiving)', emoji:'🤲' },
  { key:'toy_solo', ru:'Игрушка (сама)', en:'Toy (solo)', emoji:'🎯' },
  { key:'toy_partner', ru:'Игрушка (с партнёром)', en:'Toy (with partner)', emoji:'🎀' },
  { key:'tribbing', ru:'Трибинг / ножницы', en:'Tribbing / scissors', emoji:'✂️' },
  { key:'fisting', ru:'Фистинг', en:'Fisting', emoji:'✊' },
  { key:'group', ru:'Групповой секс', en:'Group sex', emoji:'👥' },
  { key:'threesome', ru:'Тройничок', en:'Threesome', emoji:'🔱' },
  { key:'virtual', ru:'Виртуальный / по видео', en:'Virtual / video', emoji:'📱' },
  { key:'bdsm', ru:'БДСМ элементы', en:'BDSM elements', emoji:'⛓' },
  { key:'roleplay', ru:'Ролевые игры', en:'Role play', emoji:'🎭' },
  { key:'tantric', ru:'Тантрический', en:'Tantric', emoji:'🕯' },
  { key:'other', ru:'Другое', en:'Other', emoji:'✨' },
]

const MASTURBATION_TYPES = [
  { key:'solo_fingers', ru:'Руками (сама)', en:'Fingers (solo)', emoji:'🤌' },
  { key:'solo_toy', ru:'Игрушкой (сама)', en:'Toy (solo)', emoji:'🎀' },
  { key:'solo_shower', ru:'В душе', en:'In shower', emoji:'🚿' },
  { key:'solo_pillow', ru:'Без рук', en:'Hands-free', emoji:'🛏' },
  { key:'partner_watch', ru:'Партнёр смотрит', en:'Partner watching', emoji:'👀' },
  { key:'partner_manual', ru:'Руками партнёра', en:'Partner (manual)', emoji:'🤲' },
  { key:'partner_oral', ru:'Партнёр орально', en:'Partner (oral)', emoji:'💝' },
  { key:'mutual', ru:'Взаимная', en:'Mutual', emoji:'💑' },
  { key:'phone_sex', ru:'По телефону/видео', en:'Phone/video', emoji:'📞' },
  { key:'other', ru:'Другое', en:'Other', emoji:'✨' },
]

const PARTNER_TYPES = [
  { key:'regular', ru:'Постоянный партнёр', en:'Regular partner', emoji:'💑' },
  { key:'casual', ru:'Случайный', en:'Casual', emoji:'🎲' },
  { key:'multiple', ru:'Несколько партнёров', en:'Multiple partners', emoji:'👥' },
  { key:'anonymous', ru:'Анонимный', en:'Anonymous', emoji:'🎭' },
  { key:'self', ru:'Без партнёра', en:'Solo', emoji:'🌸' },
]

const DESIRE_LABELS = ['😐','🌡','🔥','💫','⚡']


function buildHistoryFromEntries(periodEntries) {
  if (!periodEntries || periodEntries.length === 0) return []
  const sorted = [...periodEntries].sort((a,b) => String(a.date).localeCompare(String(b.date)))
  const groups = []
  let group = [sorted[0].date]

  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(`${sorted[i].date}T00:00:00`) - new Date(`${sorted[i - 1].date}T00:00:00`)) / 86400000
    if (diff <= 2) group.push(sorted[i].date)
    else {
      groups.push(group)
      group = [sorted[i].date]
    }
  }
  groups.push(group)

  return groups.map((g, idx) => {
    const start = g[0]
    const end = g[g.length - 1]
    const prevStart = idx > 0 ? groups[idx - 1][0] : null
    const cycleLen = prevStart ? Math.round((new Date(`${start}T00:00:00`) - new Date(`${prevStart}T00:00:00`)) / 86400000) : null
    return {
      period_start: start,
      period_end: end,
      cycle_length: cycleLen && cycleLen > 10 && cycleLen < 60 ? cycleLen : null,
    }
  })
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(digits).replace(/\.0$/, '')
}

export default function IntimacyPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()

  const isTeen = profile?.age_mode === 'teen'
  const teenSettings = profile?.teen_settings || DEFAULT_TEEN_SETTINGS

  const today = new Date().toISOString().slice(0,10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [desireLevel, setDesireLevel] = useState(0)
  const [hadSex, setHadSex] = useState(false)
  const [hadMasturbation, setHadMasturbation] = useState(false)
  const [sexCount, setSexCount] = useState(1)
  const [masturbationCount, setMasturbationCount] = useState(1)
  const [libidoStats, setLibidoStats] = useState(null)
  const [sexTypes, setSexTypes] = useState([])
  const [masturbationTypes, setMasturbationTypes] = useState([])
  const [contraceptionUsed, setContraceptionUsed] = useState([])
  const [partnerType, setPartnerType] = useState('regular')
  const [partnersCount, setPartnersCount] = useState(2)
  const [pregnancyIntent, setPregnancyIntent] = useState(false)
  const [visiblePartner, setVisiblePartner] = useState(false)
  const [visibleFriends, setVisibleFriends] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Настройки подростка
  const [teenConfig, setTeenConfig] = useState(teenSettings)
  const [showTeenSettings, setShowTeenSettings] = useState(false)

  useEffect(() => { loadEntry(selectedDate) }, [selectedDate])
  useEffect(() => { loadLibidoStats() }, [user.id])

  async function loadEntry(dateKey = selectedDate) {
    const { data } = await supabase
      .from('intimacy_entries').select('*').eq('user_id', user.id).eq('date', dateKey).maybeSingle()
    if (data) {
      setDesireLevel(data.desire_level || 0)
      setHadSex(data.had_sex || false)
      setHadMasturbation(data.had_masturbation || false)
      setSexCount(Math.max(1, Number(data.sex_count || 1)))
      setMasturbationCount(Math.max(1, Number(data.masturbation_count || 1)))
      setSexTypes(data.sex_types || [])
      setMasturbationTypes(data.masturbation_types || [])
      setContraceptionUsed(data.contraception_used || [])
      setPartnerType(data.partner_type || 'regular')
      setPartnersCount(Math.max(2, Number(data.partners_count || 2)))
      setPregnancyIntent(Boolean(data.pregnancy_intent))
      setVisiblePartner(data.visible_to_partner || false)
      setVisibleFriends(data.visible_to_friends || false)
    } else {
      setDesireLevel(0)
      setHadSex(false)
      setHadMasturbation(false)
      setSexCount(1)
      setMasturbationCount(1)
      setSexTypes([])
      setMasturbationTypes([])
      setContraceptionUsed([])
      setPartnerType('regular')
      setPartnersCount(2)
      setPregnancyIntent(false)
      setVisiblePartner(false)
      setVisibleFriends(false)
    }
  }


  async function loadLibidoStats() {
    const [{ data: intimacyData }, { data: periodData }] = await Promise.all([
      supabase.from('intimacy_entries').select('*').eq('user_id', user.id).order('date'),
      supabase.from('cycle_entries').select('date').eq('user_id', user.id).eq('type', 'period').order('date'),
    ])

    const history = buildHistoryFromEntries(periodData || [])
    const cyclePrediction = history.length >= 2 ? predictCycle(history) : null
    setLibidoStats(analyzeLibido(intimacyData || [], cyclePrediction))
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('intimacy_entries').upsert({
      user_id: user.id, date: selectedDate,
      desire_level: desireLevel || null,
      had_sex: hadSex,
      had_masturbation: hadMasturbation,
      sex_count: hadSex ? Math.max(1, Number(sexCount || 1)) : 0,
      masturbation_count: hadMasturbation ? Math.max(1, Number(masturbationCount || 1)) : 0,
      sex_types: sexTypes,
      masturbation_types: masturbationTypes,
      partner_type: hadSex ? partnerType : null,
      partners_count: hadSex && partnerType === 'multiple' ? Math.max(2, partnersCount) : (hadSex ? 1 : 0),
      pregnancy_intent: hadSex ? pregnancyIntent : false,
      contraception_used: contraceptionUsed,
      visible_to_partner: visiblePartner,
      visible_to_friends: visibleFriends,
    }, { onConflict: 'user_id,date' })
    setSaving(false); setSaved(true); loadLibidoStats()
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveTeenSettings(settings) {
    setTeenConfig(settings)
    await supabase.from('profiles').update({ teen_settings: settings }).eq('id', user.id)
  }

  function toggleArr(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  function Toggle({ value, onChange, color }) {
    return (
      <button onClick={() => onChange(!value)} style={{
        width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
        background: value ? (color||'var(--accent)') : 'var(--bg3)', position:'relative', transition:'all 0.2s',
      }}>
        <div style={{ position:'absolute', top:2, left:value?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
      </button>
    )
  }


  function CountControl({ label, value, onChange }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 12px', borderRadius:12, background:'var(--bg3)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:13, color:'var(--text2)' }}>{label}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => onChange(Math.max(1, Number(value || 1) - 1))} style={{ width:30, height:30, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', cursor:'pointer' }}>−</button>
          <input
            type="number"
            min="1"
            max="20"
            value={value}
            onChange={e => onChange(Math.max(1, Math.min(20, Number(e.target.value || 1))))}
            style={{ width:56, textAlign:'center', padding:'7px 6px' }}
          />
          <button onClick={() => onChange(Math.min(20, Number(value || 1) + 1))} style={{ width:30, height:30, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', cursor:'pointer' }}>+</button>
        </div>
      </div>
    )
  }

  function libidoBandLabel(band) {
    const map = {
      not_enough_data: rl('мало данных','not enough data'),
      low: rl('низкий','low'),
      medium: rl('средний','medium'),
      high: rl('высокий','high'),
    }
    return map[band] || band
  }

  function phaseName(type) {
    const map = {
      period: rl('менструация','period'),
      follicular: rl('фолликулярная фаза','Follicular phase'),
      fertile: rl('фертильные дни','Fertile window'),
      ovulation: rl('овуляция','Ovulation'),
      luteal: rl('лютеиновая фаза','Luteal phase'),
      pms: rl('ПМС','PMS'),
      regular: rl('обычные дни','regular days'),
      unknown: rl('без фазы','unknown phase'),
    }
    return map[type] || type
  }

  // Подростковые настройки
  if (isTeen && showTeenSettings) return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:14, overflowY:'auto' }}>
      <button onClick={() => setShowTeenSettings(false)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
        ‹ {rl('Назад','Back')}
      </button>
      <h2 style={{ fontSize:24 }}>🌸 {rl('Настройки раздела','Section settings')}</h2>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
        {rl('Выбери что хочешь отслеживать. Всё остаётся только твоим.','Choose what you want to track. Everything stays private.')}
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { key:'show_masturbation', ru:'Отслеживать мастурбацию', en:'Track masturbation' },
          { key:'show_sex', ru:'Отслеживать секс', en:'Track sex' },
          { key:'show_partner', ru:'Отслеживать партнёра', en:'Track partner' },
          
        ].map(item => (
          <div key={item.key} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, fontSize:13 }}>{rl(item.ru, item.en)}</div>
            <Toggle value={!!teenConfig[item.key]} onChange={v => saveTeenSettings({...teenConfig, [item.key]: v})} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:28 }}>
          {isTeen ? '🌸 ' : '🌹 '}{rl('Интимное','Intimacy')}
        </h2>
        {isTeen && (
          <button onClick={() => setShowTeenSettings(true)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text3)', fontSize:12, padding:'6px 12px', cursor:'pointer' }}>
            ⚙ {rl('Настройки','Settings')}
          </button>
        )}
      </div>

      {isTeen && (
        <div style={{ background:'rgba(244,114,182,0.08)', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(244,114,182,0.2)', fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
          🌸 {rl('Это пространство только твоё. Никто не увидит без твоего разрешения.', 'This space is yours only. No one sees it without your permission.')}
        </div>
      )}

      <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          {rl('Дата записи','Entry date')}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value || today)}
            style={{ flex:1 }}
          />
          <button
            onClick={() => setSelectedDate(today)}
            style={{ padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text2)', cursor:'pointer', fontSize:12 }}
          >
            {rl('Сегодня','Today')}
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
          {rl('Можно добавить интимные отметки задним числом, если забыла записать в день события.','You can add intimacy notes for previous days if you forgot to log them on the day.')}
        </div>
      </div>


      {libidoStats && libidoStats.totalEntries > 0 && (
        <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {rl('Средний уровень либидо','Average libido')}
              </div>
              <div style={{ fontSize:24, fontFamily:'Cormorant Garamond, serif', marginTop:4 }}>
                {libidoStats.desireEntries ? `${formatNumber(libidoStats.desireAverage)} / 5` : '—'}
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                {rl('Уровень: ','Level: ')}{libidoBandLabel(libidoStats.libidoBand)}
              </div>
            </div>
            <div style={{ textAlign:'right', fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
              <div>🌹 {rl('секс','sex')}: {libidoStats.sexEvents} / {rl('примерно','about')} {formatNumber(libidoStats.sexPerWeek || 0)} {rl('в нед.','per week')}</div>
              <div>🌸 {rl('соло','solo')}: {libidoStats.masturbationEvents} / {rl('примерно','about')} {formatNumber(libidoStats.masturbationPerWeek || 0)} {rl('в нед.','per week')}</div>
            </div>
          </div>
          {libidoStats.strongestPhase && (
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55, background:'var(--bg3)', borderRadius:10, padding:'10px 12px' }}>
              ✦ {rl('По твоим отметкам желание чаще выше в фазе:','According to your logs, desire is often higher in:')} <b>{phaseName(libidoStats.strongestPhase.phase)}</b>.
            </div>
          )}
          <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
            {rl('Это показывает твой средний ритм. Потребности партнёра лучше считать по его/их собственным отметкам или по общей синхронизации.', 'This shows your own average rhythm. A partner’s needs should be based on their own logs or shared sync.')}
          </div>
        </div>
      )}

      {/* Уровень желания */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
          {selectedDate === today ? rl('Уровень желания сегодня','Desire level today') : rl('Уровень желания в выбранный день','Desire level on selected day')}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          {DESIRE_LABELS.map((emoji, i) => (
            <button key={i} onClick={() => setDesireLevel(desireLevel===i+1?0:i+1)} style={{
              fontSize:26, padding:'8px', borderRadius:12, cursor:'pointer',
              border:`2px solid ${desireLevel===i+1?'var(--accent)':'transparent'}`,
              background:desireLevel===i+1?'var(--accent-soft)':'var(--bg3)',
            }}>{emoji}</button>
          ))}
        </div>
        {desireLevel > 0 && (
          <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:8 }}>
            {[rl('Нет желания','None'),rl('Слабое','Low'),rl('Среднее','Medium'),rl('Высокое','High'),rl('Очень высокое','Very high')][desireLevel-1]}
          </div>
        )}
      </div>

      {/* Мастурбация */}
      {(!isTeen || teenConfig.show_masturbation) && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: hadMasturbation?12:0 }}>
            <div style={{ fontSize:14 }}>{rl('Мастурбация','Masturbation')}</div>
            <Toggle value={hadMasturbation} onChange={setHadMasturbation} color='#a78bfa' />
          </div>
          {hadMasturbation && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <CountControl label={rl('Сколько раз за сутки','Times in this day')} value={masturbationCount} onChange={setMasturbationCount} />
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Тип','Type')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {MASTURBATION_TYPES.map(t => (
                  <button key={t.key} onClick={() => toggleArr(masturbationTypes, setMasturbationTypes, t.key)} style={{
                    padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                    border:`1px solid ${masturbationTypes.includes(t.key)?'#a78bfa':'var(--border)'}`,
                    background:masturbationTypes.includes(t.key)?'rgba(167,139,250,0.12)':'transparent',
                    color:masturbationTypes.includes(t.key)?'#a78bfa':'var(--text2)',
                    display:'flex', alignItems:'center', gap:5,
                  }}>
                    <span>{t.emoji}</span> <span>{lang==='en'?t.en:t.ru}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Секс */}
      {(!isTeen || teenConfig.show_sex) && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: hadSex?12:0 }}>
            <div style={{ fontSize:14 }}>{rl('Секс','Sex')}</div>
            <Toggle value={hadSex} onChange={setHadSex} color='#f472b6' />
          </div>
          {hadSex && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <CountControl label={rl('Сколько раз за сутки','Times in this day')} value={sexCount} onChange={setSexCount} />
              <div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Тип (можно несколько)','Type (multiple)')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {SEX_TYPES.map(t => (
                    <button key={t.key} onClick={() => toggleArr(sexTypes, setSexTypes, t.key)} style={{
                      padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                      border:`1px solid ${sexTypes.includes(t.key)?'#f472b6':'var(--border)'}`,
                      background:sexTypes.includes(t.key)?'rgba(244,114,182,0.12)':'transparent',
                      color:sexTypes.includes(t.key)?'#f472b6':'var(--text2)',
                      display:'flex', alignItems:'center', gap:5,
                    }}>
                      <span>{t.emoji}</span> <span>{lang==='en'?t.en:t.ru}</span>
                      <InfoTooltip id={t.key} />
                    </button>
                  ))}
                </div>
              </div>

              {(!isTeen || teenConfig.show_partner) && (
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Партнёр','Partner')}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {PARTNER_TYPES.map(p => (
                      <button key={p.key} onClick={() => setPartnerType(p.key)} style={{
                        padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                        border:`1px solid ${partnerType===p.key?'var(--accent)':'var(--border)'}`,
                        background:partnerType===p.key?'var(--accent-soft)':'transparent',
                        color:partnerType===p.key?'var(--accent)':'var(--text2)',
                        display:'flex', alignItems:'center', gap:5,
                      }}>
                        <span>{p.emoji}</span> <span>{lang==='en'?p.en:p.ru}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Контрацепция */}
              <div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Контрацепция','Contraception')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {CONTRACEPTION_USED.map(c => (
                    <button key={c.key} onClick={() => toggleArr(contraceptionUsed, setContraceptionUsed, c.key)} style={{
                      padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                      border:`1px solid ${contraceptionUsed.includes(c.key)?'var(--accent)':'var(--border)'}`,
                      background:contraceptionUsed.includes(c.key)?'var(--accent-soft)':'transparent',
                      color:contraceptionUsed.includes(c.key)?'var(--accent)':'var(--text2)',
                    }}>{lang==='en'?c.en:c.ru}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Несколько партнёров */}
      {hadSex && partnerType === 'multiple' && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
            {rl('Сколько партнёров за эти сутки?','How many partners today?')}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[2,3,4,'5+'].map(n => {
              const val = n === '5+' ? 5 : n
              return (
                <button key={n} onClick={() => setPartnersCount(val)} style={{
                  padding:'8px 16px', borderRadius:20, border:`1.5px solid ${partnersCount===val?'var(--accent)':'var(--border)'}`,
                  background:partnersCount===val?'var(--accent-soft)':'transparent',
                  color:partnersCount===val?'var(--accent)':'var(--text2)', fontSize:13, cursor:'pointer',
                }}>{n}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* Намерение беременности */}
      {hadSex && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px',
          background:'rgba(134,239,172,0.06)', borderRadius:10, border:'1px solid rgba(134,239,172,0.15)' }}>
          <div>
            <div style={{ fontSize:13, color:'var(--text)' }}>🌱 {rl('С намерением беременности','With pregnancy intent')}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{rl('Для подготовки к беременности','For pregnancy planning')}</div>
          </div>
          <button onClick={() => setPregnancyIntent(p=>!p)} style={{
            width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0,
            background:pregnancyIntent?'#86efac':'var(--bg3)', position:'relative', transition:'background 0.2s',
          }}>
            <div style={{ position:'absolute', top:2, width:20, height:20, borderRadius:'50%', background:'#fff', left:pregnancyIntent?22:2, transition:'left 0.2s' }} />
          </button>
        </div>
      )}

      {/* Приватность */}
      {!isTeen && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
            {rl('Кто видит','Visibility')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Toggle value={visiblePartner} onChange={setVisiblePartner} color='#f472b6' />
              <span style={{ fontSize:13, color:'var(--text2)' }}>{rl('Видит партнёр (только желание и тип)','Partner can see (desire & type only)')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Toggle value={visibleFriends} onChange={setVisibleFriends} />
              <span style={{ fontSize:13, color:'var(--text2)' }}>{rl('Видят подруги','Friends can see')}</span>
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
      </button>
    </div>
  )
}
