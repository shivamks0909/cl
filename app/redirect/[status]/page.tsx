import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateResponseStatus, getLandingPageData } from "@/lib/landingService";
import { getClientIp } from "@/lib/getClientIp";
import { RedirectResolver } from "@/lib/redirect-resolver";
import { NextRequest } from "next/server";
import { auditService } from "@/lib/audit-service";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";

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
  
  // Map route status to proper status
  const dbStatus = statusMap[routeStatus] || 'terminate';
  
  // Get the dummy request for getLandingPageData
  // Use headers to construct proper base URL (preserves host and port)
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;
  const dummyRequest = new NextRequest(new URL(baseUrl), { headers: headersList });
  const data = await getLandingPageData(paramsObj, dummyRequest);
  
  const uid = data.uid || "N/A";
  const pid = data.pid || "N/A";
  const sid = data.clickid || (data.response?.oi_session) || (data.response?.clickid) || undefined;
  const ip = data.ip;

  // Allow fallback: if no clickid, find response by pid + uid from the response data
  // This enables redirect callbacks without session token when response was found via pid+uid
  const fallbackClickid = !sid && data.response ?
    (data.response.oi_session || data.response.clickid || null) : null;

  // SECURITY: Require clickid (session token) for redirect callbacks
  // But allow fallback if we found a response via pid+uid (non-strict mode)
  if (!sid && !fallbackClickid) {
    console.warn(`[Redirect Callback] Missing clickid - possible fake callback attempt from pid=${pid}, uid=${uid}`);
    await auditService.log({
        event_type: 'SECURITY_CALLBACK_DENIED',
        payload: { reason: 'missing_clickid', pid, uid, status: dbStatus },
        ip: ip,
        user_agent: headersList.get('user-agent') || 'Unknown'
    });
    const errorUrl = new URL('/paused', dummyRequest.url);
    errorUrl.searchParams.set('title', 'INVALID CALLBACK');
    errorUrl.searchParams.set('desc', 'Session token missing.');
    return redirect(errorUrl.toString());
  }

  // Use fallback clickid if needed
  const finalClickid = sid || fallbackClickid;

  // Auto-create project if it doesn't exist (for redirect callbacks without pre-existing project)
  if (!data.project && pid && pid !== 'N/A') {
    console.log(`[Redirect Callback] No project found for pid=${pid}, attempting auto-create...`);
    try {
      const { dashboardService } = await import('@/lib/dashboardService');
      const projectResult = await dashboardService.createProject({
        project_code: pid,
        project_name: `Auto-created Project ${pid}`,
        base_url: `https://example.com/survey?pid=${pid}&uid={uid}`,
        status: 'active',
        source: 'auto_redirect'
      });
      if (projectResult.data) {
        data.project = projectResult.data;
        console.log(`[Redirect Callback] Auto-created project: ${pid}`);
      } else if (projectResult.error) {
        console.warn(`[Redirect Callback] Failed to create project:`, projectResult.error.message);
      }
    } catch (projErr: any) {
      console.warn(`[Redirect Callback] Error creating project:`, projErr.message);
    }
  }

  // Update the response status in database
  // Enforce strictMode=true to prevent unauthorized completions
  const updateResult = await updateResponseStatus(pid, uid, dbStatus, finalClickid || uid, `/redirect/${routeStatus}`, ip, true);

  // If update fails, reject the callback
  if (!updateResult) {
    console.warn(`[Redirect Callback] Security denial for callback: pid=${pid}, uid=${uid}, sid=${finalClickid}`);
    
    await auditService.log({
        event_type: 'SECURITY_CALLBACK_DENIED',
        payload: { reason: 'invalid_session_or_mismatch', pid, uid, status: dbStatus, sid: finalClickid },
        ip: ip,
        user_agent: headersList.get('user-agent') || 'Unknown'
    });
    
    const errorUrl = new URL('/paused', dummyRequest.url);
    errorUrl.searchParams.set('title', 'SECURITY VERIFICATION FAILED');
    errorUrl.searchParams.set('desc', 'Invalid or expired session token. Please ensure you are completing from a valid survey link.');
    return redirect(errorUrl.toString());
  }

  console.log(`[Redirect Callback] Successfully updated response ${updateResult.id} to ${dbStatus}`);

  // Resolve Redirect based on project/supplier configuration
  const passedUid = (data as any).originalUid || uid;

  const resolution = RedirectResolver.resolve(
    dbStatus === 'quota_full' ? 'quota_full' : (dbStatus === 'terminate' ? 'terminate' : 'complete'),
    data.project,
    data.supplier,
    data.link,
    passedUid,
    pid,
    data.source || undefined
  );

  // If external redirect configured, redirect there
  if (resolution.isExternal) {
    console.log(`[Redirect Callback] External redirect to: ${resolution.url}`);
    redirect(resolution.url);
  }

  // Use WavyOutcomeView like the original pages
  const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : (routeStatus === 'terminate' ? 'Terminated' : 'Complete');
  // WavyOutcomeView uses 'quotafull' not 'quota_full'
  const statusKeyword = routeStatus;
  return <WavyOutcomeView status={statusDisplay} statusKeyword={statusKeyword} session={finalClickid} ip={ip} />;
}
