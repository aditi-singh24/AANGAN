import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bdxutyngvyzvitcksrpn.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_DsNsxnnMJXVj2oBZA_yrqQ_YihuiCAN'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)