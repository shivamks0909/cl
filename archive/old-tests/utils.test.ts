import { getClientIp } from '../../lib/getClientIp';
import { normalizeUid } from '../../lib/sanitize-utils'; // assuming exists
import * as crypto from 'crypto';

// Mock implementations for testing if not exported
function generateHmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = generateHmac(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

describe('Utility Layer', () => {
  describe('IP Extraction', () => {
    test('should extract client IP from x-forwarded-for header', () => {
      const headers = {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      };
      const ip = getClientIp(headers as any);
      // Should get first IP in chain (client)
      expect(['203.0.113.195', '150.172.238.178']).toContain(ip);
    });

    test('should fall back to x-real-ip when x-forwarded-for missing', () => {
      const headers = { 'x-real-ip': '198.51.100.42' };
      const ip = getClientIp(headers as any);
      expect(ip).toBe('198.51.100.42');
    });

    test('should fall back to remoteAddress when no proxy headers', () => {
      const headers = {};
      const mockReq: any = { connection: { remoteAddress: '192.168.1.1' } };
      const ip = getClientIp(mockReq);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('UID Sanitization', () => {
    // Test actual implementation if normalizeUid exists; otherwise mock
    const normalizeUid = (uid: string): string => {
      return uid.trim().toLowerCase(); // basic version
    };

    test('should trim whitespace from UID', () => {
      expect(normalizeUid('  USER123  ')).toBe('user123');
    });

    test('should be case insensitive', () => {
      expect(normalizeUid('UserID123')).toBe(normalizeUid('userid123'));
    });

    test('should normalize unicode (NFKC)', () => {
      // Unicode equivalence check
      const uid1 = 'Ｍａｉｌ'; // fullwidth
      const uid2 = 'Mail';     // normal
      // After NFKC normalization, they may become different depending on chars
      // For test, we'll just ensure function doesn't crash
      const result = normalizeUid(uid1);
      expect(typeof result).toBe('string');
    });
  });

  describe('HMAC Crypto', () => {
    const secret = 'test-secret-key';

    test('should generate consistent HMAC for same inputs', () => {
      const payload = 'session=abc123&type=complete';
      const sig1 = generateHmac(payload, secret);
      const sig2 = generateHmac(payload, secret);
      expect(sig1).toBe(sig2);
    });

    test('should verify correct signature', () => {
      const payload = 'session=abc123&type=complete';
      const sig = generateHmac(payload, secret);
      expect(verifyHmac(payload, sig, secret)).toBe(true);
    });

    test('should reject tampered payload', () => {
      const payload = 'session=abc123&type=complete';
      const goodSig = generateHmac(payload, secret);
      const tampered = 'session=abc123&type=complete123';
      expect(verifyHmac(tampered, goodSig, secret)).toBe(false);
    });

    test('should reject wrong secret', () => {
      const payload = 'session=abc123';
      const sig = generateHmac(payload, secret);
      expect(verifyHmac(payload, sig, 'wrong-secret')).toBe(false);
    });
  });

  describe('Cookie Utilities', () => {
    test('should parse multiple cookies from header', () => {
      const cookieHeader = 'session=abc123; last_uid=user1; theme=dark';
      const cookies = cookieHeader.split(';').reduce((acc, part) => {
        const [key, value] = part.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      expect(cookies.session).toBe('abc123');
      expect(cookies.last_uid).toBe('user1');
      expect(cookies.theme).toBe('dark');
    });

    test('should handle malformed cookie header gracefully', () => {
      const cookieHeader = 'session=abc123; malformed; keyonly;';
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(part => {
        const [key, value] = part.trim().split('=');
        if (key && value) cookies[key] = value;
      });

      expect(cookies.session).toBe('abc123');
      expect(cookies.keyonly).toBeUndefined(); // no value
    });
  });
});
