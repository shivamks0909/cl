import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/track/lookup?pid=...&session=...
 * Returns supplier name + uid for a given session token.
 * Used by test-survey page to display context after supplier redirect.
 */
export async function GET(request: NextRequest) {
  const pid     = request.nextUrl.searchParams.get('pid')
  const session = request.nextUrl.searchParams.get('session')

  if (!pid || !session) {
    return NextResponse.json({ error: 'Missing pid or session' }, { status: 400 })
  }

  try {
    const { database: db } = await getUnifiedDb()
    if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

    const { data } = await db
      .from('responses')
      .select('uid, supplier_name, supplier_token, source')
      .or(`oi_session.eq.${session},clickid.eq.${session},session_token.eq.${session}`)
      .eq('project_code', pid)
      .maybeSingle()

    return NextResponse.json({
      uid:           data?.uid || null,
      supplier_name: data?.supplier_name || null,
      supplier_token:data?.supplier_token || null,
      source:        data?.source || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
