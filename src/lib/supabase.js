import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wqghejwcbtyspqrwlnvc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_vzk2Np3uyNIo3EWyBtvX0g_XgS2cYtR'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const TOSS_CLIENT_KEY = 'YOUR_TOSS_CLIENT_KEY'
