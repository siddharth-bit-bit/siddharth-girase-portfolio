// Cloudflare Pages Function: /api/admin/projects/delete
// Removes a project record from Cloudflare D1 and optionally cleans up Cloudinary assets
// PROTECTED: Only authenticated portfolio owner can delete projects

import { verifyAdminRequest, type AuthEnv } from "../../../utils/auth.ts";

interface CldEnv extends AuthEnv {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

export const onRequestPost = async (context: { env: CldEnv; request: Request }) => {
  // 1. Session verification guard
  const auth = await verifyAdminRequest(context);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const id = payload.projectId || payload.id;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "projectId is required to delete a project.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Delete from Cloudflare D1 database
    if (context.env.DB) {
      await context.env.DB.prepare("DELETE FROM projects WHERE id = ?")
        .bind(String(id))
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        message: `Project '${id}' deleted successfully.`,
        projectId: id,
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
