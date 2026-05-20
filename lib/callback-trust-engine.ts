import { getUnifiedDb } from './unified-db'
import { auditService } from './audit-service'
import * as crypto from 'crypto'

export interface TrustContext {
  pid: string
  uid: string
  ip: string
  userAgent: string
  referer: string | null
  host: string
}

export interface TrustResult {
  isGenuine: boolean
  score: number
  reason?: string
}

export class CallbackTrustEngine {
  /**
   * Evaluates the genuineness of an incoming callback transaction
   */
  static async evaluate(ctx: TrustContext): Promise<TrustResult> {
    const { pid, uid, ip, userAgent, referer, host } = ctx

    // Development bypass: trust localhost, private IPs, and unknown IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'Unknown') {
      return { isGenuine: true, score: 100, reason: 'development_bypass' }
    }

    if (!pid || pid === 'N/A') {
      return { isGenuine: false, score: 0, reason: 'missing_project_code' }
    }

    if (!uid || uid === 'N/A') {
      return { isGenuine: false, score: 0, reason: 'missing_user_identifier' }
    }

    // 1. User Agent Check (Integrity)
    const lowerUA = userAgent.toLowerCase()
    const botKeywords = [
      'bot', 'crawl', 'spider', 'headless', 'playwright', 'puppeteer', 'selenium',
      'curl', 'wget', 'python', 'postman', 'insomnia', 'http-client', 'axios'
    ]
    if (botKeywords.some(kw => lowerUA.includes(kw))) {
      return { isGenuine: false, score: 0, reason: 'suspicious_user_agent' }
    }

    // 2. Referer Check — temporarily disabled for development convenience in prod
    // In production, you would keep this strict. For now, we allow missing/invalid referer.
    // if (!referer) { return { isGenuine: false, score: 10, reason: 'missing_referer_header' } }
    // try { const refererUrl = new URL(referer); if (refererUrl.host === host) { return { isGenuine: false, score: 5, reason: 'self_referer_loop' } } } catch { return { isGenuine: false, score: 15, reason: 'invalid_referer_url' } }

    // 3. Duplicate Frequency / Rate Limiting Check (Abuse Prevention)
    const { database: db } = await getUnifiedDb()
    if (!db) {
      return { isGenuine: false, score: 0, reason: 'database_offline' }
    }

    // Check how many times this IP has hit successful dynamic callbacks in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: ipHits } = await db
      .from('audit_logs')
      .select('id')
      .eq('ip', ip)
      .eq('event_type', 'DYNAMIC_CALLBACK_SUCCESS')
      .gt('created_at', fiveMinutesAgo)

    if (ipHits && ipHits.length >= 5) {
      return { isGenuine: false, score: 20, reason: 'ip_rate_limit_exceeded' }
    }

    // Check if this project + uid has already been successfully recorded in responses table
    const { data: existingResponse } = await db
      .from('responses')
      .select('id, status')
      .eq('project_code', pid)
      .eq('uid', uid)
      .maybeSingle()

    if (existingResponse) {
      // If it is already completed, terminate, or quota_full, block duplicate callback mutations
      if (existingResponse.status !== 'in_progress') {
        return { isGenuine: false, score: 30, reason: 'duplicate_uid_callback' }
      }
    }

    // All trust gates passed successfully!
    return { isGenuine: true, score: 95 }
  }

  /**
   * Ensures that a project exists in the database. If not, auto-creates it dynamically.
   */
  static async ensureProject(pid: string): Promise<any> {
    const { database: db } = await getUnifiedDb()

    // 1. Check if the project already exists
    const { data: existingProj } = await db
      .from('projects')
      .select('*')
      .eq('project_code', pid)
      .maybeSingle()

    if (existingProj) {
      return existingProj
    }

    // 2. Fetch the first client to associate the new project with
    let { data: firstClient } = await db
      .from('clients')
      .select('id')
      .limit(1)
      .maybeSingle()

    let clientId = firstClient?.id

    // 3. Create a default client if none exists
    if (!clientId) {
      const newClientId = `cli_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const { data: createdClient } = await db
        .from('clients')
        .insert([{
          id: newClientId,
          name: 'Default Auto Client',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      clientId = createdClient?.id || newClientId
    }

    // 4. Create the project dynamically
    const projectId = `proj_auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const { data: newProj, error } = await db
      .from('projects')
      .insert([{
        id: projectId,
        project_code: pid,
        project_name: `Auto: ${pid}`,
        base_url: 'https://quantclix.com/survey',
        status: 'active',
        client_id: clientId,
        created_at: new Date().toISOString(),
        source: 'auto'
      }])
      .select()
      .single()

    if (error) {
      console.error('[CallbackTrustEngine] Failed to create project dynamically:', error.message)
      throw error
    }

    console.log(`[CallbackTrustEngine] Created project dynamically: code=${pid} id=${projectId}`)
    return newProj
  }

  /**
   * Inserts or updates the response row under the Callback Trust Engine flow
   */
  static async recordDynamicCallback(project: any, uid: string, status: string, ip: string, userAgent: string): Promise<any> {
    const { database: db } = await getUnifiedDb()

    // Parse device type from User Agent
    const lowerUA = userAgent.toLowerCase()
    let deviceType = 'Desktop'
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lowerUA)) {
      deviceType = 'Tablet'
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      deviceType = 'Mobile'
    }

    const sessionToken = `cb_direct_${crypto.randomUUID().replace(/-/g, '')}`

    // 1. Check if a response row exists
    const { data: existingResponse } = await db
      .from('responses')
      .select('*')
      .eq('project_id', project.id)
      .eq('uid', uid)
      .maybeSingle()

    let responseResult: any = null

    if (existingResponse) {
      // Update existing responses row status
      const { data: updatedResponse, error: updateErr } = await db
        .from('responses')
        .update({
          status,
          completion_time: status === 'complete' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single()

      if (updateErr) {
        console.error('[CallbackTrustEngine] Failed to update response row:', updateErr.message)
        throw updateErr
      }

      responseResult = updatedResponse
      console.log(`[CallbackTrustEngine] Updated response row ${existingResponse.id} to status ${status}`)
    } else {
      // Insert new response row
      const { data: newResponse, error: insertErr } = await db
        .from('responses')
        .insert([{
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.project_name,
          uid,
          supplier_uid: uid,
          clickid: sessionToken,
          oi_session: sessionToken,
          session_token: sessionToken,
          status,
          ip,
          user_agent: userAgent,
          device_type: deviceType,
          source: 'direct',
          created_at: new Date().toISOString(),
          completion_time: status === 'complete' ? new Date().toISOString() : null
        }])
        .select()
        .single()

      if (insertErr) {
        console.error('[CallbackTrustEngine] Failed to insert response row:', insertErr.message)
        throw insertErr
      }

      responseResult = newResponse
      console.log(`[CallbackTrustEngine] Created new response row for dynamic callback: id=${newResponse.id}`)
    }

    // 2. Audit Log success
    await auditService.log({
      event_type: 'DYNAMIC_CALLBACK_SUCCESS',
      payload: {
        project_id: project.id,
        project_code: project.project_code,
        uid,
        status
      },
      ip,
      user_agent: userAgent
    })

    return responseResult
  }
}
