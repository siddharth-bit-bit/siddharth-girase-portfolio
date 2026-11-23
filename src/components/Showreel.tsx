import { useState, useRef, useEffect } from "react";
import {
  FaPlay,
  FaPause,
  FaVolumeMute,
  FaVolumeUp,
  FaExpand,
  FaFilm,
  FaRedo,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import {
  getShowreel,
  DEFAULT_SHOWREEL,
  DEFAULT_SHOWREEL_FALLBACK,
  ShowreelData,
} from "../data/videoStorage";
import "./styles/Showreel.css";

interface ShowreelProps {
  refreshTrigger?: number;
}

const Showreel = ({ refreshTrigger = 0 }: ShowreelProps) => {
  const [showreel, setShowreel] = useState<ShowreelData>(DEFAULT_SHOWREEL);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isIframeActive, setIsIframeActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [usedFallback, setUsedFallback] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load showreel data on mount or when refreshed via Admin
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getShowreel()
      .then((data) => {
        if (isMounted) {
          setShowreel(data);
          setHasError(false);
          setErrorDetails("");
          setUsedFallback(false);
          setIsIframeActive(false);
          setIsPlaying(false);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load showreel data:", err);
        if (isMounted) {
          setShowreel(DEFAULT_SHOWREEL);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const togglePlay = () => {
    if (showreel.isIframe) {
      setIsIframeActive(true);
      setIsPlaying(true);
      return;
    }

    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setHasError(false);
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Playback prevented or error:", err);
          // If browser requires muted autoplay first, try muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.8);
      videoRef.current.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
    setIsLoading(false);
    setHasError(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleFullscreen = () => {
    const playerBox = document.getElementById("showreel-player-box");
    if (!playerBox) return;

    if (!document.fullscreenElement) {
      if (playerBox.requestFullscreen) {
        playerBox.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleVideoError = () => {
    setIsLoading(false);
    // If we haven't tried the secondary mirror, try fallback first
    if (!usedFallback && !showreel.hasUploadedFile) {
      setUsedFallback(true);
      if (videoRef.current) {
        videoRef.current.src = DEFAULT_SHOWREEL_FALLBACK;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    setHasError(true);
    setErrorDetails(
      showreel.hasUploadedFile
        ? "Uploaded video file format or codec needs browser decoding. MP4 (H.264 / AAC) is recommended."
        : "Video streaming source is temporarily unreachable or blocked by network provider."
    );
  };

  const handleRetry = () => {
    setHasError(false);
    setErrorDetails("");
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.src = showreel.videoUrl || DEFAULT_SHOWREEL.videoUrl;
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="showreel-section" id="showreel">
      <div className="showreel-container">
        {/* Section Header */}
        <div className="showreel-header">
          <div className="showreel-tag">
            <FaFilm /> CINEMATIC SHOWCASE
          </div>
          <h2 className="showreel-title">
            MY CREATIVE <span>UNIVERSE</span>
          </h2>
          <p className="showreel-subtitle">Every frame tells a story.</p>
        </div>

        {/* Cinematic Main Player Container */}
        <div className="showreel-player-box" id="showreel-player-box">
          <div className="showreel-ambient-backlight" />

          {/* Loading Spinner */}
          {isLoading && !hasError && (
            <div className="showreel-spinner-overlay">
              <FaSpinner className="spinner-icon" />
              <span>Loading 4K Stream...</span>
            </div>
          )}

          {/* Error Recovery Overlay */}
          {hasError ? (
            <div className="showreel-error-box">
              <FaExclamationTriangle className="error-icon" />
              <h3>Unable to load current video</h3>
              <p>{errorDetails || "The video source could not be streamed directly."}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="showreel-retry-btn" onClick={handleRetry}>
                  <FaRedo /> Retry Video Stream
                </button>
              </div>
            </div>
          ) : showreel.isIframe ? (
            // Embedded Video Player (Google Drive preview / YouTube embed / Vimeo)
            isIframeActive ? (
              <iframe
                title={showreel.title}
                src={showreel.embedUrl || showreel.videoUrl}
                className="showreel-video"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                style={{ border: "none", width: "100%", height: "100%" }}
              />
            ) : (
              // Poster view with big Play button before user starts iframe playback
              <div
                className="showreel-poster-backdrop"
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${showreel.posterUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={togglePlay}
              >
                <div className="showreel-play-overlay">
                  <div className="play-button-pulse">
                    <div className="pulse-ring" />
                    <div className="pulse-ring delayed" />
                    <div className="play-btn-circle" data-cursor="pointer">
                      <FaPlay style={{ marginLeft: "4px" }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Standard Native HTML5 Video Element
            <>
              <video
                ref={videoRef}
                className="showreel-video"
                src={showreel.videoUrl}
                poster={showreel.posterUrl}
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                  setIsLoading(false);
                  setIsPlaying(true);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleVideoError}
              />

              {/* Central Glowing Purple Play/Pause Trigger */}
              <div
                className={`showreel-play-overlay ${isPlaying ? "playing" : ""}`}
                onClick={togglePlay}
              >
                <div className="play-button-pulse">
                  <div className="pulse-ring" />
                  <div className="pulse-ring delayed" />
                  <div className="play-btn-circle" data-cursor="pointer">
                    {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: "4px" }} />}
                  </div>
                </div>
              </div>

              {/* Cinematic Scrubber & Controls Bar */}
              <div className="showreel-controls-wrapper">
                {/* Interactive Timeline Progress Bar */}
                <div className="timeline-scrubber-row">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="timeline-slider"
                    style={{
                      background: `linear-gradient(to right, #c2a4ff 0%, #a855f7 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                    }}
                    aria-label="Video scrubber"
                  />
                </div>

                {/* Control Buttons & Indicators */}
                <div className="showreel-controls">
                  <div className="controls-left">
                    <button
                      className="ctrl-btn"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      data-cursor="pointer"
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>

                    <div className="volume-control-box">
                      <button
                        className="ctrl-btn"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        data-cursor="pointer"
                      >
                        {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                        aria-label="Volume slider"
                      />
                    </div>

                    <div className="duration-counter">
                      <span>{formatTime(currentTime)}</span>
                      <span className="duration-separator">/</span>
                      <span className="duration-total">{formatTime(duration)}</span>
                    </div>

                    <div className="equalizer-bars">
                      <span className={`bar ${isPlaying && !isMuted ? "animating" : ""}`} />
                      <span className={`bar ${isPlaying && !isMuted ? "animating" : ""}`} />
                      <span className={`bar ${isPlaying && !isMuted ? "animating" : ""}`} />
                      <span className={`bar ${isPlaying && !isMuted ? "animating" : ""}`} />
                    </div>
                  </div>

                  <div className="controls-center">
                    <span className="live-badge">SHOWREEL 2026</span>
                    <span className="timecode-text">4K DCI • 24 FPS • CINEMATIC GRADE</span>
                  </div>

                  <div className="controls-right">
                    <button
                      className="ctrl-btn"
                      onClick={handleFullscreen}
                      aria-label="Toggle Fullscreen"
                      data-cursor="pointer"
                    >
                      <FaExpand />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="showreel-footer-note">
          <p>
            * Official Showreel of Siddharth Girase. You can update or replace this video anytime directly from your computer via the SG Portfolio Manager.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Showreel;
