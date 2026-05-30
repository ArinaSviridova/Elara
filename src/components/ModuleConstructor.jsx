// Конструктор модулей — пользователь собирает приложение под себя
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

// Все доступные модули с описаниями
const ALL_MODULES = [
  { key: 'cycle',          emoji: '🩸', group: 'cycle',   ru: 'Цикл и месячные',         en: 'Cycle & periods',       desc_ru: 'Календарь, прогноз, фазы', desc_en: 'Calendar, predictions, phases' },
  { key: 'ovulation',      emoji: '✨', group: 'cycle',   ru: 'Овуляция',                en: 'Ovulation',             desc_ru: 'Окно овуляции и фертильности', desc_en: 'Ovulation & fertility window' },
  { key: 'pregnancy',      emoji: '🤰', group: 'cycle',   ru: 'Беременность',            en: 'Pregnancy',             desc_ru: 'Недели, симптомы, визиты', desc_en: 'Weeks, symptoms, appointments' },
  { key: 'hormones',       emoji: '💉', group: 'health',  ru: 'Гормональная терапия',    en: 'Hormone therapy',       desc_ru: 'ГАТ, ЗГТ, напоминания', desc_en: 'HRT, GAHT, reminders' },
  { key: 'contraception',  emoji: '🔵', group: 'health',  ru: 'Контрацепция',            en: 'Contraception',         desc_ru: 'Таблетки, спираль, пластырь', desc_en: 'Pills, IUD, patch' },
  { key: 'meds',           emoji: '💊', group: 'health',  ru: 'Лекарства',               en: 'Medications',           desc_ru: 'Напоминания, история приёма', desc_en: 'Reminders, intake history' },
  { key: 'symptoms',       emoji: '⚡', group: 'health',  ru: 'Симптомы',                en: 'Symptoms',              desc_ru: 'Боль, локализация, интенсивность', desc_en: 'Pain, location, intensity' },
  { key: 'mood',           emoji: '🌙', group: 'mental',  ru: 'Настроение',              en: 'Mood',                  desc_ru: 'Ежедневный трекер настроения', desc_en: 'Daily mood tracker' },
  { key: 'sleep',          emoji: '😴', group: 'mental',  ru: 'Сон',                     en: 'Sleep',                 desc_ru: 'Качество и продолжительность', desc_en: 'Quality & duration' },
  { key: 'stress',         emoji: '💭', group: 'mental',  ru: 'Стресс и тревога',        en: 'Stress & anxiety',      desc_ru: 'Уровень стресса и тревожности', desc_en: 'Stress & anxiety levels' },
  { key: 'libido',         emoji: '🌹', group: 'intimate',ru: 'Либидо',                  en: 'Libido',                desc_ru: 'Трекер сексуального желания', desc_en: 'Sexual desire tracker' },
  { key: 'sex',            emoji: '💜', group: 'intimate',ru: 'Секс и близость',         en: 'Sex & intimacy',        desc_ru: 'Дневник интимной жизни', desc_en: 'Intimacy journal' },
  { key: 'consent',        emoji: '🤍', group: 'intimate',ru: 'Согласие и границы',      en: 'Consent & boundaries',  desc_ru: 'Карточки потребностей дня', desc_en: 'Daily needs cards' },
  { key: 'sport',          emoji: '🏃', group: 'body',    ru: 'Спорт и движение',        en: 'Sport & movement',      desc_ru: 'Тренировки, добавки, AI-тренер', desc_en: 'Workouts, supplements, AI coach' },
  { key: 'nutrition',      emoji: '🥗', group: 'body',    ru: 'Питание и вес',           en: 'Nutrition & weight',    desc_ru: 'Опционально, без давления', desc_en: 'Optional, no pressure' },
  { key: 'partnerSync',    emoji: '🔄', group: 'social',  ru: 'Синхронизация с близкими',en: 'Sync with loved ones',  desc_ru: 'Общие окошки, статус дня', desc_en: 'Shared windows, day status' },
  { key: 'socialBattery',  emoji: '🔋', group: 'social',  ru: 'Социальная батарейка',    en: 'Social battery',        desc_ru: 'Трекер социальной энергии', desc_en: 'Social energy tracker' },
  { key: 'doctorExport',   emoji: '📋', group: 'medical', ru: 'Отчёт для врача',         en: 'Doctor report',         desc_ru: 'PDF/CSV экспорт данных', desc_en: 'PDF/CSV data export' },
  { key: 'labTests',       emoji: '🔬', group: 'medical', ru: 'Анализы и документы',     en: 'Lab tests & documents', desc_ru: 'Загрузка анализов и фото', desc_en: 'Upload tests & photos' },
  { key: 'dysphoria',      emoji: '💜', group: 'mental',  ru: 'Трекер дисфории',         en: 'Dysphoria tracker',     desc_ru: 'Личный дневник, план поддержки', desc_en: 'Personal journal, support plan' },
]

const GROUPS = [
  { key: 'cycle',   ru: '🩸 Цикл',          en: '🩸 Cycle' },
  { key: 'health',  ru: '💊 Здоровье',       en: '💊 Health' },
  { key: 'mental',  ru: '🧠 Психика и сон',  en: '🧠 Mind & sleep' },
  { key: 'intimate',ru: '💜 Интимное',       en: '💜 Intimate' },
  { key: 'body',    ru: '🏃 Тело',           en: '🏃 Body' },
  { key: 'social',  ru: '🔄 Социальное',     en: '🔄 Social' },
  { key: 'medical', ru: '📋 Медицинское',    en: '📋 Medical' },
]

// Пресеты
export const MODULE_PRESETS = [
  { key: 'cycle_basic', ru: '🩸 Базовый цикл', en: '🩸 Basic cycle',
    modules: ['cycle','ovulation','meds','symptoms','mood','doctorExport'] },
  { key: 'cycle_partner', ru: '🩸💑 Цикл + партнёр', en: '🩸💑 Cycle + partner',
    modules: ['cycle','meds','mood','libido','sex','consent','partnerSync','socialBattery'] },
  { key: 'hormone_therapy', ru: '💉 Гормональная терапия', en: '💉 Hormone therapy',
    modules: ['hormones','meds','mood','sleep','libido','dysphoria','symptoms','doctorExport'] },
  { key: 'contraception', ru: '🔵 Контрацепция', en: '🔵 Contraception',
    modules: ['cycle','contraception','meds','symptoms','sex'] },
  { key: 'pregnancy', ru: '🤰 Беременность', en: '🤰 Pregnancy',
    modules: ['pregnancy','meds','symptoms','mood','sleep','doctorExport'] },
  { key: 'menopause', ru: '🌸 Менопауза', en: '🌸 Menopause',
    modules: ['symptoms','meds','mood','sleep','stress','hormones','doctorExport'] },
  { key: 'wellbeing', ru: '🌿 Общее самочувствие', en: '🌿 General wellbeing',
    modules: ['mood','sleep','stress','sport','socialBattery','partnerSync'] },
  { key: 'male_health', ru: '♂ Мужское здоровье', en: '♂ Male health',
    modules: ['mood','sleep','stress','libido','sport','meds','socialBattery','partnerSync'] },
  { key: 'chronic_pain', ru: '⚡ Хроническая боль', en: '⚡ Chronic pain',
    modules: ['symptoms','meds','mood','sleep','doctorExport','labTests'] },
  { key: 'lgbtq_friendly', ru: '🌈 ЛГБТК+ дружественный', en: '🌈 LGBTQ+ friendly',
    modules: ['cycle','hormones','meds','mood','dysphoria','sex','consent','partnerSync','labTests'] },
  { key: 'custom', ru: '✏️ Настроить вручную', en: '✏️ Customize manually', modules: [] },
]

export default function ModuleConstructor({ onSave, initialModules, compact }) {
  const { profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()

  const [activeModules, setActiveModules] = useState(
    initialModules || profile?.enabled_modules || ALL_MODULES.map(m => m.key)
  )
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [saved, setSaved] = useState(false)

  function applyPreset(preset) {
    setSelectedPreset(preset.key)
    if (preset.modules.length > 0) setActiveModules(preset.modules)
  }

  function toggleModule(key) {
    setActiveModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function save() {
    await updateProfile({ enabled_modules: activeModules })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onSave?.(activeModules)
  }

  if (compact) return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {ALL_MODULES.map(m => (
        <button key={m.key} onClick={() => toggleModule(m.key)} style={{
          padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
          border:`1px solid ${activeModules.includes(m.key)?'var(--accent)':'var(--border)'}`,
          background:activeModules.includes(m.key)?'var(--accent-soft)':'transparent',
          color:activeModules.includes(m.key)?'var(--accent)':'var(--text3)',
        }}>{m.emoji} {lang==='en'?m.en:m.ru}</button>
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Пресеты */}
      <div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>
          {rl('Быстрый старт — выбери пресет:','Quick start — choose a preset:')}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {MODULE_PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p)} style={{
              padding:'6px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
              border:`1px solid ${selectedPreset===p.key?'var(--accent)':'var(--border)'}`,
              background:selectedPreset===p.key?'var(--accent-soft)':'var(--bg2)',
              color:selectedPreset===p.key?'var(--accent)':'var(--text2)',
              whiteSpace:'nowrap',
            }}>{lang==='en'?p.en:p.ru}</button>
          ))}
        </div>
      </div>

      {/* Модули по группам */}
      {GROUPS.map(group => {
        const groupModules = ALL_MODULES.filter(m => m.group === group.key)
        return (
          <div key={group.key}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7, letterSpacing:'0.06em' }}>
              {lang==='en'?group.en:group.ru}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {groupModules.map(m => {
                const active = activeModules.includes(m.key)
                return (
                  <div key={m.key} onClick={() => toggleModule(m.key)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    borderRadius:10, cursor:'pointer',
                    border:`1px solid ${active?'var(--accent)':'var(--border)'}`,
                    background:active?'var(--accent-soft)':'var(--bg2)',
                    transition:'all 0.15s',
                  }}>
                    <span style={{ fontSize:18 }}>{m.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:active?'var(--accent)':'var(--text)', fontWeight:active?500:400 }}>
                        {lang==='en'?m.en:m.ru}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                        {lang==='en'?m.desc_en:m.desc_ru}
                      </div>
                    </div>
                    <div style={{ width:20, height:20, borderRadius:4, border:`1.5px solid ${active?'var(--accent)':'var(--border)'}`, background:active?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {active && <span style={{ fontSize:12, color:'var(--bg)' }}>✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
        {rl('Выбрано модулей: ','Modules selected: ')}<strong style={{ color:'var(--accent)' }}>{activeModules.length}</strong> {rl('из','of')} {ALL_MODULES.length}
      </div>

      <button onClick={save} className="btn btn-primary">
        {saved ? '✓ ' + rl('Сохранено','Saved') : rl('Сохранить настройки','Save settings')}
      </button>
    </div>
  )
}
