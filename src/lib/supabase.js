import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://muyjrghgiyoahnliupf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eWpyZ2hnaXlvYWxobmxpdXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDMzNDUsImV4cCI6MjEwNDAxOTM0NX0._klw1k7MLGAaLnNV0FDOi43cyAaasegU3oXLb01ySd0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
