import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";
import { updateResponseStatus, getLandingPageData } from "@/lib/landingService";
import { getClientIp } from "@/lib/getClientIp";
import { RedirectResolver } from "@/lib/redirect-resolver";
import { NextRequest } from "next/server";
import { auditService } from "@/lib/audit-service";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const headersList = await headers();
  
  // Use a dummy Request for getLandingPageData compatibility
  const dummyRequest = new NextRequest(new URL('http://localhost'), { headers: headersList });
  const data = await getLandingPageData(params, dummyRequest);
  
  const uid = data.uid || "N/A";
  const pid = data.pid || "N/A";
  const sid = data.clickid || undefined;
  const ip = data.ip;

  let updateResult = null;
  if (uid !== "N/A" || sid) {
      updateResult = await updateResponseStatus(pid, uid, 'complete', sid, '/complete', ip, true);
  }

  // If strict verification fails, reject the access (prevents fake completions)
  if (!updateResult && (uid !== "N/A" || sid)) {
      console.warn(`[Complete Page] Security denial: pid=${pid}, uid=${uid}, sid=${sid}`);
      
      await auditService.log({
          event_type: 'SECURITY_CALLBACK_DENIED',
          payload: { reason: 'invalid_session_or_mismatch', pid, uid, status: 'complete', sid },
          ip: ip,
          user_agent: headersList.get('user-agent') || 'Unknown'
      });
      
      const errorUrl = new URL('/paused', dummyRequest.url);
      errorUrl.searchParams.set('title', 'SESSION INVALID');
      errorUrl.searchParams.set('desc', 'Your session could not be verified. This can happen if you refresh the page after completion or if your session has expired.');
      return redirect(errorUrl.toString());
  }

  // Resolve Redirect
  // Pass BOTH the masked UID and original UID. Resolver uses original if available, falling back to masked.
  const passedUid = (data as any).originalUid || uid;

  const resolution = RedirectResolver.resolve(
    'complete',
    data.project,
    data.supplier,
    data.link,
    passedUid,
    pid,
    data.source || undefined
  );

  if (resolution.isExternal) {
    redirect(resolution.url);
  }

  return <WavyOutcomeView status="Complete" statusKeyword="complete" session={sid} ip={ip} />;
}
