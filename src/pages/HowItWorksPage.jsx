import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useRl } from '../context/LangContext'

const SECTIONS = [
  {
    id: 'cycle',
    emoji: '🩸',
    titleRu: 'Как мы предсказываем цикл и овуляцию',
    titleEn: 'How we predict your cycle and ovulation',
    items: [
      {
        q: 'Откуда Elara знает когда придут месячные?',
        a: 'Мы не используем метод «прибавить 28 дней». Алгоритм учится на каждом твоём цикле — анализирует длину предыдущих 2–12 циклов, вычисляет медиану и взвешенное среднее, давая больший вес последним циклам. После 6 циклов погрешность снижается до 1–2 дней.',
        ref: 'PMC10905339',
      },
      {
        q: 'Как рассчитывается овуляция?',
        a: 'Лютеиновая фаза стабильна — 12–14 дней. Поэтому овуляция = дата следующих месячных минус 14 дней. Алгоритм адаптирует это под твой личный паттерн. Если ты отмечаешь настроение, боль или выделения — эти данные дополнительно уточняют прогноз.',
        ref: 'PubMed 22295606',
      },
      {
        q: 'Почему прогноз иногда ошибается?',
        a: 'Овуляция может сдвигаться из-за стресса, перелётов, болезни, смены режима сна или СПКЯ. Когда ты отмечаешь реальные месячные, алгоритм автоматически пересчитывает следующий прогноз с учётом сдвига.',
        ref: 'PMC12886881',
      },
    ],
  },
  {
    id: 'ai',
    emoji: '✦',
    titleRu: 'Как работает AI-помощник',
    titleEn: 'How the AI assistant works',
    items: [
      {
        q: 'Откуда AI берёт свои советы?',
        a: 'Советы генерируются AI с промптом, который включает твою фазу цикла, настроение за сегодня, теги дневника, список лекарств, хронические заболевания, гендерную идентичность, ориентацию и предпочтения из персонализации. Каждый раз используется случайный seed — поэтому советы не повторяются.',
      },
      {
        q: 'Ставит ли AI диагнозы?',
        a: '⚠️ НЕТ. Elara — аналитический инструмент, но не врач. AI может заметить паттерны и предложить обратиться к специалисту, но никогда не ставит диагнозов. Любые медицинские решения — только после консультации с врачом.',
      },
      {
        q: 'Почему AI не занимает чью-то сторону?',
        a: 'Когда ты рассказываешь о конфликте, AI сначала признаёт твои чувства, а затем мягко предлагает взглянуть на ситуацию с другой стороны. Истинная поддержка — это не слепое согласие, а помощь в более объёмном понимании.',
      },
      {
        q: 'Как AI советует спорт?',
        a: 'Алгоритм сопоставляет настроение, фазу цикла (или циркадные ритмы для мужчин), список лекарств и теги дня. При признаках высокого кортизола — рекомендует йогу или МФР вместо интенсивного кардио.',
        ref: 'PMC1470658',
      },
    ],
  },
  {
    id: 'meds',
    emoji: '💊',
    titleRu: 'Лекарства и AI-парсер',
    titleEn: 'Medications and AI parser',
    items: [
      {
        q: 'Как AI анализирует моё лекарство?',
        a: 'Когда вводишь незнакомый препарат, запрос уходит в AI. Он определяет фармакологический класс, основное назначение и механизм действия. Автоматически появляется карточка с описанием и предупреждением о взаимодействиях с уже принимаемыми препаратами.',
        ref: 'PMC7577282',
      },
      {
        q: 'НПВС и овуляция — почему это важно?',
        a: 'Ибупрофен, диклофенак, найз блокируют простагландины — а именно они нужны яичнику чтобы разорвать фолликул. Если принимаешь НПВС в середине цикла, Elara предупредит: овуляция может не произойти. Диклофенак блокирует овуляцию в 93% случаев.',
        ref: 'PubMed 25883839',
      },
    ],
  },
  {
    id: 'privacy',
    emoji: '🔒',
    titleRu: 'Приватность и безопасность',
    titleEn: 'Privacy and security',
    items: [
      {
        q: 'Как зашифрован дневник?',
        a: 'Текст дневника шифруется AES-256 прямо на твоём устройстве до отправки на сервер. Ключ — твой личный пароль, который хранится только у тебя. Даже разработчики не могут прочитать записи.',
      },
      {
        q: 'Кто видит мои данные о цикле?',
        a: 'Только ты — и те, кому ты явно разрешишь доступ. Данные цикла не передаются третьим лицам, не продаются рекламодателям. Elara монетизируется только через подписки.',
      },
      {
        q: 'Что видит партнёр в круге?',
        a: 'Ровно столько, сколько ты выбираешь: только календарь, или плюс теги, или плюс обезличенные советы из дневника. Точный текст дневника никогда не передаётся.',
      },
    ],
  },
  {
    id: 'tests',
    emoji: '🧪',
    titleRu: 'Клинические тесты',
    titleEn: 'Clinical tests',
    items: [
      {
        q: 'Что такое клинические тесты в Elara?',
        a: 'Это научно валидированные опросники — те же, что используют врачи по всему миру. PHQ-9 для скрининга депрессии, GAD-7 для тревоги, ASRS для СДВГ, PSST для разграничения ПМС и ПМДР, Big Five для определения типа личности.',
        ref: 'PubMed 11556941',
      },
      {
        q: 'Что AI делает с результатами тестов?',
        a: 'Если тест показывает высокие баллы, AI автоматически добавляет маркер в твой профиль здоровья с пометкой «✨ AI». Ты можешь отредактировать или удалить его в любой момент. Этот маркер влияет на персонализацию советов.',
      },
      {
        q: 'Это диагностика?',
        a: '⚠️ Нет. Это скрининговые инструменты первичной оценки. Они помогают заметить паттерны, но не заменяют консультацию врача или психолога.',
      },
    ],
  },
  {
    id: 'research',
    emoji: '📚',
    titleRu: 'Научная база — 100 исследований',
    titleEn: 'Research base — 100 studies',
    items: [
      {
        q: 'На каких исследованиях основаны алгоритмы?',
        a: 'В основе Elara — более 100 рецензируемых исследований из PubMed и PMC. Алгоритм цикла опирается на PubMed 22295606. Предиктивная аналитика мигреней — PMC10512516. Спортивные рекомендации — PMC1470658 и PMC6939957.',
        ref: 'PMC10905339',
      },
      {
        q: 'Как исследования влияют на советы AI?',
        a: 'Когда AI предупреждает что ибупрофен может задержать овуляцию — это PubMed 25883839 (диклофенак блокировал в 93% случаев). Когда советует йогу при усталости — PMC6939957 о влиянии нагрузок на кортизол. Каждый совет имеет научное основание.',
      },
      {
        q: 'Где посмотреть все исследования?',
        a: 'В Профиле есть раздел «📚 Научная база» — там все 100 исследований с кликабельными ссылками на PubMed/PMC, разбитые по 16 категориям: цикл, мигрень, беременность, мужское здоровье, ГАТ, спорт, психика, сон, интим и др.',
      },
    ],
  },
  {
    id: 'dnd',
    emoji: '🎲',
    titleRu: 'D&D мод и карта дня — отдельные режимы',
    titleEn: 'D&D mode and card of day — separate modes',
    items: [
      {
        q: 'Что такое D&D мод?',
        a: 'Развлекательный режим принятия решений. Когда не можешь выбрать — бросаешь D20. Результат от 1 (критический провал) до 20 (Nat 20!) даёт игровую подсказку. Доступен для выбора активностей и спорта. Включается отдельным тумблером в Профиле.',
      },
      {
        q: 'Что такое Карта дня?',
        a: 'Психологическая техника МАК (метафорические ассоциативные карты). Вытягиваешь карту рубашкой вниз и получаешь метафорический совет на день. Включается отдельным тумблером. Доступна только в Дневнике.',
        ref: 'PMC3904618',
      },
      {
        q: 'Это разные режимы?',
        a: 'Да — два независимых тумблера в Профиле. D&D мод и Карта дня включаются отдельно. Можно включить один, оба или ни одного. Не влияют на медицинские функции.',
      },
    ],
  },
  {
    id: 'sync',
    emoji: '🔄',
    titleRu: 'Синхронизация биоритмов',
    titleEn: 'Biorhythm synchronization',
    items: [
      {
        q: 'Как работает синхронизация с подругами?',
        a: 'В разделе «Синхронизация» Elara показывает текущие фазы всех участниц твоего круга (с их согласия). Алгоритм анализирует совпадение состояний и предлагает оптимальные даты — когда у большинства пик энергии или когда всем нужен тихий отдых.',
      },
      {
        q: 'Как это работает для мужчин?',
        a: 'У мужчин нет менструального цикла, но есть суточный ритм тестостерона — пик утром 6–8 ч, спад к вечеру. Они отмечают своё состояние (На подъёме / Нужен отдых). Это видно в синхронизации группы.',
        ref: 'PMC3522336',
      },
    ],
  },
]

export default function HowItWorksPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const rl = useRl()
  const [openSection, setOpenSection] = useState('cycle')
  const [openItem, setOpenItem] = useState(null)

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ padding:'20px 16px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20, padding:0 }}>‹</button>
          <h2 style={{ fontSize:22 }}>💡 {rl('Как работает Elara','How Elara works')}</h2>
        </div>
      </div>

      <div style={{ padding:'0 16px 24px' }}>
        <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)', marginBottom:8 }}>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, margin:0 }}>
            {rl(
              'Мы знаем, что доверять приложению своё здоровье — это большой шаг. Здесь ты найдёшь честные ответы о том, как устроены алгоритмы и как защищены твои данные.',
              'We know entrusting your health to an app is a big step. Find honest answers about our algorithms and data protection here.'
            )}
          </p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.id} style={{ marginBottom:4, borderBottom:'1px solid var(--border)' }}>
            <button
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              style={{ width:'100%', padding:'14px 0', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left' }}
            >
              <span style={{ fontSize:20 }}>{section.emoji}</span>
              <span style={{ flex:1, fontSize:15, color:'var(--text)', fontWeight:500 }}>
                {lang === 'en' ? section.titleEn : section.titleRu}
              </span>
              <span style={{ color:'var(--text3)', fontSize:16, display:'inline-block', transition:'transform 0.2s', transform: openSection===section.id?'rotate(180deg)':'none' }}>▾</span>
            </button>

            {openSection === section.id && (
              <div style={{ paddingBottom:12, display:'flex', flexDirection:'column', gap:6 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
                    <button
                      onClick={() => setOpenItem(openItem === `${section.id}-${i}` ? null : `${section.id}-${i}`)}
                      style={{ width:'100%', padding:'12px 14px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:10, textAlign:'left' }}
                    >
                      <span style={{ fontSize:13, color:'var(--text)', flex:1, lineHeight:1.5 }}>{item.q}</span>
                      <span style={{ color:'var(--text3)', fontSize:12, flexShrink:0, marginTop:1 }}>
                        {openItem === `${section.id}-${i}` ? '▲' : '▼'}
                      </span>
                    </button>
                    {openItem === `${section.id}-${i}` && (
                      <div style={{ padding:'0 14px 12px', borderTop:'1px solid var(--border)' }}>
                        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:'10px 0 0' }}>{item.a}</p>
                        {item.ref && (
                          <div style={{ fontSize:10, color:'var(--accent)', marginTop:8 }}>📚 {item.ref}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop:20, padding:'16px', background:'rgba(248,113,113,0.08)', borderRadius:12, border:'1px solid rgba(248,113,113,0.25)' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#f87171', marginBottom:8 }}>
            ⚠️ {rl('Важно','Important')}
          </div>
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, margin:0 }}>
            {rl(
              'Elara — информационный инструмент. Приложение НЕ ставит диагнозы и НЕ заменяет врача. Все советы AI носят ознакомительный характер. Любые медицинские решения согласовывай с врачом.',
              'Elara is an informational tool. The app does NOT diagnose and does NOT replace a doctor. All AI advice is informational only. Discuss any medical decisions with your doctor.'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
