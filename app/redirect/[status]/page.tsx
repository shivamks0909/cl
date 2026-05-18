import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLandingPageData } from "@/lib/landingService";
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
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;
  const dummyRequest = new NextRequest(new URL(baseUrl), { headers: headersList });
  const data = await getLandingPageData(paramsObj, dummyRequest);
  
  const uid = data.uid || "N/A";
  const pid = data.pid || "N/A";
  const sid = data.clickid || (data.response?.oi_session) || (data.response?.clickid) || undefined;
  const ip = data.ip;

  // Get the session token (clickid)
  const clickid = sid || (data.response?.oi_session) || (data.response?.clickid) || null;

  // ========================================================================
  // NEW LOGIC: Handle missing/non-created projects gracefully
  // ========================================================================
  // 
  // If project doesn't exist, we just show the landing page content
  // without any DB updates or error pages.
  // This allows clients to test redirects without requiring project creation.
  //
  // Security is still maintained: No valid session = No DB update
  // ========================================================================

  // Case 1: Project not found - show original design landing page without DB update
  if (!data.project || pid === 'N/A' || pid === 'undefined') {
    console.log(`[Redirect Callback] Project not found for pid=${pid}. Showing original design landing page without DB update.`);
    
    // Log the callback attempt for audit purposes
    await auditService.log({
      event_type: 'REDIRECT_CALLBACK_PROJECT_NOT_FOUND',
      payload: { reason: 'project_not_found', pid, uid, status: dbStatus },
      ip: ip,
      user_agent: headersList.get('user-agent') || 'Unknown'
    });
    
    // Show original WavyOutcomeView design instead of plain HTML
    const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : (routeStatus === 'terminate' ? 'Terminated' : 'Complete');
    return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={clickid} ip={ip} />;
  }

  // Case 2: Project exists but no valid response/session found
  // Still show landing page, but this time we know the project exists
  if (!data.response && !clickid) {
    console.log(`[Redirect Callback] No valid session found for project=${pid}. Showing landing page without DB update.`);
    
    // Log the callback attempt
    await auditService.log({
      event_type: 'REDIRECT_CALLBACK_NO_SESSION',
      payload: { reason: 'no_valid_session', pid, uid, status: dbStatus },
      ip: ip,
      user_agent: headersList.get('user-agent') || 'Unknown'
    });
    
    // Show landing page content
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Survey System</h1>
          <p className="text-gray-600 mb-6">
            {routeStatus === 'complete' ? 'Survey Completed' : 
             routeStatus === 'terminate' ? 'Survey Terminated' : 
             'Quota Full'}
          </p>
          <p className="text-sm text-gray-500">
            Project: {pid}<br/>
            User: {uid}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Landing page mode - no active session)
          </p>
        </div>
      </div>
    );
  }

  // Case 3: Project exists AND we have a valid session/response
  // NOW we can safely update the database
  console.log(`[Redirect Callback] Valid project and session found. Updating database for pid=${pid}`);

  // Import updateResponseStatus here (lazy load to keep code organized)
  const { updateResponseStatus } = await import('@/lib/landingService');

  // Update the response status in database
  // strictMode=true ensures only valid sessions can update
  const updateResult = await updateResponseStatus(pid, uid, dbStatus, clickid || uid, `/redirect/${routeStatus}`, ip, true);

  // If update fails, still show landing page (don't show "Project Paused")
  if (!updateResult) {
    console.warn(`[Redirect Callback] DB update failed for pid=${pid}, uid=${uid}. Showing landing page.`);
    
    await auditService.log({
      event_type: 'REDIRECT_CALLBACK_UPDATE_FAILED',
      payload: { reason: 'db_update_failed', pid, uid, status: dbStatus },
      ip: ip,
      user_agent: headersList.get('user-agent') || 'Unknown'
    });
    
    // Show landing page instead of "Project Paused" error
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Survey System</h1>
          <p className="text-gray-600 mb-6">
            {routeStatus === 'complete' ? 'Survey Completed' : 
             routeStatus === 'terminate' ? 'Survey Terminated' : 
             'Quota Full'}
          </p>
          <p className="text-sm text-gray-500">
            Project: {pid}<br/>
            User: {uid}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Landing page mode - DB update skipped)
          </p>
        </div>
      </div>
    );
  }

  console.log(`[Redirect Callback] Successfully updated response ${updateResult.id} to ${dbStatus}`);

   // If supplier flow with redirect configured, send external redirect
   if (data.source === 'supplier' && data.supplier) {
     const supplier = data.supplier as any;
     let targetUrl: string | null = null;
     if (routeStatus === 'complete' && supplier.complete_redirect_url) targetUrl = supplier.complete_redirect_url;
     if (routeStatus === 'terminate' && supplier.terminate_redirect_url) targetUrl = supplier.terminate_redirect_url;
     if (routeStatus === 'quotafull' && supplier.quotafull_redirect_url) targetUrl = supplier.quotafull_redirect_url;
     if (targetUrl) {
       const finalUrl = targetUrl
         .replace(/{pid}/g, pid)
         .replace(/{uid}/g, uid);
       console.log(`[Redirect Callback] Supplier redirect to: ${finalUrl}`);
       redirect(finalUrl);
     }
   }

   // Fallback: show outcome view
   const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : (routeStatus === 'terminate' ? 'Terminated' : 'Complete');
   return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={clickid} ip={ip} />;
}


