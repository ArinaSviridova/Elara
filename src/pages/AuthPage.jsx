import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const { lang } = useLang()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isTeen, setIsTeen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const rl = (ru, en) => lang === 'en' ? en : ru

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(rl('Неверный email или пароль', 'Invalid email or password'))
    } else {
      if (!name.trim()) { setError(rl('Введи своё имя', 'Enter your name')); setLoading(false); return }
      const { error } = await signUp(email, password, name, isTeen)
      if (!error && promoCode.trim()) {
        // Применяем промокод после регистрации
        try {
          const { data: promo } = await supabase
            .from('promo_codes').select('*').eq('code', promoCode.trim().toUpperCase()).maybeSingle()
          if (promo && promo.uses < promo.max_uses) {
            await supabase.from('promo_codes').update({ uses: promo.uses + 1 }).eq('id', promo.id)
          }
        } catch {}
      }
      if (error) setError(error.message)
      else setSuccess(rl('Проверь почту — мы отправили письмо', 'Check your email — we sent a link'))
    }
    setLoading(false)
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'32px 24px', minHeight:'100svh' }}>
      <div style={{ marginBottom:40 }}>
        <div style={{ fontSize:11, letterSpacing:'0.2em', color:'var(--text3)', textTransform:'uppercase', marginBottom:10 }}>
          {rl('приложение','app')}
        </div>
        <h1 style={{ fontSize:52, lineHeight:1, fontFamily:'Cormorant Garamond, serif', color:'var(--text)', marginBottom:8 }}>Elara</h1>
        <p style={{ color:'var(--text2)', fontSize:14 }}>{rl('для тебя и твоих близких', 'for you and your circle')}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {mode === 'register' && (
          <>
            {/* Пояснение что будет после регистрации */}
            <div style={{ padding:'12px 14px', background:'rgba(167,139,250,0.07)', borderRadius:12, border:'1px solid rgba(167,139,250,0.2)', fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
              <div style={{ fontWeight:600, color:'var(--text)', marginBottom:6 }}>
                ✦ {rl('После входа:', 'After signing in:')}
              </div>
              <div>🧬 {rl('Настроишь режим тела и цели — займёт 2 минуты', 'Set up your body mode and goals — takes 2 min')}</div>
              <div>🔒 {rl('Все данные приватны по умолчанию — ты выбираешь кто видит', 'All data private by default — you choose who sees')}</div>
              <div>💡 {rl('Не хочешь заполнять сейчас — всё есть в Профиле', "Don't want to fill in now — everything is in Profile")}</div>
            </div>
            <input placeholder={rl('Твоё имя','Your name')} value={name} onChange={e => setName(e.target.value)} autoComplete="name" />

            {/* Вопрос о возрасте при регистрации */}
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={() => setIsTeen(false)} style={{
                flex:1, padding:'11px', borderRadius:8, fontSize:13, cursor:'pointer',
                border:`1px solid ${!isTeen ? 'var(--accent)' : 'var(--border)'}`,
                background:!isTeen ? 'var(--accent-soft)' : 'transparent',
                color:!isTeen ? 'var(--accent)' : 'var(--text2)',
              }}>
                {rl('Мне 18+','I\'m 18+')}
              </button>
              <button type="button" onClick={() => setIsTeen(true)} style={{
                flex:1, padding:'11px', borderRadius:8, fontSize:13, cursor:'pointer',
                border:`1px solid ${isTeen ? '#f472b6' : 'var(--border)'}`,
                background:isTeen ? 'rgba(244,114,182,0.12)' : 'transparent',
                color:isTeen ? '#f472b6' : 'var(--text2)',
              }}>
                🌸 {rl('Мне до 18','I\'m under 18')}
              </button>
            </div>
            <input
              placeholder={rl('Промокод (если есть)','Promo code (optional)')}
              value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              style={{ letterSpacing:'0.08em' }}
            />
          </>
        )}

        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <input type="password" placeholder={rl('Пароль','Password')} value={password} onChange={e => setPassword(e.target.value)} required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

        {error && <p style={{ color:'#f87171', fontSize:13, padding:'10px 14px', background:'rgba(248,113,113,0.08)', borderRadius:8 }}>{error}</p>}
        {success && <p style={{ color:'#4ade80', fontSize:13, padding:'10px 14px', background:'rgba(74,222,128,0.08)', borderRadius:8 }}>{success}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop:4 }}>
          {loading ? <span className="dot-loader"><span/><span/><span/></span>
            : mode === 'login' ? rl('Войти','Sign in') : rl('Создать аккаунт','Create account')}
        </button>
      </form>

      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
        <div style={{ flex:1, height:1, background:'var(--border)' }} />
        <span style={{ color:'var(--text3)', fontSize:12 }}>{rl('или','or')}</span>
        <div style={{ flex:1, height:1, background:'var(--border)' }} />
      </div>

      <button className="btn btn-ghost" onClick={signInWithGoogle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {rl('Войти через Google','Continue with Google')}
      </button>

      <button onClick={() => { setMode(m => m==='login'?'register':'login'); setError(''); setSuccess('') }}
        style={{ marginTop:24, background:'none', border:'none', color:'var(--text2)', fontSize:13, cursor:'pointer', textDecoration:'underline', textDecorationColor:'var(--text3)' }}>
        {mode === 'login' ? rl('Нет аккаунта? Зарегистрироваться','No account? Sign up') : rl('Уже есть аккаунт? Войти','Have an account? Sign in')}
      </button>
    </div>
  )
}
