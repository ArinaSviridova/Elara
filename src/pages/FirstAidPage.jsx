import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { earnAchievement, hasAchievement } from '../lib/achievements'
import { showAchievementToast } from '../components/AchievementToast'

const FIRST_AID_SECTIONS = [
  {
    key: 'assessment', emoji: '🧭', ru: 'Первые 60 секунд', en: 'First 60 seconds',
    introRu: 'Сначала безопасность, потом проверка сознания, дыхания, кровотечения и аллергии. Не геройствуем, мы тут не снимаем медицинскую драму для стриминга.',
    introEn: 'Safety first, then check consciousness, breathing, bleeding and allergy signs. No heroics, this is not a medical drama.',
    stepsRu: [
      'Убедись, что место безопасно для тебя и человека.',
      'Обратись к человеку громко и спокойно: “Вы меня слышите?”',
      'Если не отвечает - позови помощь, звони в экстренную службу 112/911 по стране пребывания.',
      'Проверь дыхание не дольше 10 секунд: есть ли нормальные вдохи, а не редкие судорожные вздохи.',
      'Быстро посмотри, нет ли сильного кровотечения, судорог, травмы головы, признаков анафилаксии.',
    ],
    stepsEn: [
      'Make sure the scene is safe for you and the person.',
      'Speak loudly and calmly: “Can you hear me?”',
      'If there is no response, call for help and contact local emergency services.',
      'Check breathing for no more than 10 seconds: normal breaths, not rare gasps.',
      'Quickly check for severe bleeding, seizure, head injury, or signs of anaphylaxis.',
    ],
    dangerRu: ['Не хлопать по лицу.', 'Не обливать водой.', 'Не давать пить или лекарства человеку без полного сознания.'],
    dangerEn: ['Do not slap the face.', 'Do not pour water on them.', 'Do not give drinks or medication until fully alert.'],
  },
  {
    key: 'fainting', emoji: '🌫️', ru: 'Обморок / предобморок', en: 'Fainting / presyncope',
    introRu: 'Часто в бьюти-сфере это реакция на боль, страх, духоту, голод, обезвоживание или вид крови. Да, тело иногда выключает систему как старый ноутбук.',
    introEn: 'Often triggered by pain, fear, heat, hunger, dehydration, or seeing blood.',
    stepsRu: [
      'Останови процедуру.',
      'Уложи человека на спину, ноги приподними на 20-30 см, если нет травмы.',
      'Ослабь тесную одежду, обеспечь воздух, убери толпу вокруг.',
      'Проверь дыхание и цвет кожи. Наблюдай 10-15 минут после восстановления.',
      'Вызывай скорую, если потеря сознания больше минуты, есть боль в груди, одышка, судороги, травма головы, беременность, диабет, повторный обморок или человек не восстанавливается нормально.',
    ],
    stepsEn: [
      'Stop the procedure.',
      'Lay the person flat and raise legs 20-30 cm if there is no injury.',
      'Loosen tight clothing, provide fresh air, keep crowd away.',
      'Check breathing and skin color. Observe 10-15 minutes after recovery.',
      'Call emergency services if unconsciousness lasts over a minute, or if chest pain, breathing trouble, seizure, head injury, pregnancy, diabetes, repeated fainting, or abnormal recovery occurs.',
    ],
    dangerRu: ['Не поднимать резко.', 'Не продолжать процедуру “ну раз легче”.', 'Не давать нюхать спирт/нашатырь.'],
    dangerEn: ['Do not lift them abruptly.', 'Do not continue the procedure just because they feel better.', 'Do not use ammonia/alcohol smelling tricks.'],
  },
  {
    key: 'bleeding', emoji: '🩸', ru: 'Сильное кровотечение', en: 'Severe bleeding',
    introRu: 'Главная цель - давление на рану и вызов помощи. Красиво паникуем потом, сейчас давим.',
    introEn: 'The goal is pressure on the wound and calling help.',
    stepsRu: [
      'Надень перчатки или используй барьер.',
      'Прижми рану чистой салфеткой/бинтом и держи постоянное давление.',
      'Если повязка промокла - не снимай первый слой, добавь новый сверху.',
      'Подними конечность выше уровня сердца, если это не усиливает боль и нет подозрения на перелом.',
      'Вызывай скорую при пульсирующем кровотечении, большой потере крови, слабости, бледности, травме головы/шеи/живота или невозможности остановить кровь за 10 минут.',
    ],
    stepsEn: [
      'Put on gloves or use a barrier.',
      'Press the wound with clean gauze/bandage and maintain pressure.',
      'If soaked, do not remove the first layer; add another layer on top.',
      'Raise the limb if it does not increase pain and fracture is not suspected.',
      'Call emergency services for spurting bleeding, heavy blood loss, weakness, pallor, head/neck/abdomen injury, or bleeding not controlled after 10 minutes.',
    ],
    dangerRu: ['Не промывать глубокую сильно кровящую рану вместо давления.', 'Не вытаскивать глубоко застрявший предмет.', 'Не трогать кровь без защиты.'],
    dangerEn: ['Do not rinse a deep heavily bleeding wound instead of applying pressure.', 'Do not remove deeply embedded objects.', 'Do not touch blood without protection.'],
  },
  {
    key: 'burns', emoji: '🔥', ru: 'Ожоги', en: 'Burns',
    introRu: 'При термическом ожоге раннее охлаждение прохладной проточной водой около 20 минут связано с лучшими исходами.',
    introEn: 'For thermal burns, early cool running water for about 20 minutes is linked with better outcomes.',
    stepsRu: [
      'Убери источник тепла.',
      'Охлаждай ожог прохладной проточной водой 20 минут, желательно в первые 3 часа.',
      'Сними кольца/браслеты рядом с ожогом до отёка, если это легко.',
      'Накрой чистой неприлипающей повязкой или пищевой плёнкой без тугого давления.',
      'К врачу/скорую: лицо, кисти, гениталии, суставы, большой ожог, химический/электрический ожог, дети, беременность, признаки шока.',
    ],
    stepsEn: [
      'Remove the heat source.',
      'Cool the burn with cool running water for 20 minutes, ideally within 3 hours.',
      'Remove rings/bracelets near the burn before swelling if easy.',
      'Cover with a clean non-stick dressing or plastic wrap without tight pressure.',
      'Seek urgent care for face, hands, genitals, joints, large burns, chemical/electrical burns, children, pregnancy, or shock signs.',
    ],
    dangerRu: ['Не мазать маслом/кремом сразу.', 'Не прикладывать лёд.', 'Не вскрывать пузыри.'],
    dangerEn: ['Do not apply oil/cream immediately.', 'Do not apply ice.', 'Do not pop blisters.'],
  },
  {
    key: 'allergy', emoji: '⚠️', ru: 'Анафилаксия / сильная аллергия', en: 'Anaphylaxis / severe allergy',
    introRu: 'Опасные признаки: отёк губ/языка/горла, хрипы, одышка, слабость, падение давления, крапивница после контакта с аллергеном.',
    introEn: 'Danger signs: lip/tongue/throat swelling, wheezing, breathing trouble, weakness, low blood pressure, hives after allergen exposure.',
    stepsRu: [
      'Немедленно вызывай скорую.',
      'Если у человека есть автоинъектор адреналина - помоги использовать его по инструкции устройства.',
      'Уложи человека. Если тяжело дышать - полусидя. Если беременность - на левый бок.',
      'Следи за дыханием. Будь готов(а) к СЛР, если человек перестал нормально дышать.',
      'Антигистаминные не заменяют адреналин при анафилаксии.',
    ],
    stepsEn: [
      'Call emergency services immediately.',
      'If the person has an epinephrine autoinjector, help use it according to the device instructions.',
      'Lay them down. If breathing is difficult, let them sit partly upright. If pregnant, left side.',
      'Monitor breathing. Be ready for CPR if normal breathing stops.',
      'Antihistamines do not replace epinephrine in anaphylaxis.',
    ],
    dangerRu: ['Не ждать, “вдруг само пройдёт”.', 'Не ставить человека резко на ноги.', 'Не давать таблетки вместо вызова скорой при проблемах с дыханием.'],
    dangerEn: ['Do not wait to see if it passes.', 'Do not make them stand suddenly.', 'Do not give tablets instead of calling emergency services when breathing is affected.'],
  },
  {
    key: 'seizure', emoji: '⚡', ru: 'Судороги', en: 'Seizure',
    introRu: 'Задача - защитить от травм и засечь время. В рот ничего не класть. Вообще ничего. Да, даже “ложечку”.',
    introEn: 'Protect from injury and time the seizure. Put nothing in the mouth.',
    stepsRu: [
      'Убери опасные предметы вокруг.',
      'Подложи что-то мягкое под голову.',
      'Засеки время начала.',
      'После судорог поверни на бок, если человек дышит.',
      'Вызывай скорую, если судороги дольше 5 минут, повторяются, это первый приступ, есть травма, беременность, диабет, человек не приходит в себя или дыхание нарушено.',
    ],
    stepsEn: [
      'Move dangerous objects away.',
      'Cushion the head.',
      'Time the seizure.',
      'After convulsions, turn them on the side if breathing.',
      'Call emergency services if seizure lasts over 5 minutes, repeats, is first known seizure, injury occurs, pregnancy/diabetes is present, recovery is poor, or breathing is abnormal.',
    ],
    dangerRu: ['Не удерживать силой.', 'Не разжимать рот.', 'Не давать пить сразу после приступа.'],
    dangerEn: ['Do not restrain forcefully.', 'Do not force the mouth open.', 'Do not give drinks right after the seizure.'],
  },
  {
    key: 'cpr', emoji: '❤️', ru: 'Нет сознания и нормального дыхания', en: 'Unconscious and not breathing normally',
    introRu: 'Это сценарий СЛР/AED. Приложение не заменит курс, но хотя бы не будет советовать человеку “похлопать по щекам”, уже прогресс цивилизации.',
    introEn: 'This is CPR/AED territory. The app does not replace training, but gives the emergency sequence.',
    stepsRu: [
      'Позови помощь и звони в экстренную службу.',
      'Попроси кого-то принести AED/дефибриллятор, если он доступен.',
      'Начни компрессии грудной клетки: центр груди, глубоко и быстро, 100-120 в минуту.',
      'Если обучен(а), делай 30 компрессий и 2 вдоха. Если нет - только компрессии до приезда помощи.',
      'Включи AED и следуй голосовым командам устройства.',
    ],
    stepsEn: [
      'Call for help and contact emergency services.',
      'Ask someone to bring an AED/defibrillator if available.',
      'Start chest compressions: center of chest, hard and fast, 100-120 per minute.',
      'If trained, use 30 compressions and 2 breaths. If not, hands-only CPR until help arrives.',
      'Turn on the AED and follow its voice prompts.',
    ],
    dangerRu: ['Не проверять пульс долго.', 'Не прекращать компрессии без причины.', 'Не бояться AED: устройство само анализирует ритм.'],
    dangerEn: ['Do not spend time checking pulse.', 'Do not stop compressions without reason.', 'Do not fear the AED: it analyzes rhythm itself.'],
  },
]

const TEST_QUESTIONS = [
  {
    qRu: 'Человек упал в обморок и быстро очнулся. Что делать первым?',
    qEn: 'A person fainted and quickly woke up. What first?',
    optionsRu: ['Поднять резко', 'Уложить, приподнять ноги, наблюдать', 'Дать нюхать нашатырь'],
    optionsEn: ['Lift them abruptly', 'Lay flat, raise legs, observe', 'Use ammonia smell'],
    answer: 1,
  },
  {
    qRu: 'При ожоге лучше всего в первые часы:',
    qEn: 'For a burn in the first hours, best action is:',
    optionsRu: ['Лёд на кожу', 'Масло/крем', 'Прохладная проточная вода около 20 минут'],
    optionsEn: ['Ice on skin', 'Oil/cream', 'Cool running water for about 20 minutes'],
    answer: 2,
  },
  {
    qRu: 'При судорогах нельзя:',
    qEn: 'During a seizure, do not:',
    optionsRu: ['Убрать опасные предметы', 'Засечь время', 'Класть что-то в рот'],
    optionsEn: ['Move hazards away', 'Time it', 'Put something in the mouth'],
    answer: 2,
  },
  {
    qRu: 'При анафилаксии с одышкой нужно:',
    qEn: 'For anaphylaxis with breathing trouble:',
    optionsRu: ['Ждать', 'Вызвать скорую и помочь с автоинъектором адреналина, если он есть', 'Только дать антигистаминное'],
    optionsEn: ['Wait', 'Call emergency services and help with epinephrine autoinjector if available', 'Only give antihistamine'],
    answer: 1,
  },
  {
    qRu: 'Нет сознания и нормального дыхания. Что дальше?',
    qEn: 'No consciousness and no normal breathing. What next?',
    optionsRu: ['Звонок в скорую, компрессии, AED если доступен', 'Дать воды', 'Похлопать по лицу'],
    optionsEn: ['Call emergency, compressions, AED if available', 'Give water', 'Slap the face'],
    answer: 0,
  },
]

const SOURCES = [
  { label: 'ILCOR 2020 First Aid CoSTR', url: 'https://pubmed.ncbi.nlm.nih.gov/33098920/' },
  { label: 'Public access defibrillation review', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5127419/' },
  { label: 'AED survival systematic review', url: 'https://pubmed.ncbi.nlm.nih.gov/28687709/' },
  { label: 'Epinephrine for anaphylaxis first aid', url: 'https://pubmed.ncbi.nlm.nih.gov/28193791/' },
  { label: 'Cool running water for burns', url: 'https://pubmed.ncbi.nlm.nih.gov/35688782/' },
]

export default function FirstAidPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const [open, setOpen] = useState('assessment')
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    if (!profile || !user?.id || hasAchievement(profile, 'first_aid_started')) return
    earnAchievement(supabase, profile, 'first_aid_started', updateProfile).then(ok => {
      if (ok) showAchievementToast('first_aid_started')
    }).catch(() => {})
  }, [profile?.id, user?.id])

  const score = useMemo(() => TEST_QUESTIONS.reduce((sum, q, idx) => sum + (answers[idx] === q.answer ? 1 : 0), 0), [answers])
  const complete = Object.keys(answers).length === TEST_QUESTIONS.length

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/today')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 11px' }}>‹</button>
        <div>
          <h2 style={{ fontSize:25, margin:0 }}>🆘 {rl('Первая помощь', 'First aid')}</h2>
          <p style={{ margin:'4px 0 0', color:'var(--text3)', fontSize:12, lineHeight:1.45 }}>
            {rl('Короткие алгоритмы для дома, салона, студии и обычного человеческого хаоса.', 'Short algorithms for home, studios, salons and ordinary human chaos.')}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding:14, borderColor:'rgba(248,113,113,0.35)', background:'rgba(248,113,113,0.08)' }}>
        <div style={{ fontWeight:800, color:'#fecaca', marginBottom:5 }}>⚠️ {rl('Важно', 'Important')}</div>
        <p style={{ margin:0, color:'var(--text2)', fontSize:12, lineHeight:1.55 }}>
          {rl('При угрозе жизни вызывай экстренную службу. Это справочник первой помощи, не диагностика и не замена очному обучению СЛР.', 'For life-threatening situations, call emergency services. This is a first-aid reference, not diagnosis or a replacement for CPR training.')}
        </p>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {FIRST_AID_SECTIONS.map(section => (
          <button key={section.key} onClick={() => setOpen(section.key)} style={{
            padding:'8px 11px', borderRadius:999, border:`1px solid ${open === section.key ? 'var(--accent)' : 'var(--border)'}`,
            background: open === section.key ? 'var(--accent-soft)' : 'var(--bg2)', color: open === section.key ? 'var(--accent)' : 'var(--text2)',
            cursor:'pointer', fontSize:12,
          }}>
            {section.emoji} {lang === 'en' ? section.en : section.ru}
          </button>
        ))}
      </div>

      {FIRST_AID_SECTIONS.filter(s => s.key === open).map(section => (
        <section key={section.key} className="card" style={{ padding:16 }}>
          <h3 style={{ margin:'0 0 8px', fontSize:21 }}>{section.emoji} {lang === 'en' ? section.en : section.ru}</h3>
          <p style={{ margin:'0 0 12px', color:'var(--text2)', fontSize:13, lineHeight:1.6 }}>{lang === 'en' ? section.introEn : section.introRu}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(lang === 'en' ? section.stepsEn : section.stepsRu).map((step, idx) => (
              <div key={idx} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'9px 10px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                <span style={{ width:22, height:22, borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>{idx + 1}</span>
                <span style={{ color:'var(--text2)', fontSize:13, lineHeight:1.5 }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:12, borderRadius:14, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#fecaca', marginBottom:6 }}>{rl('Чего не делать', 'Do not')}</div>
            {(lang === 'en' ? section.dangerEn : section.dangerRu).map((item, idx) => (
              <div key={idx} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>✕ {item}</div>
            ))}
          </div>
        </section>
      ))}

      <section className="card" style={{ padding:16 }}>
        <h3 style={{ margin:'0 0 8px', fontSize:20 }}>🧪 {rl('Мини-тест', 'Mini test')}</h3>
        <p style={{ margin:'0 0 12px', color:'var(--text3)', fontSize:12, lineHeight:1.5 }}>
          {rl('Проверка, что мозг не просто красиво пролистал карточки.', 'A check that your brain did not merely scroll prettily through the cards.')}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {TEST_QUESTIONS.map((q, qi) => (
            <div key={qi} style={{ padding:12, borderRadius:14, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>{qi + 1}. {lang === 'en' ? q.qEn : q.qRu}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(lang === 'en' ? q.optionsEn : q.optionsRu).map((option, oi) => {
                  const chosen = answers[qi] === oi
                  const answered = answers[qi] !== undefined
                  const correct = q.answer === oi
                  return (
                    <button key={oi} type="button" onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))} style={{
                      textAlign:'left', padding:'8px 10px', borderRadius:10, cursor:'pointer', fontSize:12,
                      border:`1px solid ${chosen ? (correct ? '#4ade80' : '#fb7185') : 'var(--border)'}`,
                      background: chosen ? (correct ? 'rgba(74,222,128,0.12)' : 'rgba(251,113,133,0.12)') : 'var(--bg)',
                      color: chosen ? (correct ? '#86efac' : '#fecdd3') : 'var(--text2)',
                    }}>
                      {answered && correct ? '✓ ' : ''}{option}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:12, borderRadius:14, background:'var(--accent-soft)', border:'1px solid var(--accent)33', color:'var(--accent)', fontWeight:800, fontSize:13 }}>
          {complete ? rl(`Результат: ${score}/${TEST_QUESTIONS.length}`, `Score: ${score}/${TEST_QUESTIONS.length}`) : rl(`Отвечено: ${Object.keys(answers).length}/${TEST_QUESTIONS.length}`, `Answered: ${Object.keys(answers).length}/${TEST_QUESTIONS.length}`)}
        </div>
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
