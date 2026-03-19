import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gsrqikfeirbnmoyjioyb.supabase.co'
const supabaseKey = 'gsrqikfeirbnmoyjioyb'

export const supabase = createClient(supabaseUrl, supabaseKey)