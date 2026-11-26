// Cloudflare Pages Function: /api/auth/request-password-reset
// Sends a cryptographically secure 6-digit OTP to the registered owner email via Resend
// Enforces 60-second cooldown, 5-minute expiry, and invalidates previous active OTPs

import {
  AUTHORIZED_OWNER_EMAIL,
  validateSameOrigin,
  type AuthEnv,
} from "../../utils/auth.ts";

export async function hashOtp(otp: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", keyMaterial, enc.encode(otp));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestPost = async (context: {
  env: AuthEnv & { RESEND_API_KEY?: string; INQUIRY_FROM_EMAIL?: string };
  request: Request;
}) => {
  try {
    const originCheck = validateSameOrigin(context.request);
    if (!originCheck.valid) {
      return originCheck.errorResponse!;
    }

    const body = (await context.request.json().catch(() => ({}))) as any;
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, status: 400, message: "Owner email is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 403,
          message: "Access restricted: Password recovery is only available for the portfolio owner.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!context.env.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 500,
          message: "Database connection unavailable. Please ensure D1 database is configured.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();
    const cooldownMs = 60 * 1000; // 60 seconds
    const otpTtlMs = 5 * 60 * 1000; // 5 minutes

    // Check rate limit / cooldown on last created OTP
    try {
      const recentOtp: any = await context.env.DB.prepare(
        "SELECT created_at FROM password_reset_otps WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
      )
        .bind(email)
        .first();

      if (recentOtp && recentOtp.created_at && now - recentOtp.created_at < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - (now - recentOtp.created_at)) / 1000);
        return new Response(
          JSON.stringify({
            success: false,
            status: 429,
            message: `Please wait ${remainingSec} second${remainingSec === 1 ? "" : "s"} before requesting another verification code.`,
            cooldownRemaining: remainingSec,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.warn("Could not check OTP cooldown:", e);
    }

    // Invalidate any existing active OTPs for this email
    try {
      await context.env.DB.prepare(
        "UPDATE password_reset_otps SET used = 1 WHERE email = ? AND used = 0"
      )
        .bind(email)
        .run();
    } catch (e) {
      console.warn("Could not invalidate previous OTPs:", e);
    }

    // Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const otpNumber = 100000 + (randomBuffer[0] % 900000);
    const otpString = otpNumber.toString();

    const signingSecret = context.env.ADMIN_JWT_SECRET || "sg_portfolio_reset_salt_key";
    const otpHash = await hashOtp(otpString, signingSecret);

    const otpId = `otp_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = now + otpTtlMs;

    await context.env.DB.prepare(
      "INSERT INTO password_reset_otps (id, email, otp_hash, attempts, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?, 0, ?)"
    )
      .bind(otpId, email, otpHash, expiresAt, now)
      .run();

    // Send email via Resend
    const resendApiKey = (context.env.RESEND_API_KEY || "").trim();
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 503,
          message: "Email service is temporarily unavailable. RESEND_API_KEY is not configured.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const fromEmail = context.env.INQUIRY_FROM_EMAIL?.trim() || "Siddharth Portfolio <onboarding@resend.dev>";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0c0814; color: #f1edff; border: 1px solid rgba(192, 132, 252, 0.25); border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="padding: 28px 32px; border-bottom: 1px solid rgba(192, 132, 252, 0.15); background: linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(15, 10, 24, 0.8));">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
            Siddharth Girase Portfolio
          </h2>
          <p style="margin: 6px 0 0; font-size: 13px; color: #c084fc;">
            Admin Security & Password Verification
          </p>
        </div>
        <div style="padding: 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #e2ddf0; line-height: 1.5;">
            Hello Siddharth,
          </p>
          <p style="margin: 0 0 24px; font-size: 14px; color: #b4a8cb; line-height: 1.6;">
            A request was received to reset the administrator password for your portfolio. Use the 6-digit verification code below to authorize this change:
          </p>
          <div style="text-align: center; margin: 28px 0; padding: 20px; background: rgba(192, 132, 252, 0.08); border: 1px dashed rgba(192, 132, 252, 0.4); border-radius: 10px;">
            <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #ffffff;">
              ${otpString}
            </span>
            <p style="margin: 10px 0 0; font-size: 12px; color: #c084fc;">
              ⏳ Valid for 5 minutes (expires in 300 seconds)
            </p>
          </div>
          <p style="margin: 0 0 20px; font-size: 13px; color: #9188a3; line-height: 1.5;">
            For security, this code allows a maximum of 5 attempts and cannot be reused. If you did not request this password reset, you can safely disregard this email; your existing password remains unchanged.
          </p>
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 24px; font-size: 11px; color: #6e6480; text-align: center;">
            This is an automated notification from your Cloudflare Pages production backend.
          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Your Verification Code: ${otpString} — Siddharth Girase Portfolio`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}));
      console.error("Resend API delivery error:", errorData);
      return new Response(
        JSON.stringify({
          success: false,
          status: 502,
          message: errorData.message || "Failed to dispatch verification email via Resend.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: `A 6-digit verification code has been sent to ${email}.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: err.message || "Server error while requesting password reset.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
