// Cloudflare Pages Function: /api/auth/verify
// Validates HttpOnly cookie session for owner authorization

import { verifyAdminRequest, type AuthEnv } from "../../utils/auth.ts";

export const onRequest = async (context: { env: AuthEnv; request: Request }) => {
  const auth = await verifyAdminRequest(context);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: 200,
      message: "Session is active and valid.",
      payload: {
        email: auth.email,
        role: "owner",
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
