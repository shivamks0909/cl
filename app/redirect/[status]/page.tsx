/**
 * /redirect/[status]/page.tsx
 *
 * Handles survey callbacks: complete, terminate, quotafull
 *
 * Resolution Priority:
 *  1. oi_sid param (secure session — preferred)
 *  2. oi_session / clickid in query params (existing session token)
 *  3. Dynamic Bypass Flow (Callback Trust Engine):
 *     If pid+uid ONLY are supplied, assess transaction confidence.
 *     If genuine: Dynamic project creation + Dynamic response creation + Dashboard update.
 *     If fake: Block database mutation, render landing page only.
 *
 * DB mutations ONLY happen when a valid session or genuine bypass is resolved.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLandingPageData } from "@/lib/landingService";
import { NextRequest } from "next/server";
import { auditService } from "@/lib/audit-service";
import { SessionService } from "@/lib/session-service";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";
import { CallbackTrustEngine } from "@/lib/callback-trust-engine";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Map route status to database status
const statusMap: Record<string, string> = {
  'complete': 'complete',
  'terminate': 'terminate',
  'quotafull': 'quota_full'
};

/** Render a generic landing page without any DB mutation */
function LandingPageOnly({
    routeStatus,
    pid,
    uid,
    note
}: {
    routeStatus: string
    pid: string
    uid: string
    note?: string
}) {
    const label =
        routeStatus === 'complete' ? 'Survey Completed' :
        routeStatus === 'terminate' ? 'Survey Terminated' :
        'Quota Full'

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Survey System</h1>
                <p className="text-gray-600 mb-6">{label}</p>
                <p className="text-sm text-gray-500">
                    Project: {pid}<br/>
                    User: {uid}
                </p>
                {note && (
                    <p className="text-xs text-gray-400 mt-4">({note})</p>
                )}
            </div>
        </div>
    )
}

export default async function RedirectCallbackPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ status: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

    const { status: routeStatus } = await params;
    const paramsObj = await searchParams;
    const headersList = await headers();

    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || '0.0.0.0'
    const userAgent = headersList.get('user-agent') || 'Unknown'
    const referer = headersList.get('referer') || null
    const host = headersList.get('host') || 'localhost:3000'

    // Map route status to DB status
    const dbStatus = (statusMap[routeStatus] || 'terminate') as 'complete' | 'terminate' | 'quota_full'

    // Extract all identifiers from query params
    const oi_sid      = (paramsObj.oi_sid as string) || null          // secure session id (new)
    const clickid     = (paramsObj.oi_session as string)              // internal session token
                     || (paramsObj.session_token as string)
                     || (paramsObj.clickid as string)
                     || (paramsObj.cid as string)
                     || null
    const pid         = (paramsObj.pid as string) || (paramsObj.code as string) || 'N/A'
    const uid         = (paramsObj.uid as string) || 'N/A'

    console.log(`[RedirectCallback] status=${routeStatus} oi_sid=${oi_sid} clickid=${clickid} pid=${pid} uid=${uid} ip=${ip}`)

    // ========================================================================
    // RESOLUTION PATH 1: Secure Session (oi_sid)
    // ========================================================================
    if (oi_sid) {
        const resolution = await SessionService.resolveSessionBySid(oi_sid)

        if (resolution.blocked || !resolution.session) {
            // Blocked — session not found or expired
            await SessionService.logBlockedCallback({
                reason: resolution.reason || 'invalid_session',
                sid: oi_sid,
                pid,
                uid,
                ip,
                userAgent,
                status: dbStatus
            })

            // Still show landing page — no DB update
            const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
            return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={undefined} ip={ip} />
        }

        const session = resolution.session

        // We have a valid session — update the response row
        const { updateResponseStatus } = await import('@/lib/landingService')

        // Use the session's clickid (oi_session from the response row) for DB update
        const sessionClickId = session.response_id
            ? clickid || oi_sid    // prefer real clickid, fall back to sid
            : clickid || oi_sid

        const updateResult = await updateResponseStatus(
            session.pid || pid,
            session.uid || uid,
            dbStatus,
            sessionClickId,
            `/redirect/${routeStatus}`,
            ip,
            true
        )

        // Mark session as resolved regardless of whether row update succeeded
        if (session.response_id) {
            await SessionService.resolveSession(oi_sid, dbStatus, session.response_id)
        } else if (updateResult?.id) {
            await SessionService.resolveSession(oi_sid, dbStatus, updateResult.id)
        }

        if (updateResult) {
            console.log(`[RedirectCallback] ✅ Session ${oi_sid} resolved → ${dbStatus} (response ${updateResult.id})`)
        } else {
            console.log(`[RedirectCallback] ℹ️ Session ${oi_sid} already resolved or row not found — showing landing page.`)
        }

        // Handle supplier-level external redirect
        if (session.supplier_token) {
            const { database: db } = await import('@/lib/unified-db').then(m => m.getUnifiedDb())
            const { data: supplier } = await db
                .from('suppliers')
                .select('complete_redirect_url, terminate_redirect_url, quotafull_redirect_url')
                .eq('supplier_token', session.supplier_token)
                .maybeSingle()

            if (supplier) {
                let targetUrl: string | null = null
                if (routeStatus === 'complete'   && supplier.complete_redirect_url)  targetUrl = supplier.complete_redirect_url
                if (routeStatus === 'terminate'  && supplier.terminate_redirect_url) targetUrl = supplier.terminate_redirect_url
                if (routeStatus === 'quotafull'  && supplier.quotafull_redirect_url) targetUrl = supplier.quotafull_redirect_url

                if (targetUrl) {
                    const finalUrl = targetUrl
                        .replace(/{pid}/g, session.pid || pid)
                        .replace(/{uid}/g, session.uid || uid)
                    console.log(`[RedirectCallback] Supplier redirect: ${finalUrl}`)
                    redirect(finalUrl)
                }
            }
        }

        const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
        return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={sessionClickId} ip={ip} />
    }

    // ========================================================================
    // RESOLUTION PATH 2: Legacy clickid / oi_session (backward compatibility)
    // ========================================================================
    if (clickid) {
        const hostHeader = headersList.get('host') || 'localhost:3000'
        const protocol = headersList.get('x-forwarded-proto') || 'http'
        const baseUrl = `${protocol}://${hostHeader}`
        const dummyRequest = new NextRequest(new URL(baseUrl), { headers: headersList })
        const data = await getLandingPageData(paramsObj, dummyRequest)

        const resolvedUid = data.uid || uid
        const resolvedPid = data.pid || pid

        if (data.response) {
            // Valid response found by clickid — safe to update
            const { updateResponseStatus } = await import('@/lib/landingService')
            const updateResult = await updateResponseStatus(
                resolvedPid,
                resolvedUid,
                dbStatus,
                clickid,
                `/redirect/${routeStatus}`,
                ip,
                true
            )

            if (updateResult) {
                console.log(`[RedirectCallback] ✅ Legacy clickid resolved → ${dbStatus} (response ${updateResult.id})`)
            }

            // Handle supplier redirect
            if (data.source === 'supplier' && data.supplier) {
                const supplier = data.supplier as any
                let targetUrl: string | null = null
                if (routeStatus === 'complete'   && supplier.complete_redirect_url)  targetUrl = supplier.complete_redirect_url
                if (routeStatus === 'terminate'  && supplier.terminate_redirect_url) targetUrl = supplier.terminate_redirect_url
                if (routeStatus === 'quotafull'  && supplier.quotafull_redirect_url) targetUrl = supplier.quotafull_redirect_url
                if (targetUrl) {
                    const finalUrl = targetUrl
                        .replace(/{pid}/g, resolvedPid)
                        .replace(/{uid}/g, resolvedUid)
                    redirect(finalUrl)
                }
            }

            const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
            return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={clickid} ip={ip} />
        }

        // clickid provided but no matching response — log and show landing page
        await SessionService.logBlockedCallback({
            reason: 'clickid_no_matching_response',
            pid: resolvedPid,
            uid: resolvedUid,
            ip,
            userAgent,
            status: dbStatus
        })

        console.log(`[RedirectCallback] BLOCKED: clickid=${clickid} found no response. Showing landing page.`)
        return <LandingPageOnly routeStatus={routeStatus} pid={resolvedPid} uid={resolvedUid} note="No active session found for this clickid" />
    }


    // DEVELOPMENT BYPASS: For localhost/private IPs, skip trust engine and show landing directly
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'Unknown') {
        console.log('[RedirectCallback] DEV BYPASS: IP=' + ip + ' - showing landing page without trust check')
        const hostHeader = headersList.get('host') || 'localhost:3000'
        const protocol = headersList.get('x-forwarded-proto') || 'http'
        const baseUrl = protocol + '://' + hostHeader
        const dummyRequest = new NextRequest(new URL(baseUrl), { headers: headersList })
        const data = await getLandingPageData(paramsObj, dummyRequest)

        if (data.response) {
            const { updateResponseStatus } = await import('@/lib/landingService')
            await updateResponseStatus(pid, uid, dbStatus, data.response.clickid || data.response.oi_session, '/redirect/' + routeStatus, ip, true)
        }

        const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
        return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={data.response?.clickid || data.response?.oi_session || undefined} ip={ip} />
    }


    // ========================================================================
    // RESOLUTION PATH 3: pid + uid ONLY (Bypass Flow & Trust Evaluation)
    // ========================================================================
    const trustResult = await CallbackTrustEngine.evaluate({
        pid,
        uid,
        ip,
        userAgent,
        referer,
        host
    })

    if (trustResult.isGenuine) {
        console.log(`[RedirectCallback] Genuine dynamic callback identified (Score: ${trustResult.score}). Processing Dynamic Provisioning...`)
        
        // 1. Ensure project exists dynamically (create if missing)
        const project = await CallbackTrustEngine.ensureProject(pid)

        // 2. Insert dynamic response entry
        const response = await CallbackTrustEngine.recordDynamicCallback(project, uid, dbStatus, ip, userAgent)

        const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
        return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={response.clickid} ip={ip} />
    }

    // Blocked/untrusted direct callback
    await SessionService.logBlockedCallback({
        reason: trustResult.reason || 'failed_trust_gates',
        pid,
        uid,
        ip,
        userAgent,
        status: dbStatus
    })

    await auditService.log({
        event_type: 'REDIRECT_CALLBACK_UNTRUSTED',
        payload: { reason: trustResult.reason || 'failed_trust_gates', pid, uid, status: dbStatus, score: trustResult.score },
        ip,
        user_agent: userAgent
    })

    console.log(`[RedirectCallback] BLOCKED: untrusted callback (Score: ${trustResult.score}, Reason: ${trustResult.reason}). No DB mutation.`)

    const errorMsg = routeStatus === 'complete'
        ? 'INVALID CALLBACK'
        : 'INVALID CALLBACK, Session token missing';

    const targetUrl = `/paused?title=${encodeURIComponent(errorMsg)}&uid=${encodeURIComponent(uid)}&pid=${encodeURIComponent(pid)}&reason=${encodeURIComponent(trustResult.reason || 'failed_trust_gates')}`;
    console.log(`[RedirectCallback] Redirecting untrusted callback to: ${targetUrl}`);
    redirect(targetUrl);
}
