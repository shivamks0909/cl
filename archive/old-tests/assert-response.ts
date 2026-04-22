import { createMockResponse } from './create-test-request';

/**
 * Assertions for HTTP responses
 */
export function assertStatus(res: any, expected: number): void {
  if (res.statusCode !== expected) {
    throw new Error(`Expected status ${expected} but got ${res.statusCode}`);
  }
}

/**
 * Assert response is a redirect to expected URL
 */
export function assertRedirect(res: any, expectedUrl: string): void {
  if (res.statusCode !== 302) {
    throw new Error(`Expected redirect (302) but got status ${res.statusCode}`);
  }
  const location = res.headers['location'] || res.headers['Location'];
  if (!location) {
    throw new Error('Expected Location header but none found');
  }
  // Allow partial match (query params may vary)
  if (!location.includes(expectedUrl)) {
    throw new Error(`Expected redirect to contain "${expectedUrl}" but got "${location}"`);
  }
}

/**
 * Assert JSON response body matches expected shape
 */
export function assertJsonBody(res: any, expected: Record<string, any>): void {
  if (!res.jsonBody) {
    throw new Error('Response does not have JSON body');
  }
  for (const [key, value] of Object.entries(expected)) {
    if (res.jsonBody[key] !== value) {
      throw new Error(`Expected body.${key} = ${JSON.stringify(value)} but got ${JSON.stringify(res.jsonBody[key])}`);
    }
  }
}

/**
 * Assert response has Set-Cookie header with specific cookie
 */
export function assertHasCookie(res: any, cookieName: string, options?: { httpOnly?: boolean; secure?: boolean; sameSite?: string }): void {
  const cookieHeader = res.headers['set-cookie'] || res.headers['Set-Cookie'];
  if (!cookieHeader) {
    throw new Error('No Set-Cookie header found');
  }
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  if (!cookieStr.includes(`${cookieName}=`)) {
    throw new Error(`Cookie "${cookieName}" not found in Set-Cookie: ${cookieHeader}`);
  }
  // Check flags if provided
  if (options) {
    if (options.httpOnly && !cookieStr.includes('HttpOnly')) {
      throw new Error(`Cookie ${cookieName} missing HttpOnly flag`);
    }
    if (options.secure && !cookieStr.includes('Secure')) {
      throw new Error(`Cookie ${cookieName} missing Secure flag`);
    }
    if (options.sameSite && !cookieStr.toLowerCase().includes(`samesite=${options.sameSite.toLowerCase()}`)) {
      throw new Error(`Cookie ${cookieName} missing SameSite=${options.sameSite}`);
    }
  }
}

/**
 * Assert response body contains text
 */
export function assertBodyContains(res: any, text: string): void {
  const body = res.text ? res.text() : (res.body ? Buffer.concat(res.body).toString('utf-8') : '');
  if (!body.includes(text)) {
    throw new Error(`Response body does not contain "${text}"`);
  }
}
