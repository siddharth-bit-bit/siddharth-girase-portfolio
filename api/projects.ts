import fs from "node:fs";
import path from "node:path";
import { verifySessionToken, logAudit } from "./auth.ts";

declare const process: any;

export const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
export const VIDEOS_DIR = path.join(PUBLIC_UPLOADS_DIR, "videos");
export const THUMBS_DIR = path.join(PUBLIC_UPLOADS_DIR, "thumbnails");
export const PROJECTS_FILE = path.join(process.cwd(), "api", "projects_data.json");
export const SHOWREEL_FILE = path.join(process.cwd(), "api", "showreel_data.json");
export const BACKUPS_DIR = path.join(process.cwd(), "api", "backups");

// Ensure permanent storage directories exist
function ensureStorageDirs(): void {
  try {
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create permanent storage directories:", err);
  }
}

ensureStorageDirs();

// -------------------------------------------------------------
// PROJECTS DATA HELPERS WITH AUTOMATIC SNAPSHOT BACKUPS
// -------------------------------------------------------------

function backupProjectsDatabase(): void {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      ensureStorageDirs();
      const backupPath = path.join(BACKUPS_DIR, `projects_${Date.now()}.json`);
      fs.copyFileSync(PROJECTS_FILE, backupPath);
      // Keep only last 10 backups to prevent disk bloat
      const files = fs.readdirSync(BACKUPS_DIR).filter((f: string) => f.startsWith("projects_")).sort();
      while (files.length > 10) {
        const oldFile = files.shift();
        if (oldFile) fs.unlinkSync(path.join(BACKUPS_DIR, oldFile));
      }
    }
  } catch (err) {
    console.warn("Could not create database backup snapshot:", err);
  }
}

export function getRawServerProjects(): any[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = fs.readFileSync(PROJECTS_FILE, "utf-8");
      return JSON.parse(data || "[]");
    }
  } catch (err) {
    console.warn("Could not read projects file:", err);
  }
  return [];
}

export function saveRawServerProjects(projects: any[]): void {
  try {
    ensureStorageDirs();
    backupProjectsDatabase();
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), { encoding: "utf-8" });
  } catch (err) {
    console.error("Could not write projects file:", err);
  }
}

// Public Projects Query (Anonymous visitors see only published)
export function getPublicProjects(includeUnpublished: boolean = false): any[] {
  const projects = getRawServerProjects();
  return projects.filter((p) => {
    if (!includeUnpublished && p.published === false) return false;
    return true;
  });
}

// -------------------------------------------------------------
// SHOWREEL DATA HELPERS
// -------------------------------------------------------------

export function getRawServerShowreel(): any {
  try {
    if (fs.existsSync(SHOWREEL_FILE)) {
      const data = fs.readFileSync(SHOWREEL_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read showreel file:", err);
  }
  return {
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    posterUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1600&q=80",
    title: "Siddharth Girase — Official Showreel",
    isCustom: false,
    published: true,
  };
}

export function saveRawServerShowreel(showreelData: any): void {
  try {
    fs.writeFileSync(SHOWREEL_FILE, JSON.stringify(showreelData, null, 2), { encoding: "utf-8" });
  } catch (err) {
    console.error("Could not write showreel file:", err);
  }
}

// -------------------------------------------------------------
// MEDIA STORAGE: BASE64 / BINARY TO PERMANENT FILE
// -------------------------------------------------------------

export function saveBase64Media(
  dataUrlOrBase64: string,
  type: "video" | "thumbnail",
  _originalName?: string
): string {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== "string") {
    return "";
  }

  // If already a standard HTTP/HTTPS or external URL, keep as is
  if (dataUrlOrBase64.startsWith("http://") || dataUrlOrBase64.startsWith("https://")) {
    return dataUrlOrBase64;
  }

  // If already a permanent local relative URL, keep as is
  if (dataUrlOrBase64.startsWith("/uploads/")) {
    return dataUrlOrBase64;
  }

  ensureStorageDirs();

  const isVideo = type === "video";
  const targetDir = isVideo ? VIDEOS_DIR : THUMBS_DIR;
  const urlPrefix = isVideo ? "/uploads/videos" : "/uploads/thumbnails";

  let base64Data = dataUrlOrBase64;
  let ext = isVideo ? ".mp4" : ".jpg";

  // Check if it's a data URL e.g. "data:video/mp4;base64,AAAA..."
  const matches = dataUrlOrBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const mime = matches[1];
    base64Data = matches[2];
    if (mime.includes("webm")) ext = ".webm";
    else if (mime.includes("mov")) ext = ".mov";
    else if (mime.includes("png")) ext = ".png";
    else if (mime.includes("webp")) ext = ".webp";
  }

  const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(targetDir, filename);

  try {
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);
    return `${urlPrefix}/${filename}`;
  } catch (err) {
    console.error(`Failed to save base64 ${type}:`, err);
    return "";
  }
}

// -------------------------------------------------------------
// PROJECT MUTATIONS (OWNER PROTECTED)
// -------------------------------------------------------------

export function saveProjectServer(
  projectData: any,
  authHeader: string | undefined,
  ip: string
): { success: boolean; status: number; message: string; project?: any } {
  // Verify owner authentication
  const token = authHeader?.replace("Bearer ", "");
  const auth = verifySessionToken(token || "");
  if (!auth.valid) {
    logAudit("UNAUTHORIZED_PROJECT_MUTATION", ip, "DENIED", undefined, `Attempt to save project "${projectData?.title}"`);
    return {
      success: false,
      status: 401,
      message: "Unauthorized: Only the portfolio owner can create or update projects.",
    };
  }

  if (!projectData || !projectData.title) {
    return {
      success: false,
      status: 400,
      message: "Invalid project data: Title is required.",
    };
  }

  const projects = getRawServerProjects();
  const id = projectData.id || `custom-vid-${Date.now()}`;

  // Process media if base64 provided
  let videoUrl = projectData.videoUrl || "";
  let thumbnailUrl = projectData.thumbnailUrl || "";

  if (videoUrl.startsWith("data:")) {
    videoUrl = saveBase64Media(videoUrl, "video", `${id}_video`);
  }
  if (thumbnailUrl.startsWith("data:")) {
    thumbnailUrl = saveBase64Media(thumbnailUrl, "thumbnail", `${id}_thumb`);
  }

  const existingIndex = projects.findIndex((p) => p.id === id);
  const updatedProject = {
    ...projectData,
    id,
    videoUrl: videoUrl || (existingIndex >= 0 ? projects[existingIndex].videoUrl : ""),
    thumbnailUrl: thumbnailUrl || (existingIndex >= 0 ? projects[existingIndex].thumbnailUrl : ""),
    isCustom: true,
    published: projectData.published !== undefined ? projectData.published : true,
    updatedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    projects[existingIndex] = updatedProject;
    logAudit("PROJECT_UPDATED", ip, "SUCCESS", auth.payload?.email, `ID: ${id}, Title: "${updatedProject.title}"`);
  } else {
    projects.push(updatedProject);
    logAudit("PROJECT_CREATED", ip, "SUCCESS", auth.payload?.email, `ID: ${id}, Title: "${updatedProject.title}"`);
  }

  saveRawServerProjects(projects);

  return {
    success: true,
    status: 200,
    message: `Project "${updatedProject.title}" saved successfully to shared database.`,
    project: updatedProject,
  };
}

export function deleteProjectServer(
  id: string,
  authHeader: string | undefined,
  ip: string
): { success: boolean; status: number; message: string } {
  // Verify owner authentication
  const token = authHeader?.replace("Bearer ", "");
  const auth = verifySessionToken(token || "");
  if (!auth.valid) {
    logAudit("UNAUTHORIZED_PROJECT_DELETE", ip, "DENIED", undefined, `Attempt to delete project ID: ${id}`);
    return {
      success: false,
      status: 401,
      message: "Unauthorized: Only the portfolio owner can delete projects.",
    };
  }

  const projects = getRawServerProjects();
  const existingIndex = projects.findIndex((p) => p.id === id);

  if (existingIndex === -1) {
    return {
      success: false,
      status: 404,
      message: `Project ID "${id}" not found in database.`,
    };
  }

  const deleted = projects.splice(existingIndex, 1)[0];
  saveRawServerProjects(projects);

  // Clean up permanent files if stored locally in /uploads/
  try {
    if (deleted.videoUrl && deleted.videoUrl.startsWith("/uploads/videos/")) {
      const filename = path.basename(deleted.videoUrl);
      const filePath = path.join(VIDEOS_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (deleted.thumbnailUrl && deleted.thumbnailUrl.startsWith("/uploads/thumbnails/")) {
      const filename = path.basename(deleted.thumbnailUrl);
      const filePath = path.join(THUMBS_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn("Could not delete physical media files:", err);
  }

  logAudit("PROJECT_DELETED", ip, "SUCCESS", auth.payload?.email, `ID: ${id}, Title: "${deleted.title}"`);

  return {
    success: true,
    status: 200,
    message: `Project "${deleted.title}" permanently deleted from shared database.`,
  };
}

// -------------------------------------------------------------
// STREAMING BINARY MEDIA UPLOAD (FOR LARGE VIDEO/THUMB FILES)
// -------------------------------------------------------------

export function handleBinaryUpload(
  req: any,
  res: any,
  type: "video" | "thumbnail",
  authHeader: string | undefined,
  ip: string
): void {
  const token = authHeader?.replace("Bearer ", "");
  const auth = verifySessionToken(token || "");
  if (!auth.valid) {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 401;
    res.end(JSON.stringify({ success: false, status: 401, message: "Unauthorized" }));
    return;
  }

  ensureStorageDirs();
  const isVideo = type === "video";
  const targetDir = isVideo ? VIDEOS_DIR : THUMBS_DIR;
  const urlPrefix = isVideo ? "/uploads/videos" : "/uploads/thumbnails";

  const contentType = (req.headers["content-type"] || "").toLowerCase();
  let ext = isVideo ? ".mp4" : ".jpg";
  if (contentType.includes("webm")) ext = ".webm";
  else if (contentType.includes("png")) ext = ".png";
  else if (contentType.includes("webp")) ext = ".webp";
  else if (contentType.includes("mov") || contentType.includes("quicktime")) ext = ".mov";

  const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(targetDir, filename);

  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  writeStream.on("finish", () => {
    logAudit("MEDIA_UPLOADED", ip, "SUCCESS", auth.payload?.email, `Saved ${type} to ${filename}`);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, url: `${urlPrefix}/${filename}` }));
  });

  writeStream.on("error", (err: any) => {
    console.error("Binary write error:", err);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, message: err.message }));
  });
}

// -------------------------------------------------------------
// BATCH MIGRATION & SYNC (FROM BROWSER INDEXEDDB TO SERVER)
// -------------------------------------------------------------

export function syncProjectsFromClient(
  incomingProjects: any[],
  authHeader: string | undefined,
  ip: string
): { success: boolean; status: number; message: string; count: number; projects: any[] } {
  // Allow sync either with owner token or during initial database synchronization
  const token = authHeader?.replace("Bearer ", "");
  const auth = verifySessionToken(token || "");
  const isOwner = auth.valid;

  if (!incomingProjects || !Array.isArray(incomingProjects)) {
    return {
      success: false,
      status: 400,
      message: "Invalid payload: projects array required.",
      count: 0,
      projects: [],
    };
  }

  const existingProjects = getRawServerProjects();
  let migratedCount = 0;

  for (const incoming of incomingProjects) {
    if (!incoming || !incoming.title) continue;

    // Filter out built-in demo placeholders
    if (incoming.id && incoming.id.startsWith("proj-")) continue;
    if (incoming.videoUrl && incoming.videoUrl.includes("commondatastorage.googleapis.com")) continue;

    const id = incoming.id || `custom-vid-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Convert any base64 video or thumbnail data to permanent server files
    let finalVideoUrl = incoming.videoUrl || "";
    let finalThumbUrl = incoming.thumbnailUrl || "";

    if (finalVideoUrl.startsWith("data:")) {
      finalVideoUrl = saveBase64Media(finalVideoUrl, "video", `${id}_vid`);
    }
    if (finalThumbUrl.startsWith("data:")) {
      finalThumbUrl = saveBase64Media(finalThumbUrl, "thumbnail", `${id}_thumb`);
    }

    const normalizedProject = {
      ...incoming,
      id,
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbUrl,
      isCustom: true,
      published: incoming.published !== false,
      updatedAt: incoming.updatedAt || Date.now(),
    };

    const existingIndex = existingProjects.findIndex((p) => p.id === id || p.title === incoming.title);
    if (existingIndex >= 0) {
      // Update existing if new media or details are present
      existingProjects[existingIndex] = {
        ...existingProjects[existingIndex],
        ...normalizedProject,
        videoUrl: finalVideoUrl || existingProjects[existingIndex].videoUrl,
        thumbnailUrl: finalThumbUrl || existingProjects[existingIndex].thumbnailUrl,
      };
    } else {
      existingProjects.push(normalizedProject);
      migratedCount++;
    }
  }

  saveRawServerProjects(existingProjects);

  logAudit(
    "PROJECTS_SYNCED_TO_CLOUD",
    ip,
    "SUCCESS",
    isOwner ? auth.payload?.email : "browser_sync",
    `Synced ${incomingProjects.length} projects. Added ${migratedCount} new to shared database.`
  );

  return {
    success: true,
    status: 200,
    message: `Successfully synchronized ${existingProjects.length} projects in shared persistent database.`,
    count: existingProjects.length,
    projects: existingProjects,
  };
}
