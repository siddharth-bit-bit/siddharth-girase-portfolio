// Cloudflare Pages Function: /api/auth/verify-reset-code
// Verifies the 6-digit OTP code submitted by the owner
// Enforces max 5 attempts, expiration check, and issues a short-lived single-use reset authorization token

import {
  AUTHORIZED_OWNER_EMAIL,
  validateSameOrigin,
  type AuthEnv,
} from "../../utils/auth.ts";
import { hashOtp } from "./request-password-reset.ts";

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
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();

    if (!email || !code) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Email address and 6-digit verification code are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 403,
          message: "Access restricted: Verification is only available for the portfolio owner.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
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

    const signingSecret = context.env.ADMIN_JWT_SECRET || "sg_portfolio_reset_salt_key";
    const submittedOtpHash = await hashOtp(code, signingSecret);

    // Retrieve active OTP record
    const otpRecord: any = await context.env.DB.prepare(
      "SELECT id, otp_hash, attempts, expires_at, used FROM password_reset_otps WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
    )
      .bind(email)
      .first();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "No active verification code found. Please request a new code.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();

    // Check expiration (5 minutes)
    if (now > otpRecord.expires_at) {
      await context.env.DB.prepare("UPDATE password_reset_otps SET used = 1 WHERE id = ?")
        .bind(otpRecord.id)
        .run();

      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Verification code has expired. Please request a new code.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check attempt limits (max 5)
    if (otpRecord.attempts >= 5) {
      await context.env.DB.prepare("UPDATE password_reset_otps SET used = 1 WHERE id = ?")
        .bind(otpRecord.id)
        .run();

      return new Response(
        JSON.stringify({
          success: false,
          status: 429,
          message: "Too many failed attempts. This code has been invalidated for security. Please request a new code.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify hash
    if (otpRecord.otp_hash !== submittedOtpHash) {
      const nextAttempts = (otpRecord.attempts || 0) + 1;
      await context.env.DB.prepare("UPDATE password_reset_otps SET attempts = ? WHERE id = ?")
        .bind(nextAttempts, otpRecord.id)
        .run();

      const remainingAttempts = 5 - nextAttempts;
      return new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.` : "Code locked."}`,
          remainingAttempts,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // OTP matched! Invalidate OTP so it can NEVER be reused
    await context.env.DB.prepare("UPDATE password_reset_otps SET used = 1 WHERE id = ?")
      .bind(otpRecord.id)
      .run();

    // Issue a short-lived, single-use reset authorization token (valid for 10 minutes)
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    let resetToken = "";
    for (let i = 0; i < randomBytes.byteLength; i++) {
      resetToken += randomBytes[i].toString(16).padStart(2, "0");
    }

    const resetTokenExpiresAt = now + 10 * 60 * 1000; // 10 minutes
    await context.env.DB.prepare(
      "INSERT INTO password_reset_tokens (token, email, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)"
    )
      .bind(resetToken, email, resetTokenExpiresAt, now)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "Code verified successfully.",
        resetToken,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: err.message || "Server error while verifying reset code.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
