# SG — Siddharth Girase | Video Editor Portfolio 🎬

> **"Turning Moments Into Cinematic Stories."**  
> Creative Video Editor • Visual Storyteller • Content Creator  
> Navsari, Gujarat, India • +91 7041293231

A world-class, award-winning creative video editor portfolio website featuring 3D interactive character animation, dark cinematic aesthetics, purple neon lighting, custom video showcase gallery, full-width showreel player, and an admin-protected video management system.

---

## 🌟 Key Highlights

- **Cinematic Dark Theme**: Deep black backdrop with vibrant purple and magenta backlight ambient glows.
- **Interactive 3D Avatar**: Head-tracking Three.js character with subtle idle animations and rim lighting.
- **Video Portfolio Showcase**: Filterable gallery for *All Work, Reels, Cinematic Edits, Social Media Videos, Promotional Videos, and Other Projects*.
- **Embedded Showreel**: Full-width 4K master showreel player with sound visualizer equalizer and cinema controls.
- **Admin Video Management System**:
  - Secure PIN-protected dashboard (Default PIN: `sg2026`).
  - Direct computer uploads for `.mp4` and `.webm` video files.
  - Custom thumbnail uploads, duration detection, title, category, and description editor.
  - IndexedDB high-performance client storage + optional Cloudinary / Supabase cloud integration.
  - Shortcut: Press `Ctrl + Shift + A` (or `Cmd + Shift + A`) anytime to open the dashboard!
- **Services Showcase**: 6 dedicated video editing service cards (Reels, Commercials, YouTube, Color Grading, etc.).
- **Editing Tools & Software**: Dedicated creative tools showcase (Premiere Pro, After Effects, DaVinci Resolve, Audition, Photoshop, Blender, CapCut).
- **Direct Contacts**: Click-to-call (`tel:+917041293231`), instant WhatsApp chat (`https://wa.me/917041293231`), and interactive project inquiry form.
- **Custom Cursor & Interactions**: Fluid cursor ring with glowing purple outline, expanding hover states, and smooth touch fallback.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

---

## 🔐 How to Upload Videos & Admin Management

1. Click the **Lock icon** in the top-right navbar, or press `Ctrl + Shift + A`.
2. Enter the default security PIN: `sg2026` and click **Unlock Dashboard**.
3. In the **Upload Video Project** tab:
   - Enter your project title and pick the category.
   - Choose a video file directly from your computer (`.mp4`, `.webm`) or enter a streaming URL.
   - Optionally upload a custom thumbnail image (`.jpg`, `.png`, `.webp`).
   - Add a brief description, client name, and year.
   - Click **Publish to Portfolio**.
4. The new video will immediately appear in your portfolio gallery and can be watched in fullscreen!
5. Manage or delete uploaded videos anytime from the **Manage Uploads** tab.

---

## ☁️ Cloud Video Storage Setup (Optional)

To enable global cloud video streaming via Cloudinary or Supabase, create a `.env` file in the project root:

```env
# Cloudinary (Free 25GB)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# OR Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📄 Profile & Resume

- Clicking **PROFILE** in the bottom-right opens your creative credentials card.
- To enable direct PDF resume download, place your `resume.pdf` inside the `public/` folder (`public/resume.pdf`).

---

© 2026 Siddharth Girase. All rights reserved.
