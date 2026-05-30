import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib
  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }
  return window.pdfjsLib
}

async function convertPdfToImages(file) {
  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)
  const pdfjs = await ensurePdfJs()
  if (!pdfjs) throw new Error('PDF.js is not available')

  const pdf = await pdfjs.getDocument({ data: uint8 }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 2.6 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    pages.push({
      pageNumber,
      mediaType: 'image/jpeg',
      base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1],
    })
  }

  return pages
}

async function imageFileToPage(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  return [{ pageNumber: 1, mediaType: file.type || 'image/jpeg', base64 }]
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function conditionLabel(item) {
  if (!item) return ''
  if (typeof item === 'string') return normalizeText(item)
  return normalizeText(item.name || item.condition || item.title)
}

function medicationName(item) {
  return normalizeText(item?.name || item?.medication || item?.drug || item?.title)
}

function medicationDosage(item) {
  return [item?.dosage, item?.dose, item?.duration, item?.frequency, item?.instructions]
    .filter(Boolean)
    .map(normalizeText)
    .filter(Boolean)
    .join(' · ')
}

function guessTimes(item) {
  const raw = normalizeText([item?.time, item?.times, item?.frequency, item?.instructions].filter(Boolean).join(' ')).toLowerCase()
  if (/2\s*(раз|times)|twice|bid|утром.*вечером|morning.*evening/.test(raw)) return ['09:00', '21:00']
  if (/3\s*(раз|times)|three|tid/.test(raw)) return ['09:00', '15:00', '21:00']
  if (/вечер|night|evening|bedtime|перед сном/.test(raw)) return ['21:00']
  if (/обед|day|afternoon/.test(raw)) return ['14:00']
  return ['09:00']
}

function normalizeAssignment(aiData, fileName) {
  const sourceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const doctor = aiData?.doctor || aiData?.doctor_info || {}
  const doctorName = normalizeText(typeof doctor === 'string' ? doctor : doctor.name)
  const specialty = normalizeText(typeof doctor === 'object' ? doctor.specialty : '')
  const clinic = normalizeText(typeof doctor === 'object' ? doctor.clinic : '')

  return {
    id: sourceId,
    source: 'AI',
    sourceFile: fileName,
    documentType: aiData?.detected_type || 'Документ',
    date: aiData?.document_date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    doctor: {
      name: doctorName || null,
      specialty: specialty || null,
      clinic: clinic || null,
    },
    analyses: Array.isArray(aiData?.detected_tests) ? aiData.detected_tests : [],
    medications: Array.isArray(aiData?.prescriptions) ? aiData.prescriptions : [],
    recommendations: Array.isArray(aiData?.recommendations)
      ? aiData.recommendations
      : aiData?.advice ? [aiData.advice] : [],
    testsToDo: Array.isArray(aiData?.tests_to_do) ? aiData.tests_to_do : [],
    followUp: aiData?.follow_up || null,
    findings: aiData?.findings || null,
    summary: aiData?.summary || null,
  }
}

export default function HealthArchivePage() {
  const { user, refetchProfile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processedResults, setProcessedResults] = useState([])

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    const { data } = await supabase.from('health_documents')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }

  async function appendHealthData(aiData, fileName) {
    const assignment = normalizeAssignment(aiData, fileName)
    const detectedConditions = (aiData?.detected_conditions || []).map(conditionLabel).filter(Boolean)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('health')
      .eq('id', user.id)
      .single()

    const health = profileData?.health || {}
    const prevDiseases = Array.isArray(health.diseases) ? health.diseases : []
    const prevAssignments = Array.isArray(health.assignments) ? health.assignments : []

    const nextDiseases = [...prevDiseases]
    for (const condition of detectedConditions) {
      const aiLabel = condition.includes('AI') ? condition : `${condition} ✨ AI`
      const exists = nextDiseases.some(d => normalizeText(d).replace('✨ AI', '').trim().toLowerCase() === condition.toLowerCase())
      if (!exists) nextDiseases.push(aiLabel)
    }

    const hasUsefulAssignment = assignment.medications.length || assignment.recommendations.length || assignment.testsToDo.length || assignment.doctor.name || assignment.findings || assignment.summary
    const nextAssignments = hasUsefulAssignment ? [assignment, ...prevAssignments] : prevAssignments

    await supabase.from('profiles').update({
      health: {
        ...health,
        diseases: nextDiseases,
        assignments: nextAssignments,
      }
    }).eq('id', user.id)

    await addPrescribedMedications(assignment)
    await refetchProfile?.()

    return { assignment, addedConditions: detectedConditions }
  }

  async function addPrescribedMedications(assignment) {
    const prescribed = Array.isArray(assignment.medications) ? assignment.medications : []
    if (!prescribed.length) return []

    const { data: existing } = await supabase
      .from('medications')
      .select('name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const existingNames = new Set((existing || []).map(m => normalizeText(m.name).toLowerCase()))
    const inserted = []

    for (const item of prescribed) {
      const name = medicationName(item)
      if (!name || existingNames.has(name.toLowerCase())) continue

      const payload = {
        user_id: user.id,
        name,
        dosage: medicationDosage(item),
        times: guessTimes(item),
        all_days: true,
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
      }

      const { error } = await supabase.from('medications').insert(payload)
      if (!error) {
        existingNames.add(name.toLowerCase())
        inserted.push(name)
      }
    }

    return inserted
  }

  async function analyzeOneFile(file) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const documentPages = isPdf ? await convertPdfToImages(file) : await imageFileToPage(file)
    const firstPage = documentPages[0]

    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-advisor', {
      body: {
        userId: user.id,
        requestType: 'analyze_document',
        documentType: 'auto',
        documentPages,
        fileBase64: firstPage?.base64,
        mediaType: firstPage?.mediaType || 'image/jpeg',
        language: lang,
        fileName: file.name,
      }
    })

    if (aiError) throw new Error(aiError.message)

    let fileUrl = null
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_')
      const path = `health_docs/${user.id}/${Date.now()}_${safeName}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('health_documents').upload(path, file, { upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('health_documents').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }
    } catch {}

    await supabase.from('health_documents').insert({
      user_id: user.id,
      file_url: fileUrl,
      file_name: file.name,
      document_type: aiData?.detected_type || 'Документ',
      ai_summary: aiData?.summary || null,
      ai_biomarkers: aiData?.biomarkers || [],
      ai_advice: aiData?.advice || null,
      ai_findings: aiData?.findings || null,
      ai_detected_type: aiData?.detected_type || null,
      media_type: isPdf ? 'application/pdf' : (file.type || 'image/jpeg'),
    })

    const added = await appendHealthData(aiData, file.name)
    return { fileName: file.name, aiData, ...added }
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const tooLarge = files.find(file => file.size > 15 * 1024 * 1024)
    if (tooLarge) {
      setError(rl(`Файл слишком большой: ${tooLarge.name} (максимум 15МБ)`, `File too large: ${tooLarge.name} (max 15MB)`))
      return
    }

    setUploading(true)
    setAnalyzing(false)
    setError(null)
    setResult(null)
    setProcessedResults([])
    setQueue(files.map(file => file.name))
    setCurrentIndex(0)

    try {
      const allResults = []
      for (let i = 0; i < files.length; i += 1) {
        setCurrentIndex(i + 1)
        setUploading(false)
        setAnalyzing(true)
        const itemResult = await analyzeOneFile(files[i])
        allResults.push(itemResult)
        setProcessedResults([...allResults])
        setResult(itemResult.aiData)
      }
      await loadDocs()
    } catch (err) {
      console.error(err)
      setError(rl('Ошибка анализа: ' + err.message, 'Analysis error: ' + err.message))
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  async function deleteDoc(doc) {
    setDeleting(doc.id)
    if (doc.file_url) {
      try {
        const path = doc.file_url.split('/health_documents/')[1]
        if (path) await supabase.storage.from('health_documents').remove([path])
      } catch {}
    }
    await supabase.from('health_documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    if (expandedDoc?.id === doc.id) setExpandedDoc(null)
    setDeleting(null)
  }

  const statusColor = {
    normal: '#4ade80', low: '#60a5fa', high: '#f87171',
    abnormal: '#fb923c', unknown: '#94a3b8',
  }
  const statusLabel = {
    normal: '✓', low: '↓', high: '↑', abnormal: '!', unknown: '?',
  }

  const isBusy = uploading || analyzing

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>🔬 {rl('Архив анализов','Health archive')}</h2>
      </div>

      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
        {rl(
          'Загружай сразу несколько PDF или фото. AI прочитает все страницы, определит врача, анализы, назначения и аккуратно добавит найденное в здоровье.',
          'Upload multiple PDFs or photos. AI will read all pages, detect doctor, tests, prescriptions and add findings to Health.'
        )}
      </p>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={isBusy}
        style={{
          padding:'20px', borderRadius:12, cursor: isBusy ? 'wait' : 'pointer',
          textAlign:'center', border:'2px dashed var(--accent)',
          background:'var(--accent-soft)', color:'var(--accent)', fontSize:14, lineHeight:1.8,
          opacity: isBusy ? 0.7 : 1,
        }}
      >
        {isBusy
          ? `✦ ${rl('AI читает документы','AI reading documents')} ${currentIndex || 1}/${queue.length || 1}`
          : `📎 ${rl('Добавить анализы / назначения','Add tests / prescriptions')}\n${rl('Можно выбрать несколько PDF/JPG/PNG · PDF читается целиком','Multiple PDF/JPG/PNG · all PDF pages are read')}`
        }
      </button>
      <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={handleFiles} style={{ display:'none' }} />

      {queue.length > 0 && isBusy && (
        <div className="card" style={{ padding:'12px 14px', fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
          <div style={{ color:'var(--accent)', fontWeight:500, marginBottom:6 }}>⟳ {rl('Очередь обработки','Processing queue')}</div>
          {queue.map((name, i) => (
            <div key={name} style={{ color:i + 1 === currentIndex ? 'var(--accent)' : 'var(--text3)' }}>
              {i + 1 === currentIndex ? '▶ ' : i + 1 < currentIndex ? '✓ ' : '· '} {name}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding:'10px 14px', background:'rgba(248,113,113,0.1)', borderRadius:8, fontSize:13, color:'#f87171', lineHeight:1.5 }}>
          ⚠️ {error}
        </div>
      )}

      {processedResults.length > 0 && (
        <div className="card" style={{ padding:'14px 16px', border:'1px solid var(--accent)30' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--accent)', marginBottom:10 }}>
            ✓ {rl('Добавлено из документов','Added from documents')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {processedResults.map((item, i) => (
              <div key={i} style={{ borderTop:i?'1px solid var(--border)':'none', paddingTop:i?10:0 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{item.fileName}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
                  {item.aiData?.detected_type || rl('Документ','Document')}
                </div>
                {item.addedConditions?.length > 0 && (
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:5 }}>
                    {rl('Заболевания/состояния:','Conditions:')} {item.addedConditions.join(', ')} ✨ AI
                  </div>
                )}
                {item.assignment?.medications?.length > 0 && (
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:5 }}>
                    {rl('Препараты добавлены в таблетки:','Medications added:')} {item.assignment.medications.map(medicationName).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ padding:'16px', border:'1px solid var(--accent)30' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:18 }}>✦</span>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--accent)' }}>
                {result.detected_type || rl('Анализ распознан','Document analyzed')}
              </div>
              {result.language_detected && (
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                  {rl('Язык оригинала:','Original language:')} {result.language_detected}
                </div>
              )}
            </div>
          </div>

          {result.summary && (
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:'0 0 12px' }}>{result.summary}</p>
          )}

          {result.doctor && (typeof result.doctor === 'string' || result.doctor.name || result.doctor.specialty || result.doctor.clinic) && (
            <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:8, background:'var(--bg3)', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
              <strong>{rl('Врач:','Doctor:')}</strong> {typeof result.doctor === 'string' ? result.doctor : [result.doctor.name, result.doctor.specialty, result.doctor.clinic].filter(Boolean).join(' · ')}
            </div>
          )}

          {result.prescriptions?.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, letterSpacing:'0.06em' }}>{rl('Назначенные препараты:','Prescribed meds:')}</div>
              {result.prescriptions.map((m, i) => (
                <div key={i} style={{ padding:'7px 10px', borderRadius:8, background:'var(--bg3)', marginBottom:4, fontSize:12, color:'var(--text2)' }}>
                  <strong>{medicationName(m)}</strong>{medicationDosage(m) ? ` · ${medicationDosage(m)}` : ''}
                </div>
              ))}
            </div>
          )}

          {result.tests_to_do?.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, letterSpacing:'0.06em' }}>{rl('Что сдать / сделать:','Tests / actions to do:')}</div>
              {result.tests_to_do.map((item, i) => <div key={i} style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>• {typeof item === 'string' ? item : item.name || item.test || JSON.stringify(item)}</div>)}
            </div>
          )}

          {result.biomarkers && result.biomarkers.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, letterSpacing:'0.06em' }}>{rl('Показатели из документа:','Values from document:')}</div>
              {result.biomarkers.map((b, i) => b.value ? (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:6, marginBottom:3, background:`${statusColor[b.status] || '#94a3b8'}10`, border:`1px solid ${statusColor[b.status] || '#94a3b8'}20` }}>
                  <div style={{ fontSize:12 }}>
                    <span style={{ color:'var(--text2)' }}>{b.name}</span>
                    {b.reference && <span style={{ color:'var(--text3)', fontSize:10, marginLeft:6 }}>({b.reference})</span>}
                  </div>
                  <div style={{ fontSize:12, color:statusColor[b.status] || '#94a3b8' }}>
                    {b.value} {b.unit} {statusLabel[b.status] || ''}
                  </div>
                </div>
              ) : null)}
            </div>
          )}

          {result.findings && <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:10 }}><strong>{rl('Заключение:','Findings:')}</strong> {result.findings}</div>}
          {result.advice && <div style={{ fontSize:13, color:'#fb923c', lineHeight:1.6 }}>⚠️ {result.advice}</div>}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3 style={{ fontSize:15, color:'var(--text2)' }}>{rl('Документы','Documents')}</h3>
        <button onClick={() => navigate('/health')} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer' }}>
          {rl('Здоровье →','Health →')}
        </button>
      </div>

      {docs.length === 0 && (
        <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, lineHeight:1.8, padding:'30px 10px' }}>
          🔬<br/>{rl('Пока нет загруженных документов','No uploaded documents yet')}
        </div>
      )}

      {docs.map(doc => (
        <div key={doc.id} className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <span style={{ fontSize:22 }}>📄</span>
            <div style={{ flex:1, minWidth:0 }} onClick={() => setExpandedDoc(expandedDoc?.id === doc.id ? null : doc)}>
              <div style={{ fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {doc.document_type || doc.file_name}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                {new Date(doc.created_at).toLocaleDateString()} · {doc.file_name}
              </div>
              {doc.ai_summary && (
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:6, lineHeight:1.5 }}>
                  {expandedDoc?.id === doc.id ? doc.ai_summary : doc.ai_summary.slice(0, 110) + (doc.ai_summary.length > 110 ? '...' : '')}
                </div>
              )}
            </div>
            <button onClick={() => deleteDoc(doc)} disabled={deleting === doc.id} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>
              {deleting === doc.id ? '...' : '×'}
            </button>
          </div>

          {expandedDoc?.id === doc.id && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              {doc.ai_findings && <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}><strong>{rl('Заключение:','Findings:')}</strong> {doc.ai_findings}</p>}
              {doc.ai_advice && <p style={{ fontSize:13, color:'#fb923c', lineHeight:1.6 }}>⚠️ {doc.ai_advice}</p>}
              {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--accent)' }}>{rl('Открыть файл','Open file')}</a>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
