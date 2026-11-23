-- ==============================================================================
-- CLOUDFLARE D1 DATABASE MIGRATION SCHEMA & SEED DATA
-- Generated on: 2026-11-22T18:10:23.672Z
-- Total Projects: 19
-- ==============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  aspect_ratio TEXT DEFAULT '16:9',
  duration TEXT,
  video_key TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_key TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  published INTEGER DEFAULT 1,
  is_custom INTEGER DEFAULT 1,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS unassigned_media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  size_bytes INTEGER,
  size_mb REAL,
  resolution TEXT,
  aspect_ratio TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS showreel (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  video_key TEXT NOT NULL,
  video_url TEXT NOT NULL,
  poster_key TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  published INTEGER DEFAULT 1,
  updated_at INTEGER
);

-- -----------------------------------------------------------------------------
-- SEED: 19 PORTFOLIO PROJECTS CONNECTED TO CLOUDFLARE R2
-- -----------------------------------------------------------------------------
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1', 'Baby Shower', 'EVENTS', 'Heartwarming cinematic celebration film capturing joyful family moments.', '16:9', '02:15', 'videos/video_1795364790740_8fqdsm.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795364790740_8fqdsm.mp4', 'thumbnails/thumbnail_1795364801040_wzwkhw.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795364801040_wzwkhw.png', 1, 1, 1795364801083);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368328596', 'hetansh', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:25', 'videos/video_1795368328606_kyr2od.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368328606_kyr2od.mp4', 'thumbnails/thumbnail_1795368328842_4gfarv.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368328842_4gfarv.jpg', 1, 1, 1795368328856);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368372641', 'bappa reel', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:10', 'videos/video_1795368372647_f258cd.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368372647_f258cd.mp4', 'thumbnails/thumbnail_1795368372707_tycqy4.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368372707_tycqy4.jpg', 1, 1, 1795368372721);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368430512', 'perfume', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:10', 'videos/video_1795368430516_djhc5i.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368430516_djhc5i.mp4', 'thumbnails/thumbnail_1795368430637_dspjop.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368430637_dspjop.jpg', 1, 1, 1795368430650);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368488045', 'decoration reel bappa', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:28', 'videos/video_1795368488051_wgciz4.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368488051_wgciz4.mp4', 'thumbnails/thumbnail_1795368488800_dw9x8b.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368488800_dw9x8b.jpg', 1, 1, 1795368488813);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368589159', 'bappa reel 1', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:22', 'videos/video_1795368589165_ywjuah.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368589165_ywjuah.mp4', 'thumbnails/thumbnail_1795368589657_smx9uk.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368589657_smx9uk.jpg', 1, 1, 1795368589671);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368632149', 'Teachers day reel', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:50', 'videos/video_1795368632154_o69mba.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368632154_o69mba.mp4', 'thumbnails/thumbnail_1795368632453_216y7y.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368632453_216y7y.jpg', 1, 1, 1795368632466);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368699618', 'car delivery', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:55', 'videos/video_1795368699625_uwd5o7.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368699625_uwd5o7.mp4', 'thumbnails/thumbnail_1795368701118_vb2m29.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368701118_vb2m29.jpg', 1, 1, 1795368701138);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368762334', 'Baby shower 1', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '1:10', 'videos/video_1795368762341_i00hxb.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368762341_i00hxb.mp4', 'thumbnails/thumbnail_1795368762855_1fksb6.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368762855_1fksb6.jpg', 1, 1, 1795368762871);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368809226', 'coming soon baby reel', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:59', 'videos/video_1795368809232_41i0ln.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368809232_41i0ln.mp4', 'thumbnails/thumbnail_1795368809529_pr2w9l.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368809529_pr2w9l.jpg', 1, 1, 1795368809543);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368845898', 'cinematic reel', 'CINEMATIC EDITS', 'Creative video project edited by Siddharth Girase.', '16:9', '0:26', 'videos/video_1795368845903_y3hsbx.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368845903_y3hsbx.mp4', 'thumbnails/thumbnail_1795368846074_mwsf33.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368846074_mwsf33.jpg', 1, 1, 1795368846082);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795368934788', 'DJ pranshu', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:26', 'videos/video_1795368934796_5vj1g9.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795368934796_5vj1g9.mp4', 'thumbnails/thumbnail_1795368935461_huhpxy.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795368935461_huhpxy.png', 1, 1, 1795368935488);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369064936', 'Bappa parshuram', 'CINEMATIC EDITS', 'Creative video project edited by Siddharth Girase.', '16:9', '0:35', 'videos/video_1795369064942_ipdhc9.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369064942_ipdhc9.mp4', 'thumbnails/thumbnail_1795369065948_3gkhnr.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369065948_3gkhnr.png', 1, 1, 1795369065976);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369102703', 'Bappa mohit', 'CINEMATIC EDITS', 'Creative video project edited by Siddharth Girase.', '16:9', '0:45', 'videos/video_1795369102710_nxyokp.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369102710_nxyokp.mp4', 'thumbnails/thumbnail_1795369103560_dt7d1f.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369103560_dt7d1f.png', 1, 1, 1795369103591);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369148468', 'Funny one', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:28', 'videos/video_1795369148475_fu7e1h.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369148475_fu7e1h.mp4', 'thumbnails/thumbnail_1795369148624_24w2zq.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369148624_24w2zq.jpg', 1, 1, 1795369148639);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369207034', 'Janmashtami Reel', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:18', 'videos/video_1795369207087_n8hbpb.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369207087_n8hbpb.mp4', 'thumbnails/thumbnail_1795369207513_utmdue.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369207513_utmdue.png', 1, 1, 1795369207544);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369239932', 'Car delivery 2', 'REELS', 'Creative video project edited by Siddharth Girase.', '9:16', '0:32', 'videos/video_1795369239941_fv0qf8.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369239941_fv0qf8.mp4', 'thumbnails/thumbnail_1795369240126_kl5jka.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369240126_kl5jka.jpg', 1, 1, 1795369240134);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369299819', 'youth 2m', 'CINEMATIC EDITS', 'Creative video project edited by Siddharth Girase.', '16:9', '0:58', 'videos/video_1795369299848_ygb7ri.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369299848_ygb7ri.mp4', 'thumbnails/thumbnail_1795369302952_w1g0p9.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369302952_w1g0p9.jpg', 1, 1, 1795369302982);
INSERT OR REPLACE INTO projects (id, title, category, description, aspect_ratio, duration, video_key, video_url, thumbnail_key, thumbnail_url, published, is_custom, updated_at) VALUES ('custom-vid-1795369378927', 'Baby Shower', 'CINEMATIC EDITS', 'Creative video project edited by Siddharth Girase.', '16:9', '1:19', 'videos/video_1795369378934_wrcmw0.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/videos/video_1795369378934_wrcmw0.mp4', 'thumbnails/thumbnail_1795369424213_jvwg1p.png', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/thumbnails/thumbnail_1795369424213_jvwg1p.png', 1, 1, 1795369424257);

-- -----------------------------------------------------------------------------
-- SEED: UNASSIGNED MEDIA (Preserved for private admin management)
-- -----------------------------------------------------------------------------
INSERT OR REPLACE INTO unassigned_media (id, file_name, media_type, r2_key, r2_url, size_bytes, size_mb, resolution, aspect_ratio, created_at) VALUES ('unassigned-vid-1', 'video_1795369017530_rlnuz8.mp4', 'video', 'unassigned/video_1795369017530_rlnuz8.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/unassigned/video_1795369017530_rlnuz8.mp4', 349357215, 333.17, '3840x2160', '16:9', 1795369017530);
INSERT OR REPLACE INTO unassigned_media (id, file_name, media_type, r2_key, r2_url, size_bytes, size_mb, resolution, aspect_ratio, created_at) VALUES ('unassigned-thumb-1', 'thumbnail_1795369383707_innxhp.jpg', 'thumbnail', 'unassigned/thumbnail_1795369383707_innxhp.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/unassigned/thumbnail_1795369383707_innxhp.jpg', 935888, 0.89, '1920x1080', '16:9', 1795369383707);

-- -----------------------------------------------------------------------------
-- SEED: SHOWREEL FALLBACK MEDIA
-- -----------------------------------------------------------------------------
INSERT OR REPLACE INTO showreel (id, title, video_key, video_url, poster_key, poster_url, published, updated_at) VALUES ('showreel-primary', 'Siddharth Girase — Official Showreel', 'showreels/video_1795361979860_p56613.mp4', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/showreels/video_1795361979860_p56613.mp4', 'showreels/thumbnail_1795361979861_5edi9s.jpg', 'https://siddharth-portfolio-media..r2.cloudflarestorage.com/showreels/thumbnail_1795361979861_5edi9s.jpg', 1, 1795371023674);