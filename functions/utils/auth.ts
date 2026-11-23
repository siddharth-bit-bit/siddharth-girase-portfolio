/**
 * Cloudflare Pages Functions Authentication & Security Helper
 * Uses standard Web Crypto APIs (crypto.subtle) compatible with Cloudflare Workers / Pages
 */

export const AUTHORIZED_OWNER_EMAIL = "girasejitendra249@gmail.com";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  email: string;
  role: "owner";
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
}

export interface AuthEnv {
  ADMIN_JWT_SECRET?: string;
  ADMIN_SECRET?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SALT?: string;
  DB?: any;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getSecret(env: AuthEnv): string {
  return env.ADMIN_JWT_SECRET || env.ADMIN_SECRET || "sg_cloudflare_pages_session_secret_2026_fallback";
}

// PBKDF2 Password Hashing using Web Crypto API (100,000 iterations, SHA-512, 64 bytes)
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-512",
    },
    keyMaterial,
    512 // 64 bytes * 8
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC-SHA256 Token Signing
export async function createSessionToken(email: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const payload: SessionPayload = {
    email: email.toLowerCase(),
    role: "owner",
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    sessionId: base64UrlEncode(crypto.getRandomValues(new Uint8Array(16))),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(enc.encode(payloadStr));

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBytes));

  return `${payloadB64}.${sigB64}`;
}

// HMAC-SHA256 Token Verification
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<{ valid: boolean; payload?: SessionPayload; reason?: string }> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "No token provided" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Malformed token" };
  }

  const [payloadB64, sigB64] = parts;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlDecode(sigB64);
    const validSig = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadB64));

    if (!validSig) {
      return { valid: false, reason: "Invalid signature" };
    }

    const payloadBytes = base64UrlDecode(payloadB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload: SessionPayload = JSON.parse(payloadStr);

    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: "Session expired" };
    }

    if (payload.email.toLowerCase() !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return { valid: false, reason: "Unauthorized email identity" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: err.message || "Token verification error" };
  }
}

// Extract token from Request
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)sg_admin_jwt=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

// Full Request Verification Guard for Cloudflare Pages Functions
export async function verifyAdminRequest(context: {
  request: Request;
  env: AuthEnv;
}): Promise<{ authorized: boolean; email?: string; errorResponse?: Response }> {
  let token = extractToken(context.request);

  // If not in headers/cookies, check JSON body if method is POST
  if (!token && context.request.method === "POST") {
    try {
      const cloned = context.request.clone();
      const body = await cloned.json().catch(() => ({}));
      if (body && typeof body.token === "string") {
        token = body.token.trim();
      }
    } catch {}
  }

  if (!token) {
    return {
      authorized: false,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: "Unauthorized: Missing authentication credentials.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      ),
    };
  }

  const secret = getSecret(context.env);
  const result = await verifySessionToken(token, secret);

  if (!result.valid || !result.payload) {
    return {
      authorized: false,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          status: 403,
          message: `Access denied: ${result.reason || "Invalid session"}`,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      ),
    };
  }

  return { authorized: true, email: result.payload.email };
}
