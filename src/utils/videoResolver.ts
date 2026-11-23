export type VideoSourceType = "html5" | "drive" | "youtube" | "vimeo" | "empty";

export interface VideoSourceInfo {
  type: VideoSourceType;
  streamUrl: string;
  embedUrl?: string;
  isIframe: boolean;
  originalUrl: string;
}

/**
 * Parses and normalizes any video URL (Google Drive, YouTube, Vimeo, Dropbox, Cloudinary, Supabase, MP4, WebM, Blob).
 * Ensures that Google Drive and other hosted videos can be played seamlessly inside the website without redirecting users.
 */
export function resolveVideoSource(rawUrl?: string): VideoSourceInfo {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      type: "empty",
      streamUrl: "",
      isIframe: false,
      originalUrl: "",
    };
  }

  const url = rawUrl.trim();

  // 1. Google Drive Links (e.g., https://drive.google.com/file/d/XYZ/view?usp=sharing)
  const driveMatch = url.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=download&id=))([a-zA-Z0-9_-]+)/
  );
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: "drive",
      streamUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      isIframe: true,
      originalUrl: url,
    };
  }

  // 2. YouTube Links (watch, shorts, embed, youtu.be)
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      streamUrl: url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`,
      isIframe: true,
      originalUrl: url,
    };
  }

  // 3. Vimeo Links
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?)([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      type: "vimeo",
      streamUrl: url,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`,
      isIframe: true,
      originalUrl: url,
    };
  }

  // 4. Dropbox Links: convert to ?raw=1 for direct HTML5 streaming
  if (url.includes("dropbox.com")) {
    let directDropboxUrl = url;
    if (/[?&]dl=[01]/.test(directDropboxUrl)) {
      directDropboxUrl = directDropboxUrl.replace(/([?&])dl=[01]/, "$1raw=1");
    } else if (directDropboxUrl.includes("?")) {
      directDropboxUrl += "&raw=1";
    } else {
      directDropboxUrl += "?raw=1";
    }
    return {
      type: "html5",
      streamUrl: directDropboxUrl,
      isIframe: false,
      originalUrl: url,
    };
  }

  // 5. Direct MP4, WebM, Cloudinary, Supabase, Blob, or standard video URL
  return {
    type: "html5",
    streamUrl: url,
    isIframe: false,
    originalUrl: url,
  };
}
