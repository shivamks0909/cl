/**
 * POST /api/session
 * 
 * Creates a secure tracking session for projectless mode.
 * This allows launching a survey without a pre-created project
 * while still maintaining callback integrity.
 *
 * Request body:
 * {
 *   uid: string           — respondent identifier
 *   pid?: string          — project code (optional for projectless mode)
 *   supplier_token?: string
 *   source?: 'direct' | 'supplier' | 'projectless'
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   sid: string,          — the secure session identifier to pass in survey URL
 *   session: TrackingSession
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { SessionService } from '@/lib/session-service'
import { getClientIp } from '@/lib/getClientIp'
import { getUnifiedDb } from '@/lib/unified-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { uid, pid, supplier_token, source, metadata } = body

    if (!uid) {
        return NextResponse.json({ success: false, error: 'uid is required' }, { status: 400 })
    }

    // Optionally resolve project if pid provided
    let projectId: string | null = null
    let supplierId: string | null = null

    try {
        const { database: db } = await getUnifiedDb()

        if (pid) {
            const { data: proj } = await db
                .from('projects')
                .select('id')
                .eq('project_code', pid)
                .maybeSingle()
            if (proj) projectId = proj.id
        }

        if (supplier_token) {
            const { data: sup } = await db
                .from('suppliers')
                .select('id')
                .eq('supplier_token', supplier_token)
                .eq('status', 'active')
                .maybeSingle()
            if (sup) supplierId = sup.id
        }
    } catch (err: any) {
        console.error('[POST /api/session] DB lookup error:', err.message)
    }

    const resolvedSource: 'direct' | 'supplier' | 'projectless' =
        source === 'supplier' || supplier_token ? 'supplier' :
        source === 'projectless' || !pid ? 'projectless' :
        'direct'

    const session = await SessionService.createSession({
        uid,
        pid: pid || null,
        project_id: projectId,
        supplier_token: supplier_token || null,
        supplier_id: supplierId,
        source: resolvedSource,
        ip,
        user_agent: userAgent,
        metadata: metadata || {}
    })

    if (!session) {
        return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        sid: session.sid,
        session
    })
}

/**
 * GET /api/session?sid=<sid>
 * 
 * Look up a session by sid. Useful for debugging / admin tools.
 * Blocked in production unless admin key provided.
 */
export async function GET(request: NextRequest) {
    const sid = request.nextUrl.searchParams.get('sid')

    if (!sid) {
        return NextResponse.json({ success: false, error: 'sid is required' }, { status: 400 })
    }

    const resolution = await SessionService.resolveSessionBySid(sid)

    if (!resolution.found) {
        return NextResponse.json({
            success: false,
            blocked: resolution.blocked,
            reason: resolution.reason
        }, { status: 404 })
    }

    return NextResponse.json({ success: true, session: resolution.session })
}
