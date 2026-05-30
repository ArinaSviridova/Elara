#!/usr/bin/env node
// Скрипт для AI-перевода файлов локализации через Supabase Edge Function
// Запуск: SUPABASE_URL=... SUPABASE_ANON_KEY=... node translate-locales.js [lang]
//
// Пример: node translate-locales.js be  (только белорусский)
// Или:    node translate-locales.js all  (все языки)

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales')
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdquuhnkwhmohweiudlx.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || ''

const LANG_NAMES = {
  be: 'Belarusian', uk: 'Ukrainian', ka: 'Georgian',
  pl: 'Polish', de: 'German', fr: 'French', es: 'Spanish', tr: 'Turkish'
}

const targetArg = process.argv[2] || 'all'
const targets = targetArg === 'all' ? Object.keys(LANG_NAMES) : [targetArg]

// Загрузка базового ru.json
const ruSource = JSON.parse(await fs.readFile(path.join(LOCALES_DIR, 'ru.json'), 'utf8'))
const entries = Object.entries(ruSource)
const BATCH_SIZE = 60

for (const langCode of targets) {
  console.log(`\n📝 Translating to ${LANG_NAMES[langCode]} (${langCode})...`)
  
  const allTranslated = {}
  let batchNum = 0
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    batchNum++
    const batch = Object.fromEntries(entries.slice(i, i + BATCH_SIZE))
    
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          userId: 'system',
          requestType: 'translate_ui',
          targetLang: langCode,
          strings: batch,
        })
      })
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      if (data?.translated) {
        Object.assign(allTranslated, data.translated)
        process.stdout.write(`  Batch ${batchNum}: ✓ (${Object.keys(data.translated).length} keys)\n`)
      }
    } catch (err) {
      console.error(`  Batch ${batchNum}: ✗ ${err.message} — skipping`)
      // Заполняем английским как fallback
      Object.assign(allTranslated, batch)
    }
    
    // Небольшая пауза между батчами
    await new Promise(r => setTimeout(r, 300))
  }
  
  // Проверка полноты
  const missing = entries.filter(([k]) => !allTranslated[k]).map(([k]) => k)
  if (missing.length > 0) {
    console.log(`  ⚠️  Missing ${missing.length} keys, filling with Russian`)
    missing.forEach(k => { allTranslated[k] = ruSource[k] })
  }
  
  const outPath = path.join(LOCALES_DIR, `${langCode}.json`)
  await fs.writeFile(outPath, JSON.stringify(allTranslated, null, 2), 'utf8')
  console.log(`  ✅ Saved ${outPath} (${Object.keys(allTranslated).length} keys)`)
}

console.log('\n🎉 Done! All locales translated.')
