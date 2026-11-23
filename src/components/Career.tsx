import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          MY JOURNEY <span>&</span>
          <br /> MILESTONES
        </h2>
        <div className="career-info">
          {/* Vertical continuous glowing timeline */}
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>

          {/* MILESTONE 01 — 2024 */}
          <div className="career-info-box">
            <div className="career-timeline-point" aria-hidden="true"></div>
            <div className="career-info-in">
              <div className="career-role">
                <h4>VIDEO EDITING JOURNEY BEGINS</h4>
                <h5>The Beginning</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Started my journey in video editing, exploring creative cuts, transitions, music synchronization and the fundamentals of visual storytelling.
            </p>
          </div>

          {/* MILESTONE 02 — 2025 */}
          <div className="career-info-box">
            <div className="career-timeline-point" aria-hidden="true"></div>
            <div className="career-info-in">
              <div className="career-role">
                <h4>CREATIVE SKILLS & GROWTH</h4>
                <h5>Learning & Improving</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>
              Focused on improving editing techniques, experimenting with creative effects, sound design, color grading and engaging short-form content.
            </p>
          </div>

          {/* MILESTONE 03 — 2026 */}
          <div className="career-info-box current-milestone">
            <div className="career-timeline-point current" aria-hidden="true"></div>
            <div className="career-info-in">
              <div className="career-role">
                <h4>GROWING AS A VIDEO EDITOR</h4>
                <h5>
                  Present <span className="career-present-pill">PRESENT</span>
                </h5>
              </div>
              <h3 className="career-year-current">2026</h3>
            </div>
            <p>
              Continuing to create engaging visual stories, refine my editing style and take on new creative challenges through video editing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
