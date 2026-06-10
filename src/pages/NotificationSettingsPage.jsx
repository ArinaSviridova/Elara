import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { disablePushNotifications, enablePushNotifications, getPushState, isPushSupported } from '../lib/pushNotifications'

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(ua)
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)
  const isEdge = /Edg/i.test(ua)
  return { isIOS, isAndroid, isStandalone, isChrome, isSafari, isEdge }
}

function StatusPill({ children, tone = 'neutral' }) {
  const styles = {
    good: { bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.35)', color:'#4ade80' },
    warn: { bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.35)', color:'#fbbf24' },
    bad: { bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.35)', color:'#f87171' },
    neutral: { bg:'var(--bg2)', border:'var(--border)', color:'var(--text2)' },
  }[tone]
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 9px', borderRadius:999, border:`1px solid ${styles.border}`, background:styles.bg, color:styles.color, fontSize:11, fontWeight:700 }}>{children}</span>
}

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  const platform = useMemo(() => detectPlatform(), [])
  const [state, setState] = useState({ supported: isPushSupported(), enabled: false, permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isEn = lang === 'en'
  const t = (ru, en) => isEn ? en : ru

  async function refresh() {
    if (!user?.id) return
    try {
      setState(await getPushState(user.id))
    } catch (e) {
      setError(e?.message || t('Не удалось проверить статус уведомлений.', 'Could not check notification status.'))
    }
  }

  useEffect(() => { refresh() }, [user?.id])

  async function handleEnable() {
    if (!user?.id || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await enablePushNotifications(user.id)
      await refresh()
      setMessage(t('Готово. Это устройство подписано на push-уведомления.', 'Done. This device is subscribed to push notifications.'))
    } catch (e) {
      await refresh()
      setError(e?.message || t('Не удалось включить уведомления.', 'Could not enable notifications.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    if (!user?.id || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await disablePushNotifications(user.id)
      await refresh()
      setMessage(t('Push на этом устройстве выключен.', 'Push is disabled on this device.'))
    } catch (e) {
      setError(e?.message || t('Не удалось выключить уведомления.', 'Could not disable notifications.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleTestLocal() {
    setError(''); setMessage('')
    try {
      if (!state.enabled) throw new Error(t('Сначала включи push для этого устройства.', 'Enable push on this device first.'))
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Elara', {
        body: t('Тестовое уведомление работает на этом устройстве.', 'Test notification works on this device.'),
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        data: { url: '/notification-settings' },
      })
      setMessage(t('Тест отправлен. Если его не видно, проверь системные настройки уведомлений.', 'Test sent. If you cannot see it, check system notification settings.'))
    } catch (e) {
      setError(e?.message || t('Не удалось показать тестовое уведомление.', 'Could not show test notification.'))
    }
  }

  function openBrowserSiteSettings() {
    setMessage(t(
      'Браузеры почти никогда не дают открыть системные настройки напрямую. Открой настройки по инструкции ниже. Да, это нелепо. Нет, веб не стал взрослее.',
      'Browsers almost never allow opening system settings directly. Use the guide below. Yes, it is ridiculous. No, the web has not matured.'
    ))
  }

  const permissionTone = state.permission === 'granted' && state.enabled ? 'good' : state.permission === 'denied' ? 'bad' : 'warn'
  const permissionLabel = state.enabled
    ? t('Включены', 'Enabled')
    : state.permission === 'denied'
      ? t('Запрещены в системе', 'Blocked by system')
      : state.permission === 'default'
        ? t('Не запрошены', 'Not requested')
        : t('Не включены', 'Not enabled')

  const guide = (() => {
    if (!state.supported) return {
      title: t('Этот браузер не поддерживает Web Push', 'This browser does not support Web Push'),
      steps: [
        t('Попробуй Chrome, Edge или установленную PWA.', 'Try Chrome, Edge, or the installed PWA.'),
        t('На iPhone нужна iOS 16.4+ и приложение, добавленное на экран Домой.', 'On iPhone, iOS 16.4+ and an app added to Home Screen are required.'),
      ]
    }
    if (platform.isIOS) return {
      title: t('iPhone / iPad', 'iPhone / iPad'),
      steps: [
        t('Открой Elara именно как PWA с экрана Домой, не просто вкладку Safari.', 'Open Elara as a Home Screen PWA, not just a Safari tab.'),
        t('Нажми “Разрешить уведомления” на этой странице.', 'Tap “Allow notifications” on this page.'),
        t('Если уже нажимала “Не разрешать”: Настройки iPhone → Уведомления → Elara → Разрешить уведомления.', 'If you already tapped “Don’t allow”: iPhone Settings → Notifications → Elara → Allow Notifications.'),
        t('Если Elara не видна в списке: удали PWA с экрана Домой, добавь заново и снова нажми кнопку разрешения.', 'If Elara is not listed: remove the PWA from Home Screen, add it again, then tap the permission button again.'),
      ]
    }
    if (platform.isAndroid) return {
      title: t('Android', 'Android'),
      steps: [
        t('Нажми “Разрешить уведомления” на этой странице.', 'Tap “Allow notifications” on this page.'),
        t('Если уведомления заблокированы: долго нажми иконку Elara → О приложении → Уведомления → Разрешить.', 'If notifications are blocked: long-press the Elara icon → App info → Notifications → Allow.'),
        t('Или в Chrome: замочек у адреса сайта → Разрешения → Уведомления → Разрешить.', 'Or in Chrome: lock icon near the site address → Permissions → Notifications → Allow.'),
      ]
    }
    return {
      title: t('Компьютер / браузер', 'Desktop / browser'),
      steps: [
        t('Нажми “Разрешить уведомления” на этой странице.', 'Click “Allow notifications” on this page.'),
        t('Если уведомления заблокированы: нажми замочек рядом с адресом сайта → Site settings / Настройки сайта → Notifications / Уведомления → Allow / Разрешить.', 'If notifications are blocked: click the lock icon near the address → Site settings → Notifications → Allow.'),
        t('После изменения настроек обнови страницу.', 'Reload the page after changing settings.'),
      ]
    }
  })()

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'22px 18px', gap:14, overflowY:'auto' }}>
      <button onClick={() => navigate(-1)} style={{ alignSelf:'flex-start', background:'none', border:'none', color:'var(--text3)', fontSize:13, cursor:'pointer' }}>‹ {t('Назад', 'Back')}</button>

      <div>
        <h2 style={{ fontSize:28, marginBottom:6 }}>🔔 {t('Уведомления', 'Notifications')}</h2>
        <p style={{ color:'var(--text2)', fontSize:13, lineHeight:1.6, margin:0 }}>
          {t('Здесь включается системный push для этого конкретного устройства. Если друг установил PWA, он тоже должен зайти сюда и разрешить уведомления у себя. Потому что телефоны, к сожалению, не подписываются на заботу телепатически.', 'Enable system push for this specific device here. If a friend installed the PWA, they must also open this page and allow notifications on their own device.')}
        </p>
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{t('Статус на этом устройстве', 'Status on this device')}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
              {platform.isStandalone ? t('Открыто как PWA', 'Opened as PWA') : t('Открыто в браузере', 'Opened in browser')}
            </div>
          </div>
          <StatusPill tone={permissionTone}>{permissionLabel}</StatusPill>
        </div>

        {state.permission === 'denied' && (
          <div style={{ padding:'10px 12px', borderRadius:12, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)', color:'#fca5a5', fontSize:12, lineHeight:1.55 }}>
            {t('Уведомления уже запрещены на уровне системы/браузера. Кнопка в приложении больше не сможет показать popup разрешения, пока ты вручную не включишь уведомления в настройках устройства.', 'Notifications are already blocked by the system/browser. The app button cannot show the permission popup again until you manually allow notifications in device settings.')}
          </div>
        )}

        {!state.supported && (
          <div style={{ padding:'10px 12px', borderRadius:12, border:'1px solid rgba(251,191,36,0.3)', background:'rgba(251,191,36,0.08)', color:'#fde68a', fontSize:12, lineHeight:1.55 }}>
            {t('Web Push здесь не поддерживается. На iPhone проверь iOS 16.4+ и запуск именно из PWA.', 'Web Push is not supported here. On iPhone, check iOS 16.4+ and launch from the PWA.')}
          </div>
        )}

        <div style={{ display:'grid', gap:8 }}>
          <button className="btn btn-primary" onClick={handleEnable} disabled={busy || !state.supported || state.permission === 'denied'}>
            {busy ? '...' : state.enabled ? t('Переустановить подписку', 'Refresh subscription') : t('Разрешить уведомления', 'Allow notifications')}
          </button>
          <button className="btn btn-ghost" onClick={handleTestLocal} disabled={!state.enabled || busy}>
            {t('Показать тестовое уведомление', 'Show test notification')}
          </button>
          <button className="btn btn-ghost" onClick={handleDisable} disabled={!state.enabled || busy}>
            {t('Выключить на этом устройстве', 'Disable on this device')}
          </button>
          <button className="btn btn-ghost" onClick={openBrowserSiteSettings}>
            {t('Где включить в системе?', 'Where to enable in system?')}
          </button>
        </div>

        {message && <div style={{ fontSize:12, color:'#4ade80', lineHeight:1.55 }}>{message}</div>}
        {error && <div style={{ fontSize:12, color:'#fb7185', lineHeight:1.55 }}>{error}</div>}
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:15, fontWeight:700 }}>{guide.title}</div>
        <ol style={{ margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:8 }}>
          {guide.steps.map((step, i) => <li key={i} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>{step}</li>)}
        </ol>
      </div>

      <div className="card" style={{ background:'var(--bg2)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>🧭 {t('Куда будут вести уведомления', 'Where notifications will open')}</div>
        <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
          {t('Если уведомление связано с циклом, оно откроет календарь. Если с сообщением партнёра или друга - круг/профиль. Если с лекарствами - назначения. Если с весом, спортом или самочувствием - нужный экран трекера. Если ссылки нет, откроется Сегодня.', 'Cycle notifications open the calendar. Partner or friend messages open the circle/profile. Medication notifications open medications. Weight, sport, or wellbeing notifications open the right tracker screen. If there is no link, Today opens.')}
        </div>
      </div>
    </div>
  )
}
