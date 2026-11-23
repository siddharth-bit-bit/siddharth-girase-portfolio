// Cloudflare Pages Function: /api/auth/logout
// Clears the HttpOnly admin session cookie with Same-Origin validation

import { validateSameOrigin } from "../../utils/auth.ts";

export const onRequest = async (context: { request?: Request }) => {
  if (context?.request) {
    const originCheck = validateSameOrigin(context.request);
    if (!originCheck.valid) {
      return originCheck.errorResponse!;
    }
  }

  const expiredCookie = "sg_admin_jwt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
  return new Response(
    JSON.stringify({
      success: true,
      status: 200,
      message: "Admin session logged out successfully.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": expiredCookie,
      },
    }
  );
};
