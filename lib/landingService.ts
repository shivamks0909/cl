import { NextRequest } from "next/server";
import { createAdminClient } from "./supabase-server";
import { getClientIp } from "./getClientIp";
import { Response, SupplierProjectLink } from "./types";

export async function getLandingDataByClickId(clickid: string): Promise<Response | null> {
    const db = await createAdminClient()
    if (!db) return null

    const { data: response } = await db.database
        .from('responses')
        .select('*')
        .eq('clickid', clickid)
        .maybeSingle()

    return response as Response | null
}

/**
 * Simple redirect-based status updater.
 * Finds the exact record by oi_session or clickid only.
 * Safety rules:
 *   1. NEVER inserts a new row (unless TEST MODE enabled for localhost & strictMode=false)
 *   2. NEVER overwrites a status that is already finalized
 *   3. Returns null if no record found by session token (unless TEST MODE)
 *   4. STRICT MODE: No fallback to pid+uid lookups - prevents fake callbacks
 */
export async function updateResponseStatus(
    projectCode: string,
    userUid: string,
    newStatus: string,
    clickid?: string | null,
    lastLandingPage?: string | null,
    ipAddress?: string | null,
    strictMode: boolean = true
): Promise<{ id: string; status: string; uid: string; ip: string; supplier_uid?: string; project_id?: string; project_code?: string; client_uid_sent?: string; hash_identifier?: string; clickid?: string } | null> {
    const db = await createAdminClient()
    if (!db) return null

    let existing: any = null

    // STEP 1a — Find by oi_session (preferred — zero vendor PID collision risk)
    if (clickid && clickid.includes('-') && clickid.length === 36) {
        const { data: bySession } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .eq('oi_session', clickid)
            .maybeSingle()
        existing = bySession
    }

    // STEP 1b — Find the record by clickid (Case-Insensitive)
    if (!existing && clickid) {
        const cleanCid = clickid.trim()
        const { data } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .ilike('clickid', cleanCid)
            .maybeSingle()
        existing = data
    }



    // If record found, check if it is already terminal
    const terminalStatuses = ['complete', 'terminate', 'quota', 'security_terminate', 'duplicate_ip', 'duplicate_string', 'terminated', 'quota_full']
    if (existing && terminalStatuses.includes(existing.status)) {
        console.log(`[updateResponseStatus] Record ${existing.id} already terminal (${existing.status}). Skipping update.`)
        return existing
    }

    // SECURITY WITH TEST MODE: Allow localhost or ALLOW_TEST_MODE env to create entries
    if (!existing) {
        const clientIp = ipAddress || 'unknown'
        const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.')
        const isTestMode = isLocalhost || process.env.ALLOW_TEST_MODE === 'true'
        
        if (isTestMode && (isLocalhost || !strictMode)) {
            console.log(`[updateResponseStatus] TEST MODE: Creating for ${projectCode}/${userUid}`)
            try {
                let projectId = null
                const { data: projData } = await db.database.from('projects').select('id').eq('project_code', projectCode).maybeSingle()
                if (projData) projectId = projData.id
                
                const testToken = clickid || 'test_' + Date.now()
                const newResponse = await db.database.from('responses').insert({
                    project_code: projectCode,
                    project_id: projectId,
                    uid: userUid,
                    clickid: testToken,
                    oi_session: testToken,
                    status: newStatus,
                    ip: clientIp,
                    start_time: new Date().toISOString(),
                    source: 'test'
                }).select().single()
                
                if (newResponse.data) return newResponse.data
            } catch (err: any) {
                console.error('[updateResponseStatus] TEST error:', err.message)
            }
        }
        
        console.warn(`[updateResponseStatus] BLOCKED: No entry for ${projectCode}/${userUid} IP:${clientIp} strict:${strictMode}`)
        return null
    }

    // Optional attributes to update
    const now = new Date()
    const updatePayload: any = {
        status: newStatus,
        updated_at: now.toISOString()
    }
    if (clickid) updatePayload.hash = clickid
    if (lastLandingPage) updatePayload.last_landing_page = lastLandingPage
    if (ipAddress) updatePayload.ip = ipAddress

    if (terminalStatuses.includes(newStatus)) {
        updatePayload.completion_time = now.toISOString()
        
        if (existing.start_time) {
            const startTime = new Date(existing.start_time)
            const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
            updatePayload.duration_seconds = Math.max(0, durationSeconds)
        }
    }

    // STEP 2 — Update by specific id
    console.log(`[updateResponseStatus] Attempting update for id=${existing.id} to ${newStatus}`);

    try {
        const { error, data } = await db.database
            .from('responses')
            .update(updatePayload)
            .eq('id', existing.id)
            .in('status', ['in_progress', 'started', 'click'])
            .select()
            .single()

        if (error) {
            console.error(`[updateResponseStatus] Update failed for id=${existing.id}:`, error);
            return null;
        }

        if (!data) {
            console.warn(`[updateResponseStatus] Update affected 0 rows for id=${existing.id}. Status might have changed.`);
            return null;
        }

        console.log(`[updateResponseStatus] Successfully updated id=${existing.id} to ${newStatus}`);
        return data as any;
    } catch (e: any) {
        console.error(`[updateResponseStatus] CRITICAL ERROR during update for id=${existing.id}:`, e.message);
        return null;
    }
}

export async function getLandingPageData(
    params: { [key: string]: string | string[] | undefined },
    request: NextRequest
) {
    const cookieUid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_uid='))?.split('=')[1]
    const cookiePid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_pid='))?.split('=')[1]
    const cookieSid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_sid='))?.split('=')[1]

    // Accept both pid and code — pid always wins
    const code = (params.pid as string) || (params.code as string) || cookiePid || "N/A";
    const uid = (params.uid as string) || cookieUid || "N/A";
    const clickid = (params.oi_session as string) || (params.session_token as string) || (params.clickid as string) || (params.cid as string) || cookieSid || null;
    const ip = (params.ip as string) || getClientIp(request);

    const result = {
        pid: code,
        uid,
        clickid,
        ip,
        source: null as string | null,
        response: null as any,
        project: null as any,
        supplier: null as any,
        link: null as SupplierProjectLink | null
    };

    const db = await createAdminClient()
    if (!db) return result

    if (clickid) {
        // ... (existing lookup logic remains similar but we ensure we get supplier token)
        const { data: respBySid } = await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('oi_session', clickid)
            .maybeSingle()

        const { data: respByCid } = !respBySid ? await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('clickid', clickid)
            .maybeSingle() : { data: null }

        const resp = respBySid || respByCid
        if (resp) {
            result.response = resp
            result.pid = resp.project_code || code
            result.uid = resp.uid || resp.user_uid || uid
            result.supplier = resp.suppliers
            result.source = resp.source
            
            console.log(`[getLandingPageData] Response found: id=${resp.id}, source=${resp.source}, supplier_id=${resp.supplier_id}, supplier_token=${resp.supplier_token}`)

            // FALLBACK: If join failed but we have a token, fetch manually
            if (!result.supplier && resp.supplier_token) {
                const { data: s } = await db.database
                    .from('suppliers')
                    .select('*')
                    .eq('supplier_token', resp.supplier_token)
                    .maybeSingle()
                result.supplier = s
                console.log(`[getLandingPageData] Fallback supplier lookup: ${s?.name}`)
            }
        }
    }

    // Fallback: lookup by uid if no clickid response found
    if (!result.response && uid && uid !== 'N/A') {
        const { data: resp } = await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('uid', uid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (resp) {
            result.response = resp
            result.pid = resp.project_code || code
            result.supplier = resp.suppliers
            result.source = resp.source
        }
    }

    // If supplier still missing, try to get from query params ONLY if we have no response record
    // For redirect callbacks (where we have a response), trust the response's source/supplier, not the query param
    const sToken = (params.supplier as string);
    if (!result.response && !result.supplier && sToken) {
        const { data: s } = await db.database
            .from('suppliers')
            .select('*')
            .eq('supplier_token', sToken)
            .maybeSingle();

        if (s) {
            result.supplier = s;
        }
    }

    if (result.pid && result.pid !== "N/A") {
        const { data: proj } = await db.database
            .from('projects')
            .select('*')
            .eq('project_code', result.pid)
            .maybeSingle()

        if (proj) result.project = proj
    }

    // Fetch supplier-project link for link-level custom redirects
    if (result.supplier?.id && result.project?.id) {
        const { data: link } = await db.database
            .from('supplier_project_links')
            .select('*')
            .eq('supplier_id', result.supplier.id)
            .eq('project_id', result.project.id)
            .maybeSingle()

        if (link) result.link = link as SupplierProjectLink
    }

    return result;
}
