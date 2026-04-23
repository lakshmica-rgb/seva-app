import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://syfbmrokkdjseurdobgv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ZmJtcm9ra2Rqc2V1cmRvYmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzUxNDQsImV4cCI6MjA5MjI1MTE0NH0.Py09pVkErvqP5u68EyXg-zQBgBSwIwPKhZmlbNLAeGU'
)