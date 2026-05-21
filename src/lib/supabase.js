import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fdquuhnkwhmohweiudlx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_pJSuS_37pz0JWKEmCoFiEA_Wf3LHhP2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
