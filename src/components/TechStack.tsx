import { useState } from "react";
import {
  FaFilm,
  FaMagic,
  FaPalette,
  FaVolumeUp,
  FaCube,
  FaBolt,
  FaCheck,
  FaPen,
} from "react-icons/fa";
import "./styles/TechStack.css";

interface ToolItem {
  id: string;
  name: string;
  role: string;
  category: "Editing" | "Motion Graphics" | "Color" | "Audio" | "3D & Design";
  icon: JSX.Element;
  level: string;
  description: string;
}

const initialTools: ToolItem[] = [
  {
    id: "tool-1",
    name: "Adobe Premiere Pro",
    role: "Industry-Standard Non-Linear Video Editor",
    category: "Editing",
    icon: <FaFilm />,
    level: "Primary NLE",
    description: "Multitrack timeline editing, multicam sync, dynamic transitions, and broadcast audio exports.",
  },
  {
    id: "tool-2",
    name: "Adobe After Effects",
    role: "Motion Graphics, VFX & Kinetic Typography",
    category: "Motion Graphics",
    icon: <FaMagic />,
    level: "Visual FX",
    description: "Visual compositing, motion tracking, glowing kinetic text, 3D camera sweeps, and particle effects.",
  },
  {
    id: "tool-3",
    name: "DaVinci Resolve",
    role: "Color Grading & Color Science",
    category: "Color",
    icon: <FaPalette />,
    level: "Color Mastery",
    description: "Node-based color grading, LUT creation, skin tone isolation, and cinema dynamic range mastery.",
  },
  {
    id: "tool-4",
    name: "Adobe Audition",
    role: "Audio Restoration & Sound Design",
    category: "Audio",
    icon: <FaVolumeUp />,
    level: "Sound Design",
    description: "Dialogue denoising, spectral editing, foley synchronization, and multi-channel audio mixing.",
  },
  {
    id: "tool-5",
    name: "Adobe Photoshop",
    role: "Thumbnail Design & Visual Assets",
    category: "3D & Design",
    icon: <FaPen />,
    level: "Graphic Design",
    description: "High-CTR YouTube thumbnail crafting, title cards, composite cutout layers, and color correction.",
  },
  {
    id: "tool-6",
    name: "CapCut Desktop",
    role: "Fast-Turnaround Viral Shorts & Reels",
    category: "Editing",
    icon: <FaBolt />,
    level: "Short-Form",
    description: "Fast-paced subtitle generation, vertical trending templates, and rapid social media turnaround.",
  },
  {
    id: "tool-7",
    name: "Final Cut Pro",
    role: "Magnetic Timeline & High-Speed Cuts",
    category: "Editing",
    icon: <FaFilm />,
    level: "Secondary NLE",
    description: "Optimized ProRes rendering, magnetic ripple editing, and lightweight timeline playback.",
  },
  {
    id: "tool-8",
    name: "Blender 3D",
    role: "3D Motion Elements & Camera Projections",
    category: "3D & Design",
    icon: <FaCube />,
    level: "3D Visuals",
    description: "3D product mockups, camera projection mapping, and animated title sequences.",
  },
];

const TechStack = () => {
  const [tools] = useState<ToolItem[]>(initialTools);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  const categories = ["ALL", "Editing", "Motion Graphics", "Color", "Audio", "3D & Design"];

  const filtered =
    selectedFilter === "ALL"
      ? tools
      : tools.filter((t) => t.category === selectedFilter);

  return (
    <div className="techstack-section" id="tools">
      <div className="techstack-container">
        <div className="techstack-header">
          <div className="techstack-tag">
            <FaFilm /> EDITING ARSENAL
          </div>
          <h2 className="techstack-title">
            SOFTWARE & <span>CREATIVE TOOLS</span>
          </h2>
          <p className="techstack-subtitle">
            Professional post-production suite utilized for frame-accurate storytelling and cinema-grade finishes.
          </p>

          <div className="tools-filter-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tools-pill ${selectedFilter === cat ? "active" : ""}`}
                onClick={() => setSelectedFilter(cat)}
                data-cursor="pointer"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="tools-cards-grid">
          {filtered.map((tool) => (
            <div className="tool-item-card" key={tool.id} data-cursor="pointer">
              <div className="tool-card-glow" />
              <div className="tool-card-header">
                <div className="tool-icon-frame">{tool.icon}</div>
                <span className="tool-level-badge">{tool.level}</span>
              </div>

              <h3 className="tool-name">{tool.name}</h3>
              <h4 className="tool-role">{tool.role}</h4>
              <p className="tool-desc">{tool.description}</p>

              <div className="tool-card-footer">
                <span className="tool-cat-tag">
                  <FaCheck className="check-mini" /> {tool.category}
                </span>
                <span className="tool-configured-status">Ready</span>
              </div>
            </div>
          ))}
        </div>

        <div className="tools-custom-note">
          <p>
            * Editable creative stack. Tool entries can be customized to reflect your exact hardware and software setup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TechStack;
