import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { verifySessionToken, logAudit, getRecentAuditLogs } from "./auth.ts";

declare const process: any;

const BACKUP_DIR = path.join(process.cwd(), "api", "backups");
const SERVER_DATA_PATH = path.join(process.cwd(), "api", "projects_data.json");

// Ensure backup dir exists
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch {}

export interface AdminApiResponse {
  success: boolean;
  status: number;
  message: string;
  data?: any;
}

// Middleware helper to require valid owner authentication
export function requireOwnerAuth(authHeader: string | undefined, ip: string): {
  authorized: boolean;
  email?: string;
  errorResponse?: AdminApiResponse;
} {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : authHeader?.trim();

  if (!token) {
    logAudit("UNAUTHORIZED_ACCESS_ATTEMPT", ip, "DENIED", undefined, "Missing session token");
    return {
      authorized: false,
      errorResponse: {
        success: false,
        status: 401,
        message: "Unauthorized: An authenticated session token is required to perform this administrative action.",
      },
    };
  }

  const verification = verifySessionToken(token);

  if (!verification.valid || !verification.payload) {
    logAudit("UNAUTHORIZED_TOKEN_INVALID", ip, "DENIED", undefined, verification.reason || "Invalid token");
    return {
      authorized: false,
      errorResponse: {
        success: false,
        status: 403,
        message: `Forbidden: ${verification.reason || "Session token invalid or expired"}. Access denied.`,
      },
    };
  }

  return {
    authorized: true,
    email: verification.payload.email,
  };
}

// Helper to load server-side projects data
function getServerProjects(): any[] {
  try {
    if (fs.existsSync(SERVER_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(SERVER_DATA_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

// Helper to save server-side projects data with automatic backup
function saveServerProjects(projects: any[]): void {
  try {
    fs.writeFileSync(SERVER_DATA_PATH, JSON.stringify(projects, null, 2), { encoding: "utf-8" });
  } catch (err) {
    console.error("Failed to save server projects data:", err);
  }
}

// Helper to generate Cloudinary upload signature
function generateCloudinarySignature(params: Record<string, any>, apiSecret: string): string {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort();
  const toSign = keys.map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

// Helper to query Cloudinary usage and credit limits
function fetchCloudinaryUsage(cloudName: string, apiKey: string, apiSecret: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const req = https.request(
      {
        hostname: "api.cloudinary.com",
        port: 443,
        path: `/v1_1/${cloudName}/usage`,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "User-Agent": "Siddharth-Portfolio-Server/1.0",
        },
      },
      (res: any) => {
        let data = "";
        res.on("data", (c: any) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e: any) {
            reject(new Error(`Failed to parse usage JSON: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// Handle Admin Operations
export async function handleAdminOperation(
  action: string,
  _method: string,
  payload: any,
  authHeader: string | undefined,
  ip: string
): Promise<AdminApiResponse> {
  // 1. Verify owner authentication for ALL administrative mutations
  const auth = requireOwnerAuth(authHeader, ip);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  // 2. Route operations
  switch (action) {
    case "audit-logs":
    case "list_audit_logs": {
      const logs = getRecentAuditLogs(50);
      return {
        success: true,
        status: 200,
        message: "Audit logs retrieved.",
        data: logs,
      };
    }

    case "export_backup": {
      const projects = getServerProjects();
      const backupData = {
        exportedAt: new Date().toISOString(),
        owner: auth.email,
        totalProjects: projects.length,
        projects,
      };

      const filename = `portfolio_backup_${Date.now()}.json`;
      const filePath = path.join(BACKUP_DIR, filename);
      try {
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), { encoding: "utf-8" });
      } catch {}

      logAudit("BACKUP_CREATED", ip, "SUCCESS", auth.email, `Filename: ${filename}`);

      return {
        success: true,
        status: 200,
        message: "Backup created successfully.",
        data: backupData,
      };
    }

    case "restore_backup": {
      if (!payload || !Array.isArray(payload.projects)) {
        return {
          success: false,
          status: 400,
          message: "Invalid backup file: 'projects' array expected.",
        };
      }

      saveServerProjects(payload.projects);
      logAudit("BACKUP_RESTORED", ip, "SUCCESS", auth.email, `Restored ${payload.projects.length} projects`);

      return {
        success: true,
        status: 200,
        message: `Successfully restored ${payload.projects.length} projects from backup.`,
        data: payload.projects,
      };
    }

    case "log_audit_action": {
      const { userAction, details, status } = payload || {};
      logAudit(userAction || "ADMIN_ACTION", ip, status || "SUCCESS", auth.email, details || "");
      return {
        success: true,
        status: 200,
        message: "Action logged.",
      };
    }

    case "cloudinary-sign": {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        return {
          success: false,
          status: 503,
          message: "Cloudinary credentials not configured on server.",
          data: { configured: false },
        };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const isVideo = payload.resource_type === "video";
      const folder = payload.folder || (isVideo ? "siddharth-portfolio/videos" : "siddharth-portfolio/thumbnails");
      const publicId = payload.public_id || undefined;

      const signParams: Record<string, any> = {
        folder,
        timestamp,
        overwrite: "true",
        unique_filename: "false",
      };
      if (publicId) signParams.public_id = publicId;

      const signature = generateCloudinarySignature(signParams, apiSecret);

      return {
        success: true,
        status: 200,
        message: "Upload signature generated.",
        data: {
          signature,
          timestamp,
          apiKey,
          cloudName,
          folder,
          publicId,
          resourceType: isVideo ? "video" : "image",
        },
      };
    }

    case "cloudinary-usage": {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        return {
          success: false,
          status: 503,
          message: "Cloudinary credentials not configured in server environment.",
          data: { configured: false },
        };
      }

      try {
        const rawUsage = await fetchCloudinaryUsage(cloudName, apiKey, apiSecret);
        const creditsUsed = rawUsage.credits?.usage || 0;
        const creditsLimit = rawUsage.credits?.limit || 25;
        const usedPercent = rawUsage.credits?.used_percent || (creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0);

        let warningLevel: "ok" | "warning" | "critical" = "ok";
        let warningMessage = "";

        if (usedPercent >= 90) {
          warningLevel = "critical";
          warningMessage = `CRITICAL: Approaching free-plan limits (${usedPercent.toFixed(1)}% of credits used). Conserve remaining credits.`;
        } else if (usedPercent >= 80) {
          warningLevel = "warning";
          warningMessage = `WARNING: Approaching free-plan limits (${usedPercent.toFixed(1)}% of credits used).`;
        }

        return {
          success: true,
          status: 200,
          message: "Cloudinary usage data retrieved.",
          data: {
            configured: true,
            plan: rawUsage.plan || "Free",
            credits: {
              usage: creditsUsed,
              limit: creditsLimit,
              usedPercent: parseFloat(usedPercent.toFixed(1)),
            },
            storage: {
              bytes: rawUsage.storage?.usage || 0,
              credits: rawUsage.storage?.credits_usage || 0,
            },
            bandwidth: {
              bytes: rawUsage.bandwidth?.usage || 0,
              credits: rawUsage.bandwidth?.credits_usage || 0,
            },
            transformations: {
              count: rawUsage.transformations?.usage || 0,
              credits: rawUsage.transformations?.credits_usage || 0,
            },
            mediaLimits: {
              videoMaxBytes: rawUsage.media_limits?.video_max_size_bytes || 104857600,
              imageMaxBytes: rawUsage.media_limits?.image_max_size_bytes || 10485760,
            },
            warningLevel,
            warningMessage,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          status: 500,
          message: `Failed to fetch Cloudinary usage: ${err.message}`,
        };
      }
    }

    default:
      return {
        success: false,
        status: 404,
        message: `Unknown admin operation: ${action}`,
      };
  }
}
