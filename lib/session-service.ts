/**
 * SessionService — Secure Session-Based Tracking
 *
 * Architecture:
 *  - A "tracking session" is created when a respondent launches a survey via /track.
 *  - The session holds: sid, uid, pid, project_id, supplier info, IP, UA, etc.
 *  - The generated `sid` is passed as `oi_sid` in the survey URL and returned in callbacks.
 *  - On /redirect/complete|terminate|quotafull:
 *      1. Resolve by sid first (preferred, cryptographically secure).
 *      2. If valid session found → update response row.
 *      3. If no session → block DB update, show landing page only.
 *
 * Backward Compatibility:
 *  - Existing pid+uid callbacks still surface the landing page.
 *  - DB is only mutated when a valid session is resolved.
 */

import * as crypto from 'crypto'
import { getUnifiedDb } from './unified-db'
import { auditService } from './audit-service'

export type TrackingSession = {
    id: string
    sid: string
    uid: string
    pid: string | null
    project_id: string | null
    supplier_token: string | null
    supplier_id: string | null
    source: 'direct' | 'supplier' | 'projectless'
    survey_url: string | null
    ip: string | null
    user_agent: string | null
    country_code: string | null
    device_type: string | null
    status: 'launched' | 'complete' | 'terminate' | 'quota_full' | 'expired'
    response_id: string | null
    metadata: Record<string, unknown>
    launched_at: string
    resolved_at: string | null
    expires_at: string
    created_at: string
    updated_at: string | null
}

export type CreateSessionInput = {
    uid: string
    pid?: string | null
    project_id?: string | null
    supplier_token?: string | null
    supplier_id?: string | null
    source?: 'direct' | 'supplier' | 'projectless'
    survey_url?: string | null
    ip?: string | null
    user_agent?: string | null
    country_code?: string | null
    device_type?: string | null
    metadata?: Record<string, unknown>
}

export type SessionResolution = {
    found: boolean
    session: TrackingSession | null
    blocked: boolean
    reason?: string
}

export class SessionService {
    /**
     * Generate a cryptographically secure session identifier.
     */
    static generateSid(): string {
        return crypto.randomUUID()
    }

    /**
     * Create a new tracking session at launch time.
     * This is the ONLY place sessions are created — never on callback.
     */
    static async createSession(input: CreateSessionInput): Promise<TrackingSession | null> {
        try {
            const { database: db } = await getUnifiedDb()

            const sid = this.generateSid()
            const now = new Date()
            const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h TTL

            const source = input.source || (input.supplier_token ? 'supplier' : input.pid ? 'direct' : 'projectless')

            const sessionData = {
                sid,
                uid: input.uid,
                pid: input.pid || null,
                project_id: input.project_id || null,
                supplier_token: input.supplier_token || null,
                supplier_id: input.supplier_id || null,
                source,
                survey_url: input.survey_url || null,
                ip: input.ip || null,
                user_agent: input.user_agent || null,
                country_code: input.country_code || null,
                device_type: input.device_type || null,
                status: 'launched' as const,
                response_id: null,
                metadata: input.metadata || {},
                launched_at: now.toISOString(),
                resolved_at: null,
                expires_at: expiresAt.toISOString(),
                created_at: now.toISOString(),
                updated_at: null
            }

            const { data, error } = await db
                .from('tracking_sessions')
                .insert([sessionData])
                .select()
                .single()

            if (error) {
                console.error('[SessionService] Failed to create session:', error.message)
                return null
            }

            console.log(`[SessionService] Session created: sid=${sid} uid=${input.uid} pid=${input.pid || 'projectless'} source=${source}`)
            return data as TrackingSession
        } catch (err: any) {
            console.error('[SessionService] createSession error:', err.message)
            return null
        }
    }

    /**
     * Resolve a session by its sid.
     * Returns { found: true, session } on success.
     * Returns { found: false, blocked: true } on missing/expired/invalid.
     */
    static async resolveSessionBySid(sid: string): Promise<SessionResolution> {
        if (!sid || !sid.includes('-') || sid.length !== 36) {
            return { found: false, session: null, blocked: true, reason: 'invalid_sid_format' }
        }

        try {
            const { database: db } = await getUnifiedDb()

            const { data: session, error } = await db
                .from('tracking_sessions')
                .select('*')
                .eq('sid', sid)
                .maybeSingle()

            if (error) {
                console.error('[SessionService] resolveSessionBySid error:', error.message)
                return { found: false, session: null, blocked: true, reason: 'db_error' }
            }

            if (!session) {
                console.warn(`[SessionService] BLOCKED: sid=${sid} not found`)
                await auditService.log({
                    event_type: 'SESSION_NOT_FOUND',
                    payload: { sid, reason: 'no_matching_session' },
                    ip: 'unknown',
                    user_agent: 'system'
                })
                return { found: false, session: null, blocked: true, reason: 'session_not_found' }
            }

            // Check expiry
            const expiresAt = new Date(session.expires_at)
            if (expiresAt < new Date()) {
                console.warn(`[SessionService] BLOCKED: sid=${sid} expired at ${session.expires_at}`)
                await auditService.log({
                    event_type: 'SESSION_EXPIRED',
                    payload: { sid, expired_at: session.expires_at },
                    ip: session.ip || 'unknown',
                    user_agent: session.user_agent || 'system'
                })
                return { found: false, session: null, blocked: true, reason: 'session_expired' }
            }

            // Already resolved (idempotent: return existing)
            if (session.status !== 'launched') {
                console.log(`[SessionService] Session ${sid} already resolved with status=${session.status}`)
                return { found: true, session: session as TrackingSession, blocked: false }
            }

            return { found: true, session: session as TrackingSession, blocked: false }
        } catch (err: any) {
            console.error('[SessionService] resolveSessionBySid error:', err.message)
            return { found: false, session: null, blocked: true, reason: 'exception' }
        }
    }

    /**
     * Try to find a valid session by pid+uid (legacy fallback — read-only).
     * This NEVER creates a session — just checks if one exists for display purposes.
     * Returns null if not found (caller shows landing page without DB update).
     */
    static async findSessionByPidUid(pid: string, uid: string): Promise<TrackingSession | null> {
        if (!pid || !uid || pid === 'N/A' || uid === 'N/A') return null

        try {
            const { database: db } = await getUnifiedDb()

            const { data, error } = await db
                .from('tracking_sessions')
                .select('*')
                .eq('pid', pid)
                .eq('uid', uid)
                .eq('status', 'launched')
                .gt('expires_at', new Date().toISOString())
                .order('launched_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error || !data) return null
            return data as TrackingSession
        } catch {
            return null
        }
    }

    /**
     * Mark a session as resolved and link it to a response row.
     * Status transitions: launched → complete | terminate | quota_full
     */
    static async resolveSession(
        sid: string,
        newStatus: 'complete' | 'terminate' | 'quota_full',
        responseId: string
    ): Promise<boolean> {
        try {
            const { database: db } = await getUnifiedDb()

            const { error } = await db
                .from('tracking_sessions')
                .update({
                    status: newStatus,
                    response_id: responseId,
                    resolved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('sid', sid)
                .eq('status', 'launched') // Only update if still in 'launched' state

            if (error) {
                console.error(`[SessionService] resolveSession failed for sid=${sid}:`, error.message)
                return false
            }

            console.log(`[SessionService] Session ${sid} resolved → ${newStatus}, response_id=${responseId}`)
            return true
        } catch (err: any) {
            console.error('[SessionService] resolveSession error:', err.message)
            return false
        }
    }

    /**
     * Update the survey_url on an existing session (called after URL is built).
     */
    static async updateSurveyUrl(sid: string, surveyUrl: string): Promise<void> {
        try {
            const { database: db } = await getUnifiedDb()
            await db
                .from('tracking_sessions')
                .update({ survey_url: surveyUrl, updated_at: new Date().toISOString() })
                .eq('sid', sid)
        } catch (err: any) {
            console.error('[SessionService] updateSurveyUrl error:', err.message)
        }
    }

    /**
     * Link a response row to a session after the response is created.
     */
    static async linkResponseToSession(sid: string, responseId: string): Promise<void> {
        try {
            const { database: db } = await getUnifiedDb()
            await db
                .from('tracking_sessions')
                .update({ response_id: responseId, updated_at: new Date().toISOString() })
                .eq('sid', sid)
            
            // Also update responses.session_id for bidirectional lookup
            await db
                .from('responses')
                .update({ session_id: sid, updated_at: new Date().toISOString() })
                .eq('id', responseId)
        } catch (err: any) {
            console.error('[SessionService] linkResponseToSession error:', err.message)
        }
    }

    /**
     * Block a fake callback: log the attempt and return false.
     * The caller must NOT update the DB.
     */
    static async logBlockedCallback(context: {
        reason: string
        pid?: string
        uid?: string
        sid?: string
        ip: string
        userAgent: string
        status: string
    }): Promise<void> {
        console.warn(`[SessionService] FAKE CALLBACK BLOCKED: reason=${context.reason} pid=${context.pid} uid=${context.uid} sid=${context.sid} status=${context.status} ip=${context.ip}`)
        
        await auditService.log({
            event_type: 'FAKE_CALLBACK_BLOCKED',
            payload: {
                reason: context.reason,
                pid: context.pid,
                uid: context.uid,
                sid: context.sid,
                status: context.status
            },
            ip: context.ip,
            user_agent: context.userAgent
        })
    }
}
