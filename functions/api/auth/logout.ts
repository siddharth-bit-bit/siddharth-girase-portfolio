// Cloudflare Pages Function: /api/auth/logout
// Clears the HttpOnly admin session cookie

export const onRequest = async () => {
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
