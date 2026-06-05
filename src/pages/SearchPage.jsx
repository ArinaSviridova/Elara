import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { APP_ZONES, FEATURE_PLACEMENT } from '../lib/featureMap'

const BASE_ITEMS = [
  // ── Таблетки ──
  { titleRu:'Добавить таблетку', titleEn:'Add medication', path:'/medications', icon:'💊', tags:'лекарства таблетки препарат добавить' },
  { titleRu:'Внеплановое лекарство', titleEn:'Unplanned medication', path:'/medications?action=emergency', icon:'🆘', tags:'экстренно внеплановое лекарство ибупрофен эскапел антибиотик' },
  { titleRu:'История приёма таблеток', titleEn:'Medication history', path:'/medications', icon:'📋', tags:'история приём таблетки лекарства' },

  // ── Здоровье ──
  { titleRu:'Что назначил врач', titleEn:'Prescriptions', path:'/health?tab=assignments', icon:'📋', tags:'назначения врач рекомендации лекарства' },
  { titleRu:'Мои заболевания', titleEn:'My conditions', path:'/health?tab=diseases', icon:'🩺', tags:'заболевания диагнозы хронические состояния' },
  { titleRu:'Контрацепция', titleEn:'Contraception', path:'/health?tab=contraception', icon:'🔵', tags:'контрацепция таблетки спираль презервативы кок' },
  { titleRu:'Самочувствие / тело', titleEn:'Body / wellbeing', path:'/health?tab=body', icon:'💜', tags:'вес рост самочувствие тело иmt' },

  // ── Анализы ──
  { titleRu:'Загрузить анализ', titleEn:'Upload lab report', path:'/health?tab=analyses', icon:'🧪', tags:'анализы лаборатория загрузить архив' },
  { titleRu:'Архив документов', titleEn:'Document archive', path:'/health?tab=archive', icon:'📁', tags:'документы pdf архив врач история' },

  // ── Прочее ──
  { titleRu:'Прививки', titleEn:'Vaccines', path:'/health?tab=body', icon:'💉', tags:'вакцина вакцинация прививки впч tdap' },
  { titleRu:'Отметить день в календаре', titleEn:'Mark a calendar day', path:'/calendar', icon:'◯', tags:'цикл месячные пмс овуляция фазы' },
  { titleRu:'Интимный трекер', titleEn:'Intimacy tracker', path:'/intimacy', icon:'🌹', tags:'интим секс либидо согласие' },
  { titleRu:'Дневник', titleEn:'Diary', path:'/diary', icon:'◈', tags:'дневник настроение мысли эмоции' },
  { titleRu:'Пройти тесты', titleEn:'Take tests', path:'/tests', icon:'🧠', tags:'тесты phq gad asrs mrs тревога сдвг депрессия' },
  { titleRu:'Персонализация AI', titleEn:'AI personalization', path:'/personalization', icon:'✨', tags:'ai персонализация настройки что отслеживать функции' },
  { titleRu:'Синхронизация круга', titleEn:'Circle sync', path:'/friends', icon:'✦', tags:'круг друзья синхронизация доступы' },
  { titleRu:'Гайд по приложению', titleEn:'App guide', path:'/how-it-works', icon:'💡', tags:'гайд помощь как работает faq' },
  { titleRu:'Настройки профиля', titleEn:'Profile settings', path:'/profile', icon:'🧬', tags:'профиль настройки гендер режим тела' },
  { titleRu:'Достижения', titleEn:'Achievements', path:'/achievements', icon:'🏆', tags:'ачивки достижения прогресс' },
  { titleRu:'Питание и меню', titleEn:'Nutrition & menu', path:'/nutrition', icon:'🥗', tags:'питание меню рецепты кбжу калории диета еда' },
  { titleRu:'Спорт и активность', titleEn:'Sport & activity', path:'/sport', icon:'🏃', tags:'спорт тренировка активность движение' },
]

export default function SearchPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [query, setQuery] = useState('')
  const rl = (ru, en) => (lang === 'en' ? en : ru)

  const items = useMemo(() => {
    const zones = Object.values(APP_ZONES).map(z => ({
      titleRu: z.titleRu,
      titleEn: z.titleEn,
      path: z.path,
      icon: z.icon,
      tags: `${z.titleRu} ${z.titleEn} ${z.purposeRu} ${z.purposeEn}`,
      subtitleRu: z.purposeRu,
      subtitleEn: z.purposeEn,
    }))
    const features = FEATURE_PLACEMENT.map(f => ({
      titleRu: f.titleRu,
      titleEn: f.titleEn,
      path: APP_ZONES[f.zone]?.path || '/health',
      icon: APP_ZONES[f.zone]?.icon || '🩺',
      tags: `${f.titleRu} ${f.titleEn} ${f.whyRu} ${f.whyEn}`,
      subtitleRu: f.whyRu,
      subtitleEn: f.whyEn,
    }))
    return [...BASE_ITEMS, ...zones, ...features]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 12)
    return items.filter(item => [item.titleRu, item.titleEn, item.tags, item.subtitleRu, item.subtitleEn].join(' ').toLowerCase().includes(q))
  }, [items, query])

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'20px 16px 28px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ width:'auto', padding:'8px 12px' }}>←</button>
        <div>
          <h2 style={{ fontSize:26 }}>{rl('Поиск в Elara','Search Elara')}</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text3)' }}>{rl('Найди таблетки, анализы, тесты, прививки, модули и настройки.','Find meds, labs, tests, vaccines, modules, and settings.')}</p>
        </div>
      </div>
      <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={rl('Например: ВПЧ, дневник, таблетки...', 'E.g.: HPV, diary, meds...')} style={{ marginBottom:14 }} />
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((item, idx) => (
          <button key={`${item.path}-${item.titleRu}-${idx}`} onClick={() => navigate(item.path)} className="card" style={{ padding:14, textAlign:'left', cursor:'pointer', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:22 }}>{item.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{rl(item.titleRu, item.titleEn)}</div>
                {(item.subtitleRu || item.subtitleEn) && <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5, marginTop:4 }}>{rl(item.subtitleRu, item.subtitleEn)}</div>}
              </div>
              <span style={{ color:'var(--text3)' }}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
