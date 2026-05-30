import { useCallback, useEffect, useMemo, useState } from 'react'

function notifyLockChange() {
  window.dispatchEvent(new Event('elara-lock-change'))
}

export async function hashPin(pin) {
  const safePin = String(pin || '').replace(/\D/g, '').slice(0, 4)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(safePin))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function useGhostMode() {
  return sessionStorage.getItem('elara_ghost_mode') === '1'
}

export function useAppLock() {
  const [locked, setLocked] = useState(false)
  const [ghostMode, setGhostMode] = useState(false)

  const refresh = useCallback(() => {
    const hasPin = !!localStorage.getItem('elara_pin_hash')
    if (!hasPin) {
      sessionStorage.removeItem('elara_unlocked')
      sessionStorage.removeItem('elara_ghost_mode')
      setLocked(false)
      setGhostMode(false)
      return
    }
    const unlocked = sessionStorage.getItem('elara_unlocked') === '1'
    const ghost = sessionStorage.getItem('elara_ghost_mode') === '1'
    setLocked(!unlocked)
    setGhostMode(ghost)
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = () => refresh()
    const onVisibility = () => {
      if (!document.hidden) return
      const autoLock = localStorage.getItem('elara_auto_lock') === '1'
      if (!autoLock) return
      sessionStorage.removeItem('elara_unlocked')
      sessionStorage.removeItem('elara_ghost_mode')
      refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('elara-lock-change', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('elara-lock-change', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  const unlock = useCallback((isGhost = false) => {
    sessionStorage.setItem('elara_unlocked', '1')
    if (isGhost) sessionStorage.setItem('elara_ghost_mode', '1')
    else sessionStorage.removeItem('elara_ghost_mode')
    setGhostMode(isGhost)
    setLocked(false)
    notifyLockChange()
  }, [])

  const lock = useCallback(() => {
    sessionStorage.removeItem('elara_unlocked')
    sessionStorage.removeItem('elara_ghost_mode')
    setGhostMode(false)
    setLocked(!!localStorage.getItem('elara_pin_hash'))
    notifyLockChange()
  }, [])

  return { locked, unlock, lock, ghostMode, refresh }
}

function DigitDots({ value = '', error = false }) {
  return (
    <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          width:14, height:14, borderRadius:'50%',
          border:`2px solid ${error ? '#f87171' : 'var(--accent)'}`,
          background:i < value.length ? (error ? '#f87171' : 'var(--accent)') : 'transparent',
          transition:'all 0.15s',
        }} />
      ))}
    </div>
  )
}

function NumberPad({ value, onChange, onComplete, error }) {
  function press(n) {
    if (value.length >= 4) return
    const next = `${value}${n}`.slice(0, 4)
    onChange(next)
    if (next.length === 4) setTimeout(() => onComplete?.(next), 60)
  }
  function erase() {
    onChange(value.slice(0, -1))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
      <DigitDots value={value} error={error} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, width:240 }}>
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button key={n} type="button" onClick={() => press(n)} style={{
            height:58, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg2)',
            color:'var(--text)', fontSize:22, cursor:'pointer',
          }}>{n}</button>
        ))}
        <div />
        <button type="button" onClick={() => press(0)} style={{
          height:58, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg2)',
          color:'var(--text)', fontSize:22, cursor:'pointer',
        }}>0</button>
        <button type="button" onClick={erase} style={{
          height:58, borderRadius:14, border:'none', background:'transparent', color:'var(--text3)', fontSize:20, cursor:'pointer',
        }}>⌫</button>
      </div>
    </div>
  )
}

function PinField({ value, onChange, autoFocus = false }) {
  return (
    <input
      autoFocus={autoFocus}
      type="password"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      placeholder="••••"
      style={{
        width:'100%', textAlign:'center', fontSize:24, letterSpacing:'0.35em',
        padding:'12px 14px', borderRadius:12,
      }}
    />
  )
}

export default function AppLockScreen() {
  const { unlock } = useAppLock()
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  async function checkPin(pin) {
    const realHash = localStorage.getItem('elara_pin_hash')
    const ghostHash = localStorage.getItem('elara_ghost_pin_hash')
    if (!realHash) {
      unlock(false)
      return
    }
    const enteredHash = await hashPin(pin)
    if (enteredHash === realHash) {
      setError(false)
      unlock(false)
      return
    }
    if (ghostHash && enteredHash === ghostHash) {
      setError(false)
      unlock(true)
      return
    }
    setError(true)
    setInput('')
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, background:'var(--bg)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:28, padding:'40px 24px',
    }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:8 }}>✦</div>
        <div style={{ fontSize:24, fontFamily:'Cormorant Garamond, serif', color:'var(--text)' }}>Elara</div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:6 }}>Введи PIN</div>
      </div>

      <NumberPad value={input} onChange={(v) => { setError(false); setInput(v) }} onComplete={checkPin} error={error} />
      {error && <div style={{ fontSize:13, color:'#f87171' }}>Неверный PIN</div>}
    </div>
  )
}

function GhostPinSetup({ realPinExists }) {
  const [step, setStep] = useState('idle')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [hasGhost, setHasGhost] = useState(() => !!localStorage.getItem('elara_ghost_pin_hash'))

  async function setGhostPin() {
    setError('')
    if (!realPinExists) {
      setError('Сначала установи основной PIN')
      return
    }
    if (pin1.length !== 4 || pin2.length !== 4) return
    if (pin1 !== pin2) {
      setError('PIN не совпадает')
      setPin2('')
      return
    }
    const ghostHash = await hashPin(pin1)
    const realHash = localStorage.getItem('elara_pin_hash')
    if (ghostHash === realHash) {
      setError('Скрытый PIN не должен совпадать с основным')
      setPin1('')
      setPin2('')
      setStep('set')
      return
    }
    localStorage.setItem('elara_ghost_pin_hash', ghostHash)
    notifyLockChange()
    setHasGhost(true)
    setStep('idle')
    setPin1('')
    setPin2('')
  }

  function removeGhost() {
    localStorage.removeItem('elara_ghost_pin_hash')
    sessionStorage.removeItem('elara_ghost_mode')
    notifyLockChange()
    setHasGhost(false)
    setStep('idle')
  }

  return (
    <div style={{ padding:'12px 14px', background:'rgba(167,139,250,0.08)', borderRadius:12, border:'1px solid rgba(167,139,250,0.2)', display:'flex', flexDirection:'column', gap:10 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'#a78bfa' }}>🎭 Скрытый PIN</div>
        <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5, marginTop:4 }}>
          Второй PIN открывает приложение в безопасном виде: интимные и приватные разделы скрываются.
        </div>
      </div>

      {!realPinExists && (
        <div style={{ fontSize:12, color:'#facc15' }}>Сначала установи основной PIN, потом можно добавить скрытый.</div>
      )}

      {realPinExists && step === 'idle' && (
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={() => setStep('set')} className="btn btn-ghost" style={{ flex:1, fontSize:12 }}>
            {hasGhost ? 'Сменить скрытый PIN' : 'Настроить скрытый PIN'}
          </button>
          {hasGhost && <button type="button" onClick={removeGhost} className="btn btn-ghost" style={{ flex:1, fontSize:12, color:'#f87171', borderColor:'rgba(248,113,113,0.35)' }}>Удалить</button>}
        </div>
      )}

      {step === 'set' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <PinField value={pin1} onChange={setPin1} autoFocus />
          <button type="button" onClick={() => setStep('confirm')} disabled={pin1.length !== 4} className="btn btn-ghost" style={{ fontSize:12 }}>Далее</button>
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <PinField value={pin2} onChange={setPin2} autoFocus />
          {error && <div style={{ fontSize:12, color:'#f87171' }}>{error}</div>}
          <button type="button" onClick={setGhostPin} disabled={pin2.length !== 4} className="btn btn-primary" style={{ fontSize:12 }}>Установить</button>
        </div>
      )}
    </div>
  )
}

export function PinSetup({ onClose }) {
  const [step, setStep] = useState('idle')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [hasPin, setHasPin] = useState(() => !!localStorage.getItem('elara_pin_hash'))
  const [autoLock, setAutoLock] = useState(() => localStorage.getItem('elara_auto_lock') === '1')

  const title = useMemo(() => hasPin ? '🔒 PIN приложения' : '🔒 Установить PIN', [hasPin])

  async function savePin() {
    setError('')
    if (pin1.length !== 4 || pin2.length !== 4) return
    if (pin1 !== pin2) {
      setError('PIN не совпадает')
      setPin2('')
      return
    }
    const h = await hashPin(pin1)
    localStorage.setItem('elara_pin_hash', h)
    sessionStorage.setItem('elara_unlocked', '1')
    setHasPin(true)
    notifyLockChange()
    setSaved(true)
    setStep('idle')
    setPin1('')
    setPin2('')
    setTimeout(() => setSaved(false), 1600)
  }

  async function removePin() {
    setError('')
    const realHash = localStorage.getItem('elara_pin_hash')
    const currentHash = await hashPin(current)
    if (currentHash !== realHash) {
      setError('Неверный текущий PIN')
      setCurrent('')
      return
    }
    localStorage.removeItem('elara_pin_hash')
    localStorage.removeItem('elara_ghost_pin_hash')
    sessionStorage.removeItem('elara_unlocked')
    sessionStorage.removeItem('elara_ghost_mode')
    notifyLockChange()
    setHasPin(false)
    setCurrent('')
    setStep('idle')
  }

  function toggleAutoLock() {
    const next = !autoLock
    setAutoLock(next)
    if (next) localStorage.setItem('elara_auto_lock', '1')
    else localStorage.removeItem('elara_auto_lock')
  }

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <h3 style={{ fontSize:18, margin:0 }}>{title}</h3>
        {onClose && <button type="button" onClick={onClose} style={{ border:'none', background:'transparent', color:'var(--text3)', cursor:'pointer', fontSize:22 }}>×</button>}
      </div>

      {saved && <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(74,222,128,0.1)', color:'#4ade80', fontSize:12 }}>PIN сохранён</div>}

      {step === 'idle' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
            {hasPin ? 'Основной PIN установлен. Его можно сменить, удалить или добавить скрытый PIN.' : 'PIN защищает приложение при входе. После него можно настроить скрытый PIN.'}
          </p>
          <button type="button" onClick={() => setStep('set')} className="btn btn-primary">
            {hasPin ? 'Сменить основной PIN' : 'Установить основной PIN'}
          </button>
          {hasPin && <button type="button" onClick={() => setStep('remove')} className="btn btn-ghost" style={{ color:'#f87171', borderColor:'rgba(248,113,113,0.35)' }}>Удалить основной PIN</button>}
        </div>
      )}

      {step === 'set' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Придумай 4-значный PIN:</div>
          <PinField value={pin1} onChange={setPin1} autoFocus />
          <button type="button" disabled={pin1.length !== 4} onClick={() => setStep('confirm')} className="btn btn-primary">Далее</button>
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Повтори PIN:</div>
          <PinField value={pin2} onChange={setPin2} autoFocus />
          {error && <div style={{ fontSize:12, color:'#f87171' }}>{error}</div>}
          <button type="button" disabled={pin2.length !== 4} onClick={savePin} className="btn btn-primary">Сохранить PIN</button>
        </div>
      )}

      {step === 'remove' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Введи текущий PIN для удаления:</div>
          <PinField value={current} onChange={setCurrent} autoFocus />
          {error && <div style={{ fontSize:12, color:'#f87171' }}>{error}</div>}
          <button type="button" disabled={current.length !== 4} onClick={removePin} className="btn btn-ghost" style={{ color:'#f87171', borderColor:'rgba(248,113,113,0.35)' }}>Удалить PIN</button>
        </div>
      )}

      <GhostPinSetup realPinExists={hasPin} />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize:13 }}>Автоблокировка</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>Запрашивать PIN после сворачивания приложения</div>
        </div>
        <button type="button" onClick={toggleAutoLock} style={{
          width:46, height:26, borderRadius:13, cursor:'pointer', border:'none', flexShrink:0,
          background:autoLock ? 'var(--accent)' : 'var(--bg3)', position:'relative', transition:'all 0.2s',
        }}>
          <div style={{ position:'absolute', top:3, left:autoLock ? 23 : 3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
        </button>
      </div>
    </div>
  )
}
