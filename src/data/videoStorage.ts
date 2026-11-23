import { VideoProject } from "./videoData";
import { resolveVideoSource } from "../utils/videoResolver";
import { getAuthToken } from "../utils/authClient";
import { extractVideoThumbnail } from "../utils/thumbnailGenerator";

const DB_NAME = "SG_VideoPortfolio_DB";
const DB_VERSION = 2;
const STORE_NAME = "uploaded_videos";
const METADATA_KEY = "sg_portfolio_custom_projects_meta";
const SHOWREEL_STORE_NAME = "showreel_store";
const SHOWREEL_META_KEY = "sg_custom_showreel_meta";

export interface ShowreelData {
  videoUrl: string;
  posterUrl: string;
  title: string;
  isCustom: boolean;
  hasUploadedFile?: boolean;
  embedUrl?: string;
  isIframe?: boolean;
  published?: boolean;
}

export const DEFAULT_SHOWREEL: ShowreelData = {
  videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
  posterUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1600&q=80",
  title: "Siddharth Girase — Official Showreel",
  isCustom: false,
  published: true,
};

export const DEFAULT_SHOWREEL_FALLBACK = "https://res.cloudinary.com/he2zkdrt/video/upload/v1795419173/siddharth-portfolio/showreels/showreel_fallback.mp4";

interface StoredVideoRecord {
  id: string;
  project: VideoProject;
  videoBlob?: Blob;
  thumbBlob?: Blob;
  updatedAt?: number;
}

interface StoredShowreelRecord {
  id: string;
  data: ShowreelData;
  videoBlob?: Blob;
  posterBlob?: Blob;
  updatedAt?: number;
}

// Track active Object URLs to revoke when replaced
const activeObjectUrls = new Set<string>();

function registerObjectUrl(url: string): string {
  activeObjectUrls.add(url);
  return url;
}

export function revokeAllObjectUrls(): void {
  activeObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  });
  activeObjectUrls.clear();
}

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SHOWREEL_STORE_NAME)) {
        db.createObjectStore(SHOWREEL_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert Blob or File to Base64 Data URL
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// -------------------------------------------------------------
// PERMANENT CLOUD / BACKEND MEDIA UPLOAD HELPER
// -------------------------------------------------------------

export async function fetchCloudinaryUsageStats(): Promise<any> {
  const token = getAuthToken();
  if (!token) return { configured: false };
  try {
    const res = await fetch("/api/admin/cloudinary-usage", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.data || { configured: false };
    }
  } catch (e) {
    console.warn("Could not fetch Cloudinary usage:", e);
  }
  return { configured: false };
}

async function uploadMediaFile(
  fileOrBlob: File | Blob,
  type: "video" | "thumbnail",
  originalName?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const token = getAuthToken();
  const isVideo = type === "video";
  const resType = isVideo ? "video" : "image";

  // Method 1: Cloudinary Signed Direct Upload with Large-Video Chunking Support
  if (token) {
    try {
      const signRes = await fetch("/api/admin/cloudinary-sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resource_type: resType }),
      });

      if (signRes.ok) {
        const signData = await signRes.json();
        if (signData.success && signData.data) {
          const { signature, timestamp, apiKey, cloudName, folder } = signData.data;
          const totalSize = fileOrBlob.size;
          const fileName = originalName || (fileOrBlob instanceof File ? fileOrBlob.name : `${type}_${Date.now()}`);
          const chunkSize = 20 * 1024 * 1024; // 20 MB chunks

          // If file > 20 MB (large video), use Cloudinary Chunked Upload
          if (isVideo && totalSize > chunkSize) {
            const uniqueId = `cld_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            let offset = 0;
            let finalUrl = "";

            while (offset < totalSize) {
              const end = Math.min(offset + chunkSize, totalSize);
              const chunk = fileOrBlob.slice(offset, end);
              const isLastChunk = end === totalSize;

              const formData = new FormData();
              formData.append("file", chunk, fileName);
              formData.append("api_key", apiKey);
              formData.append("timestamp", String(timestamp));
              formData.append("signature", signature);
              formData.append("folder", folder);
              formData.append("overwrite", "true");
              formData.append("unique_filename", "false");

              const chunkRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
                {
                  method: "POST",
                  headers: {
                    "X-Unique-Upload-Id": uniqueId,
                    "Content-Range": `bytes ${offset}-${end - 1}/${totalSize}`,
                  },
                  body: formData,
                }
              );

              if (!chunkRes.ok) {
                const errText = await chunkRes.text();
                throw new Error(`Cloudinary chunk upload failed (${chunkRes.status}): ${errText}`);
              }

              if (isLastChunk) {
                const resultJson = await chunkRes.json();
                if (resultJson.secure_url) {
                  finalUrl = resultJson.secure_url;
                }
              }

              offset = end;
              if (onProgress) {
                onProgress(Math.min(100, Math.round((offset / totalSize) * 100)));
              }
            }

            if (finalUrl) return finalUrl;
          } else {
            // Standard Single File Signed Upload
            const formData = new FormData();
            formData.append("file", fileOrBlob, fileName);
            formData.append("api_key", apiKey);
            formData.append("timestamp", String(timestamp));
            formData.append("signature", signature);
            formData.append("folder", folder);
            formData.append("overwrite", "true");
            formData.append("unique_filename", "false");

            const uploadRes = await fetch(
              `https://api.cloudinary.com/v1_1/${cloudName}/${resType}/upload`,
              {
                method: "POST",
                body: formData,
              }
            );

            if (uploadRes.ok) {
              const uploadJson = await uploadRes.json();
              if (uploadJson.secure_url) {
                if (onProgress) onProgress(100);
                return uploadJson.secure_url;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Cloudinary signed upload error, falling back to permanent server storage:", err);
    }
  }

  // Method 2: Supabase Storage Bucket Upload (if configured)
  const config = getCloudStorageConfig();
  if (config.supabaseConfigured) {
    try {
      const isVideo = type === "video";
      const ext = isVideo ? "mp4" : "jpg";
      const filePath = `${type}s/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const bucket = isVideo ? "portfolio-videos" : "portfolio-thumbnails";
      const res = await fetch(
        `${config.supabaseUrl}/storage/v1/object/${bucket}/${filePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.supabaseAnonKey}`,
            "Content-Type": fileOrBlob.type || (isVideo ? "video/mp4" : "image/jpeg"),
          },
          body: fileOrBlob,
        }
      );
      if (res.ok) {
        return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
      }
    } catch (err) {
      console.warn("Supabase upload failed, falling back to permanent server storage:", err);
    }
  }

  // Method 3: Built-in Streaming Binary Upload (Direct to disk /uploads/)
  try {
    const res = await fetch(`/api/projects/upload-binary?type=${type}`, {
      method: "POST",
      headers: {
        "Content-Type":
          fileOrBlob.type || (type === "video" ? "video/mp4" : "image/jpeg"),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fileOrBlob,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn(`Binary upload failed for ${type}, trying base64 fallback:`, err);
  }

  // Method 4: Base64 JSON upload fallback
  try {
    const base64 = await blobToBase64(fileOrBlob);
    const fileName =
      originalName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `${type}_${Date.now()}`);
    const res = await fetch("/api/projects/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: base64, type, name: fileName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn(`Base64 upload failed for ${type}:`, err);
  }

  return "";
}

// -------------------------------------------------------------
// SHOWREEL STORAGE (SHARED CLOUD + LOCAL FALLBACK)
// -------------------------------------------------------------

const SHOWREEL_DOC_ID = "active_showreel";

export async function getShowreel(): Promise<ShowreelData> {
  // 1. Fetch from shared server database
  try {
    const res = await fetch("/api/showreel");
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.showreel && json.showreel.videoUrl) {
        return json.showreel;
      }
    }
  } catch (err) {
    console.warn("Could not fetch showreel from shared server:", err);
  }

  // 2. Fallback to local IndexedDB
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(SHOWREEL_STORE_NAME)) {
      const tx = db.transaction(SHOWREEL_STORE_NAME, "readonly");
      const store = tx.objectStore(SHOWREEL_STORE_NAME);
      const record: StoredShowreelRecord | undefined = await new Promise((res) => {
        const req = store.get(SHOWREEL_DOC_ID);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(undefined);
      });

      if (record && record.data) {
        let videoUrl = record.data.videoUrl;
        let posterUrl = record.data.posterUrl;

        if (record.videoBlob) {
          try {
            const mime = record.videoBlob.type || "video/mp4";
            const typedBlob = record.videoBlob.type
              ? record.videoBlob
              : new Blob([record.videoBlob], { type: mime });
            videoUrl = registerObjectUrl(URL.createObjectURL(typedBlob));
          } catch {}
        }
        if (record.posterBlob) {
          try {
            const mime = record.posterBlob.type || "image/jpeg";
            const typedBlob = record.posterBlob.type
              ? record.posterBlob
              : new Blob([record.posterBlob], { type: mime });
            posterUrl = registerObjectUrl(URL.createObjectURL(typedBlob));
          } catch {}
        }

        const resolved = resolveVideoSource(videoUrl);
        return {
          ...record.data,
          videoUrl: resolved.streamUrl,
          posterUrl,
        };
      }
    }
  } catch (err) {
    console.warn("Could not read showreel from IndexedDB:", err);
  }

  const fallbackStr = typeof window !== "undefined" ? localStorage.getItem(SHOWREEL_META_KEY) : null;
  return fallbackStr ? JSON.parse(fallbackStr) : DEFAULT_SHOWREEL;
}

export async function saveShowreel(
  videoFile?: File,
  posterFile?: File,
  videoUrl?: string,
  posterUrl?: string,
  title?: string
): Promise<ShowreelData> {
  let finalVideoUrl = videoUrl?.trim() || "";
  let finalPosterUrl = posterUrl?.trim() || "";

  // 1. Upload new files to permanent server storage
  if (videoFile) {
    const permVideoUrl = await uploadMediaFile(videoFile, "video");
    if (permVideoUrl) finalVideoUrl = permVideoUrl;
  }
  if (posterFile) {
    const permPosterUrl = await uploadMediaFile(posterFile, "thumbnail");
    if (permPosterUrl) finalPosterUrl = permPosterUrl;
  }

  const finalTitle = title?.trim() || "Siddharth Girase — Official Showreel";
  if (!finalPosterUrl) finalPosterUrl = DEFAULT_SHOWREEL.posterUrl;
  if (!finalVideoUrl) finalVideoUrl = DEFAULT_SHOWREEL.videoUrl;

  const resolved = resolveVideoSource(finalVideoUrl);
  const newShowreel: ShowreelData = {
    videoUrl: resolved.streamUrl,
    embedUrl: resolved.embedUrl,
    isIframe: resolved.isIframe,
    posterUrl: finalPosterUrl,
    title: finalTitle,
    isCustom: true,
    published: true,
    hasUploadedFile: Boolean(videoFile),
  };

  // 2. Save to shared server database
  try {
    const token = getAuthToken();
    await fetch("/api/admin/showreel/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ showreel: newShowreel }),
    });
  } catch (err) {
    console.warn("Failed to persist showreel to server:", err);
  }

  // 3. Keep local cache updated
  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(SHOWREEL_STORE_NAME)) {
      const record: StoredShowreelRecord = {
        id: SHOWREEL_DOC_ID,
        data: newShowreel,
        videoBlob: videoFile,
        posterBlob: posterFile,
        updatedAt: Date.now(),
      };
      const tx = db.transaction(SHOWREEL_STORE_NAME, "readwrite");
      tx.objectStore(SHOWREEL_STORE_NAME).put(record);
    }
    localStorage.setItem(SHOWREEL_META_KEY, JSON.stringify(newShowreel));
  } catch {}

  return newShowreel;
}

export async function deleteShowreel(): Promise<void> {
  try {
    const token = getAuthToken();
    await fetch("/api/admin/showreel/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ showreel: DEFAULT_SHOWREEL }),
    });
  } catch {}

  try {
    const db = await openDB();
    if (db.objectStoreNames.contains(SHOWREEL_STORE_NAME)) {
      const tx = db.transaction(SHOWREEL_STORE_NAME, "readwrite");
      tx.objectStore(SHOWREEL_STORE_NAME).delete(SHOWREEL_DOC_ID);
    }
  } catch {}

  localStorage.removeItem(SHOWREEL_META_KEY);
}

// -------------------------------------------------------------
// LOCAL INDEXEDDB PROJECTS READER (FOR ACTIVE BROWSER)
// -------------------------------------------------------------

export async function getCustomProjects(): Promise<VideoProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records: StoredVideoRecord[] = request.result || [];
        const projects = records.map((record) => {
          let videoUrl = record.project.videoUrl;
          let thumbnailUrl = record.project.thumbnailUrl;

          if (record.videoBlob) {
            try {
              const mime = record.videoBlob.type || "video/mp4";
              const typedBlob = record.videoBlob.type
                ? record.videoBlob
                : new Blob([record.videoBlob], { type: mime });
              videoUrl = registerObjectUrl(URL.createObjectURL(typedBlob));
            } catch {}
          }

          if (record.thumbBlob) {
            try {
              const mime = record.thumbBlob.type || "image/jpeg";
              const typedBlob = record.thumbBlob.type
                ? record.thumbBlob
                : new Blob([record.thumbBlob], { type: mime });
              thumbnailUrl = registerObjectUrl(URL.createObjectURL(typedBlob));
            } catch {}
          }

          const resolved = resolveVideoSource(videoUrl);

          return {
            ...record.project,
            videoUrl: resolved.streamUrl,
            thumbnailUrl,
            isCustom: true,
          };
        });
        resolve(projects);
      };

      request.onerror = () => {
        const fallback = localStorage.getItem(METADATA_KEY);
        resolve(fallback ? JSON.parse(fallback) : []);
      };
    });
  } catch (error) {
    console.warn("Could not retrieve custom projects from IndexedDB:", error);
    const fallback = typeof window !== "undefined" ? localStorage.getItem(METADATA_KEY) : null;
    return fallback ? JSON.parse(fallback) : [];
  }
}

// -------------------------------------------------------------
// AUTOMATIC MIGRATION: BROWSER INDEXEDDB -> SHARED SERVER DATABASE
// -------------------------------------------------------------

let isSyncInProgress = false;

export async function syncLocalProjectsToServer(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  if (isSyncInProgress) {
    return { success: true, count: 0, message: "Sync already in progress" };
  }

  isSyncInProgress = true;
  try {
    const db = await openDB();
    const records: StoredVideoRecord[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (records.length === 0) {
      isSyncInProgress = false;
      return { success: true, count: 0, message: "No local projects found to sync." };
    }

    const payloadProjects = [];
    for (const rec of records) {
      if (!rec || !rec.project || !rec.project.title) continue;
      // Skip hardcoded sample items
      if (rec.id && rec.id.startsWith("proj-")) continue;

      let videoUrl = rec.project.videoUrl || "";
      let thumbnailUrl = rec.project.thumbnailUrl || "";

      // Convert stored Blob to base64 so server can save permanently to disk
      if (rec.videoBlob) {
        try {
          videoUrl = await blobToBase64(rec.videoBlob);
        } catch (e) {
          console.warn("Failed to convert videoBlob:", e);
        }
      }
      if (rec.thumbBlob) {
        try {
          thumbnailUrl = await blobToBase64(rec.thumbBlob);
        } catch (e) {
          console.warn("Failed to convert thumbBlob:", e);
        }
      }

      payloadProjects.push({
        ...rec.project,
        videoUrl,
        thumbnailUrl,
      });
    }

    const token = getAuthToken();
    const res = await fetch("/api/projects/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ projects: payloadProjects }),
    });

    const data = await res.json();
    isSyncInProgress = false;

    if (data.success && Array.isArray(data.projects)) {
      // Update IndexedDB with the permanent server URLs
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const sp of data.projects) {
          const existingReq = store.get(sp.id);
          existingReq.onsuccess = () => {
            const current = existingReq.result;
            if (current) {
              current.project = sp;
              store.put(current);
            }
          };
        }
      } catch {}

      return {
        success: true,
        count: data.count,
        message: `Synced ${data.count} project(s) to shared database.`,
      };
    }

    return { success: false, count: 0, message: data.message || "Sync failed" };
  } catch (err: any) {
    isSyncInProgress = false;
    console.warn("Could not sync projects to server:", err);
    return { success: false, count: 0, message: err.message };
  }
}

// -------------------------------------------------------------
// PRIMARY SHARED PROJECTS QUERY (UNIVERSAL FOR ALL VISITORS)
// -------------------------------------------------------------

export async function getAllProjects(includeUnpublished: boolean = false): Promise<VideoProject[]> {
  // 1. Fetch from shared persistent database
  try {
    const token = getAuthToken();
    const url = `/api/projects${includeUnpublished ? "?includeUnpublished=true" : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        // If server already has the published projects, return them!
        if (data.projects.length > 0) {
          // Check in background if local browser has any unsynced projects
          if (typeof window !== "undefined" && window.indexedDB) {
            getCustomProjects().then((local) => {
              const unsynced = local.filter(
                (l) => !data.projects.some((sp: any) => sp.id === l.id || sp.title === l.title)
              );
              if (unsynced.length > 0) {
                syncLocalProjectsToServer();
              }
            }).catch(() => {});
          }
          return data.projects;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load from /api/projects:", err);
  }

  // 2. If server database is currently empty, check local browser IndexedDB
  const custom = await getCustomProjects();
  if (custom.length > 0) {
    // Automatically trigger migration to server so all future visitors see these projects
    syncLocalProjectsToServer().catch(() => {});
  }

  // Filter out any sample/demo projects
  return custom.filter((p) => {
    if (p.id && p.id.startsWith("proj-")) return false;
    if (p.videoUrl && p.videoUrl.includes("commondatastorage.googleapis.com/gtv-videos-bucket/sample/")) return false;
    if (p.title === "Cinematic Wanderlust — Nature & Travel Film" && !p.isCustom) return false;
    if (!includeUnpublished && p.published === false) return false;
    return true;
  });
}

// -------------------------------------------------------------
// SAVE NEW PROJECT (OWNER OPERATION -> SHARED CLOUD DATABASE)
// -------------------------------------------------------------

export async function saveProject(
  projectData: Omit<VideoProject, "id">,
  videoFile?: File,
  thumbFile?: File | Blob
): Promise<VideoProject> {
  const id = `custom-vid-${Date.now()}`;
  let finalVideoUrl = projectData.videoUrl;
  let finalThumbUrl = projectData.thumbnailUrl;

  // Auto-extract thumbnail frame and detect aspect ratio from video if no custom thumbnail provided
  if (videoFile && !thumbFile && (!finalThumbUrl || finalThumbUrl.startsWith("blob:") || finalThumbUrl.includes("placeholder"))) {
    try {
      const extracted = await extractVideoThumbnail(videoFile);
      thumbFile = extracted.blob;
      if (!projectData.aspectRatio) {
        projectData.aspectRatio = extracted.aspectRatio;
      }
      if (!projectData.duration || projectData.duration === "0:45") {
        projectData.duration = extracted.duration;
      }
    } catch (e) {
      console.warn("Auto thumbnail extraction failed, continuing with fallback:", e);
    }
  }

  // 1. Upload files to permanent server / cloud storage
  if (videoFile) {
    const permUrl = await uploadMediaFile(videoFile, "video");
    if (permUrl) {
      finalVideoUrl = permUrl;
    } else {
      finalVideoUrl = registerObjectUrl(URL.createObjectURL(videoFile));
    }
  }

  if (thumbFile) {
    const permUrl = await uploadMediaFile(thumbFile, "thumbnail");
    if (permUrl) {
      finalThumbUrl = permUrl;
    } else {
      finalThumbUrl = registerObjectUrl(URL.createObjectURL(thumbFile));
    }
  }

  const resolved = resolveVideoSource(finalVideoUrl);
  const newProject: VideoProject = {
    ...projectData,
    id,
    isCustom: true,
    published: projectData.published !== undefined ? projectData.published : true,
    videoUrl: resolved.streamUrl,
    thumbnailUrl: finalThumbUrl,
    aspectRatio: projectData.aspectRatio || "16:9",
    duration: projectData.duration || "0:45",
  };

  // 2. Persist to shared server database
  try {
    const token = getAuthToken();
    await fetch("/api/admin/projects/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ project: newProject }),
    });
  } catch (err) {
    console.warn("Failed to persist project to server:", err);
  }

  // 3. Keep local cache updated
  try {
    const db = await openDB();
    const record: StoredVideoRecord = {
      id,
      project: newProject,
      videoBlob: videoFile,
      thumbBlob: thumbFile,
      updatedAt: Date.now(),
    };
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);

    const existingMetaStr = localStorage.getItem(METADATA_KEY);
    const metaList: VideoProject[] = existingMetaStr ? JSON.parse(existingMetaStr) : [];
    metaList.push(newProject);
    localStorage.setItem(METADATA_KEY, JSON.stringify(metaList));
  } catch {}

  return newProject;
}

// -------------------------------------------------------------
// UPDATE PROJECT (OWNER OPERATION -> SHARED CLOUD DATABASE)
// -------------------------------------------------------------

export async function updateProject(
  id: string,
  updates: Partial<VideoProject>,
  newVideoFile?: File,
  newThumbFile?: File | Blob
): Promise<VideoProject | null> {
  let updatedVideoUrl = updates.videoUrl;
  let updatedThumbUrl = updates.thumbnailUrl;

  // Auto-extract thumbnail from new video if no custom thumbnail provided
  if (newVideoFile && !newThumbFile && (!updatedThumbUrl || updatedThumbUrl.startsWith("blob:"))) {
    try {
      const extracted = await extractVideoThumbnail(newVideoFile);
      newThumbFile = extracted.blob;
      if (!updates.aspectRatio) {
        updates.aspectRatio = extracted.aspectRatio;
      }
      if (!updates.duration) {
        updates.duration = extracted.duration;
      }
    } catch (e) {
      console.warn("Auto thumbnail extraction on update:", e);
    }
  }

  if (newVideoFile) {
    const permUrl = await uploadMediaFile(newVideoFile, "video");
    if (permUrl) updatedVideoUrl = permUrl;
  }

  if (newThumbFile) {
    const permUrl = await uploadMediaFile(newThumbFile, "thumbnail");
    if (permUrl) updatedThumbUrl = permUrl;
  }

  const cleanUpdates: Partial<VideoProject> = {
    ...updates,
    ...(updatedVideoUrl ? { videoUrl: updatedVideoUrl } : {}),
    ...(updatedThumbUrl ? { thumbnailUrl: updatedThumbUrl } : {}),
  };

  // 1. Update on shared server database
  try {
    const token = getAuthToken();
    await fetch("/api/admin/projects/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ project: { id, ...cleanUpdates } }),
    });
  } catch (err) {
    console.warn("Failed to update project on server:", err);
  }

  // 2. Update local IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const existing: StoredVideoRecord | undefined = await new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (existing) {
      existing.project = {
        ...existing.project,
        ...cleanUpdates,
      };
      if (newVideoFile) existing.videoBlob = newVideoFile;
      if (newThumbFile) existing.thumbBlob = newThumbFile;
      existing.updatedAt = Date.now();
      store.put(existing);
    }

    const existingMetaStr = localStorage.getItem(METADATA_KEY);
    if (existingMetaStr) {
      const metaList: VideoProject[] = JSON.parse(existingMetaStr);
      const updatedList = metaList.map((p) => (p.id === id ? { ...p, ...cleanUpdates } : p));
      localStorage.setItem(METADATA_KEY, JSON.stringify(updatedList));
    }
  } catch {}

  return { id, ...cleanUpdates } as VideoProject;
}

// -------------------------------------------------------------
// DELETE PROJECT (OWNER OPERATION -> SHARED CLOUD DATABASE)
// -------------------------------------------------------------

export async function deleteProject(id: string): Promise<boolean> {
  // 1. Delete on shared server database
  try {
    const token = getAuthToken();
    await fetch("/api/admin/projects/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.warn("Failed to delete project on server:", err);
  }

  // 2. Delete from local IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    const existingMetaStr = localStorage.getItem(METADATA_KEY);
    if (existingMetaStr) {
      const metaList: VideoProject[] = JSON.parse(existingMetaStr);
      const filtered = metaList.filter((p) => p.id !== id);
      localStorage.setItem(METADATA_KEY, JSON.stringify(filtered));
    }
  } catch {}

  return true;
}

// -------------------------------------------------------------
// BACKUP EXPORT & RESTORE
// -------------------------------------------------------------

export async function exportDatabaseBackup(): Promise<string> {
  const [projects, showreel] = await Promise.all([
    getAllProjects(true),
    getShowreel(),
  ]);

  const backupObj = {
    backupVersion: 2,
    exportedAt: new Date().toISOString(),
    owner: "girasejitendra249@gmail.com",
    totalProjects: projects.length,
    projects,
    showreel,
  };

  return JSON.stringify(backupObj, null, 2);
}

export async function restoreDatabaseBackup(
  jsonString: string
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.projects)) {
      return { success: false, message: "Invalid backup file: 'projects' array not found." };
    }

    // 1. Restore to shared server database
    const token = getAuthToken();
    await fetch("/api/projects/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ projects: data.projects }),
    });

    if (data.showreel) {
      await fetch("/api/admin/showreel/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ showreel: data.showreel }),
      });
    }

    // 2. Restore to local IndexedDB
    const db = await openDB();
    for (const proj of data.projects) {
      const record: StoredVideoRecord = {
        id: proj.id,
        project: {
          ...proj,
          isCustom: true,
          published: proj.published !== false,
        },
        updatedAt: Date.now(),
      };
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(data.projects));

    return {
      success: true,
      message: `Successfully restored ${data.projects.length} project(s) to shared database.`,
      count: data.projects.length,
    };
  } catch (err: any) {
    return { success: false, message: `Backup restoration failed: ${err.message}` };
  }
}

export function getCloudStorageConfig() {
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  return {
    cloudinaryConfigured: Boolean(cloudinaryCloudName && cloudinaryUploadPreset),
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    cloudinaryCloudName,
    cloudinaryUploadPreset,
    supabaseUrl,
    supabaseAnonKey,
  };
}
