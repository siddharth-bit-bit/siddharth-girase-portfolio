// Cloudflare Pages Function: /api/admin/cloudinary-sign
// Generates secure HMAC-SHA1 upload signatures for direct Cloudinary uploads from the browser
// PROTECTED: Only authenticated portfolio owner can request upload signatures

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
        message: "Cloudinary credentials not configured in Cloudflare Pages secrets.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const timestamp = Math.floor(Date.now() / 1000);
    const isVideo = payload.resource_type === "video";
    const folder = payload.folder || (isVideo ? "siddharth-portfolio/videos" : "siddharth-portfolio/thumbnails");
    const publicId = payload.public_id || undefined;

    const params: Record<string, string> = {
      folder,
      overwrite: "true",
      timestamp: String(timestamp),
      unique_filename: "false",
    };
    if (publicId) params.public_id = publicId;

    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + apiSecret;
    const signature = await sha1Hex(toSign);

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        data: {
          signature,
          timestamp,
          apiKey,
          cloudName,
          folder,
          publicId,
          resourceType: isVideo ? "video" : "image",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, status: 500, message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
