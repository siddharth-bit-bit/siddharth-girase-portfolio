export type VideoCategory =
  | "ALL WORK"
  | "REELS"
  | "CINEMATIC EDITS"
  | "SOCIAL MEDIA VIDEOS"
  | "PROMOTIONAL VIDEOS"
  | "OTHER PROJECTS";

export type VideoAspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoProject {
  id: string;
  title: string;
  category: VideoCategory;
  description: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  client?: string;
  date?: string;
  featured?: boolean;
  aspectRatio?: VideoAspectRatio;
  isCustom?: boolean;
  published?: boolean;
}

export const CATEGORIES: VideoCategory[] = [
  "ALL WORK",
  "REELS",
  "CINEMATIC EDITS",
  "SOCIAL MEDIA VIDEOS",
  "PROMOTIONAL VIDEOS",
  "OTHER PROJECTS",
];

// No hardcoded sample or demo projects — gallery displays ONLY user's actual manually uploaded projects
export const DEFAULT_PROJECTS: VideoProject[] = [];
