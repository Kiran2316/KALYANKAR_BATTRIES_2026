import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://igjyhdzngtvodyhufwuk.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jLkMWd3JBeP09gnVnJiBAQ_q5cZzVDD'

export const INVOICE_SHORT_LINK_BASE = `${SUPABASE_URL}/functions/v1/invoice`

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
