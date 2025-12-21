import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gsrqikfeirbnmoyjioyb.supabase.co' 
const supabaseAnonKey = 'sb_publishable_Pi5ee4zUosV-q9nwNo745Q_aqoqJWkA' 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)