// Cloudflare Pages Function: /api/auth/login
// Secure owner authentication endpoint with PBKDF2 password hashing and HttpOnly session cookies
// Uses D1 database as the authoritative password record when available, falling back to environment secrets.
// FAILS CLOSED when neither D1 nor environment variables provide credentials.
// The session token is transmitted EXCLUSIVELY via HttpOnly cookie; NEVER returned in JSON.

import {
  AUTHORIZED_OWNER_EMAIL,
  createSessionToken,
  getSecret,
  hashPassword,
  validateSameOrigin,
  type AuthEnv,
} from "../../utils/auth.ts";

export const onRequestPost = async (context: { env: AuthEnv; request: Request }) => {
  try {
    // 1. Same-Origin / CSRF Validation
    const originCheck = validateSameOrigin(context.request);
    if (!originCheck.valid) {
      return originCheck.errorResponse!;
    }

    const body = (await context.request.json().catch(() => ({}))) as any;
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const persist = Boolean(body.persist);

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Email address and password are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 403,
          message: "Access restricted: Only the portfolio owner can sign in.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine salt and password hash from authoritative D1 first, then environment fallback
    let salt = "";
    let expectedHash = "";
    let d1Found = false;

    if (context.env.DB) {
      try {
        const query: any = await context.env.DB.prepare(
          "SELECT password_hash, salt FROM admin_auth WHERE email = ? LIMIT 1"
        )
          .bind(email)
          .first();

        if (query && query.password_hash && query.salt) {
          expectedHash = (query.password_hash || "").trim();
          salt = (query.salt || "").trim();
          d1Found = true;
        }
      } catch (e) {
        console.warn("Could not query admin_auth from D1:", e);
      }
    }

    // Fall back to environment variables only if D1 did not have a record
    if (!d1Found) {
      salt = (context.env.ADMIN_SALT || "").trim();
      expectedHash = (context.env.ADMIN_PASSWORD_HASH || "").trim();
    }

    // FAIL CLOSED: If salt or expectedHash are not configured, reject with safe error
    if (!salt || !expectedHash) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 500,
          message: "Server configuration error: Admin authentication credentials are not configured.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const secret = getSecret(context.env);
    if (!secret) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 500,
          message: "Server configuration error: ADMIN_JWT_SECRET is not configured.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const computedHash = await hashPassword(password, salt);

    if (computedHash !== expectedHash) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 401,
          message: "Incorrect password. Please verify your credentials.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = await createSessionToken(email, secret, persist);
    const maxAge = persist ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

    const cookieHeader = `sg_admin_jwt=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

    // SECURITY: The token is NEVER exposed in the JSON payload
    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "Authentication successful. Welcome, Siddharth!",
        owner: {
          name: "Siddharth Girase",
          email: AUTHORIZED_OWNER_EMAIL,
          role: "owner",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: err.message || "Authentication error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
