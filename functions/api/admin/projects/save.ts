// Cloudflare Pages Function: /api/admin/projects/save
// Inserts or updates a project record in Cloudflare D1
// PROTECTED: Only authenticated portfolio owner can save projects

import { verifyAdminRequest, type AuthEnv } from "../../../utils/auth.ts";

export const onRequestPost = async (context: { env: AuthEnv; request: Request }) => {
  // 1. Session verification guard
  const auth = await verifyAdminRequest(context);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const project = payload.project || payload;

    if (!project || !project.id || !project.title || !project.videoUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Invalid project data: id, title, and videoUrl are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const id = String(project.id);
    const title = String(project.title || "").trim();
    const category = String(project.category || "REELS").trim();
    const description = String(project.description || "").trim();
    const aspectRatio = String(project.aspectRatio || "16:9");
    const duration = String(project.duration || "0:45");
    const videoUrl = String(project.videoUrl || "").trim();
    const videoPublicId = project.videoPublicId ? String(project.videoPublicId) : null;
    const thumbnailUrl = String(project.thumbnailUrl || "").trim();
    const thumbnailPublicId = project.thumbnailPublicId ? String(project.thumbnailPublicId) : null;
    const resourceType = "video";
    const format = "mp4";
    const width = project.aspectRatio === "9:16" ? 1080 : 1920;
    const height = project.aspectRatio === "9:16" ? 1920 : 1080;
    const published = project.published !== false ? 1 : 0;
    const isCustom = 1;
    const updatedAt = project.updatedAt || Date.now();

    // If Cloudflare D1 is bound
    if (context.env.DB) {
      await context.env.DB.prepare(
        `INSERT OR REPLACE INTO projects (
          id, title, category, description, aspect_ratio, duration,
          video_url, video_public_id, thumbnail_url, thumbnail_public_id,
          resource_type, format, width, height, published, is_custom, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          title,
          category,
          description,
          aspectRatio,
          duration,
          videoUrl,
          videoPublicId,
          thumbnailUrl,
          thumbnailPublicId,
          resourceType,
          format,
          width,
          height,
          published,
          isCustom,
          updatedAt
        )
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: `Project '${title}' saved successfully.`,
        project: {
          id,
          title,
          category,
          description,
          aspectRatio,
          duration,
          videoUrl,
          videoPublicId,
          thumbnailUrl,
          thumbnailPublicId,
          published: Boolean(published),
          isCustom: true,
          updatedAt,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
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
