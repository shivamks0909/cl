import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";
import { updateResponseStatus, getLandingPageData } from "@/lib/landingService";
import { getClientIp } from "@/lib/getClientIp";
import { RedirectResolver } from "@/lib/redirect-resolver";
import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function QuotaFullPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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
      updateResult = await updateResponseStatus(pid, uid, 'quota_full', sid, '/quotafull', ip, true);
  }

  // If strict verification fails, reject the access (prevents fake quota full status)
  if (!updateResult && (uid !== "N/A" || sid)) {
      console.warn(`[QuotaFull Page] Security denial: pid=${pid}, uid=${uid}, sid=${sid}`);
      
      const errorUrl = new URL('/paused', dummyRequest.url);
      errorUrl.searchParams.set('title', 'SESSION INVALID');
      errorUrl.searchParams.set('desc', 'Your session could not be verified.');
      return redirect(errorUrl.toString());
  }

  // Resolve Redirect
  // Use UID from query param (original client_sent UID) for external redirects to preserve end-to-end UID
  const passedUid = (params.uid as string) || uid;

  const resolution = RedirectResolver.resolve(
    'quota_full',
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

  return <WavyOutcomeView status="Quota Full" statusKeyword="quotafull" session={sid} ip={ip} />;
}
