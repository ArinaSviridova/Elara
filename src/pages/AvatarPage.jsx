import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

export default function AvatarPage() {
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [mode, setMode] = useState('choose') // choose | upload | generate | result
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.avatar_url || null)
  const [saved, setSaved] = useState(false)

  // Описание внешности для AI
  const [appearance, setAppearance] = useState({
    hair_color: '',
    hair_style: '',
    eye_color: '',
    skin_tone: '',
    age_range: '',
    style: '',
  })

  const HAIR_COLORS = [
    { key:'blonde', ru:'Светлые', en:'Blonde' },
    { key:'brown', ru:'Каштановые', en:'Brown' },
    { key:'black', ru:'Чёрные', en:'Black' },
    { key:'red', ru:'Рыжие', en:'Red' },
    { key:'grey', ru:'Седые', en:'Grey' },
    { key:'colored', ru:'Крашеные (яркие)', en:'Colored (bright)' },
  ]
  const HAIR_STYLES = [
    { key:'long', ru:'Длинные', en:'Long' },
    { key:'medium', ru:'Средней длины', en:'Medium length' },
    { key:'short', ru:'Короткие', en:'Short' },
    { key:'curly', ru:'Кудрявые', en:'Curly' },
    { key:'wavy', ru:'Волнистые', en:'Wavy' },
    { key:'braids', ru:'Косы', en:'Braids' },
    { key:'bun', ru:'Пучок', en:'Bun' },
    { key:'shaved', ru:'Выбритые', en:'Shaved/buzzcut' },
  ]
  const STYLES = [
    { key:'casual', ru:'Повседневный', en:'Casual' },
    { key:'aesthetic', ru:'Эстетичный', en:'Aesthetic' },
    { key:'boho', ru:'Бохо', en:'Boho' },
    { key:'sporty', ru:'Спортивный', en:'Sporty' },
    { key:'elegant', ru:'Элегантный', en:'Elegant' },
    { key:'dark', ru:'Тёмный/Готика', en:'Dark/Gothic' },
    { key:'anime', ru:'Аниме-стиль', en:'Anime style' },
    { key:'fantasy', ru:'Фэнтези', en:'Fantasy' },
  ]

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await updateProfile({ avatar_url: url })
      setCurrentAvatarUrl(url)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Upload error:', err)
      alert(rl('Ошибка загрузки. Проверь размер файла (до 5МБ).', 'Upload error. Check file size (up to 5MB).'))
    }
    setUploading(false)
  }

  async function generateAvatar() {
    setGenerating(true)
    setGeneratedUrl(null)
    try {
      const traits = profile?.personality_tags?.join(', ') || ''
      const interests = [...(profile?.preferences?.music?.slice(0,2)||[]),...(profile?.preferences?.movies?.slice(0,1)||[])].join(', ')

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'generate_avatar',
          appearance, traits, interests,
          gender: profile?.gender || 'cis_woman',
          lang,
        }
      })

      if (error) throw new Error(error.message || 'Function error')

      if (data?.imageUrl) {
        setGeneratedUrl(data.imageUrl)
        setMode('result')
      } else {
        const errMsg = data?.error || 'No image generated'
        console.error('DALL-E error:', errMsg)
        alert(rl(
          'Не удалось сгенерировать изображение. Возможно, DALL-E недоступен. Попробуй снова или загрузи своё фото.',
          'Could not generate image. DALL-E may be unavailable. Try again or upload your own photo.'
        ))
      }
    } catch (err) {
      console.error('Generation error:', err)
      alert(rl(
        'Ошибка при генерации: ' + err.message,
        'Generation error: ' + err.message
      ))
    }
    setGenerating(false)
  }

  async function saveGeneratedAvatar() {
    if (!generatedUrl) return
    setUploading(true)
    // DALL-E URL временный (~1 час). Сохраняем его напрямую.
    // При следующей генерации будет новый URL.
    try {
      await updateProfile({ avatar_url: generatedUrl })
      setCurrentAvatarUrl(generatedUrl)
      setSaved(true)
      setTimeout(() => { setSaved(false); navigate(-1) }, 1500)
    } catch (err) {
      console.error('Save error:', err)
    }
    setUploading(false)
  }

  const SelectRow = ({ label, items, value, onChange }) => (
    <div>
      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{label}</div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {items.map(i => (
          <button key={i.key} onClick={() => onChange(i.key)} style={{
            padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
            border:`1px solid ${value===i.key?'var(--accent)':'var(--border)'}`,
            background:value===i.key?'var(--accent-soft)':'transparent',
            color:value===i.key?'var(--accent)':'var(--text2)',
          }}>{lang==='en'?i.en:i.ru}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:16, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>🖼 {rl('Аватарка','Avatar')}</h2>
      </div>

      {/* Текущий аватар */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        <div style={{
          width:100, height:100, borderRadius:'50%',
          background: currentAvatarUrl ? 'transparent' : 'var(--accent-soft)',
          display:'flex', alignItems:'center', justifyContent:'center',
          overflow:'hidden', border:'2px solid var(--border)',
        }}>
          {currentAvatarUrl
            ? <img src={currentAvatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:36, color:'var(--accent)' }}>{profile?.name?.[0]?.toUpperCase() || '?'}</span>
          }
        </div>
      </div>

      {/* Выбор способа */}
      {mode === 'choose' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => fileRef.current?.click()} className="btn btn-ghost" style={{ padding:'16px', fontSize:14 }}>
            📷 {rl('Загрузить своё фото','Upload my photo')}
          </button>
          <button onClick={() => setMode('generate')} className="btn btn-ghost" style={{ padding:'16px', fontSize:14, border:'1px solid var(--accent)', color:'var(--accent)' }}>
            ✨ {rl('Сгенерировать AI-аватарку','Generate AI avatar')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:'none' }} />
          {uploading && <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13 }}>⟳ {rl('Загружаю...','Uploading...')}</div>}
          {saved && <div style={{ textAlign:'center', color:'#4ade80', fontSize:13 }}>✓ {rl('Сохранено!','Saved!')}</div>}
        </div>
      )}

      {/* Генерация аватарки */}
      {mode === 'generate' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
            {rl(
              'Opиши свою внешность, и AI создаст аватарку в выбранном стиле. Данные о характере и увлечениях из профиля добавятся автоматически.',
              'Describe your appearance and AI will create an avatar in your chosen style. Character and interests from your profile will be added automatically.'
            )}
          </p>

          <SelectRow
            label={rl('Цвет волос','Hair color')}
            items={HAIR_COLORS}
            value={appearance.hair_color}
            onChange={v => setAppearance(p => ({...p, hair_color: v}))}
          />
          <SelectRow
            label={rl('Стрижка/длина','Hair style')}
            items={HAIR_STYLES}
            value={appearance.hair_style}
            onChange={v => setAppearance(p => ({...p, hair_style: v}))}
          />
          <SelectRow
            label={rl('Стиль изображения','Art style')}
            items={STYLES}
            value={appearance.style}
            onChange={v => setAppearance(p => ({...p, style: v}))}
          />

          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
              {rl('Цвет глаз (необязательно)','Eye color (optional)')}
            </div>
            <input
              placeholder={rl('Например: карие, голубые...','E.g.: brown, blue...')}
              value={appearance.eye_color}
              onChange={e => setAppearance(p => ({...p, eye_color: e.target.value}))}
            />
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setMode('choose')} className="btn btn-ghost" style={{ flex:1 }}>
              {rl('Назад','Back')}
            </button>
            <button
              onClick={generateAvatar}
              className="btn btn-primary"
              disabled={generating || !appearance.style}
              style={{ flex:2 }}
            >
              {generating
                ? rl('✨ Генерирую...','✨ Generating...')
                : rl('✨ Создать аватарку','✨ Create avatar')
              }
            </button>
          </div>

          {generating && (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--text3)', fontSize:13, lineHeight:2 }}>
              ✨<br/>
              {rl('AI создаёт твою аватарку... ~15 секунд','AI is creating your avatar... ~15 sec')}
            </div>
          )}
        </div>
      )}

      {/* Результат */}
      {mode === 'result' && generatedUrl && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
          <img
            src={generatedUrl} alt="Generated avatar"
            style={{ width:240, height:240, borderRadius:16, objectFit:'cover', border:'2px solid var(--border)' }}
          />
          <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', margin:0, lineHeight:1.5 }}>
            {rl('Нравится? Сохрани как аватарку!','Like it? Save as your avatar!')}
          </p>
          <div style={{ display:'flex', gap:8, width:'100%' }}>
            <button onClick={() => setMode('generate')} className="btn btn-ghost" style={{ flex:1 }}>
              {rl('Переделать','Regenerate')}
            </button>
            <button onClick={saveGeneratedAvatar} className="btn btn-primary" disabled={uploading} style={{ flex:2 }}>
              {uploading ? '⟳' : saved ? '✓' : rl('Сохранить','Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
