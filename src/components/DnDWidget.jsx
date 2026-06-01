import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useLang, useRl } from '../context/LangContext'
import { MAC_CARDS, getRandomCard } from '../lib/macCards'

const D20_RESULTS = [
  { min:1, max:1, label:'Критический провал', labelEn:'Critical fail', emoji:'💀', desc:'Судьба говорит решительное «нет». Может, в другой раз?', descEn:"Fate says a firm no. Maybe another time?", color:'#f87171' },
  { min:2, max:5, label:'Провал', labelEn:'Fail', emoji:'🎲', desc:'Кости не в твою пользу. Отдохни и попробуй снова.', descEn:"Dice aren't with you. Rest and try again.", color:'#fb923c' },
  { min:6, max:10, label:'Частичный успех', labelEn:'Partial success', emoji:'⚖️', desc:'Возможно, с некоторыми оговорками...', descEn:'Possible, with some conditions...', color:'#facc15' },
  { min:11, max:15, label:'Успех', labelEn:'Success', emoji:'✨', desc:'Удача на твоей стороне. Дерзай!', descEn:"Luck is with you. Go for it!", color:'#4ade80' },
  { min:16, max:19, label:'Отличный успех', labelEn:'Great success', emoji:'🌟', desc:'Судьба определённо за тебя. Это знак!', descEn:'Fate is definitely for you. It\'s a sign!', color:'#a78bfa' },
  { min:20, max:20, label:'Nat 20!', labelEn:'Nat 20!', emoji:'🏆', desc:'Боги D&D благословляют твой выбор!', descEn:'The D&D gods bless your choice!', color:'#facc15' },
]

function getResult(roll) {
  return D20_RESULTS.find(r => roll >= r.min && roll <= r.max)
}

// Настоящий D20 как SVG — икосаэдр в проекции
function D20Icon({ value, rolling, color }) {
  const c = color || '#a78bfa'
  return (
    <svg viewBox="0 0 120 120" width="140" height="140" style={{ filter: rolling ? 'none' : 'none' }}>
      {/* Внешний многоугольник D20 */}
      <polygon points="60,5 112,35 112,85 60,115 8,85 8,35"
        fill={`${c}22`} stroke={c} strokeWidth="2" />
      {/* Внутренние линии граней */}
      <polygon points="60,5 112,35 60,55" fill="none" stroke={c} strokeWidth="1" opacity="0.6" />
      <polygon points="60,5 8,35 60,55" fill="none" stroke={c} strokeWidth="1" opacity="0.6" />
      <polygon points="112,35 112,85 60,55" fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
      <polygon points="8,35 8,85 60,55" fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
      <polygon points="112,85 60,115 60,75" fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
      <polygon points="8,85 60,115 60,75" fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
      <line x1="60" y1="55" x2="60" y2="75" stroke={c} strokeWidth="1" opacity="0.4" />
      <line x1="60" y1="55" x2="112" y2="85" stroke={c} strokeWidth="1" opacity="0.3" />
      <line x1="60" y1="55" x2="8" y2="85" stroke={c} strokeWidth="1" opacity="0.3" />
      {/* Число */}
      {value && (
        <text x="60" y="67" textAnchor="middle" dominantBaseline="middle"
          fontSize={value >= 10 ? "22" : "26"} fontWeight="700" fontFamily="monospace"
          fill={c}>
          {value}
        </text>
      )}
    </svg>
  )
}

// Карты метафорических подсказок
// MAC_CARDS imported from macCards.js

export function DnDRollWidget({ onClose, lang }) {
  const rl = useRl()
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(null)
  const [displayNum, setDisplayNum] = useState(null)
  const [rotation, setRotation] = useState(0)
  const intervalRef = useRef(null)
  const rotRef = useRef(0)

  function rollDice() {
    if (rolling) return
    setRolling(true); setResult(null)
    let count = 0
    intervalRef.current = setInterval(() => {
      rotRef.current += 47
      setRotation(rotRef.current)
      setDisplayNum(Math.floor(Math.random() * 20) + 1)
      count++
      if (count > 18) {
        clearInterval(intervalRef.current)
        const final = Math.floor(Math.random() * 20) + 1
        setDisplayNum(final)
        setResult(getResult(final))
        setRolling(false)
      }
    }, 70)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:2000,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'32px 24px',
    }}>
      <button onClick={() => onClose && onClose(null)} style={{ position:'absolute', top:20, right:20, background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:28, cursor:'pointer', lineHeight:1 }}>×</button>

      <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', letterSpacing:'0.2em', marginBottom:24, textTransform:'uppercase' }}>
        {rl('D&D • Что скажет судьба?','D&D • What does fate say?')}
      </div>

      {/* Кубик с анимацией */}
      <div
        onClick={!rolling && !result ? rollDice : undefined}
        style={{
          cursor: rolling || result ? 'default' : 'pointer',
          transform:`rotate(${rotation}deg)`,
          transition: rolling ? 'transform 0.07s linear' : 'transform 0.5s ease-out',
          userSelect:'none',
        }}
      >
        <D20Icon value={displayNum} rolling={rolling} color={result?.color || '#a78bfa'} />
      </div>

      {!rolling && !result && (
        <div style={{ textAlign:'center', marginTop:20 }}>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:20, lineHeight:1.6 }}>
            {rl('Нажми на кубик — пусть судьба решит','Tap the die — let fate decide')}
          </p>
          <button onClick={rollDice} style={{
            padding:'12px 32px', borderRadius:10, background:'#a78bfa', border:'none',
            color:'#0a0a0a', fontSize:15, fontWeight:600, cursor:'pointer',
          }}>🎲 {rl('Бросить D20','Roll D20')}</button>
        </div>
      )}

      {rolling && (
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:16 }}>
          {rl('Судьба думает...','Fate is thinking...')}
        </p>
      )}

      {result && (
        <div style={{ textAlign:'center', marginTop:24, maxWidth:300 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>{result.emoji}</div>
          <div style={{ fontSize:22, fontWeight:700, color:result.color, marginBottom:10 }}>
            {lang === 'en' ? result.labelEn : result.label}
          </div>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.75)', lineHeight:1.7, marginBottom:24, fontStyle:'italic' }}>
            "{lang === 'en' ? result.descEn : result.desc}"
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setResult(null); setDisplayNum(null); setRotation(0) }} style={{
              flex:1, padding:'10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)',
              background:'transparent', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:13,
            }}>{rl('Перебросить','Reroll')}</button>
            <button onClick={() => onClose && onClose(displayNum)} style={{
              flex:1, padding:'10px', borderRadius:8, border:'none',
              background:'#a78bfa', color:'#0a0a0a', cursor:'pointer', fontSize:13, fontWeight:600,
            }}>{rl('Принято!','Got it!')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Карта дня
export // Компонент изображения карты с fallback на эмодзи
// size="full" — занимает весь родительский блок
function CardImage({ card, size = 140 }) {
  const [imgError, setImgError] = useState(false)
  const imgSrc = `/cards/${card.num}.webp`
  const isFull = size === 'full'

  if (imgError) {
    return (
      <div style={{
        width: isFull ? '100%' : size,
        height: isFull ? '100%' : size,
        background:`linear-gradient(145deg, ${card.color}15, rgba(0,0,0,0.8))`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
      }}>
        <span style={{ fontSize: isFull ? 80 : 52 }}>{card.emoji}</span>
        {isFull && (
          <span style={{ fontSize:13, color:`${card.color}`, opacity:0.6, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {card.name}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={card.name}
      onError={() => setImgError(true)}
      style={{
        width: isFull ? '100%' : size,
        height: isFull ? '100%' : size,
        objectFit:'cover',
        display:'block',
      }}
    />
  )
}

export function OracleCardWidget({ onClose, lang }) {
  const rl = useRl()
  const [flipped, setFlipped] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [card] = useState(() => getRandomCard())

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:2000,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    }}>
      {/* Заголовок */}
      <div style={{
        position:'absolute', top:0, left:0, right:0,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'18px 20px',
      }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {rl('Карта дня','Card of the day')}
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:26, cursor:'pointer', lineHeight:1 }}>×</button>
      </div>

      {/* КАРТА — на весь экран */}
      {!flipped ? (
        /* Рубашка */
        <div onClick={() => setFlipped(true)} style={{
          width:'min(320px, 85vw)',
          height:'min(480px, 70vh)',
          cursor:'pointer', borderRadius:20,
          border:'1px solid rgba(167,139,250,0.4)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(145deg, #1a0a2e, #0d0518)',
          boxShadow:'0 0 60px rgba(167,139,250,0.2)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Узорный фон рубашки */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.15 }} viewBox="0 0 320 480">
            {[...Array(8)].map((_,i) => (
              <line key={i} x1={i*45} y1="0" x2={i*45-80} y2="480" stroke="#a78bfa" strokeWidth="0.5"/>
            ))}
            {[...Array(11)].map((_,i) => (
              <line key={i} x1="0" y1={i*48} x2="320" y2={i*48+40} stroke="#a78bfa" strokeWidth="0.5"/>
            ))}
            <circle cx="160" cy="240" r="80" stroke="#f472b6" strokeWidth="0.5" fill="none"/>
            <circle cx="160" cy="240" r="50" stroke="#a78bfa" strokeWidth="0.5" fill="none"/>
          </svg>
          <div style={{ fontSize:52, opacity:0.5, zIndex:1 }}>✦</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:16, zIndex:1, letterSpacing:'0.1em' }}>
            {rl('Нажми чтобы открыть','Tap to reveal')}
          </div>
        </div>
      ) : (
        /* Открытая карта — изображение на весь блок */
        <div style={{
          width:'min(320px, 85vw)',
          height:'min(480px, 70vh)',
          borderRadius:20, overflow:'hidden',
          boxShadow:'0 0 60px rgba(167,139,250,0.3)',
          position:'relative',
        }}>
          {/* Изображение/эмодзи занимает весь блок */}
          <CardImage card={card} size="full" />
        </div>
      )}

      {/* Кнопки снизу */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'20px', display:'flex', gap:10 }}>
        {flipped && (
          <button onClick={() => setShowMeaning(true)} style={{
            flex:1, padding:'13px', borderRadius:12,
            border:`1px solid ${card.color}50`,
            background:`${card.color}15`, color:card.color,
            fontSize:14, cursor:'pointer', fontWeight:500,
          }}>
            📖 {rl('Значение','Meaning')}
          </button>
        )}
        <button onClick={onClose} style={{
          flex:flipped?1:2, padding:'13px', borderRadius:12,
          border:'none', background:'#a78bfa',
          color:'#0a0a0a', fontSize:14, cursor:'pointer', fontWeight:600,
        }}>
          {flipped ? `✓ ${rl('Принято','Got it')}` : rl('Отмена','Cancel')}
        </button>
      </div>

      {/* Слайд-ап с полным значением — отдельное окошко */}
      {showMeaning && (
        <>
          {/* Затемнение за окошком */}
          <div onClick={() => setShowMeaning(false)} style={{
            position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10,
          }} />
          {/* Само окошко */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:11,
            background:'linear-gradient(to bottom, #1a0a2e, #0d0518)',
            borderRadius:'20px 20px 0 0',
            border:'1px solid rgba(167,139,250,0.3)',
            borderBottom:'none',
            maxHeight:'75vh',
            display:'flex', flexDirection:'column',
          }}>
            {/* Ручка */}
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'rgba(167,139,250,0.3)' }} />
            </div>

            {/* Заголовок окошка */}
            <div style={{ padding:'12px 20px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <span style={{ fontSize:16, fontWeight:600, color:'#c4a8ff', fontFamily:'Cormorant Garamond, serif' }}>{card.emoji} {card.name}</span>
                <div style={{ fontSize:12, color:`${card.color}`, marginTop:3 }}>{card.keys}</div>
              </div>
              <button onClick={() => setShowMeaning(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:22, cursor:'pointer' }}>×</button>
            </div>

            {/* Контент — скроллируемый */}
            <div style={{ overflowY:'auto', padding:'4px 20px 32px', flex:1 }}>
              {/* Разделитель */}
              <div style={{ height:1, background:`${card.color}30`, marginBottom:16 }} />

              {/* Полное значение */}
              <p style={{
                fontSize:15, color:'rgba(255,255,255,0.88)', lineHeight:1.8,
                margin:'0 0 20px', fontFamily:'Cormorant Garamond, serif', fontStyle:'italic',
              }}>
                {card.meaning}
              </p>

              {/* Вопрос */}
              <div style={{
                padding:'14px 16px', borderRadius:12,
                background:`${card.color}10`, border:`1px solid ${card.color}25`,
              }}>
                <div style={{ fontSize:11, color:`${card.color}`, marginBottom:6, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  💭 {rl('Вопрос для рефлексии','Reflection question')}
                </div>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.8)', lineHeight:1.7, margin:0, fontStyle:'italic' }}>
                  {card.question}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Отправить D20 результат партнёру
export async function sendDiceInvite({ userId, targetUserId, activity, diceResult, diceLabel }) {
  try {
    await supabase.functions.invoke('ai-advisor', {
      body: {
        userId,
        requestType: 'push_dice_invite',
        targetUserId,
        activityType: activity,
        diceResult,
        diceLabel,
      }
    })
    return true
  } catch { return false }
}

// Виджет входящих D20 инвайтов
export function DiceInviteNotification({ invite, currentUserId, onRoll, lang }) {
  const rl = useRl()
  const [showRoll, setShowRoll] = useState(false)
  const [myResult, setMyResult] = useState(null)
  const [rolling, setRolling] = useState(false)

  async function respondWithDice(finalRoll) {
    const result = D20_RESULTS.find(r => finalRoll >= r.min && finalRoll <= r.max)
    setMyResult(result)
    await supabase.from('push_invites').update({
      status: 'rolled',
      response_roll: finalRoll,
      response_label: result?.label || '',
    }).eq('id', invite.id)
    onRoll?.()
  }

  if (myResult) return (
    <div style={{ padding:'12px 14px', background:'rgba(167,139,250,0.1)', borderRadius:10, border:'1px solid rgba(167,139,250,0.3)', fontSize:13 }}>
      <span style={{ color:myResult.color, fontWeight:500 }}>{myResult.emoji} {myResult.label}</span>
      <span style={{ color:'var(--text3)', marginLeft:8, fontSize:11 }}>{rl('Ответ отправлен','Response sent')}</span>
    </div>
  )

  return (
    <div style={{ padding:'14px', background:'rgba(167,139,250,0.08)', borderRadius:12, border:'1px solid rgba(167,139,250,0.3)' }}>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>
        🎲 {rl('Тебя приглашают','You got an invite')}
      </div>
      <p style={{ fontSize:13, color:'var(--text2)', margin:'0 0 10px' }}>
        {invite.activity_type}
        {invite.dice_result && <span style={{ color:'#a78bfa' }}> · D20: {invite.dice_result} ({invite.dice_label})</span>}
      </p>
      <button onClick={() => setShowRoll(true)} style={{
        padding:'8px 16px', borderRadius:8, border:'1px solid #a78bfa',
        background:'rgba(167,139,250,0.15)', color:'#a78bfa', fontSize:12, cursor:'pointer'
      }}>
        🎲 {rl('Бросить кубик в ответ','Roll dice in response')}
      </button>
      {showRoll && (
        <DnDRollWidget lang={lang} onClose={(roll) => { setShowRoll(false); if(roll) respondWithDice(roll) }} />
      )}
    </div>
  )
}

// Кнопка D20 для ActivityPage
export function DnDActivityButton({ onResponse }) {
  const { lang } = useLang()
  const rl = useRl()
  const [showRoll, setShowRoll] = useState(false)
  const [showOracle, setShowOracle] = useState(false)
  // Реактивное чтение из localStorage — обновляется при изменении настройки
  const [dndMode, setDndMode] = useState(() => localStorage.getItem('elara_dnd_mode'))
  const [oracleMode, setOracleMode] = useState(() => localStorage.getItem('elara_oracle_mode'))

  // Слушаем изменения из AppearancePage
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'elara_dnd_mode') setDndMode(e.newValue)
      if (e.key === 'elara_oracle_mode') setOracleMode(e.newValue)
    }
    function onLockChange() {
      setDndMode(localStorage.getItem('elara_dnd_mode'))
      setOracleMode(localStorage.getItem('elara_oracle_mode'))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('elara-lock-change', onLockChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('elara-lock-change', onLockChange)
    }
  }, [])

  if (!dndMode && !oracleMode) return null

  return (
    <>
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        {dndMode && (
          <button onClick={() => setShowRoll(true)} style={{
            flex:1, padding:'10px', borderRadius:8, border:'1px solid #a78bfa',
            background:'rgba(167,139,250,0.1)', color:'#a78bfa', fontSize:12, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            🎲 {rl('D20 — спросить судьбу','D20 — ask fate')}
          </button>
        )}
        {oracleMode && (
          <button onClick={() => setShowOracle(true)} style={{
            flex:1, padding:'10px', borderRadius:8, border:'1px solid #f472b6',
            background:'rgba(244,114,182,0.1)', color:'#f472b6', fontSize:12, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            🃏 {rl('Карта дня','Card of day')}
          </button>
        )}
      </div>
      {showRoll && <DnDRollWidget lang={lang} onClose={() => { setShowRoll(false); onResponse?.() }} />}
      {showOracle && <OracleCardWidget lang={lang} onClose={() => setShowOracle(false)} />}
    </>
  )
}
