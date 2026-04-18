import { NextRequest, NextResponse } from 'next/server';
import { getLandingPageData } from '@/lib/landingService';
import { RedirectResolver } from '@/lib/redirect-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const session = searchParams.get('session');
    
    if (!session) return NextResponse.json({ error: 'no session' });

    // mock params for getLandingPageData
    const params = { oi_session: session };
    const data = await getLandingPageData(params, request);
    
    if (!data.response) return NextResponse.json({ error: 'response not found' });

    const passedUid = (data as any).originalUid || data.uid;
    const pid = data.pid || 'N/A';

    const completeResolution = RedirectResolver.resolve(
        'complete',
        data.project,
        data.supplier,
        data.link,
        passedUid,
        pid,
        data.source || undefined
    );

    const terminateResolution = RedirectResolver.resolve(
        'terminate',
        data.project,
        data.supplier,
        data.link,
        passedUid,
        pid,
        data.source || undefined
    );

    return NextResponse.json({
        debug_info: {
            session: session,
            source: data.source,
            passedUid: passedUid,
            supplier: data.supplier ? data.supplier.name : null,
            supplierFullData: data.supplier,
            link: data.link ? data.link.id : null,
        },
        resolutions: {
            complete: completeResolution,
            terminate: terminateResolution
        }
    });
}
