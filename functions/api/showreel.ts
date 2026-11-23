// Cloudflare Pages Function: /api/showreel
// Serves showreel details from Cloudflare D1 with automatic fallback to verified Cloudinary media

import staticShowreel from "../../api/showreel_data.json";

interface Env {
  DB?: any;
}

export const onRequestGet = async (context: { env: Env }) => {
  if (context.env.DB) {
    try {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM showreel WHERE id = 'active_showreel' LIMIT 1"
      ).all();

      if (results && results.length > 0) {
        const row = results[0];
        return new Response(
          JSON.stringify({
            success: true,
            showreel: {
              videoUrl: row.video_url,
              posterUrl: row.poster_url,
              title: row.title || "Siddharth Girase — Official Showreel",
              isCustom: true,
              published: Boolean(row.published),
            },
            source: "cloudflare-d1",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    } catch (err: any) {
      console.warn("D1 showreel query error:", err);
    }
  }

  // Fallback to verified Cloudinary Showreel media
  return new Response(
    JSON.stringify({
      success: true,
      showreel: {
        videoUrl:
          staticShowreel.videoUrl ||
          "https://res.cloudinary.com/he2zkdrt/video/upload/v1795419173/siddharth-portfolio/showreels/showreel_fallback.mp4",
        posterUrl:
          staticShowreel.posterUrl ||
          "https://res.cloudinary.com/he2zkdrt/image/upload/v1795419174/siddharth-portfolio/showreels/showreel_fallback_thumb.jpg",
        title: staticShowreel.title || "Siddharth Girase — Official Showreel",
        isCustom: true,
        published: true,
      },
      source: "static-cloudinary-fallback",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};
