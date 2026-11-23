// Cloudflare Pages Function: /api/projects
// Serves public projects from Cloudflare D1 with automatic fallback to static Cloudinary project data
// Standard JSON import verified for Wrangler 3.114.17 compatibility
import staticProjects from "../../api/projects_data.json";

interface Env {
  DB?: any;
}

export const onRequestGet = async (context: { env: Env; request: Request }) => {
  const url = new URL(context.request.url);
  const includeUnpublished = url.searchParams.get("includeUnpublished") === "true";

  // 1. Try querying Cloudflare D1 database if bound
  if (context.env.DB) {
    try {
      let query = "SELECT * FROM projects";
      if (!includeUnpublished) {
        query += " WHERE published = 1";
      }
      query += " ORDER BY updated_at DESC";

      const { results } = await context.env.DB.prepare(query).all();
      if (results && results.length > 0) {
        const formatted = results.map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          description: row.description,
          aspectRatio: row.aspect_ratio || "16:9",
          duration: row.duration || "0:45",
          videoUrl: row.video_url,
          videoPublicId: row.video_public_id,
          thumbnailUrl: row.thumbnail_url,
          thumbnailPublicId: row.thumbnail_public_id,
          published: Boolean(row.published),
          isCustom: Boolean(row.is_custom),
          updatedAt: row.updated_at,
        }));

        return new Response(
          JSON.stringify({
            success: true,
            count: formatted.length,
            projects: formatted,
            source: "cloudflare-d1",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=60",
            },
          }
        );
      }
    } catch (err: any) {
      console.warn("D1 query error, using static fallback:", err);
    }
  }

  // 2. Fallback to verified Cloudinary project records
  const filtered = (staticProjects as any[]).filter((p) => {
    if (!includeUnpublished && p.published === false) return false;
    return true;
  });

  return new Response(
    JSON.stringify({
      success: true,
      count: filtered.length,
      projects: filtered,
      source: "static-cloudinary-fallback",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
};
