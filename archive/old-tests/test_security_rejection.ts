import { NextRequest } from 'next/server';
import { GET as redirectGET } from './app/redirect/[status]/page';

async function main() {
    // Simulate a request without clickid
    const url = new URL('http://localhost:3000/redirect/complete?pid=TEST_PID_001&uid=test01');
    const request = new NextRequest(url);

    console.log('Testing redirect WITHOUT clickid (should be rejected)...');
    console.log('URL:', url.toString());

    try {
        const response = await redirectGET(request);
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Read body if needed
        const body = await response.text();
        console.log('Response body (first 500 chars):', body.substring(0, 500));
        
        if (response.status === 307 || response.status === 403) {
            console.log('\n✅ Correctly rejected missing clickid');
        } else {
            console.log('\n❌ Expected rejection but got status', response.status);
        }
    } catch (error: any) {
        console.error('Error during request:', error.message);
    }
}

main().catch(console.error);
