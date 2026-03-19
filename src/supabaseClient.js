import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gsrqikfeirbnmoyjioyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcnFpa2ZlaXJibm1veWppb3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNjM3MjEsImV4cCI6MjA4MTgzOTcyMX0.EbSlHndYzhg8hVJE-pKe4optgktcJQ8wGqn1GkmqD4o'

export const supabase = createClient(supabaseUrl, supabaseKey)