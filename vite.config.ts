import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { processInquiry } from "./api/inquiry";
import {
  authenticateOwner,
  verifySessionToken,
  requestPasswordReset,
  completePasswordReset,
} from "./api/auth";
import { handleAdminOperation } from "./api/admin";
import {
  getPublicProjects,
  getRawServerShowreel,
  saveRawServerShowreel,
  saveProjectServer,
  deleteProjectServer,
  syncProjectsFromClient,
  saveBase64Media,
  handleBinaryUpload,
  PUBLIC_UPLOADS_DIR,
} from "./api/projects";

declare const process: any;

function backendApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "vite-plugin-backend-api",
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // Ensure env vars from .env are available in process.env
        Object.entries(env).forEach(([k, v]) => {
          if (!process.env[k]) {
            process.env[k] = v;
          }
        });

        const url = req.url?.split("?")[0];
        const clientIp =
          req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const cookieHeader = req.headers["cookie"] || "";
        const cookieMatch = cookieHeader.match(/(?:^|;\s*)sg_admin_jwt=([^;]+)/);
        const devSessionToken = cookieMatch ? decodeURIComponent(cookieMatch[1].trim()) : undefined;

        // 0. Dedicated Video Streaming & Media Delivery (HTTP 206 Partial Content / Range Support)
        if (url?.startsWith("/uploads/")) {
          const relPath = url.replace("/uploads/", "");
          const filePath = path.join(PUBLIC_UPLOADS_DIR, relPath);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const isVideo =
              url.includes("/videos/") ||
              filePath.endsWith(".mp4") ||
              filePath.endsWith(".webm") ||
              filePath.endsWith(".mov");
            const isThumb =
              url.includes("/thumbnails/") ||
              filePath.endsWith(".jpg") ||
              filePath.endsWith(".jpeg") ||
              filePath.endsWith(".png") ||
              filePath.endsWith(".webp");

            let contentType = "application/octet-stream";
            if (filePath.endsWith(".mp4")) contentType = "video/mp4";
            else if (filePath.endsWith(".webm")) contentType = "video/webm";
            else if (filePath.endsWith(".mov")) contentType = "video/quicktime";
            else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (filePath.endsWith(".png")) contentType = "image/png";
            else if (filePath.endsWith(".webp")) contentType = "image/webp";

            // Universal CORS headers so HTML5 canvas, video players, and mobile browsers never block
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
            res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

            if (req.method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }

            const range = req.headers.range;

            if (isVideo && range) {
              // Parse Range header (e.g. "bytes=0-1048575" or "bytes=1048576-")
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

              if (start >= fileSize || end >= fileSize || start > end) {
                res.statusCode = 416; // Range Not Satisfiable
                res.setHeader("Content-Range", `bytes */${fileSize}`);
                res.end();
                return;
              }

              const chunkSize = end - start + 1;
              const fileStream = fs.createReadStream(filePath, { start, end });

              res.statusCode = 206; // Partial Content
              res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
              res.setHeader("Accept-Ranges", "bytes");
              res.setHeader("Content-Length", chunkSize);
              res.setHeader("Content-Type", contentType);

              fileStream.pipe(res);
              return;
            } else {
              res.statusCode = 200;
              res.setHeader("Content-Length", fileSize);
              res.setHeader("Content-Type", contentType);
              res.setHeader("Accept-Ranges", "bytes");
              if (isThumb) {
                res.setHeader("Cache-Control", "public, max-age=86400");
              }

              const fileStream = fs.createReadStream(filePath);
              fileStream.pipe(res);
              return;
            }
          }
        }

        // 1. Contact Inquiry API
        if (url === "/api/inquiry" && req.method === "POST") {
          let bodyStr = "";
          req.on("data", (chunk: any) => {
            bodyStr += chunk;
          });
          req.on("end", async () => {
            try {
              const payload = JSON.parse(bodyStr || "{}");
              const result = await processInquiry(payload);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = result.status;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, status: 400, message: "Invalid JSON" }));
            }
          });
          return;
        }

        // 2. Auth APIs
        if (url?.startsWith("/api/auth/")) {
          let bodyStr = "";
          req.on("data", (chunk: any) => {
            bodyStr += chunk;
          });
          req.on("end", async () => {
            try {
              const body = JSON.parse(bodyStr || "{}");
              res.setHeader("Content-Type", "application/json");

              if (url === "/api/auth/login" && req.method === "POST") {
                const result = await authenticateOwner(body.email, body.password, clientIp);
                if (result.success && result.token) {
                  const maxAge = body.persist ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
                  res.setHeader(
                    "Set-Cookie",
                    `sg_admin_jwt=${result.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
                  );
                  delete (result as any).token; // NEVER expose token in JSON
                }
                res.statusCode = result.status;
                res.end(JSON.stringify(result));
                return;
              }

              if (url === "/api/auth/verify" && (req.method === "POST" || req.method === "GET")) {
                if (!devSessionToken) {
                  res.statusCode = 401;
                  res.end(
                    JSON.stringify({
                      success: false,
                      status: 401,
                      message: "Unauthorized: Missing session cookie.",
                    })
                  );
                  return;
                }
                const result = verifySessionToken(devSessionToken);
                res.statusCode = result.valid ? 200 : 401;
                res.end(
                  JSON.stringify({
                    success: result.valid,
                    status: result.valid ? 200 : 401,
                    payload: result.payload,
                    message: result.valid ? "Session valid" : result.reason,
                  })
                );
                return;
              }

              if (url === "/api/auth/logout" && (req.method === "POST" || req.method === "GET")) {
                res.setHeader(
                  "Set-Cookie",
                  "sg_admin_jwt=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
                );
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: true,
                    status: 200,
                    message: "Admin session logged out successfully.",
                  })
                );
                return;
              }

              if (url === "/api/auth/request-password-reset" && req.method === "POST") {
                const result = await requestPasswordReset(body.email, clientIp);
                res.statusCode = result.status;
                res.end(JSON.stringify(result));
                return;
              }

              if (url === "/api/auth/reset-password" && req.method === "POST") {
                const result = await completePasswordReset(body.code, body.newPassword, clientIp);
                res.statusCode = result.status;
                res.end(JSON.stringify(result));
                return;
              }

              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, status: 404, message: "Auth endpoint not found" }));
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, status: 500, message: err.message }));
            }
          });
          return;
        }

        // 3. Public Projects API (Shared Database for ALL Visitors)
        if (url === "/api/projects" && req.method === "GET") {
          const includeUnpublished = req.url?.includes("includeUnpublished=true");
          let allowed = false;
          if (includeUnpublished && devSessionToken) {
            const auth = verifySessionToken(devSessionToken);
            if (auth.valid) allowed = true;
          }
          const projects = getPublicProjects(allowed);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, count: projects.length, projects }));
          return;
        }

        // 4. Public Showreel API (Shared Database for ALL Visitors)
        if (url === "/api/showreel" && req.method === "GET") {
          const showreel = getRawServerShowreel();
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, showreel }));
          return;
        }

        // 5. Shared Projects Migration & Synchronization (Sync from client IndexedDB)
        if (url === "/api/projects/sync" && req.method === "POST") {
          let bodyStr = "";
          req.on("data", (chunk: any) => {
            bodyStr += chunk;
          });
          req.on("end", () => {
            try {
              const body = JSON.parse(bodyStr || "{}");
              const result = syncProjectsFromClient(body.projects || [], devSessionToken, clientIp);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = result.status;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, status: 500, message: err.message }));
            }
          });
          return;
        }

        // 6. Base64 Media Upload Endpoint
        if (url === "/api/projects/upload" && req.method === "POST") {
          let bodyStr = "";
          req.on("data", (chunk: any) => {
            bodyStr += chunk;
          });
          req.on("end", () => {
            try {
              const body = JSON.parse(bodyStr || "{}");
              const permUrl = saveBase64Media(body.data, body.type || "video", body.name);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = permUrl ? 200 : 400;
              res.end(
                JSON.stringify({
                  success: Boolean(permUrl),
                  status: permUrl ? 200 : 400,
                  url: permUrl,
                  message: permUrl ? "File stored permanently" : "Upload failed",
                })
              );
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, status: 500, message: err.message }));
            }
          });
          return;
        }

        // 7. Streaming Binary Media Upload Endpoint
        if (url === "/api/projects/upload-binary" && req.method === "POST") {
          const type = req.url?.includes("type=thumbnail") ? "thumbnail" : "video";
          handleBinaryUpload(req, res, type, devSessionToken, clientIp);
          return;
        }

        // 8. Admin Protected APIs
        if (url?.startsWith("/api/admin/")) {
          const action = url.replace("/api/admin/", "");
          let bodyStr = "";
          req.on("data", (chunk: any) => {
            bodyStr += chunk;
          });
          req.on("end", async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};

              // Project mutations
              if (action === "projects/save") {
                const result = saveProjectServer(body.project || body, devSessionToken, clientIp);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = result.status;
                res.end(JSON.stringify(result));
                return;
              }

              if (action === "projects/delete") {
                const result = deleteProjectServer(body.id, devSessionToken, clientIp);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = result.status;
                res.end(JSON.stringify(result));
                return;
              }

              if (action === "showreel/save") {
                saveRawServerShowreel(body.showreel || body);
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, message: "Showreel updated on server." }));
                return;
              }

              const result = await handleAdminOperation(
                action,
                req.method,
                body,
                devSessionToken,
                clientIp
              );
              res.setHeader("Content-Type", "application/json");
              res.statusCode = result.status;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, status: 500, message: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), backendApiPlugin(env)],
    server: {
      watch: {
        ignored: [
          "**/api/backups/**",
          "**/public/uploads/**",
          "**/api/projects_data.json",
        ],
      },
    },
  };
});
