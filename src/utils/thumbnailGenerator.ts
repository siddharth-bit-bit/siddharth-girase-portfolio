import { VideoAspectRatio } from "../data/videoData";

export interface ExtractedVideoInfo {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: VideoAspectRatio;
  duration: string;
  durationSeconds: number;
  codecSupported: boolean;
}

/**
 * Automatically extracts a clean, high-resolution JPEG thumbnail from a video file.
 * Seeks to ~15% into the video (or at least 0.5s) to avoid black opening frames.
 * Also detects exact resolution, aspect ratio (16:9, 9:16, 1:1), and duration.
 */
export function extractVideoThumbnail(
  fileOrBlob: Blob,
  seekPercent: number = 0.15
): Promise<ExtractedVideoInfo> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      reject(new Error("Document/Window is not available"));
      return;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const objectUrl = URL.createObjectURL(fileOrBlob);
    video.src = objectUrl;

    let hasHandledMetadata = false;

    // Timeout safety: if video fails to decode metadata within 8 seconds, reject cleanly
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "Video metadata extraction timed out. The file format or codec might not be directly playable in this browser."
        )
      );
    }, 8000);

    video.onloadedmetadata = () => {
      if (hasHandledMetadata) return;
      hasHandledMetadata = true;

      const durSec = video.duration || 0;

      // Seek to 15% into the video to avoid black fade-in frame at the start
      let targetSeek = durSec * seekPercent;
      if (durSec > 1.0) {
        targetSeek = Math.max(0.5, Math.min(targetSeek, durSec - 0.2));
      } else {
        targetSeek = 0;
      }

      video.currentTime = targetSeek;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Unable to obtain 2D canvas context"));
          return;
        }

        ctx.drawImage(video, 0, 0, w, h);

        const ratioVal = w / h;
        let detectedRatio: VideoAspectRatio = "16:9";
        if (ratioVal < 0.85) {
          detectedRatio = "9:16";
        } else if (ratioVal >= 0.85 && ratioVal <= 1.15) {
          detectedRatio = "1:1";
        } else {
          detectedRatio = "16:9";
        }

        const durSec = video.duration || 0;
        const mins = Math.floor(durSec / 60);
        const secs = Math.floor(durSec % 60);
        const durationStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
              resolve({
                blob,
                dataUrl,
                width: w,
                height: h,
                aspectRatio: detectedRatio,
                duration: durationStr,
                durationSeconds: durSec,
                codecSupported: true,
              });
            } else {
              reject(new Error("Failed to encode canvas to JPEG blob"));
            }
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "Browser could not play this video format. Please use an MP4 file encoded with H.264/AVC video and AAC audio."
        )
      );
    };
  });
}

/**
 * Checks whether the browser natively supports playing the given video file.
 */
export function checkVideoCodecSupport(file: File): {
  isSupported: boolean;
  canPlay: string;
  recommendation?: string;
} {
  const video = document.createElement("video");
  const mime = file.type || "video/mp4";
  const canPlay = video.canPlayType(mime);

  const ext = file.name.split(".").pop()?.toLowerCase();
  const isMp4OrWebm = ext === "mp4" || ext === "webm";

  if (canPlay === "probably" || canPlay === "maybe" || isMp4OrWebm) {
    return {
      isSupported: true,
      canPlay: canPlay || "supported",
    };
  }

  return {
    isSupported: false,
    canPlay,
    recommendation: `The file "${file.name}" may not play directly across all mobile and desktop browsers. We recommend using an MP4 container with H.264 video and AAC audio for 100% universal compatibility.`,
  };
}
