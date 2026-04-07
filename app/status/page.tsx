import React, { Suspense } from 'react'
import { headers } from 'next/headers'
import { WavyOutcomeView } from '../../components/public/WavyOutcomeView'
import { getUnifiedDb } from '../../lib/unified-db'
import { getClientIp } from '../../lib/getClientIp'

export const dynamic = 'force-dynamic'
export const runtime = "nodejs";

async function StatusContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await searchParams
    const head = await headers()
    const ip = getClientIp({ headers: head })

    const type = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'complete'
    const clickid = typeof resolvedParams.clickid === 'string' ? resolvedParams.clickid : (typeof resolvedParams.cid === 'string' ? resolvedParams.cid : null)
    const urlUid = typeof resolvedParams.uid === 'string' ? resolvedParams.uid : null
    const urlCode = typeof resolvedParams.code === 'string' ? resolvedParams.code : (typeof resolvedParams.pid === 'string' ? resolvedParams.pid : null)
    
    let statusLabel = "Complete"
    let keyword = "complete"
    let dbStatus = "complete"

    switch (type) {
        case 'terminate':
            statusLabel = "Terminated"
            keyword = "terminate"
            dbStatus = "terminate"
            break
        case 'quota':
        case 'quotafull':
        case 'quota_full':
            statusLabel = "Quota Full"
            keyword = "quotafull"
            dbStatus = "quota_full"
            break
        case 'security':
        case 'security_terminate':
            statusLabel = "Terminated"
            keyword = "security"
            dbStatus = "security_terminate"
            break
        case 'paused':
            statusLabel = "Project Paused"
            keyword = "paused"
            dbStatus = "paused"
            break
        case 'duplicate':
        case 'duplicate_string':
        case 'duplicate_ip':
            statusLabel = "Duplicate Entry"
            keyword = "duplicate"
            dbStatus = "duplicate_string"
            break
        default:
            statusLabel = "Complete"
            keyword = "complete"
            dbStatus = "complete"
    }

    let dbLoi: number | undefined = undefined
    let dbIp: string | undefined = undefined

    // Attempt status persistence and record retrieval
    if (clickid || urlUid) {
        try {
            const { database: db } = await getUnifiedDb()
            if (db) {
                // 1. Try updating the status if it's currently in progress
                let updateQuery = db.from('responses').update({ 
                    status: dbStatus,
                    updated_at: new Date().toISOString()
                }).in('status', ['in_progress', 'started'])

                if (clickid) {
                    await updateQuery.eq('oi_session', clickid)
                } else if (urlUid && urlCode) {
                    await updateQuery.eq('uid', urlUid).eq('project_code', urlCode)
                } else if (urlUid) {
                    await updateQuery.eq('uid', urlUid).order('created_at', { ascending: false }).limit(1)
                }

                // 2. Fetch the record (whether we updated it or it was already done) to get metrics
                let fetchQuery = db.from('responses')
                    .select('start_time, completion_time, updated_at, ip')
                
                if (clickid) {
                    fetchQuery = fetchQuery.eq('oi_session', clickid)
                } else if (urlUid && urlCode) {
                    fetchQuery = fetchQuery.eq('uid', urlUid).eq('project_code', urlCode)
                } else if (urlUid) {
                    fetchQuery = fetchQuery.eq('uid', urlUid).order('created_at', { ascending: false }).limit(1)
                }

                const { data: record } = await fetchQuery.maybeSingle()
                
                if (record && record.start_time) {
                    const start = new Date(record.start_time).getTime()
                    const end = new Date(record.completion_time || record.updated_at || new Date()).getTime()
                    const diffMin = Math.floor((end - start) / 60000)
                    if (diffMin >= 0) dbLoi = diffMin
                }
                if (record && record.ip) {
                    dbIp = record.ip
                }
            }
        } catch (e) {
            console.error('[Status Page] Failed to sync status/metrics:', e)
        }
    }

    return (
        <WavyOutcomeView 
            status={statusLabel}
            statusKeyword={keyword}
            session={clickid || undefined}
            ip={dbIp || ip}
            loi={dbLoi}
        />
    )
}

export default function StatusPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">Loading status...</div>}>
            <StatusContent searchParams={searchParams} />
        </Suspense>
    )
}
