import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseKey = 'gsrqikfeirbnmoyjioyb'

export const supabase = createClient(supabaseUrl, supabaseKey)