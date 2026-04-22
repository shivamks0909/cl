import { createClient } from '@supabase/supabase-js'

// Detect if we're on Vercel (production)
const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function getUnifiedDb() {
    // Use Supabase directly - no InsForge fallback
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    return {
        source: 'supabase' as const,
        database: supabase
    }
}
