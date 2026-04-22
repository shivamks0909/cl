import { Request, Response } from 'express';
import { RedirectResolution } from '../../../lib/redirect-resolver';

export interface RedirectTestContext {
  projectCode: string;
  supplierToken?: string;
  uid: string;
  expectedSource?: 'direct' | 'supplier';
  expectedRedirectUrl?: string;
  expectedIsExternal?: boolean;
}

/**
 * Builds a start URL for testing
 */
export function buildStartUrl(
  baseUrl: string = 'http://localhost:3000',
  { projectCode, supplierToken, uid }: RedirectTestContext
): string {
  const params = new URLSearchParams();
  params.set('uid', uid);
  if (supplierToken) {
    params.set('supplier', supplierToken);
  }
  return `${baseUrl}/start/${projectCode}?${params.toString()}`;
}

/**
 * Extracts the source from a response record (would query DB in real test)
 * This is a mock implementation that would be replaced with actual DB query
 */
export async function getResponseSource(uid: string, projectCode: string): Promise<string> {
  // In a real test, this would query the database:
  // SELECT source FROM responses WHERE uid = ? AND project_code = ? ORDER BY created_at DESC LIMIT 1;

  // For now, we return a mock value - actual implementation would need DB access
  console.log(`[Test Helper] Would query DB for source of uid=${uid}, project=${projectCode}`);
  return 'direct'; // Mock
}

/**
 * Verifies that a redirect resolution matches expectations
 */
export function assertRedirectResolution(
  result: RedirectResolution,
  expected: Partial<RedirectResolution>
): void {
  if (expected.url !== undefined) {
    expect(result.url).toBe(expected.url);
  }
  if (expected.isExternal !== undefined) {
    expect(result.isExternal).toBe(expected.isExternal);
  }
}

/**
 * Waits for database operation to complete (simulated)
 */
export async function waitForDbWrite(timeout: number = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // In real tests, we might poll a status endpoint
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Creates a mock request object for testing middleware/routes
 */
export function createMockRequest(params: Record<string, string> = {}): Request {
  return {
    method: 'GET',
    headers: new Headers({
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1',
    }),
    url: `http://localhost:3000/start/TEST?${new URLSearchParams(params).toString()}`,
    body: null,
    json: async () => ({}),
    text: async () => '',
    formData: async () => new FormData(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
  } as Request;
}

/**
 * Extracts redirect location from response
 */
export function getRedirectLocation(response: { status: number; headers: { get: (name: string) => string | null } }): string | null {
  if (response.status >= 300 && response.status < 400) {
    return response.headers.get('location');
  }
  return null;
}
