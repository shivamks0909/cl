import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

/**
 * Build a mock HTTP request object for testing Next.js routes
 */
export interface MockRequestOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: any;
}

/**
 * Create a mock Next.js request (Web-like) object
 */
export function createMockRequest(opts: MockRequestOptions = {}): IncomingMessage & { url: string; method: string; headers: Record<string, string> } {
  const req = {
    method: opts.method || 'GET',
    url: opts.url || '/',
    headers: opts.headers || {},
    // Add any other properties needed by Next.js
  } as any;

  // Parse query params from URL if provided
  if (opts.url) {
    try {
      const urlObj = new URL(opts.url, 'http://localhost');
      // Merge query params
      urlObj.searchParams.forEach((value, key) => {
        if (!req.query) req.query = {};
        req.query[key] = value;
      });
    } catch (e) {
      // Invalid URL, ignore
    }
  }

  // Add query directly if provided
  if (opts.query) {
    req.query = { ...(req.query || {}), ...opts.query };
  }

  // Add cookies if provided (accessible via headers 'cookie')
  if (opts.cookies) {
    const cookieHeader = Object.entries(opts.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    req.headers['cookie'] = cookieHeader;
  }

  // Add body if provided (for POST/PUT)
  if (opts.body && (req.method === 'POST' || req.method === 'PUT')) {
    // In real Next.js, body is parsed automatically based on content-type
    // For tests, we can provide raw body or parsed object
    (req as any).body = opts.body;
  }

  return req;
}

/**
 * Create a mock Next.js response object with capture capabilities
 */
export function createMockResponse(): ServerResponse & {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  body: Buffer[];
  jsonBody?: any;
  redirectUrl?: string;
} {
  const res = {
    statusCode: 200,
    statusMessage: 'OK',
    headers: {},
    body: [],
    jsonBody: undefined,
    redirectUrl: undefined,
  } as any;

  // Override writeHead to capture status/headers
  res.writeHead = function(statusCode: number, reasonPhrase?: string, headers?: Record<string, any>) {
    res.statusCode = statusCode;
    if (reasonPhrase) res.statusMessage = reasonPhrase;
    if (headers) {
      Object.assign(res.headers, headers);
    }
  };

  // Override setHeader
  res.setHeader = function(name: string, value: string | string[]) {
    res.headers[name.toLowerCase()] = value;
  };

  // Override getHeader
  res.getHeader = function(name: string) {
    return res.headers[name.toLowerCase()];
  };

  // Override redirect (Next.js helper)
  res.redirect = function(url: string) {
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.redirectUrl = url;
  };

  // Override end to capture body
  res.end = function(chunk?: any, encoding?: string) {
    if (chunk) {
      if (typeof chunk === 'string') {
        res.body.push(Buffer.from(chunk, encoding));
      } else if (Buffer.isBuffer(chunk)) {
        res.body.push(chunk);
      } else if (typeof chunk === 'object') {
        // Assume JSON
        try {
          res.jsonBody = typeof chunk === 'object' ? chunk : JSON.parse(chunk);
        } catch (e) {
          res.jsonBody = null;
        }
        res.body.push(Buffer.from(JSON.stringify(chunk)));
      }
    }
  };

  // Helper to get body as string
  res.text = function(): string {
    return Buffer.concat(res.body).toString('utf-8');
  };

  return res;
}
