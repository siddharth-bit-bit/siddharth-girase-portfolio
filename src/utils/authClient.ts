// Client-side authentication and security helper for Siddharth Girase Portfolio
// Prefers HttpOnly cookie-based sessions, avoids exposing tokens to persistent localStorage

export const AUTHORIZED_OWNER_EMAIL = "girasejitendra249@gmail.com";
const TOKEN_STORAGE_KEY = "sg_portfolio_admin_jwt";
const USER_STORAGE_KEY = "sg_portfolio_admin_user";

export interface AdminUser {
  name: string;
  email: string;
  role: "owner";
}

// Scoped strictly to current browser tab session (never long-lived localStorage)
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export function setSession(token: string, user: AdminUser, persist: boolean = false): void {
  if (typeof window === "undefined") return;
  // Session token is strictly kept in transient sessionStorage to mitigate XSS persistence
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  // If persist is selected, user profile information (non-secret) is saved,
  // while the server sets a 30-day Max-Age on the HttpOnly Secure session cookie.
  if (persist) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);

  // Invalidate server-side HttpOnly cookie
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => {});
}

// Check if currently authenticated as owner via backend verification (checks HttpOnly cookie & Bearer token)
export async function verifyOwnerSession(): Promise<boolean> {
  const token = getAuthToken();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(token ? { token } : {}),
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

// Authenticate with server
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
    if (res.ok && data.success && data.token) {
      setSession(data.token, data.owner, persist);
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

// Request password reset code
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
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
      message: data.message,
      debugCode: data.debugCode,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Complete password reset with code
export async function completePasswordReset(
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), newPassword }),
    });
    const data = await res.json();
    return { success: data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Audit logging helper
export async function logAdminAudit(action: string, details?: string): Promise<void> {
  const token = getAuthToken();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch("/api/admin/log_audit_action", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({ userAction: action, details }),
    });
  } catch {}
}

// Retrieve audit logs
export async function fetchAuditLogs(): Promise<any[]> {
  const token = getAuthToken();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/admin/list_audit_logs", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}
