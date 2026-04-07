import { NextRequest } from "next/server";

/**
 * Centrally manages IP extraction for the entire application.
 * Normalizes localhost and ensures production-safe header priority.
 * Handles multi-proxy x-forwarded-for headers.
 * Accepts either NextRequest or Headers object.
 */
export function getClientIp(request: NextRequest | { headers: Headers }): string {
    const headers = request instanceof NextRequest ? request.headers : request.headers;
    const xForwardedFor = headers.get("x-forwarded-for");
    const xRealIp = headers.get("x-real-ip");

    // 1. x-forwarded-for (take the first IP in the list)
    let ip = xForwardedFor?.split(",")[0].trim() ||
        // 2. x-real-ip
        xRealIp ||
        // 3. request.ip (only for NextRequest)
        (request instanceof NextRequest ? (request as any).ip : null) ||
        // 4. Default fallback
        "127.0.0.1";

    // Normalize IPv6 Localhost (::1) ONLY
    if (ip === "::1") {
        ip = "127.0.0.1";
    }

    // Remove port numbers if present (e.g., 1.2.3.4:5678 -> 1.2.3.4)
    // Handle both IPv4 (single colon) and be careful with IPv6 (multiple colons)
    if (ip.includes(":") && !ip.includes("[")) {
        const parts = ip.split(":");
        // If it's a standard IPv4:port
        if (parts.length === 2) {
            ip = parts[0];
        }
    }

    return ip;
}
