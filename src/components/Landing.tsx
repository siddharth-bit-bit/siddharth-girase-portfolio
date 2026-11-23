import "./styles/Landing.css";

const Landing = () => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          {/* Top Intro (Left on Desktop, Stacked Top on Mobile) */}
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              SIDDHARTH
              <br />
              <span>GIRASE</span>
            </h1>
            <p className="landing-tagline">A creative mind behind every frame.</p>
          </div>

          {/* Responsive camera spacer so mobile headings don't crowd the 3D camera */}
          <div className="landing-camera-spacer" />

          {/* Professional Role (Right on Desktop, Stacked Below Camera on Mobile) */}
          <div className="landing-info">
            <h3>A Creative</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">VIDEO</div>
              <div className="landing-h2-2">STORY</div>
            </h2>
            <h2>
              <div className="landing-h2-info">EDITOR</div>
              <div className="landing-h2-info-1">TELLER</div>
            </h2>
            <div className="landing-purple-glow-accent" />
          </div>

          {/* Scroll to Explore Navigation Hint */}
          <div className="scroll-to-explore-wrap">
            <a href="#about" className="scroll-to-explore-link">
              <span>SCROLL TO EXPLORE</span>
              <div className="scroll-arrow-anim">↓</div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Landing;
