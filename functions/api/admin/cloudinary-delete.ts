// Cloudflare Pages Function: /api/admin/cloudinary-delete
// Securely removes deleted assets from Cloudinary storage
// PROTECTED: Only authenticated portfolio owner can delete media assets

import { verifyAdminRequest, type AuthEnv } from "../../utils/auth.ts";

interface CldEnv extends AuthEnv {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

async function sha1Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestPost = async (context: { env: CldEnv; request: Request }) => {
  // 1. Session verification guard
  const auth = await verifyAdminRequest(context);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const cloudName = context.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = context.env.CLOUDINARY_API_KEY;
  const apiSecret = context.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 503,
        message: "Cloudinary credentials not configured.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const publicId = payload.public_id || payload.publicId;
    const resourceType = payload.resource_type || payload.resourceType || "video";

    if (!publicId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "public_id is required to delete an asset.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1Hex(toSign);

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
    const res = await fetch(destroyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Siddharth-Portfolio-Edge/1.0",
      },
      body: formData.toString(),
    });

    const cldResponse = (await res.json().catch(() => ({}))) as any;

    return new Response(
      JSON.stringify({
        success: res.ok,
        status: res.status,
        result: cldResponse.result || "unknown",
        message:
          cldResponse.result === "ok"
            ? `Asset ${publicId} deleted from Cloudinary.`
            : cldResponse.result === "not found"
            ? `Asset ${publicId} was already removed from Cloudinary.`
            : `Cloudinary response: ${cldResponse.result || "unknown"}`,
      }),
      {
        status: res.ok ? 200 : res.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, status: 500, message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
