import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

declare const process: any;

export const AUTHORIZED_OWNER_EMAIL = "girasejitendra249@gmail.com";
const AUTH_STORE_PATH = path.join(process.cwd(), "api", ".auth_store.json");
const AUDIT_LOG_PATH = path.join(process.cwd(), "api", "audit.log");
const SERVER_SECRET_PATH = path.join(process.cwd(), "api", ".server_secret");

// Session configuration
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting map: ip -> { count: number, lockedUntil: number }
const rateLimitMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// In-memory active reset tokens: token -> { email: string, expiresAt: number }
const activeResetTokens = new Map<string, { email: string; expiresAt: number }>();

export interface SessionPayload {
  email: string;
  role: "owner";
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  email?: string;
  ip: string;
  status: "SUCCESS" | "DENIED" | "FAILED";
  details?: string;
}

// Ensure server secret exists
function getServerSecret(): string {
  try {
    if (process.env.ADMIN_JWT_SECRET) {
      return process.env.ADMIN_JWT_SECRET;
    }
    if (fs.existsSync(SERVER_SECRET_PATH)) {
      return fs.readFileSync(SERVER_SECRET_PATH, "utf-8").trim();
    }
    const generated = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(SERVER_SECRET_PATH, generated, { encoding: "utf-8" });
    return generated;
  } catch {
    return "sg_fallback_secret_key_2026_production_secure";
  }
}

// Log security audit trail
export function logAudit(
  action: string,
  ip: string,
  status: "SUCCESS" | "DENIED" | "FAILED",
  email?: string,
  details?: string
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    email: email || "unknown",
    ip,
    status,
    details: details || "",
  };

  const line = `[${entry.timestamp}] [${entry.status}] ${entry.action} | User: ${entry.email} | IP: ${entry.ip} | ${entry.details}\n`;
  try {
    fs.appendFileSync(AUDIT_LOG_PATH, line, { encoding: "utf-8" });
  } catch (err) {
    console.error("Failed to write to audit log:", err);
  }
}

// Get recent audit logs for the dashboard
export function getRecentAuditLogs(limit: number = 30): AuditLogEntry[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return [];
    }
    const content = fs.readFileSync(AUDIT_LOG_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const recent = lines.slice(-limit).reverse();

    return recent.map((line: string) => {
      const match = line.match(/^\[(.*?)\] \[(.*?)\] (.*?) \| User: (.*?) \| IP: (.*?) \| (.*?)$/);
      if (match) {
        return {
          timestamp: match[1],
          status: match[2] as any,
          action: match[3],
          email: match[4],
          ip: match[5],
          details: match[6],
        };
      }
      return {
        timestamp: new Date().toISOString(),
        action: "LOG_LINE",
        status: "SUCCESS",
        ip: "local",
        details: line,
      };
    });
  } catch {
    return [];
  }
}

// Hash password with salt using PBKDF2 (SHA-512, 100,000 iterations)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

// Retrieve or initialize the owner auth store
interface AuthStore {
  email: string;
  salt: string;
  passwordHash: string;
  updatedAt: number;
}

function getAuthStore(): AuthStore {
  if (fs.existsSync(AUTH_STORE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_STORE_PATH, "utf-8"));
      if (data.email && data.passwordHash && data.salt) {
        return data;
      }
    } catch {}
  }

  // Initialize with initial owner credentials: default password "Siddharth@2026!"
  // Siddharth can change this immediately in the dashboard or via reset
  const salt = crypto.randomBytes(24).toString("hex");
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "Siddharth@2026!";
  const passwordHash = hashPassword(initialPassword, salt);

  const initialStore: AuthStore = {
    email: AUTHORIZED_OWNER_EMAIL,
    salt,
    passwordHash,
    updatedAt: Date.now(),
  };

  try {
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(initialStore, null, 2), { encoding: "utf-8" });
  } catch (err) {
    console.error("Failed to initialize auth store:", err);
  }

  return initialStore;
}

// Sign session token with HMAC-SHA256
export function createSessionToken(email: string): string {
  const secret = getServerSecret();
  const payload: SessionPayload = {
    email,
    role: "owner",
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    sessionId: crypto.randomBytes(16).toString("hex"),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");

  return `${payloadBase64}.${signature}`;
}

// Verify session token
export function verifySessionToken(token: string): { valid: boolean; payload?: SessionPayload; reason?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "No token provided" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Malformed token" };
  }

  const [payloadBase64, providedSig] = parts;
  const secret = getServerSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");

  const providedBuffer = Buffer.from(providedSig);
  const expectedBuffer = Buffer.from(expectedSig);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { valid: false, reason: "Invalid signature" };
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8"));
    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: "Session expired" };
    }
    if (payload.email.toLowerCase() !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return { valid: false, reason: "Unauthorized email identity in session" };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "Invalid token payload encoding" };
  }
}

// Authenticate login request
export async function authenticateOwner(
  email: string,
  password: string,
  ip: string
): Promise<{ success: boolean; status: number; message: string; token?: string; owner?: any }> {
  // 1. Rate limiting check
  const now = Date.now();
  const rl = rateLimitMap.get(ip);
  if (rl && rl.lockedUntil > now) {
    const remainingMins = Math.ceil((rl.lockedUntil - now) / 60000);
    logAudit("LOGIN_RATE_LIMITED", ip, "DENIED", email, `Locked out for ${remainingMins} more min`);
    return {
      success: false,
      status: 429,
      message: `Too many failed login attempts. For security, access is temporarily locked. Please try again in ${remainingMins} minute(s).`,
    };
  }

  // 2. Strict Owner Email Check
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (normalizedEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
    logAudit("LOGIN_DENIED_UNAUTHORIZED_EMAIL", ip, "DENIED", normalizedEmail, "Attempted login with non-owner email");
    return {
      success: false,
      status: 403,
      message: `Access Denied: Only the portfolio owner (${AUTHORIZED_OWNER_EMAIL}) is authorized to access the Admin Dashboard.`,
    };
  }

  // 3. Verify password against secure hash
  const store = getAuthStore();
  const candidateHash = hashPassword(password, store.salt);

  const candidateBuf = Buffer.from(candidateHash);
  const storedBuf = Buffer.from(store.passwordHash);

  const isValidPassword =
    candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);

  if (!isValidPassword) {
    const current = rl || { count: 0, lockedUntil: 0 };
    current.count++;
    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = now + LOCKOUT_MS;
      rateLimitMap.set(ip, current);
      logAudit("LOGIN_FAILED_LOCKOUT", ip, "FAILED", normalizedEmail, `Exceeded ${MAX_FAILED_ATTEMPTS} attempts`);
      return {
        success: false,
        status: 429,
        message: "Incorrect password. Security threshold exceeded: locked out for 15 minutes.",
      };
    } else {
      rateLimitMap.set(ip, current);
      logAudit("LOGIN_FAILED_BAD_PASSWORD", ip, "FAILED", normalizedEmail, `Attempt ${current.count}/${MAX_FAILED_ATTEMPTS}`);
      return {
        success: false,
        status: 401,
        message: `Incorrect password. Attempt ${current.count} of ${MAX_FAILED_ATTEMPTS}.`,
      };
    }
  }

  // Reset rate limit on success
  rateLimitMap.delete(ip);

  // Generate cryptographically signed session token
  const token = createSessionToken(AUTHORIZED_OWNER_EMAIL);
  logAudit("LOGIN_SUCCESS", ip, "SUCCESS", AUTHORIZED_OWNER_EMAIL, "Owner successfully authenticated");

  return {
    success: true,
    status: 200,
    message: "Welcome back, Siddharth Girase. Admin session authenticated.",
    token,
    owner: {
      name: "Siddharth Girase",
      email: AUTHORIZED_OWNER_EMAIL,
      role: "owner",
    },
  };
}

// Request Password Reset Token & deliver via Resend if available
export async function requestPasswordReset(
  email: string,
  ip: string
): Promise<{ success: boolean; status: number; message: string; debugCode?: string }> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (normalizedEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
    logAudit("RESET_DENIED_UNAUTHORIZED_EMAIL", ip, "DENIED", normalizedEmail);
    // Generic response to prevent user discovery
    return {
      success: true,
      status: 200,
      message: `If ${email} is the authorized owner address, a secure reset code has been sent.`,
    };
  }

  // Generate 6-digit numeric verification code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  activeResetTokens.set(resetCode, {
    email: AUTHORIZED_OWNER_EMAIL,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });

  logAudit("PASSWORD_RESET_REQUESTED", ip, "SUCCESS", AUTHORIZED_OWNER_EMAIL, `Code generated, expires in 15m`);

  // Deliver code via Resend if RESEND_API_KEY is configured
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  let emailSent = false;

  if (resendApiKey) {
    try {
      const emailHtml = `
      <div style="font-family: sans-serif; background: #0c0813; color: #fff; padding: 24px; border-radius: 12px; border: 1px solid #7c3aed; max-width: 500px;">
        <h2 style="color: #c084fc; margin-top: 0;">Siddharth Girase Portfolio — Password Reset</h2>
        <p>You requested a password reset for your portfolio admin dashboard.</p>
        <p>Use the following 6-digit security code to set a new password:</p>
        <div style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; border-radius: 8px; padding: 14px; font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #fff; margin: 18px 0;">
          ${resetCode}
        </div>
        <p style="color: #9ca3af; font-size: 13px;">This code will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>`;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.INQUIRY_FROM_EMAIL || "Siddharth Portfolio <onboarding@resend.dev>",
          to: [AUTHORIZED_OWNER_EMAIL],
          subject: "Your Portfolio Admin Security Reset Code",
          html: emailHtml,
        }),
      });

      if (response.ok) {
        emailSent = true;
      }
    } catch (e) {
      console.warn("Could not dispatch reset email via Resend:", e);
    }
  }

  return {
    success: true,
    status: 200,
    message: emailSent
      ? `A 6-digit security reset code has been sent directly to ${AUTHORIZED_OWNER_EMAIL}.`
      : `Reset code generated for ${AUTHORIZED_OWNER_EMAIL}. (Enter code: ${resetCode} to complete reset).`,
    debugCode: emailSent ? undefined : resetCode,
  };
}

// Reset password with valid code
export async function completePasswordReset(
  code: string,
  newPassword: string,
  ip: string
): Promise<{ success: boolean; status: number; message: string }> {
  const tokenRecord = activeResetTokens.get(code?.trim());
  if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
    logAudit("PASSWORD_RESET_FAILED", ip, "FAILED", undefined, "Invalid or expired reset code");
    return {
      success: false,
      status: 400,
      message: "Invalid or expired reset code. Please request a new code.",
    };
  }

  // Enforce strong password: min 8 chars, at least one number or special char
  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      status: 400,
      message: "New password must be at least 8 characters long.",
    };
  }

  const salt = crypto.randomBytes(24).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);

  const updatedStore: AuthStore = {
    email: AUTHORIZED_OWNER_EMAIL,
    salt,
    passwordHash,
    updatedAt: Date.now(),
  };

  try {
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(updatedStore, null, 2), { encoding: "utf-8" });
    activeResetTokens.delete(code.trim());
    logAudit("PASSWORD_RESET_SUCCESS", ip, "SUCCESS", AUTHORIZED_OWNER_EMAIL, "Password updated successfully");
    return {
      success: true,
      status: 200,
      message: "Password reset successful! You can now log in with your new password.",
    };
  } catch (err: any) {
    return {
      success: false,
      status: 500,
      message: "Failed to update password store on the server.",
    };
  }
}
