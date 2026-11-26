// Client-side authentication and security helper for Siddharth Girase Portfolio
// Enforces pure HttpOnly cookie-based sessions.
// JWT tokens are NEVER stored in localStorage or sessionStorage.
// All requests authenticate via credentials: "same-origin" (HttpOnly cookie).

export const AUTHORIZED_OWNER_EMAIL = "girasejitendra249@gmail.com";
const USER_STORAGE_KEY = "sg_portfolio_admin_user";

export interface AdminUser {
  name: string;
  email: string;
  role: "owner";
}

// Only non-sensitive user identity is stored for UI state
export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(user: AdminUser, persist: boolean = false): void {
  if (typeof window === "undefined") return;
  // Non-sensitive profile data only
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (persist) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);

  // Invalidate server-side HttpOnly cookie
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => {});
}

// Check if currently authenticated as owner via backend verification (uses HttpOnly cookie)
export async function verifyOwnerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.payload?.email?.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
        return true;
      }
    }
  } catch (err) {
    console.warn("Backend session check failed:", err);
  }

  // If session is invalid, clear client state
  clearSession();
  return false;
}

// Authenticate with server (session token is set exclusively in HttpOnly cookie by the server)
export async function loginOwner(
  email: string,
  password: string,
  persist: boolean = false
): Promise<{ success: boolean; message: string; user?: AdminUser }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, persist }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.owner) {
      setSession(data.owner, persist);
      return { success: true, message: data.message, user: data.owner };
    }

    return {
      success: false,
      message: data.message || "Authentication failed. Access denied.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Network error while connecting to authentication service.",
    };
  }
}

// Step 1: Request password reset 6-digit verification code
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message || "Request processed.",
      cooldownRemaining: data.cooldownRemaining,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to request password reset code." };
  }
}

// Step 2: Verify 6-digit OTP code on the server and obtain reset authorization token
export async function verifyResetCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string; resetToken?: string; remainingAttempts?: number }> {
  try {
    const res = await fetch("/api/auth/verify-reset-code", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message || "Code verification processed.",
      resetToken: data.resetToken,
      remainingAttempts: data.remainingAttempts,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Verification request failed." };
  }
}

// Step 3: Complete password reset with single-use reset authorization token
export async function completePasswordReset(
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken: resetToken.trim(), newPassword }),
    });
    const data = await res.json();
    return { success: data.success, message: data.message || "Password update processed." };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to update password." };
  }
}

// Audit logging helper
export async function logAdminAudit(action: string, details?: string): Promise<void> {
  try {
    await fetch("/api/admin/log_audit_action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userAction: action, details }),
    });
  } catch {}
}

// Retrieve audit logs
export async function fetchAuditLogs(): Promise<any[]> {
  try {
    const res = await fetch("/api/admin/list_audit_logs", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}
