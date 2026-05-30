import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const EXPORT_SECTIONS = [
  { key:'cycle',     emoji:'🩸', ru:'Цикл и месячные',       en:'Cycle & periods' },
  { key:'symptoms',  emoji:'⚡', ru:'Симптомы и боль',        en:'Symptoms & pain' },
  { key:'meds',      emoji:'💊', ru:'Лекарства',              en:'Medications' },
  { key:'mood',      emoji:'🌙', ru:'Настроение и сон',       en:'Mood & sleep' },
  { key:'sex',       emoji:'💜', ru:'Сексуальное здоровье',   en:'Sexual health' },
  { key:'notes',     emoji:'📓', ru:'Заметки дневника',       en:'Diary notes' },
  { key:'labs',      emoji:'🔬', ru:'Анализы и документы',    en:'Lab tests & docs' },
  { key:'dysphoria', emoji:'💜', ru:'Дневник дисфории',       en:'Dysphoria journal' },
]

const PERIOD_OPTIONS = [
  { days:7,  ru:'7 дней',    en:'7 days' },
  { days:30, ru:'30 дней',   en:'30 days' },
  { days:90, ru:'3 месяца',  en:'3 months' },
  { days:180,ru:'6 месяцев', en:'6 months' },
]

function groupPeriodEpisodes(entries = []) {
  const periodDays = entries
    .filter(e => e.type === 'period')
    .map(e => e.date)
    .sort()
  if (!periodDays.length) return []

  const groups = []
  let current = [periodDays[0]]

  for (let i = 1; i < periodDays.length; i++) {
    const prev = new Date(periodDays[i - 1] + 'T00:00:00')
    const next = new Date(periodDays[i] + 'T00:00:00')
    const diff = Math.round((next - prev) / 86400000)
    if (diff <= 2) current.push(periodDays[i])
    else { groups.push(current); current = [periodDays[i]] }
  }
  groups.push(current)

  return groups.map(g => ({
    start: g[0],
    end: g[g.length - 1],
    days: g.length,
    isLikelySetupNoise: g.length === 1,
  }))
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function getPrescribedItems(profile) {
  return (profile?.health?.assignments || []).flatMap(assignment =>
    (assignment.medications || []).map(m => ({ ...m, assignment }))
  )
}

function getPrescriptionForMed(profile, medName) {
  const name = normalizeText(medName).toLowerCase()
  return getPrescribedItems(profile).find(item => {
    const candidate = normalizeText(item.name || item.medication || item.drug || item.title).toLowerCase()
    return candidate && (candidate === name || name.includes(candidate) || candidate.includes(name))
  })
}

function loadMedicationIntakeStatus() {
  try { return JSON.parse(localStorage.getItem('elara_med_intake_status') || '{}') }
  catch { return {} }
}

function isMedicationTakenForReport(profile, med, intakeStatus) {
  const status = intakeStatus?.[med.id]
  if (status === 'not_taking') return false
  if (status === 'taking') return true
  const fromPrescription = !!getPrescriptionForMed(profile, med.name)
  return !fromPrescription
}

function buildMoodSummary(moodEntries = [], dayStatuses = [], diaryEntries = []) {
  const map = new Map()
  moodEntries.forEach(entry => {
    if (!entry.date) return
    const item = map.get(entry.date) || { date: entry.date, mood_marks: [], day_status: null, diary_tags: [] }
    if (entry.mood) item.mood_marks.push(entry.mood)
    map.set(entry.date, item)
  })
  dayStatuses.forEach(entry => {
    if (!entry.date) return
    const item = map.get(entry.date) || { date: entry.date, mood_marks: [], day_status: null, diary_tags: [] }
    item.day_status = {
      mood: entry.mood ?? null,
      energy: entry.energy ?? null,
      pain: entry.pain ?? null,
      social_battery: entry.social_battery ?? null,
      libido: entry.libido ?? null,
      tags: entry.tags || [],
    }
    map.set(entry.date, item)
  })
  diaryEntries.forEach(entry => {
    if (!entry.date) return
    const tags = Array.isArray(entry.tags) ? entry.tags : []
    const hasText = !!String(entry.encrypted_text || '').trim()
    if (!tags.length && !hasText) return
    const item = map.get(entry.date) || { date: entry.date, mood_marks: [], day_status: null, diary_tags: [] }
    item.diary_tags = tags
    item.has_diary_note = hasText
    map.set(entry.date, item)
  })
  return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date))
}

export default function ExportPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()

  const [sections, setSections] = useState(['cycle','symptoms','meds','mood'])
  const [period, setPeriod] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [exportData, setExportData] = useState(null)
  const [format, setFormat] = useState('pdf') // pdf | csv | text

  function toggle(key) {
    setSections(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])
  }

  async function generate() {
    setGenerating(true)
    setAiSummary('')
    setExportData(null)

    try {
      const since = new Date()
      since.setDate(since.getDate() - period)
      const sinceStr = since.toISOString().slice(0,10)

      // Загружаем данные по выбранным секциям
      const data = { period, sections, generated_at: new Date().toISOString() }

      if (sections.includes('cycle')) {
        const { data: entries } = await supabase.from('cycle_entries')
          .select('*').eq('user_id', user.id).gte('date', sinceStr).order('date')
        data.cycle = entries || []
        const periodEpisodes = groupPeriodEpisodes(data.cycle)
        data.cycle_summary = {
          period_days: data.cycle.filter(e => e.type === 'period').length,
          period_episodes: periodEpisodes.length,
          likely_setup_single_days: periodEpisodes.filter(e => e.isLikelySetupNoise).length,
          episodes: periodEpisodes,
        }
      }
      if (sections.includes('symptoms')) {
        const { data: syms } = await supabase.from('symptoms')
          .select('*').eq('user_id', user.id).gte('date', sinceStr).order('date')
        data.symptoms = syms || []
      }
      if (sections.includes('meds')) {
        const { data: meds } = await supabase.from('medications')
          .select('*').eq('user_id', user.id).eq('is_active', true)
        const { data: em } = await supabase.from('emergency_meds')
          .select('*').eq('user_id', user.id).gte('date', sinceStr)
        const intakeStatus = loadMedicationIntakeStatus()
        const activeTakenMeds = (meds || []).filter(med => isMedicationTakenForReport(profile, med, intakeStatus))
        data.medications = activeTakenMeds
        data.medications_excluded_not_taking = (meds || []).filter(med => !isMedicationTakenForReport(profile, med, intakeStatus)).map(med => ({ id: med.id, name: med.name }))
        data.emergency_meds = em || []
      }
      if (sections.includes('mood')) {
        const [{ data: moodEntries }, { data: dayStatuses }, { data: diaryEntries }] = await Promise.all([
          supabase.from('mood_entries').select('*').eq('user_id', user.id).gte('date', sinceStr).order('date'),
          supabase.from('day_statuses').select('*').eq('user_id', user.id).gte('date', sinceStr).order('date'),
          supabase.from('diary_entries').select('date, tags, encrypted_text').eq('user_id', user.id).gte('date', sinceStr).order('date'),
        ])
        data.mood = buildMoodSummary(moodEntries || [], dayStatuses || [], diaryEntries || [])
        data.mood_raw = { mood_entries: moodEntries || [], day_statuses: dayStatuses || [], diary_entries: diaryEntries || [] }
      }

      // AI-сводка для врача
      const { data: aiData } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'medical_summary',
          language: lang,
          periodDays: period,
          sections,
          dataPreview: {
            includedSections: sections,
            cycleDaysCount: sections.includes('cycle') ? (data.cycle_summary?.period_days || 0) : null,
            periodEpisodesCount: sections.includes('cycle') ? (data.cycle_summary?.period_episodes || 0) : null,
            likelySetupSingleDays: sections.includes('cycle') ? (data.cycle_summary?.likely_setup_single_days || 0) : null,
            symptomsCount: sections.includes('symptoms') ? (data.symptoms?.length || 0) : null,
            activeMedsCount: sections.includes('meds') ? (data.medications?.length || 0) : null,
            excludedNotTakingMedsCount: sections.includes('meds') ? (data.medications_excluded_not_taking?.length || 0) : null,
            moodDaysCount: sections.includes('mood') ? (data.mood?.length || 0) : null,
          }
        }
      })
      if (aiData?.summary) setAiSummary(aiData.summary)

      setExportData(data)
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
  }

  function downloadCSV() {
    if (!exportData) return
    const rows = []
    rows.push(['Дата', 'Тип', 'Значение', 'Заметка'])

    exportData.cycle?.forEach(e => rows.push([e.date, 'Цикл', e.type, '']))
    exportData.symptoms?.forEach(e => rows.push([e.date, 'Симптом', e.type, e.intensity || '']))
    exportData.mood?.forEach(e => rows.push([e.date, 'Настроение/дневник', [e.mood_marks?.join('; '), e.day_status?.mood != null ? `ползунок: ${e.day_status.mood}` : '', e.diary_tags?.join('; ')].filter(Boolean).join(' | '), '']))

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `elara_export_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  function downloadText() {
    if (!exportData) return
    let text = `=== ОТЧЁТ ELARA ===\n`
    text += `Период: последние ${period} дней\n`
    text += `Дата создания: ${new Date().toLocaleDateString('ru-RU')}\n\n`
    if (aiSummary) text += `=== AI-СВОДКА ДЛЯ ВРАЧА ===\n${aiSummary}\n\n`
    text += `⚠️ Данные носят информационный характер. Не являются диагнозом.\n`

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `elara_report_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:16, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>📋 {rl('Отчёт для врача','Doctor report')}</h2>
      </div>

      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
        {rl('AI составит сводку только по включённым разделам. В лекарства попадают только препараты со статусом «Принимаю» или ручные активные препараты; «Не принимаю» не считаются. Настроение считается по дням календаря/дневника, а не по каждой отдельной эмоции.','AI summarizes only selected sections. Medications marked “Not taking” are excluded. Mood is counted by calendar/diary days, not by every separate mood chip.')}
      </p>

      {/* Период */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{rl('Период','Period')}</div>
        <div style={{ display:'flex', gap:6 }}>
          {PERIOD_OPTIONS.map(p => (
            <button key={p.days} onClick={() => setPeriod(p.days)} style={{
              flex:1, padding:'8px 4px', borderRadius:8, fontSize:12, cursor:'pointer',
              border:`1px solid ${period===p.days?'var(--accent)':'var(--border)'}`,
              background:period===p.days?'var(--accent-soft)':'transparent',
              color:period===p.days?'var(--accent)':'var(--text2)',
            }}>{lang==='en'?p.en:p.ru}</button>
          ))}
        </div>
      </div>

      {/* Секции */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{rl('Включить в отчёт:','Include in report:')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {EXPORT_SECTIONS.map(s => {
            const active = sections.includes(s.key)
            return (
              <button key={s.key} onClick={() => toggle(s.key)} style={{
                padding:'9px 12px', borderRadius:9, cursor:'pointer', textAlign:'left',
                display:'flex', alignItems:'center', gap:8, fontSize:12,
                border:`1px solid ${active?'var(--accent)':'var(--border)'}`,
                background:active?'var(--accent-soft)':'transparent',
                color:active?'var(--accent)':'var(--text2)',
              }}>
                <span>{s.emoji}</span>
                <span style={{ flex:1 }}>{lang==='en'?s.en:s.ru}</span>
                {active && <span style={{ fontSize:10 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={generate} disabled={generating || sections.length===0} className="btn btn-primary">
        {generating ? `✦ ${rl('Генерирую...','Generating...')}` : `✦ ${rl('Создать отчёт','Generate report')}`}
      </button>

      {/* AI сводка */}
      {aiSummary && (
        <div className="card" style={{ padding:'16px' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--accent)', marginBottom:10 }}>
            ✦ {rl('AI-сводка для врача','AI summary for doctor')}
          </div>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:'0 0 12px', fontFamily:'Cormorant Garamond, serif', fontStyle:'italic' }}>
            {aiSummary}
          </p>
          <div style={{ padding:'8px 10px', background:'rgba(248,113,113,0.06)', borderRadius:6, fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
            ⚠️ {rl('AI не ставит диагнозы. Это сводка данных для обсуждения с врачом.','AI does not diagnose. This is a data summary for discussion with your doctor.')}
          </div>
        </div>
      )}

      {/* Кнопки скачивания */}
      {exportData && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>{rl('Скачать:','Download:')}</div>
          <button onClick={downloadCSV} className="btn btn-ghost" style={{ justifyContent:'flex-start', gap:10 }}>
            📊 {rl('CSV таблица (для Excel)','CSV table (for Excel)')}
          </button>
          <button onClick={downloadText} className="btn btn-ghost" style={{ justifyContent:'flex-start', gap:10 }}>
            📄 {rl('Текстовый отчёт','Text report')}
          </button>
        </div>
      )}
    </div>
  )
}
