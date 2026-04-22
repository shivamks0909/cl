import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!baseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

// Client-side client for use in Client Components
export function createClient() {
  return createSupabaseClient(
    baseUrl as string,
    anonKey
  )
}

// Export singleton for convenience
export const supabase = createSupabaseClient(
  baseUrl,
  anonKey
)
