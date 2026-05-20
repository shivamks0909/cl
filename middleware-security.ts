/**
 * Enhanced Security Middleware
 * Provides additional security layers beyond the basic middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { SECURITY_HEADERS } from '@/lib/security-config'

// Generate a cryptographically secure nonce
function generateNonce(): string {
  // Generate 16 bytes (128 bits) of random data, convert to hex (32 chars)
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Generate nonce for CSP
  const nonce = generateNonce()

  // Conditionally set HSTS based on HTTPS
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const isHTTPS = protocol === 'https'

  // Apply base security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value)
  })

  // Set HSTS only for HTTPS
  if (isHTTPS) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Set Cross-Origin security headers
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

  // Build CSP with nonce
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  // Expose nonce to client via custom header (for inline scripts/styles)
  response.headers.set('x-csp-nonce', nonce)

  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Expect-CT', 'max-age=86400, enforce')

  // For admin routes, add additional protections
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Add stricter session management for admin area
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

// Export security configurations
export const SECURITY_CONFIG = {
  RATE_LIMITING: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000,
    MAX_REQUESTS_PER_MINUTE: 100
  },

  INPUT_VALIDATION: {
    MAX_INPUT_LENGTH: 1000,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    SANITIZE_HTML: true
  }
}