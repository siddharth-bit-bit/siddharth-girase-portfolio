import { useState, useEffect } from "react";
import { FaPlay, FaFilm, FaPlus, FaFilter } from "react-icons/fa";
import { VideoCategory, VideoProject, VideoAspectRatio, CATEGORIES } from "../data/videoData";
import { getAllProjects, updateProject } from "../data/videoStorage";
import VideoModal from "./VideoModal";
import "./styles/Work.css";

interface WorkProps {
  onOpenAdmin?: () => void;
  refreshTrigger?: number;
}

const Work = ({ onOpenAdmin, refreshTrigger = 0 }: WorkProps) => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>("ALL WORK");
  const [activeModalProject, setActiveModalProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    loadAllProjects();
  }, [refreshTrigger]);

  const loadAllProjects = async () => {
    setIsLoading(true);
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (err) {
      console.warn("Could not load projects from shared database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-detect aspect ratio for existing projects from thumbnail image dimensions if not already set
  const handleThumbnailLoaded = (
    e: React.SyntheticEvent<HTMLImageElement>,
    projectId: string
  ) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const r = img.naturalWidth / img.naturalHeight;
      let detected: VideoAspectRatio = "16:9";
      if (r < 0.8) {
        detected = "9:16";
      } else if (r >= 0.8 && r <= 1.2) {
        detected = "1:1";
      }

      const existing = projects.find((p) => p.id === projectId);
      if (existing && !existing.aspectRatio) {
        updateProject(projectId, { aspectRatio: detected });
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, aspectRatio: detected } : p))
        );
      }
    }
  };

  const filteredProjects =
    selectedCategory === "ALL WORK"
      ? projects
      : projects.filter((p) => p.category === selectedCategory);

  return (
    <div className="work-section" id="work">
      <div className="work-container">
        {/* Section Header */}
        <div className="work-header">
          <div className="work-tag">
            <FaFilm /> PORTFOLIO SHOWCASE
          </div>
          <h2 className="work-main-title">
            SELECTED <span>WORKS</span>
          </h2>
          <p className="work-subtitle">
            Explore a curated selection of commercial films, viral vertical reels, and cinematic storytelling.
          </p>

          {/* Category Filter Pills */}
          <div className="category-filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
                data-cursor="pointer"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="work-stats-badge">
            {isLoading ? (
              <>
                <span className="work-loading-pulse" /> Loading Projects from Shared Database...
              </>
            ) : (
              <>
                <FaFilter className="filter-icon" /> Showing {filteredProjects.length} Projects
              </>
            )}
          </div>
        </div>

        {/* Video Cards Grid */}
        <div className="video-cards-grid">
          {isLoading && (
            <>
              {[1, 2, 3].map((n) => (
                <div key={`skeleton-${n}`} className="video-project-card card-skeleton">
                  <div className="card-media-wrapper skeleton-media">
                    <div className="skeleton-shimmer" />
                  </div>
                  <div className="card-info-content">
                    <div className="skeleton-line title" />
                    <div className="skeleton-line desc" />
                  </div>
                </div>
              ))}
            </>
          )}

          {!isLoading && filteredProjects.map((project) => {
            const ratio: VideoAspectRatio =
              project.aspectRatio || (project.category === "REELS" ? "9:16" : "16:9");
            const isPortrait = ratio === "9:16";
            const isSquare = ratio === "1:1";
            const ratioClass = isPortrait
              ? "card-portrait"
              : isSquare
              ? "card-square"
              : "card-landscape";

            return (
              <div
                key={project.id}
                className={`video-project-card ${ratioClass}`}
                onClick={() => setActiveModalProject(project)}
                data-cursor="pointer"
              >
                <div className="card-media-wrapper">
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    loading="lazy"
                    className="card-thumbnail"
                    onLoad={(e) => handleThumbnailLoaded(e, project.id)}
                    onError={(e) => {
                      // Prevent black boxes by falling back to high-res cinematic backdrop if source file is missing
                      const target = e.currentTarget;
                      if (!target.src.includes("unsplash")) {
                        target.src =
                          "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80";
                      }
                    }}
                  />
                  <div className="card-overlay-gradient" />

                  {/* Play Button */}
                  <div className="card-play-btn-circle">
                    <FaPlay style={{ marginLeft: "3px" }} />
                  </div>

                  {/* Badges */}
                  <div className="card-top-badges">
                    <span className="card-category-badge">{project.category}</span>
                    <div className="card-right-badges">
                      <span className="card-ratio-badge">{ratio}</span>
                      {project.duration && (
                        <span className="card-duration-badge">{project.duration}</span>
                      )}
                    </div>
                  </div>

                  {project.isCustom && (
                    <span className="card-custom-marker">NEW</span>
                  )}
                </div>

                <div className="card-info-content">
                  <h3 className="card-title">{project.title}</h3>
                  <p className="card-desc">{project.description}</p>
                  <div className="card-footer-meta">
                    <span className="card-ratio-tag">
                      {isPortrait
                        ? "9:16 Vertical Reel"
                        : isSquare
                        ? "1:1 Square Format"
                        : "16:9 4K Cinema"}
                    </span>
                    <span className="card-watch-now">Watch Project →</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Project Card for Siddharth */}
          {onOpenAdmin && (
            <div
              className="video-project-card add-project-card"
              onClick={onOpenAdmin}
              data-cursor="pointer"
              title="Upload new video to portfolio"
            >
              <div className="add-card-content">
                <div className="add-icon-circle">
                  <FaPlus />
                </div>
                <h3>Add New Video Project</h3>
                <p>Upload directly from your computer with thumbnails and descriptions.</p>
                <span className="add-action-pill">Open Video Manager</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Video Player Modal */}
      <VideoModal
        project={activeModalProject}
        onClose={() => setActiveModalProject(null)}
      />
    </div>
  );
};

export default Work;
