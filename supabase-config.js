// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://wqghejwcbtyspqrwlnvc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vzk2Np3uyNIo3EWyBtvX0g_XgS2cYtR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 결제 키 (Toss Payments)
export const TOSS_CLIENT_KEY = 'YOUR_TOSS_CLIENT_KEY';
