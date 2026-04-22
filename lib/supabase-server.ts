import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createAdminClient() {
  let baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  let apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!baseUrl || !apiKey) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Supabase] Configuration missing: URL=${baseUrl || 'MISSING'}, KEY=${apiKey ? 'PRESENT' : 'MISSING'}`)
    }
    return null
  }

  try {
    const client = createSupabaseClient(baseUrl, apiKey)
    // Return wrapper with .database for legacy compatibility with insforge-server pattern
    return {
      database: client,
      from: (table: string) => client.from(table),
      rpc: (fn: string, params: any) => client.rpc(fn, params)
    }
  } catch (err) {
    console.error('[Supabase] Failed to create client:', err)
    return null
  }
}

export async function createServerClient() {
  const cookieStore = await cookies()
  
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!baseUrl || !apiKey) {
    console.error('Supabase server configuration missing: URL=', baseUrl, ' KEY=', !!apiKey)
    return null
  }

  return createSupabaseClient(baseUrl, apiKey)
}
