import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedDb } from '../../../lib/unified-db';
import { getClientIp } from '../../../lib/getClientIp';
import { updateResponseStatus } from '../../../lib/landingService';
import { auditService } from '../../../lib/audit-service';
import { logTrackingEvent } from '../../../lib/tracking-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * EXR Status Callback API
 * 
 * Handles EXR client callback format:
 * GET /api/status?code=test&uid=UID&type=complete
 * GET /api/status?code=test&uid=UID&type=terminate
 * GET /api/status?code=test&uid=UID&type=quota
 * 
 * Normalizes type to internal status and processes tracking.
 * This route is needed in addition to /api/callback for EXR vendors.
 */

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');       // Project code (or test code)
    const uid = searchParams.get('uid');     // Respondent ID
    const type = searchParams.get('type');    // Status type: complete | terminate | quota
    const clickid = searchParams.get('clickid'); // Optional clickid

    const rawQuery = request.nextUrl.search.toString();

    console.log('[EXR Status] Received callback:', {
        code,
        uid,
        type,
        clickid,
        rawQuery
    });

    // Validate required parameters
    if (!uid || !type) {
        await logTrackingEvent({
            pid: code,
            uid,
            clickid,
            status: 'terminate',
            source: 'direct',
            supplier_id: null,
            project_id: null,
            ip_address: ip,
            user_agent: userAgent,
            rawQuery
        }, 400, false, 'Missing required parameters: uid and type');

        return NextResponse.json(
            { success: false, error: 'Missing required parameters: uid and type' },
            { status: 400 }
        );
    }

    // Normalize type to internal status
    const statusMap: Record<string, string> = {
        complete: 'complete',
        terminate: 'terminate',
        security_terminate: 'terminate',
        security: 'terminate'
    };

    const internalStatus = statusMap[type] || 'terminate';

    console.log('[EXR Status] Normalized status:', {
        type,
        internalStatus
    });

    try {
        // Enforce strict security: check if clickid is provided
        if (!clickid) {
            console.warn(`[EXR Status] Rejecting insecure callback (missing clickid) for pid=${code}, uid=${uid}`);
            
            await auditService.log({
                event_type: 'SECURITY_CALLBACK_DENIED',
                payload: { reason: 'missing_clickid', pid: code, uid, endpoint: '/api/status' },
                ip,
                user_agent: userAgent
            });

            await logTrackingEvent({
                pid: code,
                uid,
                clickid: null,
                status: internalStatus,
                source: 'direct',
                supplier_id: null,
                project_id: null,
                ip_address: ip,
                user_agent: userAgent,
                rawQuery
            }, 403, false, 'Security: clickid required');

            return NextResponse.json(
                { success: false, error: 'Security verification required (clickid missing)' },
                { status: 403 }
            );
        }

        // Use the centralized secure update function with strictMode=true
        const updateResult = await updateResponseStatus(
            code || 'UNKNOWN',
            uid,
            internalStatus,
            clickid,
            request.nextUrl.pathname,
            ip,
            true // strictMode: ONLY allows lookup by clickid
        );

        if (!updateResult) {
            console.warn(`[EXR Status] Security denial for callback: pid=${code}, uid=${uid}, clickid=${clickid}`);
            
            await auditService.log({
                event_type: 'SECURITY_CALLBACK_DENIED',
                payload: { reason: 'invalid_clickid_or_mismatch', pid: code, uid, clickid, endpoint: '/api/status' },
                ip,
                user_agent: userAgent
            });

            await logTrackingEvent({
                pid: code,
                uid,
                clickid,
                status: internalStatus,
                source: 'direct',
                supplier_id: null,
                project_id: null,
                ip_address: ip,
                user_agent: userAgent,
                rawQuery
            }, 403, false, 'Security: Invalid clickid or project mismatch');

            // Redirect to status page with error info
            return NextResponse.redirect(
                new URL(`/status?code=${encodeURIComponent(code || 'UNKNOWN')}&uid=${encodeURIComponent(uid)}&type=security_fail`, request.url)
            );
        }

        // Successfully updated
        console.log(`[EXR Status] Securely updated response ${updateResult.id} to ${internalStatus}`);

        // 6. Redirect to status page
        const statusUrl = `/status?code=${encodeURIComponent(code || updateResult.project_code || '')}&uid=${encodeURIComponent(uid)}&type=${encodeURIComponent(type)}`;
        
        console.log(`[EXR Status] Redirecting to: ${statusUrl}`);
        return NextResponse.redirect(new URL(statusUrl, request.url));

    } catch (error: any) {
        console.error('[EXR Status] Error:', error);

        await logTrackingEvent({
            pid: code,
            uid,
            clickid,
            status: internalStatus,
            source: 'direct',
            supplier_id: null,
            project_id: null,
            ip_address: ip,
            user_agent: userAgent,
            rawQuery
        }, 500, false, error.message);

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
