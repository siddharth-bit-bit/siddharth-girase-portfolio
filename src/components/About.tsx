import { FaMapMarkerAlt, FaVideo, FaUserCheck, FaFilm, FaCut, FaVolumeUp } from "react-icons/fa";
import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      {/* 3D Cinema Camera Showcase Stage (Receives the traveling 3D Camera from Hero) */}
      <div className="about-visual-col">
        <div className="about-camera-showcase">
          <div className="about-camera-studio-glow" />
          <div className="about-camera-floor-shadow" />
        </div>
      </div>

      <div className="about-me">
        <h3 className="title">BEHIND THE FRAMES.</h3>
        <p className="para">
          I'm Siddharth Girase, a creative video editor from Navsari, Gujarat.
          I believe every video has a story worth telling. Through creative
          editing, cinematic visuals, transitions, sound design, and storytelling,
          I aim to transform ordinary footage into engaging visual experiences.
        </p>

        {/* Quick Credentials */}
        <div className="about-details-grid">
          <div className="about-detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">
              <FaUserCheck className="detail-icon" /> Siddharth Girase
            </span>
          </div>
          <div className="about-detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">
              <FaMapMarkerAlt className="detail-icon" /> Navsari, Gujarat, India
            </span>
          </div>
          <div className="about-detail-item">
            <span className="detail-label">Profession</span>
            <span className="detail-value">
              <FaVideo className="detail-icon" /> Video Editor & Storyteller
            </span>
          </div>
          <div className="about-detail-item">
            <span className="detail-label">Brand Vision</span>
            <span className="detail-value">
              <FaFilm className="detail-icon" /> Turning Moments Into Stories
            </span>
          </div>
        </div>

        {/* Animated Video Editing Timeline Visual */}
        <div className="editor-timeline-visual">
          <div className="timeline-header">
            <div className="timeline-timecode">
              <span className="rec-dot" />
              <span>00:01:24:18</span>
            </div>
            <div className="timeline-tools">
              <span className="tool-icon active"><FaCut /> Razor</span>
              <span className="tool-icon"><FaFilm /> B-Roll</span>
              <span className="tool-icon"><FaVolumeUp /> 48kHz</span>
            </div>
          </div>

          <div className="timeline-tracks">
            {/* Playhead */}
            <div className="timeline-playhead">
              <div className="playhead-marker" />
              <div className="playhead-line" />
            </div>

            {/* Video Track 2 */}
            <div className="track-row">
              <span className="track-label">V2</span>
              <div className="clip-block clip-fx" style={{ width: "24%", left: "10%" }}>
                <span>B-Roll Cut</span>
              </div>
              <div className="clip-block clip-fx" style={{ width: "32%", left: "48%" }}>
                <span>Light Leak Overlay</span>
              </div>
            </div>

            {/* Video Track 1 */}
            <div className="track-row">
              <span className="track-label">V1</span>
              <div className="clip-block clip-main" style={{ width: "38%", left: "0%" }}>
                <span>A-Roll 4K DCI</span>
              </div>
              <div className="clip-block clip-main" style={{ width: "36%", left: "40%" }}>
                <span>Cinematic Grade</span>
              </div>
              <div className="clip-block clip-main" style={{ width: "22%", left: "78%" }}>
                <span>Outro Hook</span>
              </div>
            </div>

            {/* Audio Track 1 */}
            <div className="track-row">
              <span className="track-label">A1</span>
              <div className="clip-block clip-audio" style={{ width: "52%", left: "0%" }}>
                <span className="wave-icon"> ılılıllı Dialogue / VO</span>
              </div>
              <div className="clip-block clip-audio" style={{ width: "44%", left: "54%" }}>
                <span className="wave-icon"> ılılıllı Foley & SFX</span>
              </div>
            </div>

            {/* Audio Track 2 */}
            <div className="track-row">
              <span className="track-label">A2</span>
              <div className="clip-block clip-music" style={{ width: "95%", left: "0%" }}>
                <span className="wave-icon"> llılılıllılılı Cinematic Film Score (Synced)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="about-stats-row">
          <div className="stat-card">
            <h4>100+</h4>
            <p>Videos Edited</p>
          </div>
          <div className="stat-card">
            <h4>50M+</h4>
            <p>Organic Views</p>
          </div>
          <div className="stat-card">
            <h4>4K DCI</h4>
            <p>Master Quality</p>
          </div>
          <div className="stat-card">
            <h4>100%</h4>
            <p>Story Driven</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
