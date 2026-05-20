import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../lib/unified-db'
import { getClientIp } from '../../lib/getClientIp'
import { TrackingService, EntryContext } from '../../lib/tracking-service'
import { SessionService } from '../../lib/session-service'
import { auditService } from '../../lib/audit-service'

export const dynamic = 'force-dynamic'
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const searchParams = request.nextUrl.searchParams
    
    const code = (searchParams.get('code') || searchParams.get('pid') || '').trim()
    const incomingUid = (searchParams.get('uid') || 'N/A').trim()
    const supplierToken = searchParams.get('supplier') || searchParams.get('oi_supplier') || null

    if (!code) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID LINK')
        errorUrl.searchParams.set('desc', 'The project code is missing or invalid.')
        return NextResponse.redirect(errorUrl)
    }

    const { database: db } = await getUnifiedDb()
    if (!db) {
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM OFFLINE')
        return NextResponse.redirect(fatalUrl)
    }

    try {
        // 1. Resolve Project BY CODE
        let { data: project } = await db
            .from('projects')
            .select('id')
            .eq('project_code', code)
            .maybeSingle()

        // Fallback for dynamic project if explicit code not found
        if (!project) {
            const { data: dynamicP } = await db.from('projects').select('id').eq('project_code', 'DYNAMIC_ENTRY').maybeSingle()
            if (dynamicP) project = dynamicP
        }

        if (!project) {
            await auditService.log({
                event_type: 'entry_denied',
                payload: { reason: 'project_not_found', project_code: code, uid: incomingUid },
                ip, user_agent: userAgent
            })
            const errorUrl = new URL('/paused', request.url)
            errorUrl.searchParams.set('title', 'PROJECT NOT FOUND')
            return NextResponse.redirect(errorUrl)
        }

        // 2. Fetch GeoIP data
        let geoData = null
        let countryCode: string | null = null
        try {
            const { getCountryFromIp } = await import('@/lib/geoip-service')
            const geoCountry = await getCountryFromIp(request, ip)
            geoData = { country: geoCountry }
            countryCode = geoCountry || null
        } catch (e) {
            console.error('[Track] GeoIP Lookup failed:', e)
        }

        // 3. Detect device type
        const detectDevice = (ua: string): string => {
            const lowerUA = ua.toLowerCase()
            if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lowerUA)) return 'Tablet'
            if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile'
            return 'Desktop'
        }
        const deviceType = detectDevice(userAgent)

        // 4. Resolve supplier if token provided
        let supplierId: string | null = null
        if (supplierToken) {
            const { data: supplier } = await db
                .from('suppliers')
                .select('id')
                .eq('supplier_token', supplierToken)
                .eq('status', 'active')
                .maybeSingle()
            if (supplier) supplierId = supplier.id
        }

        // ============================================================
        // 5. CREATE SECURE SESSION — before processing the entry
        //    The session is created here so that:
        //    (a) callbacks can be verified against it
        //    (b) the sid becomes the tracking anchor
        // ============================================================
        const session = await SessionService.createSession({
            uid: incomingUid,
            pid: code,
            project_id: project.id,
            supplier_token: supplierToken,
            supplier_id: supplierId,
            source: supplierToken ? 'supplier' : 'direct',
            ip,
            user_agent: userAgent,
            country_code: countryCode,
            device_type: deviceType,
            metadata: { query: Object.fromEntries(searchParams.entries()) }
        })

        // 6. Process Entry through Unified Tracking Service
        const ctx: EntryContext = {
            projectId: project.id,
            rid: incomingUid,
            supplierToken: supplierToken || undefined,
            userAgent,
            ip,
            geoData,
            queryParams: Object.fromEntries(searchParams.entries()),
            source: supplierToken ? 'supplier' : 'direct'
        }

        const result = await TrackingService.processEntry(ctx)

        if (result.success && result.redirectUrl) {
            // ============================================================
            // 7. Inject the sid into the survey redirect URL so it comes
            //    back in the callback (oi_sid param).
            //    We also link the response row to the session.
            // ============================================================
            let finalRedirectUrl = result.redirectUrl

            if (session) {
                try {
                    const urlObj = new URL(finalRedirectUrl)
                    urlObj.searchParams.set('oi_sid', session.sid)
                    finalRedirectUrl = urlObj.toString()
                } catch {
                    // Malformed URL — append manually
                    const sep = finalRedirectUrl.includes('?') ? '&' : '?'
                    finalRedirectUrl = `${finalRedirectUrl}${sep}oi_sid=${session.sid}`
                }

                // Link response ↔ session
                if (result.responseData?.id) {
                    await SessionService.linkResponseToSession(session.sid, result.responseData.id)
                    await SessionService.updateSurveyUrl(session.sid, finalRedirectUrl)
                }
            }

            const response = NextResponse.redirect(new URL(finalRedirectUrl))
            
            // Set tracking cookies for persistence
            const cookieOptions = { 
                maxAge: 86400, 
                path: '/', 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'lax' as const 
            }
            response.cookies.set('last_uid', incomingUid, cookieOptions)
            if (result.responseData?.oi_session) {
                response.cookies.set('last_sid', result.responseData.oi_session, cookieOptions)
            }
            response.cookies.set('last_pid', code, cookieOptions)
            if (session) {
                response.cookies.set('oi_sid', session.sid, { ...cookieOptions, httpOnly: false })
            }
            
            return response
        }

        // 8. Handle Redirections for Errors/Quota
        const uid = encodeURIComponent(incomingUid)
        const errorMap: Record<string, string> = {
          PROJECT_PAUSED:      `/status?code=${code}&uid=${uid}&type=paused`,
          THROTTLED:           `/paused?title=THROTTLED&desc=Too+many+requests.`,
          DUPLICATE:           `/status?code=${code}&uid=${uid}&type=duplicate_string`,
          GEO_MISMATCH:        `/paused?title=GEO_MISMATCH`,
          COUNTRY_UNAVAILABLE: `/paused?title=COUNTRY+UNAVAILABLE`,
          QUOTA_FULL:          `/quotafull?code=${code}&uid=${uid}&type=quota`,
          SERVER_ERROR:        `/paused?title=SERVER_ERROR`
        }

        const redirectPath = errorMap[result.errorType || 'SERVER_ERROR'] || `/paused?title=ENTRY_DENIED`
        const finalRedirect = new URL(redirectPath, request.url)
        finalRedirect.searchParams.set('ip', ip)
        
        // Pass clickid if available for status persistence
        if (result.responseData?.oi_session) {
            finalRedirect.searchParams.set('clickid', result.responseData.oi_session)
        } else if (result.responseData?.clickid) {
            finalRedirect.searchParams.set('clickid', result.responseData.clickid)
        }

        return NextResponse.redirect(finalRedirect)

    } catch (error: any) {
        console.error('[Track Route] Unified Error:', error)
        return NextResponse.redirect(new URL('/paused?title=SERVER_ERROR', request.url))
    }
}
