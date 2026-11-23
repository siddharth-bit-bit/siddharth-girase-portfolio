import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaFilm,
  FaCalendarAlt,
  FaUserTie,
  FaRedo,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { VideoProject, VideoAspectRatio } from "../data/videoData";
import { resolveVideoSource } from "../utils/videoResolver";
import { updateProject } from "../data/videoStorage";
import { lockScroll, unlockScroll } from "../utils/scrollLock";
import "./styles/VideoModal.css";

interface VideoModalProps {
  project: VideoProject | null;
  onClose: () => void;
}

const VideoModal = ({ project, onClose }: VideoModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [detectedRatio, setDetectedRatio] = useState<VideoAspectRatio | null>(null);

  // Stop video playback and invoke parent onClose
  const handleClose = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Lock scroll, preserve position, and isolate 3D canvas when modal opens
  useEffect(() => {
    if (!project) return;

    // Apply reference-counted scroll locking and position capture
    lockScroll();

    return () => {
      // Pause video if active
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          // ignore
        }
      }
      // Force unlock scroll and restore page state cleanly
      unlockScroll(true);
    };
  }, [project]);

  // Reset & autoplay when a project is selected
  useEffect(() => {
    if (project) {
      setHasError(false);
      setIsLoading(true);

      const resolved = resolveVideoSource(project.videoUrl);
      if (!resolved.isIframe && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.load();
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsLoading(false);
            })
            .catch(() => {
              // Browser autoplay policy might require initial user click or mute
              setIsLoading(false);
            });
        }
      } else {
        setIsLoading(false);
      }
    }
  }, [project]);

  if (!project) return null;

  const resolved = resolveVideoSource(project.videoUrl);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsLoading(false);
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      const r = v.videoWidth / v.videoHeight;
      let ratio: VideoAspectRatio = "16:9";
      if (r < 0.8) {
        ratio = "9:16";
      } else if (r >= 0.8 && r <= 1.2) {
        ratio = "1:1";
      }
      setDetectedRatio(ratio);
      if (project && !project.aspectRatio) {
        updateProject(project.id, { aspectRatio: ratio });
      }
    }
  };

  const activeRatio: VideoAspectRatio =
    detectedRatio ||
    project.aspectRatio ||
    (project.category === "REELS" ? "9:16" : "16:9");

  const isVertical = activeRatio === "9:16";
  const isSquare = activeRatio === "1:1";
  const containerRatioClass = isVertical
    ? "video-vertical"
    : isSquare
    ? "video-square"
    : "video-widescreen";

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => {
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  };

  return createPortal(
    <div
      className="video-modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`video-modal-container ${containerRatioClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="video-modal-close"
          onClick={handleClose}
          aria-label="Close video player"
          data-cursor="pointer"
        >
          <FaTimes />
        </button>

        <div className="video-player-wrapper">
          {isLoading && !hasError && (
            <div className="showreel-spinner-overlay">
              <FaSpinner className="spinner-icon" />
              <span>Loading Stream...</span>
            </div>
          )}

          {hasError ? (
            <div className="showreel-error-box">
              <FaExclamationTriangle className="error-icon" />
              <h3>Unable to stream this video</h3>
              <p>The video source could not be played directly by the browser.</p>
              <button className="showreel-retry-btn" onClick={handleRetry}>
                <FaRedo /> Retry Video
              </button>
            </div>
          ) : resolved.isIframe ? (
            <iframe
              src={resolved.embedUrl || resolved.streamUrl}
              title={project.title}
              className="video-element"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              style={{ border: "none", width: "100%", height: "100%", minHeight: "360px" }}
            />
          ) : (
            <video
              ref={videoRef}
              src={resolved.streamUrl}
              poster={project.thumbnailUrl}
              playsInline
              preload="metadata"
              controls
              className="video-element"
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => setIsLoading(false)}
              onLoadedMetadata={handleVideoMetadata}
              onError={(e) => {
                console.error("Video stream error:", resolved.streamUrl, e);
                setIsLoading(false);
                setHasError(true);
              }}
            >
              <source
                src={resolved.streamUrl}
                type={resolved.streamUrl.endsWith(".webm") ? "video/webm" : "video/mp4"}
              />
              Your browser does not support HTML5 video streaming.
            </video>
          )}

          <div className="video-player-ambient-glow" />
        </div>

        <div className="video-modal-info">
          <div className="video-modal-header">
            <span className="video-modal-category">{project.category}</span>
            {project.duration && (
              <span className="video-modal-duration">Duration: {project.duration}</span>
            )}
            {project.isCustom && (
              <span className="video-modal-custom-tag">Custom Upload</span>
            )}
          </div>

          <h2 className="video-modal-title">{project.title}</h2>
          <p className="video-modal-desc">{project.description}</p>

          <div className="video-modal-meta">
            {project.client && (
              <div className="meta-item">
                <FaUserTie className="meta-icon" />
                <span>Client: {project.client}</span>
              </div>
            )}
            {project.date && (
              <div className="meta-item">
                <FaCalendarAlt className="meta-icon" />
                <span>Year: {project.date}</span>
              </div>
            )}
            <div className="meta-item">
              <FaFilm className="meta-icon" />
              <span>4K Master • Edited by Siddharth Girase</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoModal;
