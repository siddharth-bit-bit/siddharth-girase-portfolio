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
  - Secure owner-authenticated dashboard with PBKDF2 password hashing & HttpOnly JWT sessions.
  - Direct computer uploads with Cloudinary chunked streaming.
  - Custom thumbnail uploads, duration detection, title, category, and description editor.
  - Real-time Cloudflare Pages Functions serverless API integration.
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

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

### 3. Generate Secure Admin Credentials
Run the credential generator to create your unique password hash, salt, and JWT secret:
```bash
node scripts/generate_admin_credentials.cjs "YourNewSecurePassword"
```
Copy the generated values to your `.env` (for local development) and to Cloudflare Pages Environment Variables (for production deployment).

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Build for Production
```bash
npm run build
```

---

## 🔐 How to Access the Admin Dashboard

1. Click the **Lock icon** in the top-right navbar, or press `Ctrl + Shift + A`.
2. Enter your authorized owner email (`girasejitendra249@gmail.com`) and your secure password.
3. Once authenticated:
   - In the **Upload Video Project** tab: add title, category, video file/URL, and thumbnail.
   - In the **Manage Uploads** tab: edit, re-order, or delete existing portfolio projects.
   - In the **Showreel Settings** tab: update the master showreel video and poster.
4. Changes synchronize immediately across the live portfolio.

---

## ☁️ Production Cloudflare Pages Environment Variables

Configure the following variables in **Cloudflare Dashboard -> Workers & Pages -> your-project -> Settings -> Environment variables**:

| Variable Name | Description | Scope |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD_HASH` | 64-byte hex PBKDF2 SHA-512 hash of owner password | Server-side only (Secret) |
| `ADMIN_SALT` | 24-byte cryptographic random hex salt | Server-side only (Secret) |
| `ADMIN_JWT_SECRET` | Canonical 48-byte cryptographic session signing secret | Server-side only (Secret) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | Server-side only |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Server-side only |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret (for signed direct uploads) | Server-side only (Secret) |
| `RESEND_API_KEY` | Resend API key for inquiry emails & password reset (optional) | Server-side only (Secret) |

---

## 📄 Profile & Resume

- Clicking **PROFILE** in the bottom-right opens your creative credentials card.
- To enable direct PDF resume download, place your `resume.pdf` inside the `public/` folder (`public/resume.pdf`).

---

© 2026 Siddharth Girase. All rights reserved.
