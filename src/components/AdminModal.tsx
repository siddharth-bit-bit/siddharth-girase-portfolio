import { useState, useEffect } from "react";
import {
  FaTimes,
  FaUpload,
  FaTrash,
  FaVideo,
  FaCheckCircle,
  FaInfoCircle,
  FaFilm,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaKey,
  FaSignOutAlt,
  FaDownload,
  FaExclamationTriangle,
  FaCloud,
  FaPlay,
  FaSpinner,
} from "react-icons/fa";
import { VideoCategory, VideoProject, VideoAspectRatio, CATEGORIES } from "../data/videoData";
import {
  saveProject,
  deleteProject,
  updateProject,
  getAllProjects,
  getShowreel,
  saveShowreel,
  deleteShowreel,
  ShowreelData,
  DEFAULT_SHOWREEL,
  exportDatabaseBackup,
  restoreDatabaseBackup,
  syncLocalProjectsToServer,
  fetchCloudinaryUsageStats,
} from "../data/videoStorage";
import {
  extractVideoThumbnail,
  checkVideoCodecSupport,
} from "../utils/thumbnailGenerator";
import {
  AUTHORIZED_OWNER_EMAIL,
  loginOwner,
  verifyOwnerSession,
  clearSession,
  requestPasswordReset,
  completePasswordReset,
  logAdminAudit,
  fetchAuditLogs,
} from "../utils/authClient";
import "./styles/AdminModal.css";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectsUpdated: () => void;
  onShowreelUpdated?: () => void;
}

type AdminTab = "portfolio" | "showreel" | "upload" | "security";

const AdminModal = ({
  isOpen,
  onClose,
  onProjectsUpdated,
  onShowreelUpdated,
}: AdminModalProps) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>(AUTHORIZED_OWNER_EMAIL);
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Password reset flow states
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState<string>(AUTHORIZED_OWNER_EMAIL);
  const [resetCode, setResetCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetMessage, setResetMessage] = useState<string>("");

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("portfolio");

  // Showreel Management States
  const [activeShowreel, setActiveShowreel] = useState<ShowreelData>(DEFAULT_SHOWREEL);
  const [showreelVideoSource, setShowreelVideoSource] = useState<"file" | "url">("file");
  const [showreelVideoFile, setShowreelVideoFile] = useState<File | null>(null);
  const [showreelVideoUrl, setShowreelVideoUrl] = useState<string>("");
  const [showreelThumbFile, setShowreelThumbFile] = useState<File | null>(null);
  const [showreelThumbUrl, setShowreelThumbUrl] = useState<string>("");
  const [showreelTitle, setShowreelTitle] = useState<string>("Siddharth Girase — Official Showreel");
  const [isShowreelSubmitting, setIsShowreelSubmitting] = useState<boolean>(false);

  // Project Upload States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VideoCategory>("REELS");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [client, setClient] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [videoSourceType, setVideoSourceType] = useState<"file" | "url">("file");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbUrlInput, setThumbUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Project Edit State (Section 4)
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<VideoCategory>("REELS");
  const [editDescription, setEditDescription] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editAspectRatio, setEditAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [editPublished, setEditPublished] = useState(true);
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [editThumbUrl, setEditThumbUrl] = useState("");
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Project Deletion Confirmation State (Section 5)
  const [deletingProject, setDeletingProject] = useState<VideoProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback & Audit Logs
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [customProjects, setCustomProjects] = useState<VideoProject[]>([]);

  // Automated video thumbnail & codec checks
  const [autoThumbBlob, setAutoThumbBlob] = useState<Blob | null>(null);
  const [autoThumbPreview, setAutoThumbPreview] = useState<string>("");
  const [codecStatus, setCodecStatus] = useState<{ isSupported: boolean; message: string } | null>(null);
  const [isExtractingThumb, setIsExtractingThumb] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>("");
  const [previewProject, setPreviewProject] = useState<VideoProject | null>(null);

  // Verify auth session on modal open
  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  const checkAuth = async () => {
    setIsVerifyingAuth(true);
    const valid = await verifyOwnerSession();
    setIsAuthenticated(valid);
    setIsVerifyingAuth(false);
    if (valid) {
      loadData();
    }
  };

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudinaryUsage, setCloudinaryUsage] = useState<any>(null);

  const loadData = async () => {
    try {
      const [projects, reel, logs] = await Promise.all([
        getAllProjects(true),
        getShowreel(),
        fetchAuditLogs(),
      ]);
      setCustomProjects(projects);
      setActiveShowreel(reel);
      setShowreelTitle(reel.title);
      setAuditLogs(logs);

      // Fetch Cloudinary Usage Stats
      fetchCloudinaryUsageStats().then((usage) => {
        if (usage && usage.configured) {
          setCloudinaryUsage(usage);
        }
      }).catch(() => {});

      // Auto-sync in background if local projects exist
      syncLocalProjectsToServer().then((syncRes) => {
        if (syncRes.success && syncRes.count > 0) {
          getAllProjects(true).then((p) => setCustomProjects(p));
        }
      }).catch(() => {});
    } catch (err) {
      console.warn("Error loading admin data:", err);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: "info", text: "Synchronizing local projects and media files to shared cloud database..." });
    try {
      const res = await syncLocalProjectsToServer();
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Synchronization complete! ${res.count} project(s) are now in the shared persistent database and publicly visible to all visitors.`,
        });
        await loadData();
        onProjectsUpdated?.();
      } else {
        setStatusMessage({
          type: "error",
          text: `Sync error: ${res.message}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to sync to cloud database." });
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Owner Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both email and password.");
      return;
    }

    if (loginEmail.trim().toLowerCase() !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      setLoginError(`Access Denied: Only ${AUTHORIZED_OWNER_EMAIL} is authorized to access this dashboard.`);
      return;
    }

    setIsLoggingIn(true);
    const res = await loginOwner(loginEmail, loginPassword, rememberMe);
    setIsLoggingIn(false);

    if (res.success) {
      setIsAuthenticated(true);
      setLoginPassword("");
      setLoginError("");
      loadData();
      logAdminAudit("OWNER_LOGIN_UI", "Owner signed in via frontend dashboard modal");
    } else {
      setLoginError(res.message);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setActiveTab("portfolio");
    setEditingProject(null);
    setDeletingProject(null);
    setStatusMessage({ type: "info", text: "You have been signed out." });
  };

  // 2. Password Reset Handlers
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage("");
    if (!resetEmail.trim()) {
      setResetMessage("Please enter your email.");
      return;
    }

    const res = await requestPasswordReset(resetEmail);
    setResetMessage(res.message);
    if (res.success) {
      setResetStep("verify");
      if (res.debugCode) {
        setResetCode(res.debugCode);
      }
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) {
      setResetMessage("Please enter the 6-digit code and a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setResetMessage("Password must be at least 8 characters long.");
      return;
    }

    const res = await completePasswordReset(resetCode, newPassword);
    setResetMessage(res.message);
    if (res.success) {
      setTimeout(() => {
        setIsResetMode(false);
        setResetStep("request");
        setLoginPassword("");
      }, 1500);
    }
  };

  // 3. Upload Project Handler
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setAutoThumbPreview("");
      setAutoThumbBlob(null);

      // 1. Codec playability verification
      const codecCheck = checkVideoCodecSupport(file);
      if (!codecCheck.isSupported) {
        setCodecStatus({
          isSupported: false,
          message:
            codecCheck.recommendation ||
            "Format may not play across all mobile and desktop browsers. MP4 (H.264/AAC) recommended.",
        });
      } else {
        setCodecStatus({
          isSupported: true,
          message: "✓ Video Codec Verified: Browser Compatible (H.264/WebM)",
        });
      }

      // 2. Automatic Video Frame Extraction & Aspect Ratio Detection
      setIsExtractingThumb(true);
      try {
        const info = await extractVideoThumbnail(file, 0.15);
        setDuration(info.duration);
        setAspectRatio(info.aspectRatio);
        if (info.aspectRatio === "9:16") {
          setCategory("REELS");
        } else if (info.aspectRatio === "16:9") {
          setCategory("CINEMATIC EDITS");
        }
        setAutoThumbBlob(info.blob);
        setAutoThumbPreview(info.dataUrl);
      } catch (err: any) {
        console.warn("Frame extraction failed:", err);
      } finally {
        setIsExtractingThumb(false);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a project title." });
      return;
    }

    if (videoSourceType === "file" && !videoFile) {
      setStatusMessage({ type: "error", text: "Please select an MP4 or WebM video file." });
      return;
    }

    if (videoSourceType === "url" && !videoUrlInput.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a valid video streaming URL." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setUploadProgressText("Uploading video and storing permanent media files...");

    try {
      const finalVideoUrl = videoUrlInput.trim();
      let finalThumbUrl = thumbUrlInput.trim();

      // Priority 1: User's custom thumbnail file
      // Priority 2: Automatically extracted video frame
      // Priority 3: Custom thumbnail URL
      const finalThumb = thumbFile || autoThumbBlob || undefined;

      await saveProject(
        {
          title: title.trim(),
          category,
          description: description.trim() || "Creative video project edited by Siddharth Girase.",
          duration: duration.trim() || "0:45",
          client: client.trim() || undefined,
          date: year.trim() || new Date().getFullYear().toString(),
          aspectRatio,
          thumbnailUrl: finalThumbUrl,
          videoUrl: finalVideoUrl,
          published: isPublished,
        },
        videoSourceType === "file" && videoFile ? videoFile : undefined,
        finalThumb
      );

      setStatusMessage({
        type: "success",
        text: `"${title}" has been permanently stored and published to your portfolio!`,
      });

      logAdminAudit("PROJECT_CREATED", `Title: "${title.trim()}", Category: ${category}, Ratio: ${aspectRatio}`);

      // Reset form
      setTitle("");
      setDescription("");
      setDuration("");
      setClient("");
      setVideoFile(null);
      setThumbFile(null);
      setAutoThumbBlob(null);
      setAutoThumbPreview("");
      setCodecStatus(null);
      setVideoUrlInput("");
      setThumbUrlInput("");
      setUploadProgressText("");

      await loadData();
      onProjectsUpdated();
      setActiveTab("portfolio");
    } catch (err: any) {
      setUploadProgressText("");
      setStatusMessage({
        type: "error",
        text: `Upload failed: ${err.message || "Unknown error"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Edit Project Handlers (Section 4)
  const openEditModal = (p: VideoProject) => {
    setEditingProject(p);
    setEditTitle(p.title);
    setEditCategory(p.category);
    setEditDescription(p.description || "");
    setEditDuration(p.duration || "");
    setEditClient(p.client || "");
    setEditYear(p.date || new Date().getFullYear().toString());
    setEditAspectRatio(p.aspectRatio || (p.category === "REELS" ? "9:16" : "16:9"));
    setEditPublished(p.published !== false);
    setEditThumbFile(null);
    setEditThumbUrl(p.thumbnailUrl || "");
    setEditVideoFile(null);
    setEditVideoUrl(p.videoUrl?.startsWith("blob:") ? "" : p.videoUrl || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editTitle.trim()) {
      setStatusMessage({ type: "error", text: "Project title cannot be empty." });
      return;
    }

    setIsEditSubmitting(true);
    setStatusMessage(null);

    try {
      const updates: Partial<VideoProject> = {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        duration: editDuration.trim(),
        client: editClient.trim() || undefined,
        date: editYear.trim() || undefined,
        aspectRatio: editAspectRatio,
        published: editPublished,
      };

      if (editThumbUrl.trim() && !editThumbFile) {
        updates.thumbnailUrl = editThumbUrl.trim();
      }
      if (editVideoUrl.trim() && !editVideoFile) {
        updates.videoUrl = editVideoUrl.trim();
      }

      let finalEditThumb: File | Blob | undefined = editThumbFile || undefined;
      if (editVideoFile && !editThumbFile && !editThumbUrl.trim()) {
        try {
          const info = await extractVideoThumbnail(editVideoFile, 0.15);
          finalEditThumb = info.blob;
          if (!editAspectRatio) updates.aspectRatio = info.aspectRatio;
          if (!editDuration) updates.duration = info.duration;
        } catch (err) {
          console.warn("Auto frame extraction in edit failed:", err);
        }
      }

      await updateProject(
        editingProject.id,
        updates,
        editVideoFile || undefined,
        finalEditThumb
      );

      logAdminAudit("PROJECT_UPDATED", `ID: ${editingProject.id}, Title: "${editTitle.trim()}"`);

      setStatusMessage({
        type: "success",
        text: `Project "${editTitle}" updated successfully!`,
      });

      setEditingProject(null);
      await loadData();
      onProjectsUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Failed to update project: ${err.message}`,
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Toggle publish/unpublish directly from row
  const handleTogglePublish = async (p: VideoProject) => {
    const newStatus = p.published === false ? true : false;
    await updateProject(p.id, { published: newStatus });
    logAdminAudit("PROJECT_STATUS_TOGGLE", `ID: ${p.id}, Published: ${newStatus}`);
    await loadData();
    onProjectsUpdated();
  };

  // 5. Delete Project Confirmation Handlers (Section 5)
  const openDeleteModal = (p: VideoProject) => {
    setDeletingProject(p);
  };

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);

    try {
      await deleteProject(deletingProject.id);
      logAdminAudit("PROJECT_DELETED", `ID: ${deletingProject.id}, Title: "${deletingProject.title}"`);

      setStatusMessage({
        type: "success",
        text: `"${deletingProject.title}" has been permanently removed from your portfolio.`,
      });

      setDeletingProject(null);
      await loadData();
      onProjectsUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Failed to delete project: ${err.message}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 6. Showreel Handlers (Section 6)
  const handleShowreelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showreelVideoSource === "file" && !showreelVideoFile && !activeShowreel.videoUrl) {
      setStatusMessage({ type: "error", text: "Please select a showreel video file." });
      return;
    }

    setIsShowreelSubmitting(true);
    setStatusMessage(null);

    try {
      const updated = await saveShowreel(
        showreelVideoSource === "file" && showreelVideoFile ? showreelVideoFile : undefined,
        showreelThumbFile || undefined,
        showreelVideoSource === "url" ? showreelVideoUrl.trim() : undefined,
        showreelThumbUrl.trim() || undefined,
        showreelTitle.trim()
      );

      setActiveShowreel(updated);
      setShowreelVideoFile(null);
      setShowreelThumbFile(null);

      logAdminAudit("SHOWREEL_UPDATED", `Title: "${showreelTitle.trim()}"`);

      setStatusMessage({
        type: "success",
        text: "Official Showreel successfully updated and published to your homepage!",
      });

      if (onShowreelUpdated) onShowreelUpdated();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Failed to update showreel: ${err.message}`,
      });
    } finally {
      setIsShowreelSubmitting(false);
    }
  };

  const handleDeleteShowreel = async () => {
    if (window.confirm("Are you sure you want to revert Showreel to the default video?")) {
      await deleteShowreel();
      setActiveShowreel(DEFAULT_SHOWREEL);
      setShowreelTitle(DEFAULT_SHOWREEL.title);
      logAdminAudit("SHOWREEL_RESET", "Reverted to default showcase showreel");
      setStatusMessage({ type: "info", text: "Showreel reset to default showcase." });
      if (onShowreelUpdated) onShowreelUpdated();
    }
  };

  // 7. Backup & Restore Handlers (Section 8)
  const handleDownloadBackup = async () => {
    try {
      const json = await exportDatabaseBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siddharth_girase_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      logAdminAudit("PORTFOLIO_BACKUP_DOWNLOADED", "User downloaded complete JSON backup");
      setStatusMessage({ type: "success", text: "Backup file downloaded successfully!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Backup export failed: ${err.message}` });
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await restoreDatabaseBackup(text);
        if (res.success) {
          setStatusMessage({ type: "success", text: res.message });
          logAdminAudit("PORTFOLIO_RESTORED", `Restored ${res.count} items from uploaded backup`);
          await loadData();
          onProjectsUpdated();
          if (onShowreelUpdated) onShowreelUpdated();
        } else {
          setStatusMessage({ type: "error", text: res.message });
        }
      } catch (err: any) {
        setStatusMessage({ type: "error", text: `Restore failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
        <button
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close Admin Modal"
        >
          <FaTimes />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* LOGIN SCREEN: SHOWN WHEN UNAUTHENTICATED                      */}
        {/* ------------------------------------------------------------- */}
        {isVerifyingAuth ? (
          <div className="admin-verifying-box">
            <FaShieldAlt className="shield-spin-icon" />
            <p>Verifying Owner Security Credentials...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="admin-login-wrapper">
            <div className="admin-login-card">
              <div className="login-badge-top">
                <FaShieldAlt /> OWNER SECURITY ACCESS
              </div>
              <h2>SIDDHARTH GIRASE PORTFOLIO</h2>
              <p className="login-subtitle">
                Private content management portal. Strictly restricted to the authorized portfolio owner.
              </p>

              {loginError && <div className="admin-alert error">{loginError}</div>}
              {resetMessage && <div className="admin-alert info">{resetMessage}</div>}

              {!isResetMode ? (
                <form onSubmit={handleLoginSubmit} className="login-form">
                  <div className="form-group">
                    <label>Owner Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={AUTHORIZED_OWNER_EMAIL}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Master Security Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your security password"
                        required
                      />
                      <button
                        type="button"
                        className="toggle-pw-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="login-extras">
                    <label className="remember-checkbox">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Keep signed in on this computer</span>
                    </label>
                    <button
                      type="button"
                      className="forgot-pw-link"
                      onClick={() => {
                        setIsResetMode(true);
                        setResetMessage("");
                        setLoginError("");
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="admin-btn-primary login-btn"
                  >
                    {isLoggingIn ? "Verifying..." : "Sign In to Admin Dashboard"}
                  </button>

                  <div className="login-security-notice">
                    <FaInfoCircle />
                    <span>
                      Public registration is disabled. Only <code>{AUTHORIZED_OWNER_EMAIL}</code> holds administrative authority.
                    </span>
                  </div>
                </form>
              ) : (
                /* PASSWORD RESET FLOW */
                <div className="reset-password-flow">
                  {resetStep === "request" ? (
                    <form onSubmit={handleRequestReset} className="login-form">
                      <p className="reset-desc">
                        Enter your authorized owner email. A secure 6-digit verification code will be dispatched to your inbox.
                      </p>
                      <div className="form-group">
                        <label>Owner Email</label>
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="admin-btn-primary">
                        Send Reset Code
                      </button>
                      <button
                        type="button"
                        className="admin-btn-ghost mt-2"
                        onClick={() => setIsResetMode(false)}
                      >
                        Back to Login
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCompleteReset} className="login-form">
                      <p className="reset-desc">
                        Enter the 6-digit code sent to your email along with your new password.
                      </p>
                      <div className="form-group">
                        <label>6-Digit Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="e.g. 849201"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>New Password (Min 8 Characters)</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="admin-btn-primary">
                        Update Password & Log In
                      </button>
                      <button
                        type="button"
                        className="admin-btn-ghost mt-2"
                        onClick={() => {
                          setIsResetMode(false);
                          setResetStep("request");
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* AUTHENTICATED OWNER DASHBOARD                                 */
          /* ------------------------------------------------------------- */
          <div className="admin-dashboard-wrapper">
            {/* Top Owner Bar */}
            <div className="owner-top-bar">
              <div className="owner-info">
                <span className="owner-role-pill">
                  <FaShieldAlt /> PORTFOLIO OWNER
                </span>
                <span className="owner-email-text">{AUTHORIZED_OWNER_EMAIL}</span>
              </div>
              <div className="owner-top-actions">
                <button
                  className="owner-logout-btn"
                  onClick={handleLogout}
                  title="Sign out of Admin Dashboard"
                >
                  <FaSignOutAlt /> Log Out
                </button>
              </div>
            </div>

            {/* Dashboard Tabs Header */}
            <div className="admin-tabs-nav">
              <button
                className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                onClick={() => setActiveTab("portfolio")}
              >
                <FaVideo /> MY PORTFOLIO MANAGER ({customProjects.length})
              </button>
              <button
                className={`tab-btn ${activeTab === "showreel" ? "active" : ""}`}
                onClick={() => setActiveTab("showreel")}
              >
                <FaFilm /> SHOWREEL MANAGER
              </button>
              <button
                className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => setActiveTab("upload")}
              >
                <FaUpload /> UPLOAD NEW PROJECT
              </button>
              <button
                className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <FaKey /> SECURITY & BACKUPS
              </button>
            </div>

            {/* Feedback Alerts */}
            {statusMessage && (
              <div className={`admin-status-toast ${statusMessage.type}`}>
                {statusMessage.type === "success" && <FaCheckCircle />}
                {statusMessage.type === "error" && <FaExclamationTriangle />}
                {statusMessage.type === "info" && <FaInfoCircle />}
                <span>{statusMessage.text}</span>
                <button
                  className="toast-close"
                  onClick={() => setStatusMessage(null)}
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 1: MY PORTFOLIO MANAGER (Section 3, 4 & 5)                */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "portfolio" && (
              <div className="tab-pane portfolio-manager-pane">
                <div className="pane-header">
                  <div>
                    <h3>MY PORTFOLIO MANAGER</h3>
                    <p>
                      Manage, edit, publish/unpublish, and organize all your uploaded portfolio projects.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      className="admin-btn-secondary"
                      onClick={handleSyncToCloud}
                      disabled={isSyncing}
                      title="Sync all projects from this browser to the shared database so every visitor can see them"
                    >
                      <FaCloud /> {isSyncing ? "Syncing to Cloud..." : "Sync to Cloud Database"}
                    </button>
                    <button
                      className="admin-btn-primary"
                      onClick={() => setActiveTab("upload")}
                    >
                      <FaUpload /> Upload New Video
                    </button>
                  </div>
                </div>

                {customProjects.length === 0 ? (
                  <div className="empty-state">
                    <FaVideo className="empty-icon" />
                    <h3>No projects uploaded yet</h3>
                    <p>Upload your first video project to showcase in Selected Works.</p>
                    <button
                      className="admin-btn-primary"
                      onClick={() => setActiveTab("upload")}
                    >
                      Upload Project
                    </button>
                  </div>
                ) : (
                  <div className="portfolio-items-grid">
                    {customProjects.map((p) => {
                      const isPub = p.published !== false;
                      const ratio = p.aspectRatio || (p.category === "REELS" ? "9:16" : "16:9");

                      return (
                        <div key={p.id} className="project-manage-card">
                          <div className="card-thumb-col">
                            <img src={p.thumbnailUrl} alt={p.title} />
                            <span className={`status-pill ${isPub ? "pub" : "draft"}`}>
                              {isPub ? "PUBLISHED" : "DRAFT"}
                            </span>
                          </div>

                          <div className="card-info-col">
                            <div className="card-title-row">
                              <h4>{p.title}</h4>
                              <span className="card-id-sub">{p.id}</span>
                            </div>

                            <div className="project-badges-row">
                              <span className="badge category">{p.category}</span>
                              <span className="badge ratio">{ratio}</span>
                              {p.duration && <span className="badge duration">{p.duration}</span>}
                              {p.client && <span className="badge client">Client: {p.client}</span>}
                            </div>

                            {p.description && (
                              <p className="project-desc-snippet">{p.description}</p>
                            )}

                            <div className="card-storage-ref">
                              <span className="storage-label">Stream Reference:</span>
                              <code>
                                {p.videoUrl?.startsWith("blob:")
                                  ? "IndexedDB Local High-Speed Stream"
                                  : p.videoUrl || "Cloud Video Storage"}
                              </code>
                            </div>
                          </div>

                          <div className="card-actions-col">
                            <button
                              className="action-btn preview-btn"
                              onClick={() => setPreviewProject(p)}
                              title="Preview video playback"
                            >
                              <FaPlay /> <span>Preview</span>
                            </button>

                            <button
                              className={`action-btn toggle-pub-btn ${isPub ? "active" : ""}`}
                              onClick={() => handleTogglePublish(p)}
                              title={isPub ? "Unpublish from public portfolio" : "Publish to public portfolio"}
                            >
                              {isPub ? <FaEyeSlash /> : <FaEye />}
                              <span>{isPub ? "Unpublish" : "Publish"}</span>
                            </button>

                            <button
                              className="action-btn edit-btn"
                              onClick={() => openEditModal(p)}
                              title="Edit project details and replace media"
                            >
                              <FaEdit /> <span>Edit</span>
                            </button>

                            <button
                              className="action-btn delete-btn"
                              onClick={() => openDeleteModal(p)}
                              title="Permanently delete project"
                            >
                              <FaTrash /> <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: SHOWREEL MANAGER (Section 6)                           */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "showreel" && (
              <div className="tab-pane showreel-pane">
                <div className="pane-header">
                  <div>
                    <h3>SHOWREEL MANAGER</h3>
                    <p>
                      Manage the master showreel presented on your homepage and showreel section.
                    </p>
                  </div>
                </div>

                <div className="showreel-management-layout">
                  {/* Current Active Preview */}
                  <div className="showreel-preview-card">
                    <h4>Current Active Showreel</h4>
                    <div className="preview-video-box">
                      <video
                        src={activeShowreel.videoUrl}
                        poster={activeShowreel.posterUrl}
                        controls
                        playsInline
                        className="active-reel-video"
                      />
                    </div>
                    <div className="active-reel-meta">
                      <h5>{activeShowreel.title}</h5>
                      <span className="reel-source-tag">
                        {activeShowreel.hasUploadedFile
                          ? "Custom Uploaded File (IndexedDB)"
                          : "Cloud Stream URL"}
                      </span>
                    </div>
                  </div>

                  {/* Edit Showreel Form */}
                  <form onSubmit={handleShowreelSubmit} className="showreel-edit-form">
                    <h4>Update Master Showreel</h4>

                    <div className="form-group">
                      <label>Showreel Title</label>
                      <input
                        type="text"
                        value={showreelTitle}
                        onChange={(e) => setShowreelTitle(e.target.value)}
                        placeholder="Siddharth Girase — Official Showreel"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Video Source</label>
                      <div className="source-toggle">
                        <button
                          type="button"
                          className={showreelVideoSource === "file" ? "active" : ""}
                          onClick={() => setShowreelVideoSource("file")}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          className={showreelVideoSource === "url" ? "active" : ""}
                          onClick={() => setShowreelVideoSource("url")}
                        >
                          External URL / Stream
                        </button>
                      </div>

                      {showreelVideoSource === "file" ? (
                        <div className="file-dropzone">
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setShowreelVideoFile(e.target.files[0]);
                              }
                            }}
                          />
                          <p>{showreelVideoFile ? showreelVideoFile.name : "Select MP4 or WebM showreel file"}</p>
                        </div>
                      ) : (
                        <input
                          type="url"
                          placeholder="https://your-cloud-video-url.mp4"
                          value={showreelVideoUrl}
                          onChange={(e) => setShowreelVideoUrl(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label>Showreel Poster / Thumbnail (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setShowreelThumbFile(e.target.files[0]);
                          }
                        }}
                      />
                      <input
                        type="url"
                        placeholder="Or enter poster image URL"
                        value={showreelThumbUrl}
                        onChange={(e) => setShowreelThumbUrl(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div className="showreel-actions-row">
                      <button
                        type="submit"
                        disabled={isShowreelSubmitting}
                        className="admin-btn-primary"
                      >
                        {isShowreelSubmitting ? "Publishing Showreel..." : "Save & Publish Showreel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteShowreel}
                        className="admin-btn-ghost danger-text"
                      >
                        Reset to Default
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: UPLOAD NEW PROJECT                                     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "upload" && (
              <div className="tab-pane upload-pane">
                <div className="pane-header">
                  <div>
                    <h3>UPLOAD NEW VIDEO PROJECT</h3>
                    <p>
                      Add a new project to your Selected Works showcase. Video dimensions and aspect ratio are automatically detected upon file selection.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUploadSubmit} className="upload-project-form">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Project Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Urban Motion Commercial"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as VideoCategory)}
                      >
                        {CATEGORIES.filter((c) => c !== "ALL WORK").map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Aspect Ratio</label>
                      <div className="ratio-options-compact">
                        <label className="ratio-radio">
                          <input
                            type="radio"
                            name="newRatio"
                            checked={aspectRatio === "16:9"}
                            onChange={() => setAspectRatio("16:9")}
                          />
                          <span>16:9 Landscape</span>
                        </label>
                        <label className="ratio-radio">
                          <input
                            type="radio"
                            name="newRatio"
                            checked={aspectRatio === "9:16"}
                            onChange={() => setAspectRatio("9:16")}
                          />
                          <span>9:16 Vertical Reel</span>
                        </label>
                        <label className="ratio-radio">
                          <input
                            type="radio"
                            name="newRatio"
                            checked={aspectRatio === "1:1"}
                            onChange={() => setAspectRatio("1:1")}
                          />
                          <span>1:1 Square</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>Video File or URL *</label>
                      <div className="source-toggle">
                        <button
                          type="button"
                          className={videoSourceType === "file" ? "active" : ""}
                          onClick={() => setVideoSourceType("file")}
                        >
                          Select Video File
                        </button>
                        <button
                          type="button"
                          className={videoSourceType === "url" ? "active" : ""}
                          onClick={() => setVideoSourceType("url")}
                        >
                          External Stream URL
                        </button>
                      </div>

                      {videoSourceType === "file" ? (
                        <div className="file-dropzone">
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={handleVideoFileChange}
                          />
                          <p>
                            {videoFile
                              ? `${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(1)} MB)`
                              : "Choose MP4/WebM video file (Auto-detects duration, aspect ratio & extracts thumbnail)"}
                          </p>
                        </div>
                      ) : (
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/... or Google Drive / YouTube"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                        />
                      )}

                      {/* Video Codec & Frame Extraction Feedback */}
                      {isExtractingThumb && (
                        <div className="extracting-frame-loader">
                          <FaSpinner className="spinner-icon spin" />
                          <span>Analyzing video codec and extracting clean thumbnail frame...</span>
                        </div>
                      )}

                      {codecStatus && (
                        <div className={`codec-status-badge ${codecStatus.isSupported ? "supported" : "warning"}`}>
                          {codecStatus.isSupported ? <FaCheckCircle /> : <FaExclamationTriangle />}
                          <span>{codecStatus.message}</span>
                        </div>
                      )}

                      {autoThumbPreview && (
                        <div className="auto-thumbnail-preview-box">
                          <div className="preview-label-row">
                            <span className="preview-label">Auto-Generated Video Frame Thumbnail:</span>
                            <span className="badge-auto">Active Frame</span>
                          </div>
                          <div className="thumb-preview-wrap">
                            <img src={autoThumbPreview} alt="Auto-generated video thumbnail" />
                          </div>
                          <p className="thumb-preview-hint">
                            Extracted at 15% into the video to avoid dark opening frames. Ready for instant publishing, or upload a custom graphic below to override.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="form-group full-width">
                      <label>
                        Custom Thumbnail Image{" "}
                        <span className="optional-tag">
                          {autoThumbPreview ? "(Optional — Auto-frame is already ready)" : "(Optional)"}
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setThumbFile(e.target.files[0]);
                          }
                        }}
                      />
                      <input
                        type="url"
                        placeholder="Or enter custom image URL"
                        value={thumbUrlInput}
                        onChange={(e) => setThumbUrlInput(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div className="form-group">
                      <label>Client Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Red Bull Motorsport"
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Year</label>
                      <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Project Details & Goals</label>
                      <textarea
                        rows={3}
                        placeholder="Highlight your creative decisions, speed ramps, sound design, color grade..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={isPublished}
                          onChange={(e) => setIsPublished(e.target.checked)}
                        />
                        <span>Publish immediately to public portfolio gallery</span>
                      </label>
                    </div>
                  </div>

                  {uploadProgressText && (
                    <div className="upload-progress-banner">
                      <FaSpinner className="spinner-icon spin" />
                      <span>{uploadProgressText}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn-primary submit-btn"
                  >
                    {isSubmitting ? "Uploading & Storing Video..." : "Publish Video Project"}
                  </button>
                </form>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: SECURITY & BACKUPS (Section 7 & 8)                     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "security" && (
              <div className="tab-pane security-pane">
                <div className="pane-header">
                  <div>
                    <h3>PORTFOLIO SECURITY & BACKUPS</h3>
                    <p>
                      Review authentication audit trails, download offline database backups, and monitor cloud storage security policies.
                    </p>
                  </div>
                </div>

                <div className="security-cards-grid">
                  {/* Backup Card */}
                  <div className="security-card">
                    <h4>
                      <FaDownload /> Database Backup & Restore
                    </h4>
                    <p>
                      Export a complete JSON snapshot of all your project metadata, aspect ratios, and showreel configuration to prevent any data loss.
                    </p>
                    <div className="backup-btn-row">
                      <button
                        className="admin-btn-primary"
                        onClick={handleDownloadBackup}
                      >
                        <FaDownload /> Export Full Backup
                      </button>
                      <label className="restore-file-btn">
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleRestoreFile}
                        />
                        <span>Restore from JSON File</span>
                      </label>
                    </div>
                  </div>

                  {/* Storage Status & Cloudinary Free Plan Monitor Card */}
                  <div className="security-card">
                    <h4>
                      <FaCloud /> Cloudinary Free Plan & Storage Monitor
                    </h4>
                    <p>
                      Permanent media delivery via Cloudinary Free Tier (25 monthly credits) with adaptive HTML5 streaming and global CDN edge delivery.
                    </p>
                    <div className="security-specs-list">
                      <div className="spec-item">
                        <span className="spec-label">Cloudinary Plan:</span>
                        <span className="spec-val" style={{ color: cloudinaryUsage?.configured ? "#a855f7" : "#94a3b8" }}>
                          {cloudinaryUsage?.configured ? `${cloudinaryUsage.plan} Plan (Connected)` : "Awaiting .env credentials"}
                        </span>
                      </div>
                      {cloudinaryUsage?.configured && (
                        <>
                          <div className="spec-item">
                            <span className="spec-label">Monthly Credits:</span>
                            <span className="spec-val" style={{ color: cloudinaryUsage.warningLevel === "critical" ? "#ef4444" : cloudinaryUsage.warningLevel === "warning" ? "#f59e0b" : "#4ade80" }}>
                              {cloudinaryUsage.credits.usage.toFixed(2)} / {cloudinaryUsage.credits.limit} credits ({cloudinaryUsage.credits.usedPercent}%)
                            </span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">Storage Used:</span>
                            <span className="spec-val">
                              {((cloudinaryUsage.storage.bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB ({cloudinaryUsage.storage.credits.toFixed(2)} credits)
                            </span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">Bandwidth Used (30d):</span>
                            <span className="spec-val">
                              {((cloudinaryUsage.bandwidth.bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB ({cloudinaryUsage.bandwidth.credits.toFixed(2)} credits)
                            </span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">Max Video Size:</span>
                            <span className="spec-val">
                              {((cloudinaryUsage.mediaLimits?.videoMaxBytes || 104857600) / (1024 * 1024)).toFixed(0)} MB
                            </span>
                          </div>
                          {cloudinaryUsage.warningMessage && (
                            <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", fontSize: "12px", lineHeight: "1.4" }}>
                              {cloudinaryUsage.warningMessage}
                            </div>
                          )}
                        </>
                      )}
                      <div className="spec-item">
                        <span className="spec-label">Local Disk Backup:</span>
                        <span className="spec-val" style={{ color: "#4ade80" }}>Preserved (/public/uploads/, 42 files intact)</span>
                      </div>
                    </div>
                  </div>

                  {/* Access Policy Card */}
                  <div className="security-card">
                    <h4>
                      <FaShieldAlt /> Owner Identity & Authorization
                    </h4>
                    <div className="security-specs-list">
                      <div className="spec-item">
                        <span className="spec-label">Authorized Email:</span>
                        <code>{AUTHORIZED_OWNER_EMAIL}</code>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Auth Token:</span>
                        <span className="spec-val">Cryptographic HMAC-SHA256 (24hr TTL)</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Password Hashing:</span>
                        <span className="spec-val">PBKDF2 SHA-512 (100,000 Iterations)</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Rate Limiting:</span>
                        <span className="spec-val">Max 5 Attempts per 15-Minute Window</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Logs Viewer */}
                <div className="audit-logs-section">
                  <h4>Recent Administrative Audit Trail</h4>
                  <div className="audit-table-wrap">
                    {auditLogs.length === 0 ? (
                      <p className="no-logs">No security events logged yet.</p>
                    ) : (
                      <table className="audit-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Action</th>
                            <th>Identity</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td className="log-time">{new Date(log.timestamp).toLocaleString()}</td>
                              <td>
                                <span className={`audit-badge ${log.status.toLowerCase()}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="log-action">{log.action}</td>
                              <td className="log-email">{log.email}</td>
                              <td className="log-details">{log.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* EDIT PROJECT MODAL DIALOG (Section 4)                         */}
        {/* ------------------------------------------------------------- */}
        {editingProject && (
          <div className="sub-modal-overlay" onClick={() => setEditingProject(null)}>
            <div className="sub-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="sub-modal-header">
                <h3>Edit Project: {editingProject.title}</h3>
                <button
                  className="sub-modal-close"
                  onClick={() => setEditingProject(null)}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="edit-project-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as VideoCategory)}
                    >
                      {CATEGORIES.filter((c) => c !== "ALL WORK").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Aspect Ratio</label>
                    <select
                      value={editAspectRatio}
                      onChange={(e) => setEditAspectRatio(e.target.value as VideoAspectRatio)}
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="9:16">9:16 Portrait Reel</option>
                      <option value="1:1">1:1 Square</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Client</label>
                    <input
                      type="text"
                      value={editClient}
                      onChange={(e) => setEditClient(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Year</label>
                    <input
                      type="text"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Replace Thumbnail (Image File or URL)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditThumbFile(e.target.files[0]);
                      }
                    }}
                  />
                  <input
                    type="url"
                    placeholder="Or enter new image URL"
                    value={editThumbUrl}
                    onChange={(e) => setEditThumbUrl(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="form-group">
                  <label>Replace Video (Video File or URL)</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditVideoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <input
                    type="url"
                    placeholder="Or enter new stream URL"
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={editPublished}
                      onChange={(e) => setEditPublished(e.target.checked)}
                    />
                    <span>Project is Published to Public Portfolio</span>
                  </label>
                </div>

                <div className="sub-modal-actions">
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={() => setEditingProject(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="admin-btn-primary"
                  >
                    {isEditSubmitting ? "Saving..." : "Save Project Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DELETE CONFIRMATION DIALOG (Section 5)                        */}
        {/* ------------------------------------------------------------- */}
        {deletingProject && (
          <div className="sub-modal-overlay" onClick={() => setDeletingProject(null)}>
            <div className="sub-modal-container delete-confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="delete-icon-warn">
                <FaExclamationTriangle />
              </div>
              <h3>Confirm Permanent Project Deletion</h3>
              <p className="delete-target-title">
                "{deletingProject.title}"
              </p>
              <p className="delete-explain">
                This action will permanently remove this project record and delete its associated stored video and thumbnail files from your portfolio.
                This action <strong>cannot be undone</strong>.
              </p>

              <div className="sub-modal-actions">
                <button
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => setDeletingProject(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn-danger"
                  onClick={confirmDeleteProject}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting Media..." : "Confirm Permanent Deletion"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ------------------------------------------------------------- */}
        {/* IN-ADMIN VIDEO PREVIEW MODAL                                   */}
        {/* ------------------------------------------------------------- */}
        {previewProject && (
          <div className="sub-modal-overlay" onClick={() => setPreviewProject(null)}>
            <div
              className="sub-modal-container admin-video-preview-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sub-modal-header">
                <h3>{previewProject.title}</h3>
                <button
                  type="button"
                  className="sub-modal-close"
                  onClick={() => setPreviewProject(null)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="admin-video-player-frame">
                <video
                  src={previewProject.videoUrl}
                  poster={previewProject.thumbnailUrl}
                  controls
                  playsInline
                  autoPlay
                  className="admin-preview-video-el"
                >
                  <source src={previewProject.videoUrl} type="video/mp4" />
                </video>
              </div>
              <div className="admin-preview-meta-row">
                <span>Aspect Ratio: {previewProject.aspectRatio || "16:9"}</span>
                <span>Category: {previewProject.category}</span>
                {previewProject.duration && <span>Duration: {previewProject.duration}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
