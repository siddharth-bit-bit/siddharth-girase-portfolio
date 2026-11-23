// Cloudflare Pages Function: /api/auth/login
// Secure owner authentication endpoint with PBKDF2 password hashing and signed JWT session tokens

import {
  AUTHORIZED_OWNER_EMAIL,
  createSessionToken,
  getSecret,
  hashPassword,
  type AuthEnv,
} from "../../utils/auth.ts";

export const onRequestPost = async (context: { env: AuthEnv; request: Request }) => {
  try {
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

    // Determine salt and password hash from Environment variables or D1 database
    let salt = context.env.ADMIN_SALT;
    let expectedHash = context.env.ADMIN_PASSWORD_HASH;

    if ((!salt || !expectedHash) && context.env.DB) {
      try {
        const query = await context.env.DB.prepare(
          "SELECT password_hash, salt FROM admin_auth WHERE email = ? LIMIT 1"
        )
          .bind(email)
          .first();

        if (query) {
          expectedHash = query.password_hash;
          salt = query.salt;
        }
      } catch (e) {
        console.warn("Could not query admin_auth from D1:", e);
      }
    }

    // Default fallback credentials if unconfigured
    if (!salt || !expectedHash) {
      salt = "e4f8a1c93b7d2e5f8a0b4c6e8d1a3f5b7c9e0a2d4f6b8a1c";
      // Hash of "Siddharth@2026!" with the salt above
      expectedHash = await hashPassword("Siddharth@2026!", salt);
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

    const secret = getSecret(context.env);
    const token = await createSessionToken(email, secret);
    const maxAge = persist ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

    const cookieHeader = `sg_admin_jwt=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "Authentication successful. Welcome, Siddharth!",
        token,
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
          "Access-Control-Allow-Origin": "*",
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
