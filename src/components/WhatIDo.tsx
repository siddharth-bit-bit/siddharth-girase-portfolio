import {
  FaFilm,
  FaInstagram,
  FaYoutube,
  FaMagic,
  FaBullhorn,
  FaShareAlt,
  FaCut,
} from "react-icons/fa";
import "./styles/WhatIDo.css";

interface ServiceItem {
  id: string;
  cardNum: string;
  title: string;
  subtitle: string;
  icon: JSX.Element;
  description: string;
  tags: string[];
}

const services: ServiceItem[] = [
  {
    id: "serv-1",
    cardNum: "01",
    title: "Professional Video Editing",
    subtitle: "Rhythm, Narrative & Pacing",
    icon: <FaCut />,
    description:
      "Crafting seamless narrative flow from raw footage. Frame-perfect cut precision, scene structuring, transition dynamics, and emotional timing that captivates viewers.",
    tags: ["Rough Cuts", "Fine Editing", "Scene Pacing", "Story Structuring"],
  },
  {
    id: "serv-2",
    cardNum: "02",
    title: "Instagram Reels Editing",
    subtitle: "Short-form storytelling, transitions and engagement.",
    icon: <FaInstagram />,
    description:
      "High-energy short-form edits designed for maximum retention. Split-second hooks, kinetic dynamic captions, sound impact hits, and trending audio synchronization.",
    tags: ["9:16 Formats", "Retention Hooks", "Kinetic Subtitles", "Sound Sync"],
  },
  {
    id: "serv-3",
    cardNum: "03",
    title: "YouTube Video Editing",
    subtitle: "Long-form audience retention, B-roll and visual effects.",
    icon: <FaYoutube />,
    description:
      "Retention-engineered YouTube content. Dynamic zoom punches, pattern interrupts, B-roll overlays, visual effects, and sound design to keep watch time at its peak.",
    tags: ["Pattern Interrupts", "Zoom Punches", "B-Roll Weaving", "Watch-Time Mastery"],
  },
  {
    id: "serv-4",
    cardNum: "04",
    title: "Cinematic Video Editing",
    subtitle: "Color grading, cinematic looks and storytelling.",
    icon: <FaMagic />,
    description:
      "Transforming footage into cinematic art. Custom LUT application, skin tone protection, dynamic range balancing, film grain, and atmospheric color grading.",
    tags: ["Color Grading", "LUT Science", "Film Aesthetics", "Anamorphic Bars"],
  },
  {
    id: "serv-5",
    cardNum: "05",
    title: "Promotional Video Editing",
    subtitle: "Creative brand promotions and product videos.",
    icon: <FaBullhorn />,
    description:
      "Compelling brand commercials, product launches, and promotional campaigns that convert viewers into loyal clients with polished elegance.",
    tags: ["Brand Films", "Product Promos", "Commercial Adverts", "Event Teasers"],
  },
  {
    id: "serv-6",
    cardNum: "06",
    title: "Social Media Content Editing",
    subtitle: "Engaging content for digital platforms.",
    icon: <FaShareAlt />,
    description:
      "Repurposing long-form footage into multi-platform visual assets across TikTok, LinkedIn, YouTube Shorts, and X with custom aspect ratios.",
    tags: ["Content Repurposing", "Multi-Aspect Ratios", "Micro-Content", "Viral Formats"],
  },
];

const WhatIDo = () => {
  return (
    <div className="whatIDO" id="services">
      <div className="services-container">
        <div className="services-header">
          <div className="services-tag">
            <FaFilm /> SERVICES & EXPERTISE
          </div>
          <h2 className="services-title">WHAT I DO</h2>
          <p className="services-subtitle">
            "Turning raw footage into high-retention, cinematic video experiences."
          </p>
        </div>

        <div className="services-grid">
          {services.map((item) => (
            <div className="service-card" key={item.id} data-cursor="pointer">
              <div className="service-card-glow" />
              <div className="service-card-top">
                <span className="service-number">CARD {item.cardNum}</span>
                <div className="service-icon-box">{item.icon}</div>
              </div>

              <div className="service-card-body">
                <span className="service-subtitle-tag">{item.subtitle}</span>
                <h3 className="service-card-title">{item.title}</h3>
                <p className="service-card-desc">{item.description}</p>
              </div>

              <div className="service-tags-row">
                {item.tags.map((tag) => (
                  <span className="service-tag-pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatIDo;
