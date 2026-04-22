import { getUnifiedDb } from './unified-db';
import { auditService } from './audit-service';

/**
 * Tracking resolver utilities for post-response actions
 */

/**
 * Log tracking events for audit purposes
 */
export async function logTrackingEvent(
  data: {
    pid?: string | null;
    uid?: string | null;
    clickid?: string | null;
    status: string;
    source: string;
    supplier_id?: string | null;
    project_id?: string | null;
    ip_address: string;
    user_agent: string;
    rawQuery: string;
  },
  statusCode: number,
  success: boolean,
  errorMessage?: string
) {
  await auditService.log({
    event_type: 'TRACKING_EVENT',
    payload: {
      ...data,
      status_code: statusCode,
      success,
      error_message: errorMessage
    },
    ip: data.ip_address,
    user_agent: data.user_agent
  });
}



/**
 * Resolve landing page URL based on source and configuration
 */
export async function resolveLandingPage(
    status: string,
    pid: string,
    uid: string,
    source: string
): Promise<{ url: string; isExternal: boolean }> {
    // Direct flow: show PanelFlow landing page
    if (source === 'direct') {
        const statusPage = status === 'quota_full' ? 'quotafull' :
                         status === 'terminate' ? 'terminate' :
                         status === 'security_terminate' ? 'security-terminate' :
                         'complete';
        return {
            url: `/status?code=${encodeURIComponent(pid)}&uid=${encodeURIComponent(uid)}&type=${encodeURIComponent(status)}`,
            isExternal: false
        };
    }

    // Supplier flow would check supplier_project_links for custom redirect
    // For now, fallback to PanelFlow status page
    return {
        url: `/status?code=${encodeURIComponent(pid)}&uid=${encodeURIComponent(uid)}&type=${encodeURIComponent(status)}`,
        isExternal: false
    };
}
