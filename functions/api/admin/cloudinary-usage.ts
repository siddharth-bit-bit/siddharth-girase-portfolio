// Cloudflare Pages Function: /api/admin/cloudinary-usage
// Queries Cloudinary Usage API to monitor Free Plan credit consumption & file limits
// PROTECTED: Only authenticated portfolio owner can view account usage details

import { verifyAdminRequest, type AuthEnv } from "../../utils/auth.ts";

interface CldEnv extends AuthEnv {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

export const onRequestGet = async (context: { env: CldEnv; request: Request }) => {
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
        data: { configured: false },
        message: "Cloudinary credentials not configured in Cloudflare Pages.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
      headers: {
        Authorization: authHeader,
        "User-Agent": "Siddharth-Portfolio-Edge/1.0",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ success: false, status: res.status, message: errText }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const rawUsage = (await res.json()) as any;
    const creditsUsed = rawUsage.credits?.usage || 0;
    const creditsLimit = rawUsage.credits?.limit || 25;
    const usedPercent = rawUsage.credits?.used_percent || (creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0);

    let warningLevel: "ok" | "warning" | "critical" = "ok";
    let warningMessage = "";

    if (usedPercent >= 90) {
      warningLevel = "critical";
      warningMessage = `CRITICAL: Cloudinary Free tier is at ${usedPercent.toFixed(1)}% capacity!`;
    } else if (usedPercent >= 75) {
      warningLevel = "warning";
      warningMessage = `WARNING: Cloudinary Free tier is at ${usedPercent.toFixed(1)}% usage.`;
    }

    const storageBytes = rawUsage.storage?.usage || 0;
    const storageGb = parseFloat((storageBytes / (1024 * 1024 * 1024)).toFixed(3));
    const bandwidthBytes = rawUsage.bandwidth?.usage || 0;
    const bandwidthGb = parseFloat((bandwidthBytes / (1024 * 1024 * 1024)).toFixed(3));

    const mediaLimits = {
      maxVideoSizeBytes: rawUsage.media_limits?.video_max_size_bytes || 104857600, // 100 MB
      maxImageSizeBytes: rawUsage.media_limits?.image_max_size_bytes || 10485760, // 10 MB
      maxVideoSizeMb: Math.round((rawUsage.media_limits?.video_max_size_bytes || 104857600) / (1024 * 1024)),
      maxImageSizeMb: Math.round((rawUsage.media_limits?.image_max_size_bytes || 10485760) / (1024 * 1024)),
    };

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        data: {
          configured: true,
          plan: rawUsage.plan || "Free",
          credits: {
            used: parseFloat(creditsUsed.toFixed(2)),
            limit: creditsLimit,
            usedPercent: parseFloat(usedPercent.toFixed(1)),
            remaining: parseFloat((creditsLimit - creditsUsed).toFixed(2)),
          },
          storage: {
            bytes: storageBytes,
            gb: storageGb,
            creditsUsage: rawUsage.storage?.credits_usage || 0,
          },
          bandwidth30d: {
            bytes: bandwidthBytes,
            gb: bandwidthGb,
            creditsUsage: rawUsage.bandwidth?.credits_usage || 0,
          },
          mediaLimits,
          warningLevel,
          warningMessage,
          lastUpdated: Date.now(),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=30",
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
