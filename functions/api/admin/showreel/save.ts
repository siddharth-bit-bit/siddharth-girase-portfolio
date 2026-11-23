// Cloudflare Pages Function: /api/admin/showreel/save
// Updates the official showreel configuration in Cloudflare D1
// PROTECTED: Only authenticated portfolio owner can update the showreel

import { verifyAdminRequest, type AuthEnv } from "../../../utils/auth.ts";

export const onRequestPost = async (context: { env: AuthEnv; request: Request }) => {
  // 1. Session verification guard
  const auth = await verifyAdminRequest(context);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const showreel = payload.showreel || payload;

    const title = String(showreel.title || "Siddharth Girase — Official Showreel").trim();
    const videoUrl = String(showreel.videoUrl || "").trim();
    const posterUrl = String(showreel.posterUrl || "").trim();
    const videoPublicId = showreel.videoPublicId ? String(showreel.videoPublicId) : null;
    const posterPublicId = showreel.posterPublicId ? String(showreel.posterPublicId) : null;
    const published = showreel.published !== false ? 1 : 0;
    const updatedAt = Date.now();

    if (!videoUrl || !posterUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "videoUrl and posterUrl are required for the showreel.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (context.env.DB) {
      await context.env.DB.prepare(
        `INSERT OR REPLACE INTO showreel (
          id, title, video_url, video_public_id, poster_url, poster_public_id, published, updated_at
        ) VALUES ('active_showreel', ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(title, videoUrl, videoPublicId, posterUrl, posterPublicId, published, updatedAt)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: "Showreel updated successfully.",
        showreel: {
          title,
          videoUrl,
          videoPublicId,
          posterUrl,
          posterPublicId,
          published: Boolean(published),
          isCustom: true,
          updatedAt,
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
