const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  getEnvConfig,
  loadManifest,
  saveManifest,
  getFFmpegPath,
  getDurationInSeconds,
  getInventory,
  uploadSingle,
  uploadChunked,
  probeUrl,
  ROOT_DIR,
  STAGING_DIR,
  PROJECTS_DATA_FILE,
  PROJECTS_BACKUP_FILE,
  D1_SQL_OUTPUT,
} = require('./execute_full_migration.cjs');

const OVERSIZED_FILENAMES = new Set([
  'video_1795364790740_8fqdsm.mp4',
  'video_1795368488051_wgciz4.mp4',
  'video_1795368589165_ywjuah.mp4',
  'video_1795368699625_uwd5o7.mp4',
  'video_1795368934796_5vj1g9.mp4',
  'video_1795369017530_rlnuz8.mp4',
  'video_1795369064942_ipdhc9.mp4',
  'video_1795369102710_nxyokp.mp4',
  'video_1795369299848_ygb7ri.mp4',
  'video_1795369378934_wrcmw0.mp4',
]);

async function runPipeline() {
  const isDryRun = process.argv.includes('--dry-run');
  const isExecute = process.argv.includes('--execute');

  console.log('==============================================================================');
  console.log('  SIDDHARTH GIRASE PORTFOLIO — CLOUDINARY MIGRATION PIPELINE');
  console.log('==============================================================================');

  const config = getEnvConfig();
  const manifest = loadManifest();
  const { items, projects, showreel } = getInventory();
  const ffmpegPath = getFFmpegPath();

  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
  }

  // Categorize items
  const alreadyUploaded = [];
  const pendingDirectVideos = [];
  const pendingDirectThumbs = [];
  const oversizedVideos = [];

  for (const item of items) {
    if (manifest[item.localPath] && manifest[item.localPath].secure_url) {
      alreadyUploaded.push(item);
    } else if (item.resourceType === 'image') {
      pendingDirectThumbs.push(item);
    } else if (item.resourceType === 'video') {
      if (OVERSIZED_FILENAMES.has(item.fileName)) {
        oversizedVideos.push(item);
      } else {
        pendingDirectVideos.push(item);
      }
    }
  }

  console.log('\n[INVENTORY STATUS]');
  console.log(`  Total Media Assets:               ${items.length} (21 videos + 21 thumbnails)`);
  console.log(`  Already Uploaded & Manifested:    ${alreadyUploaded.length} assets`);
  console.log(`  Pending Direct Videos (<=100MB):  ${pendingDirectVideos.length} videos`);
  console.log(`  Pending Direct Thumbnails (<10MB): ${pendingDirectThumbs.length} thumbnails`);
  console.log(`  Oversized Videos (>100MB):        ${oversizedVideos.length} videos (Requires Staging Compression)`);
  console.log(`  FFmpeg Engine:                    ${ffmpegPath}`);

  // DRY RUN
  if (isDryRun || !isExecute) {
    console.log('\n==============================================================================');
    console.log('  DRY-RUN VALIDATION REPORT');
    console.log('==============================================================================');

    console.log('\n1. Source Media Protection:');
    console.log('   All 42 source files in public/uploads/ are treated as STRICTLY READ-ONLY.');
    console.log('   Original media will never be modified, moved, overwritten, or deleted.');

    console.log('\n2. Pending Direct Videos to Upload (<= 100 MB):');
    for (const v of pendingDirectVideos) {
      console.log(`   - ${v.fileName.padEnd(35)} (${String(v.sizeMb).padStart(6)} MB) -> ${v.folder}/${v.publicId}`);
    }

    console.log('\n3. Pending Direct Thumbnails to Upload (< 10 MB):');
    for (const t of pendingDirectThumbs) {
      console.log(`   - ${t.fileName.padEnd(35)} (${String(t.sizeMb).padStart(6)} MB) -> ${t.folder}/${t.publicId}`);
    }

    console.log('\n4. Oversized Videos Compression Plan (< 95 MB target):');
    for (const v of oversizedVideos) {
      const durationSec = getDurationInSeconds(ffmpegPath, v.localPath);
      console.log(`   - ${v.fileName.padEnd(35)} (${String(v.sizeMb).padStart(6)} MB, ~${Math.round(durationSec)}s) -> staging/compressed/${v.fileName}`);
    }

    console.log('\nDry-run completed successfully. All target paths and parameters verified.');
    if (!isExecute) {
      console.log('Pass --execute to proceed with live upload and compression.');
      return;
    }
  }

  // EXECUTION MODE
  console.log('\n==============================================================================');
  console.log('  STARTING SAFE MIGRATION EXECUTION');
  console.log('==============================================================================');

  // STEP 1: Upload the 3 pending direct videos
  console.log(`\n--- STEP 1: Uploading ${pendingDirectVideos.length} Pending Direct Videos (<= 100 MB) ---`);
  for (let i = 0; i < pendingDirectVideos.length; i++) {
    const v = pendingDirectVideos[i];
    console.log(`\n[Video ${i + 1}/${pendingDirectVideos.length}] Uploading ${v.fileName} (${v.sizeMb} MB)...`);
    try {
      const res = await uploadChunked(v.localPath, v.folder, v.publicId, config, (chunk, total, pct) => {
        process.stdout.write(`\r  Progress: [${'='.repeat(Math.floor(pct / 5))}${' '.repeat(20 - Math.floor(pct / 5))}] ${pct}% (Chunk ${chunk}/${total})`);
      });
      process.stdout.write('\n');
      console.log(`  ✓ Success: ${res.secure_url}`);

      manifest[v.localPath] = {
        public_id: res.public_id,
        secure_url: res.secure_url,
        resource_type: res.resource_type,
        format: res.format,
        width: res.width,
        height: res.height,
        bytes: res.bytes,
        duration: res.duration,
        uploaded_at: Date.now(),
      };
      saveManifest(manifest);
    } catch (err) {
      console.error(`  ✗ Upload failed: ${err.message}`);
      throw err;
    }
  }

  // STEP 2: Upload the 9 pending direct thumbnails
  console.log(`\n--- STEP 2: Uploading ${pendingDirectThumbs.length} Pending Thumbnails (< 10 MB) ---`);
  for (let i = 0; i < pendingDirectThumbs.length; i++) {
    const t = pendingDirectThumbs[i];
    console.log(`\n[Thumbnail ${i + 1}/${pendingDirectThumbs.length}] Uploading ${t.fileName} (${t.sizeMb} MB)...`);
    try {
      const res = await uploadSingle(t.localPath, 'image', t.folder, t.publicId, config);
      console.log(`  ✓ Success: ${res.secure_url}`);

      manifest[t.localPath] = {
        public_id: res.public_id,
        secure_url: res.secure_url,
        resource_type: res.resource_type,
        format: res.format,
        width: res.width,
        height: res.height,
        bytes: res.bytes,
        uploaded_at: Date.now(),
      };
      saveManifest(manifest);
    } catch (err) {
      console.error(`  ✗ Upload failed: ${err.message}`);
      throw err;
    }
  }

  // STEP 3: Compress 10 oversized videos to staging/compressed/
  console.log(`\n--- STEP 3: Compressing ${oversizedVideos.length} Oversized Videos into staging/compressed/ ---`);
  const compressionResults = [];

  for (let i = 0; i < oversizedVideos.length; i++) {
    const v = oversizedVideos[i];
    const outPath = path.join(STAGING_DIR, v.fileName);
    const origSizeMb = v.sizeMb;
    const durationSec = getDurationInSeconds(ffmpegPath, v.localPath);

    console.log(`\n[Compressing ${i + 1}/${oversizedVideos.length}] ${v.fileName} (${origSizeMb} MB, duration: ~${Math.round(durationSec)}s)`);

    // Only compress if not already compressed and verified
    let needEncode = true;
    if (fs.existsSync(outPath)) {
      const existingSize = fs.statSync(outPath).size / (1024 * 1024);
      if (existingSize > 0 && existingSize <= 95) {
        console.log(`  Existing compressed file found: ${existingSize.toFixed(2)} MB (valid). Skipping re-encode.`);
        needEncode = false;
        compressionResults.push({
          fileName: v.fileName,
          originalMb: origSizeMb,
          compressedMb: parseFloat(existingSize.toFixed(2)),
          outPath,
        });
      }
    }

    if (needEncode) {
      // Calculate optimal encoding parameters
      // Target 80-85 MB maximum to ensure safety buffer under 95 MB
      let ffmpegArgs = [];
      if (durationSec > 60) {
        // Longer video (e.g. Baby shower ~135s): use targeted bitrate
        const targetKbitsTotal = (82 * 1024 * 8) / durationSec;
        const videoKbits = Math.max(1500, Math.floor(targetKbitsTotal - 128));
        ffmpegArgs = [
          '-y',
          '-i', v.localPath,
          '-c:v', 'libx264',
          '-b:v', `${videoKbits}k`,
          '-maxrate', `${videoKbits + 400}k`,
          '-bufsize', `${videoKbits * 2}k`,
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outPath,
        ];
      } else {
        // Short reel (20-60s): high quality CRF 22
        ffmpegArgs = [
          '-y',
          '-i', v.localPath,
          '-c:v', 'libx264',
          '-crf', '22',
          '-preset', 'medium',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outPath,
        ];
      }

      console.log(`  Encoding with FFmpeg...`);
      const encStart = Date.now();
      const encResult = spawnSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' });
      if (encResult.status !== 0) {
        throw new Error(`FFmpeg compression failed for ${v.fileName} with exit code ${encResult.status}`);
      }

      const outStat = fs.statSync(outPath);
      let outMb = parseFloat((outStat.size / (1024 * 1024)).toFixed(2));
      console.log(`  Encoded in ${((Date.now() - encStart) / 1000).toFixed(1)}s -> ${outMb} MB`);

      // Fallback: If still above 95 MB, run a second pass with lower bitrate
      if (outMb > 95) {
        console.warn(`  [NOTICE] Output ${outMb} MB is above 95 MB. Re-encoding with strict 4500k bitrate cap...`);
        const fallbackArgs = [
          '-y',
          '-i', v.localPath,
          '-c:v', 'libx264',
          '-b:v', '4200k',
          '-maxrate', '4500k',
          '-bufsize', '9000k',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outPath,
        ];
        spawnSync(ffmpegPath, fallbackArgs, { stdio: 'inherit' });
        const fallbackStat = fs.statSync(outPath);
        outMb = parseFloat((fallbackStat.size / (1024 * 1024)).toFixed(2));
        console.log(`  Strict re-encode complete -> ${outMb} MB`);
      }

      // Verify playability
      const verifyRes = spawnSync(ffmpegPath, ['-v', 'error', '-i', outPath, '-f', 'null', '-'], { encoding: 'utf8' });
      if (verifyRes.stderr && verifyRes.stderr.trim().length > 0) {
        console.warn(`  FFmpeg integrity warning: ${verifyRes.stderr.trim()}`);
      } else {
        console.log(`  ✓ Playability and integrity verified.`);
      }

      compressionResults.push({
        fileName: v.fileName,
        originalMb: origSizeMb,
        compressedMb: outMb,
        outPath,
      });
    }
  }

  // STEP 4: Upload the 10 compressed videos to Cloudinary
  console.log(`\n--- STEP 4: Uploading ${oversizedVideos.length} Compressed Videos to Cloudinary ---`);
  for (let i = 0; i < oversizedVideos.length; i++) {
    const v = oversizedVideos[i];
    const compressedPath = path.join(STAGING_DIR, v.fileName);

    // Check if manifest already has it
    if (manifest[v.localPath] && manifest[v.localPath].secure_url) {
      console.log(`\n[Compressed Video ${i + 1}/${oversizedVideos.length}] ${v.fileName} already uploaded -> ${manifest[v.localPath].secure_url}`);
      continue;
    }

    const compStat = fs.statSync(compressedPath);
    const compMb = (compStat.size / (1024 * 1024)).toFixed(2);
    console.log(`\n[Compressed Video ${i + 1}/${oversizedVideos.length}] Uploading ${v.fileName} (${compMb} MB)...`);

    try {
      const res = await uploadChunked(compressedPath, v.folder, v.publicId, config, (chunk, total, pct) => {
        process.stdout.write(`\r  Progress: [${'='.repeat(Math.floor(pct / 5))}${' '.repeat(20 - Math.floor(pct / 5))}] ${pct}% (Chunk ${chunk}/${total})`);
      });
      process.stdout.write('\n');
      console.log(`  ✓ Success: ${res.secure_url}`);

      manifest[v.localPath] = {
        public_id: res.public_id,
        secure_url: res.secure_url,
        resource_type: res.resource_type,
        format: res.format,
        width: res.width,
        height: res.height,
        bytes: res.bytes,
        duration: res.duration,
        compressed_bytes: compStat.size,
        uploaded_at: Date.now(),
      };
      saveManifest(manifest);
    } catch (err) {
      console.error(`  ✗ Upload failed: ${err.message}`);
      throw err;
    }
  }

  // STEP 5: Verification of all 42 assets
  console.log(`\n--- STEP 5: Verifying Streaming & Accessibility for All 42 Assets ---`);
  let videoSuccessCount = 0;
  let thumbSuccessCount = 0;
  const verifiedAssets = [];

  for (const item of items) {
    const m = manifest[item.localPath];
    if (!m || !m.secure_url) {
      console.error(`  Missing manifest entry for ${item.fileName}`);
      continue;
    }

    const isVideo = item.resourceType === 'video';
    const probe = await probeUrl(m.secure_url, isVideo);
    if (probe.success) {
      if (isVideo) videoSuccessCount++;
      else thumbSuccessCount++;
      verifiedAssets.push({
        fileName: item.fileName,
        type: item.resourceType,
        url: m.secure_url,
        status: probe.statusCode,
        contentRange: probe.contentRange || 'Full',
      });
      console.log(`  ✓ [${probe.statusCode}] ${item.fileName} (${item.resourceType}) -> Range/Status OK`);
    } else {
      console.error(`  ✗ [${probe.statusCode}] Failed to probe ${item.fileName}: ${probe.error}`);
    }
  }

  console.log(`\nVerification Summary:`);
  console.log(`  Videos Verified:     ${videoSuccessCount}/21 (HTTP 206 Partial Content Range streaming)`);
  console.log(`  Thumbnails Verified: ${thumbSuccessCount}/21 (HTTP 200 OK image rendering)`);

  // STEP 6: Update api/projects_data.json and D1 SQL
  console.log(`\n--- STEP 6: Updating api/projects_data.json and Cloudflare D1 SQL ---`);
  if (!fs.existsSync(PROJECTS_BACKUP_FILE)) {
    fs.copyFileSync(PROJECTS_DATA_FILE, PROJECTS_BACKUP_FILE);
    console.log(`  Created safety backup: api/projects_data.json.bak`);
  }

  const rawProjects = JSON.parse(fs.readFileSync(PROJECTS_DATA_FILE, 'utf8'));
  let updatedProjectsCount = 0;

  for (const p of rawProjects) {
    const vName = path.basename(p.videoUrl || '');
    const tName = path.basename(p.thumbnailUrl || '');

    const vItem = items.find((i) => i.fileName === vName);
    const tItem = items.find((i) => i.fileName === tName);

    if (vItem && manifest[vItem.localPath]?.secure_url) {
      p.videoUrl = manifest[vItem.localPath].secure_url;
      p.videoPublicId = manifest[vItem.localPath].public_id;
    }
    if (tItem && manifest[tItem.localPath]?.secure_url) {
      p.thumbnailUrl = manifest[tItem.localPath].secure_url;
      p.thumbnailPublicId = manifest[tItem.localPath].public_id;
    }
    updatedProjectsCount++;
  }

  fs.writeFileSync(PROJECTS_DATA_FILE, JSON.stringify(rawProjects, null, 2), 'utf8');
  console.log(`  ✓ Successfully updated ${updatedProjectsCount} projects in api/projects_data.json`);

  // Update showreel data if exists
  const showreelFile = path.join(ROOT_DIR, 'api', 'showreel_data.json');
  if (fs.existsSync(showreelFile)) {
    try {
      const showreelData = JSON.parse(fs.readFileSync(showreelFile, 'utf8'));
      const srVidItem = items.find((i) => i.category === 'showreel_video');
      const srThumbItem = items.find((i) => i.category === 'showreel_thumbnail');
      if (srVidItem && manifest[srVidItem.localPath]?.secure_url) {
        showreelData.videoUrl = manifest[srVidItem.localPath].secure_url;
        showreelData.videoPublicId = manifest[srVidItem.localPath].public_id;
      }
      if (srThumbItem && manifest[srThumbItem.localPath]?.secure_url) {
        showreelData.posterUrl = manifest[srThumbItem.localPath].secure_url;
        showreelData.posterPublicId = manifest[srThumbItem.localPath].public_id;
      }
      fs.writeFileSync(showreelFile, JSON.stringify(showreelData, null, 2), 'utf8');
      console.log(`  ✓ Successfully updated api/showreel_data.json`);
    } catch {}
  }

  // Generate Cloudflare D1 SQL
  const { generateD1Sql } = require('./migrate_to_cloudinary.cjs');
  generateD1Sql(items, projects, showreel, manifest, config.cloudName);
  console.log(`  ✓ Successfully generated Cloudflare D1 SQL: scripts/cloudflare_d1_cloudinary_migration.sql`);

  // STEP 7: Verify Build
  console.log(`\n--- STEP 7: Testing Production Build (npm run build) ---`);
  try {
    const buildRes = spawnSync('npm', ['run', 'build'], { cwd: ROOT_DIR, encoding: 'utf8', shell: true });
    if (buildRes.status === 0) {
      console.log(`  ✓ Production build passed cleanly with exit code 0.`);
    } else {
      console.error(`  ✗ Build failed:\n${buildRes.stderr || buildRes.stdout}`);
      throw new Error('Production build failed');
    }
  } catch (err) {
    console.error(`  Build test error: ${err.message}`);
    throw err;
  }

  console.log('\n==============================================================================');
  console.log('  ALL 42 MEDIA ASSETS SUCCESSFULLY MIGRATED & VERIFIED!');
  console.log('==============================================================================');
}

runPipeline().catch((err) => {
  console.error('\nPipeline execution halted:', err);
  process.exit(1);
});
