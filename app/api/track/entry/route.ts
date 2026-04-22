import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { getClientIp } from '@/lib/getClientIp'
import { TrackingService, EntryContext } from '@/lib/tracking-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pid = searchParams.get('pid') || searchParams.get('code')
  const uid = searchParams.get('uid') || 'N/A'
  const supplierToken = searchParams.get('supplier') || searchParams.get('oi_supplier') || null

  return await processEntry(pid, uid, supplierToken, request)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const pid = body.pid || body.code
  const uid = body.uid || 'N/A'
  const supplierToken = body.supplier || body.oi_supplier || null

  return await processEntry(pid, uid, supplierToken, request)
}

async function processEntry(
  pid: string | null,
  uid: string,
  supplierToken: string | null,
  request: NextRequest
) {
  if (!pid) {
    return NextResponse.json(
      { success: false, error: 'Missing project code (pid)' },
      { status: 400 }
    )
  }

  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || 'Unknown'

  const { database: db } = await getUnifiedDb()
  if (!db) {
    return NextResponse.json(
      { success: false, error: 'Database unavailable' },
      { status: 503 }
    )
  }

  try {
    // Resolve project by code
    const { data: project, error: pError } = await db
      .from('projects')
      .select('id')
      .eq('project_code', pid)
      .maybeSingle()

    if (pError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Call TrackingService
    const ctx: EntryContext = {
      projectId: project.id,
      rid: uid,
      supplierToken: supplierToken || undefined,
      userAgent,
      ip,
      geoData: undefined,
      queryParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      source: supplierToken ? 'supplier' : 'direct'
    }

    const result = await TrackingService.processEntry(ctx)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.errorType, message: result.errorMessage },
        { status: 400 }
      )
    }

    // Extract session token from response
    const sessionToken = result.responseData?.oi_session || result.responseData?.clickid || null

    return NextResponse.json({
      success: true,
      token: sessionToken,
      responseId: result.responseData?.id,
      redirectUrl: result.redirectUrl
    })

  } catch (error: any) {
    console.error('[Track Entry API] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
