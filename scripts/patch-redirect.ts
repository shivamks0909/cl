import { readFileSync, writeFileSync } from 'fs';

const path = 'd:\\new12-main\\app\\redirect\\[status]\\page.tsx';
const content = readFileSync(path, 'utf8');
const lines = content.split('\n');

const patch = `
    // DEVELOPMENT BYPASS: For localhost/private IPs, skip trust engine and show landing directly
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'Unknown') {
        console.log('[RedirectCallback] DEV BYPASS: IP=' + ip + ' - showing landing page without trust check')
        const hostHeader = headersList.get('host') || 'localhost:3000'
        const protocol = headersList.get('x-forwarded-proto') || 'http'
        const baseUrl = protocol + '://' + hostHeader
        const dummyRequest = new NextRequest(new URL(baseUrl), { headers: headersList })
        const data = await getLandingPageData(paramsObj, dummyRequest)

        if (data.response) {
            const { updateResponseStatus } = await import('@/lib/landingService')
            await updateResponseStatus(pid, uid, dbStatus, data.response.clickid || data.response.oi_session, '/redirect/' + routeStatus, ip, true)
        }

        const statusDisplay = routeStatus === 'quotafull' ? 'Quota Full' : routeStatus === 'terminate' ? 'Terminated' : 'Complete'
        return <WavyOutcomeView status={statusDisplay} statusKeyword={routeStatus} session={data.response?.clickid || data.response?.oi_session || undefined} ip={ip} />
    }

`;

const insertAt = 252; // after line 252 (0-indexed)
const newLines = [...lines.slice(0, insertAt + 1), ...patch.split('\n'), ...lines.slice(insertAt + 1)];
const newContent = newLines.join('\n');
writeFileSync(path, newContent);
console.log('Patched redirect page with dev bypass');
