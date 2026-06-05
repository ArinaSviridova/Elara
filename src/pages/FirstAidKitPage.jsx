import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { earnAchievement, hasAchievement } from '../lib/achievements'
import { showAchievementToast } from '../components/AchievementToast'

const KIT_CATEGORIES = [
  {
    key: 'wounds', emoji: '🩹', ru: 'Раны и ожоги', en: 'Wounds & burns', items: [
      { id:'gloves', ru:'Нитриловые перчатки', en:'Nitrile gloves', noteRu:'Защита от крови и биологических жидкостей.', noteEn:'Protection from blood and body fluids.' },
      { id:'gauze', ru:'Стерильные марлевые салфетки', en:'Sterile gauze pads', noteRu:'Для давления на рану и закрытия повреждений.', noteEn:'For pressure and wound covering.' },
      { id:'bandage', ru:'Бинты разной ширины', en:'Bandages in different widths', noteRu:'Фиксация повязок.', noteEn:'Securing dressings.' },
      { id:'plasters', ru:'Пластыри разных размеров', en:'Adhesive plasters', noteRu:'Мелкие порезы и ссадины.', noteEn:'Small cuts and abrasions.' },
      { id:'tape', ru:'Медицинский пластырь-лента', en:'Medical tape', noteRu:'Фиксировать марлю и бинты.', noteEn:'Secure gauze and bandages.' },
      { id:'antiseptic', ru:'Антисептик для кожи / салфетки', en:'Skin antiseptic / wipes', noteRu:'Обработка небольших поверхностных повреждений.', noteEn:'Cleaning small superficial wounds.' },
      { id:'burn_dressing', ru:'Неприлипающая повязка', en:'Non-stick dressing', noteRu:'Для ожогов и мокнущих ран.', noteEn:'For burns and moist wounds.' },
      { id:'saline', ru:'Физраствор / стерильная вода', en:'Saline / sterile water', noteRu:'Промывание мелких загрязнений.', noteEn:'Rinsing minor contamination.' },
    ],
  },
  {
    key: 'tools', emoji: '✂️', ru: 'Инструменты', en: 'Tools', items: [
      { id:'scissors', ru:'Ножницы с тупым концом', en:'Blunt-tip scissors', noteRu:'Разрезать бинт или одежду.', noteEn:'Cut bandages or clothing.' },
      { id:'tweezers', ru:'Пинцет', en:'Tweezers', noteRu:'Занозы и мелкие инородные частицы на поверхности.', noteEn:'Splinters and small superficial particles.' },
      { id:'thermometer', ru:'Термометр', en:'Thermometer', noteRu:'Температура - банально, но человечество всё ещё забывает.', noteEn:'Temperature checks. Boring, useful, often forgotten.' },
      { id:'instant_cold', ru:'Холодовый пакет', en:'Instant cold pack', noteRu:'Ушибы, растяжения, отёк.', noteEn:'Bruises, sprains, swelling.' },
      { id:'cpr_mask', ru:'Маска/барьер для СЛР', en:'CPR face shield/barrier', noteRu:'Для вентиляции, если обучены.', noteEn:'For rescue breaths if trained.' },
      { id:'blanket', ru:'Термопокрывало', en:'Emergency blanket', noteRu:'Согревание при шоке/ознобе.', noteEn:'Warmth during shock/chills.' },
    ],
  },
  {
    key: 'meds', emoji: '💊', ru: 'Базовые лекарства', en: 'Basic medicines', items: [
      { id:'paracetamol', ru:'Парацетамол', en:'Paracetamol/acetaminophen', noteRu:'Боль/температура. Дозировки - по инструкции и противопоказаниям.', noteEn:'Pain/fever. Dose by label and contraindications.' },
      { id:'ibuprofen', ru:'Ибупрофен', en:'Ibuprofen', noteRu:'Боль/температура/воспаление, не всем можно при желудке, почках, беременности и антикоагулянтах.', noteEn:'Pain/fever/inflammation. Not for everyone: stomach, kidney, pregnancy, anticoagulants matter.' },
      { id:'oral_rehydration', ru:'Раствор для оральной регидратации', en:'Oral rehydration salts', noteRu:'Рвота, диарея, обезвоживание.', noteEn:'Vomiting, diarrhea, dehydration.' },
      { id:'antihistamine', ru:'Антигистаминное', en:'Antihistamine', noteRu:'Лёгкие аллергические реакции. Не замена адреналину при анафилаксии.', noteEn:'Mild allergic reactions. Not a replacement for epinephrine in anaphylaxis.' },
      { id:'personal_meds', ru:'Личные препараты', en:'Personal medications', noteRu:'То, что назначил врач: ингалятор, автоинъектор адреналина, нитраты и т.п.', noteEn:'Doctor-prescribed: inhaler, epinephrine autoinjector, nitrates, etc.' },
    ],
  },
  {
    key: 'documents', emoji: '📄', ru: 'Документы и безопасность', en: 'Documents & safety', items: [
      { id:'instructions', ru:'Краткая памятка первой помощи', en:'Short first-aid guide', noteRu:'Паника читает хуже, чем обычный человек, а это уже достижение.', noteEn:'Panic reads poorly, so keep instructions simple.' },
      { id:'contacts', ru:'Экстренные контакты', en:'Emergency contacts', noteRu:'112/местная скорая, близкие, врач.', noteEn:'Local emergency number, close contacts, clinician.' },
      { id:'med_list', ru:'Список лекарств и аллергий', en:'Medication and allergy list', noteRu:'Особенно если дома есть дети, пожилые или хронические заболевания.', noteEn:'Especially with children, older adults, or chronic conditions at home.' },
      { id:'expiry_marker', ru:'Маркер/наклейки для сроков годности', en:'Expiry labels/marker', noteRu:'Чтобы не хранить музей просроченного ибупрофена.', noteEn:'So the kit does not become a museum of expired ibuprofen.' },
    ],
  },
]

const REVISION_STEPS_RU = [
  'Раз в месяц открой аптечку и проверь сроки годности.',
  'После любого использования сразу восполни расходники.',
  'Лекарства держи в оригинальных упаковках с инструкциями.',
  'Раздели: раны, инструменты, лекарства, личные препараты, документы.',
  'Храни аптечку в доступном сухом месте, но вне доступа маленьких детей.',
]

const REVISION_STEPS_EN = [
  'Once a month, open the kit and check expiry dates.',
  'After any use, restock immediately.',
  'Keep medicines in original packaging with instructions.',
  'Separate: wounds, tools, medicines, personal meds, documents.',
  'Store in an accessible dry place, away from small children.',
]

const SOURCES = [
  { label:'Household first-aid kit preparedness survey', url:'https://pubmed.ncbi.nlm.nih.gov/38982457/' },
  { label:'Home first-aid kits and emergency preparedness', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9742271/' },
  { label:'Emergency supply kits and medical self-sufficiency', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12360477/' },
  { label:'Medication safety in home care', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11574791/' },
]

function loadOwned(userId) {
  try { return JSON.parse(localStorage.getItem(`elara_first_aid_kit_${userId || 'anon'}`) || '{}') } catch { return {} }
}

export default function FirstAidKitPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const [owned, setOwned] = useState(() => loadOwned(user?.id))
  const [lastRevision, setLastRevision] = useState(() => localStorage.getItem(`elara_first_aid_kit_revision_${user?.id || 'anon'}`) || '')

  useEffect(() => {
    if (!user?.id) return
    setOwned(loadOwned(user.id))
    setLastRevision(localStorage.getItem(`elara_first_aid_kit_revision_${user.id}`) || '')
  }, [user?.id])

  useEffect(() => {
    if (!profile || !user?.id || hasAchievement(profile, 'kit_started')) return
    earnAchievement(supabase, profile, 'kit_started', updateProfile).then(ok => {
      if (ok) showAchievementToast('kit_started')
    }).catch(() => {})
  }, [profile?.id, user?.id])

  function toggle(id) {
    const next = { ...owned, [id]: !owned[id] }
    setOwned(next)
    if (user?.id) localStorage.setItem(`elara_first_aid_kit_${user.id}`, JSON.stringify(next))
  }

  function markRevision() {
    const date = new Date().toISOString().slice(0,10)
    setLastRevision(date)
    if (user?.id) localStorage.setItem(`elara_first_aid_kit_revision_${user.id}`, date)
  }

  const allItems = KIT_CATEGORIES.flatMap(c => c.items)
  const ownedCount = allItems.filter(i => owned[i.id]).length
  const percent = allItems.length ? Math.round((ownedCount / allItems.length) * 100) : 0

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/today')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 11px' }}>‹</button>
        <div>
          <h2 style={{ fontSize:25, margin:0 }}>🧰 {rl('Аптечка', 'First-aid kit')}</h2>
          <p style={{ margin:'4px 0 0', color:'var(--text3)', fontSize:12, lineHeight:1.45 }}>
            {rl('Базовый домашний набор, чек-лист наличия и ревизия. Потому что “где-то был бинт” - не стратегия.', 'Basic home kit, checklist and revision. “There was a bandage somewhere” is not a strategy.')}
          </p>
        </div>
      </div>

      <section className="card" style={{ padding:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:13, color:'var(--text3)' }}>{rl('Готовность аптечки', 'Kit readiness')}</div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--accent)' }}>{percent}%</div>
          </div>
          <button className="btn btn-primary" type="button" onClick={markRevision} style={{ width:'auto', padding:'9px 12px', fontSize:12 }}>
            {rl('Провести ревизию', 'Mark revision')}
          </button>
        </div>
        <div style={{ height:7, borderRadius:999, background:'var(--bg3)', overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:`${percent}%`, height:'100%', background:'var(--accent)' }} />
        </div>
        <div style={{ fontSize:11, color:'var(--text3)' }}>
          {lastRevision ? rl(`Последняя ревизия: ${lastRevision}`, `Last revision: ${lastRevision}`) : rl('Ревизия ещё не отмечалась', 'No revision marked yet')}
        </div>
      </section>

      {KIT_CATEGORIES.map(cat => {
        const got = cat.items.filter(i => owned[i.id]).length
        return (
          <section key={cat.key} className="card" style={{ padding:14 }}>
            <h3 style={{ margin:'0 0 8px', fontSize:19 }}>{cat.emoji} {lang === 'en' ? cat.en : cat.ru}</h3>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>{got}/{cat.items.length} {rl('есть', 'owned')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cat.items.map(item => (
                <button key={item.id} type="button" onClick={() => toggle(item.id)} style={{
                  display:'flex', gap:10, alignItems:'flex-start', textAlign:'left', cursor:'pointer', padding:10, borderRadius:13,
                  border:`1px solid ${owned[item.id] ? 'var(--accent)' : 'var(--border)'}`,
                  background: owned[item.id] ? 'var(--accent-soft)' : 'var(--bg2)', color:'var(--text2)',
                }}>
                  <span style={{ width:24, height:24, borderRadius:8, border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: owned[item.id] ? 'var(--accent)' : 'var(--text3)' }}>
                    {owned[item.id] ? '✓' : ''}
                  </span>
                  <span>
                    <span style={{ display:'block', fontWeight:750, fontSize:13, color: owned[item.id] ? 'var(--accent)' : 'var(--text)' }}>{lang === 'en' ? item.en : item.ru}</span>
                    <span style={{ display:'block', fontSize:11, lineHeight:1.45, marginTop:2, color:'var(--text3)' }}>{lang === 'en' ? item.noteEn : item.noteRu}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <section className="card" style={{ padding:14 }}>
        <h3 style={{ margin:'0 0 8px', fontSize:18 }}>🔁 {rl('Как проводить ревизию', 'How to revise')}</h3>
        {(lang === 'en' ? REVISION_STEPS_EN : REVISION_STEPS_RU).map((step, idx) => (
          <div key={idx} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>✓ {step}</div>
        ))}
      </section>

      <section className="card" style={{ padding:14 }}>
        <h3 style={{ margin:'0 0 8px', fontSize:18 }}>🔬 {rl('Источники', 'Sources')}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {SOURCES.map(src => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', fontSize:12, textDecoration:'none' }}>
              🔗 {src.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
