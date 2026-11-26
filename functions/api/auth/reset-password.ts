// Cloudflare Pages Function: /api/auth/reset-password
// Atomically consumes the verified single-use reset authorization token and updates the owner password in D1
// Invalidates all previous sessions and ensures password persistence

import {
  AUTHORIZED_OWNER_EMAIL,
  hashPassword,
  validateSameOrigin,
  type AuthEnv,
} from "../../utils/auth.ts";

export const onRequestPost = async (context: {
  env: AuthEnv;
  request: Request;
}) => {
  try {
    const originCheck = validateSameOrigin(context.request);
    if (!originCheck.valid) {
      return originCheck.errorResponse!;
    }

    const body = (await context.request.json().catch(() => ({}))) as any;
    const resetToken = (body.resetToken || "").trim();
    const newPassword = body.newPassword || "";

    if (!resetToken || !newPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Reset authorization token and new password are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Password must be at least 8 characters in length.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!context.env.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 500,
          message: "Database connection unavailable.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify reset token
    const tokenRecord: any = await context.env.DB.prepare(
      "SELECT token, email, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1"
    )
      .bind(resetToken)
      .first();

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: "Invalid or unrecognized reset authorization token.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();
    if (tokenRecord.used === 1) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: "This password reset authorization has already been used.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (now > tokenRecord.expires_at) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: "Reset authorization session has expired. Please restart verification.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const email = tokenRecord.email.toLowerCase();
    if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 403,
          message: "Forbidden: Only the owner password can be updated.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Atomically mark token as used
    await context.env.DB.prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = ?")
      .bind(resetToken)
      .run();

    // Generate new random cryptographic salt (32 bytes = 64 hex chars)
    const saltBytes = new Uint8Array(32);
    crypto.getRandomValues(saltBytes);
    const newSalt = Array.from(saltBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash password with PBKDF2 (100,000 iterations, SHA-512)
    const newHash = await hashPassword(newPassword, newSalt);

    // Update authoritative admin_auth record in D1
    const existingAdmin: any = await context.env.DB.prepare(
      "SELECT id FROM admin_auth WHERE email = ? LIMIT 1"
    )
      .bind(email)
      .first();

    if (existingAdmin && existingAdmin.id) {
      await context.env.DB.prepare(
        "UPDATE admin_auth SET password_hash = ?, salt = ?, updated_at = ? WHERE email = ?"
      )
        .bind(newHash, newSalt, now, email)
        .run();
    } else {
      const adminId = `admin_${now}`;
      await context.env.DB.prepare(
        "INSERT INTO admin_auth (id, email, password_hash, salt, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(adminId, email, newHash, newSalt, now)
        .run();
    }

    // Clear any active session cookie on response to invalidate previous sessions
    const clearCookieHeader = `sg_admin_jwt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "Password reset successful! You can now sign in with your new password.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearCookieHeader,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: err.message || "Server error while resetting password.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
