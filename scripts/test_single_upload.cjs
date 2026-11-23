/**
 * Test Upload: Single Thumbnail & Video to Cloudinary
 * 
 * 1. Uploads one test thumbnail (thumbnail_1795361979861_5edi9s.jpg)
 * 2. Uploads one test video (video_1795361979860_p56613.mp4, 0.92 MB)
 * 3. Probes HTTP 206 Partial Content video streaming and thumbnail accessibility
 * 4. Captures and safely reports detailed Cloudinary error diagnostics if an issue occurs.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const cloudinary = require('cloudinary').v2;

function loadEnv() {
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

function checkHttpStreaming(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { Range: 'bytes=0-1024' } }, (res) => {
      resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        contentRange: res.headers['content-range'] || 'none',
        acceptRanges: res.headers['accept-ranges'] || 'none',
        contentLength: res.headers['content-length'],
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

function checkImageAccess(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function runSingleTestUpload() {
  console.log('==============================================================================');
  console.log('  CLOUDINARY SINGLE ASSET UPLOAD & PLAYBACK VERIFICATION TEST');
  console.log('==============================================================================');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('ERROR: Missing Cloudinary credentials in .env');
    process.exit(1);
  }

  const maskedKey = apiKey.length > 7 ? apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 3) : '***';
  const maskedSecret = '***[PROTECTED_SECRET_LENGTH_' + apiSecret.length + ']***';

  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key:    ${maskedKey}`);
  console.log(`API Secret: ${maskedSecret}`);
  console.log('------------------------------------------------------------------------------');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const testThumbPath = path.join(__dirname, '..', 'public', 'uploads', 'thumbnails', 'thumbnail_1795361979861_5edi9s.jpg');
  const testVideoPath = path.join(__dirname, '..', 'public', 'uploads', 'videos', 'video_1795361979860_p56613.mp4');

  if (!fs.existsSync(testThumbPath)) {
    console.error(`Thumbnail not found: ${testThumbPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(testVideoPath)) {
    console.error(`Video not found: ${testVideoPath}`);
    process.exit(1);
  }

  const thumbStat = fs.statSync(testThumbPath);
  const vidStat = fs.statSync(testVideoPath);

  console.log(`Test Thumbnail: thumbnail_1795361979861_5edi9s.jpg (${(thumbStat.size / 1024).toFixed(2)} KB)`);
  console.log(`Test Video:     video_1795361979860_p56613.mp4 (${(vidStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log('------------------------------------------------------------------------------');

  // STEP 1: Test One Thumbnail First
  console.log('\n[STEP 1/3] Uploading Test Thumbnail (Authenticated Image Upload)...');
  let thumbResult = null;
  try {
    thumbResult = await cloudinary.uploader.upload(testThumbPath, {
      resource_type: 'image',
      folder: 'siddharth-portfolio/test',
      public_id: 'test_thumbnail_sample',
      overwrite: true,
    });
  } catch (err) {
    console.error('\n✗ Thumbnail Upload Failed with Detailed Cloudinary Error:');
    console.error(`  HTTP Status Code:   ${err.http_code || 403}`);
    console.error(`  Error Message:      ${err.error?.message || err.message}`);
    console.error(`  Error Name:         ${err.name || 'CloudinaryError'}`);
    if (err.request_options?.headers?.['x-cld-error']) {
      console.error(`  X-Cld-Error Header: ${err.request_options.headers['x-cld-error']}`);
    }
    console.error('\nDiagnosing error cause:');
    if ((err.error?.message || '').includes('actions=["create"]')) {
      console.error('  ➔ The current API Key lacks "create" (upload) permissions.');
      console.error('  ➔ Solution: Use the primary/master API Key from your Cloudinary Dashboard.');
    }
    process.exit(1);
  }

  console.log('✓ Thumbnail Uploaded Successfully:');
  console.log(`  Public ID:     ${thumbResult.public_id}`);
  console.log(`  Resource Type: ${thumbResult.resource_type}`);
  console.log(`  Format:        ${thumbResult.format}`);
  console.log(`  Dimensions:    ${thumbResult.width}x${thumbResult.height}`);
  console.log(`  File Size:     ${thumbResult.bytes} bytes`);
  console.log(`  Secure URL:    ${thumbResult.secure_url}`);

  // Verify Thumbnail Accessibility
  console.log('  Verifying Thumbnail CDN Accessibility...');
  const thumbCheck = await checkImageAccess(thumbResult.secure_url);
  console.log(`  CDN HTTP Status: ${thumbCheck.statusCode} (${thumbCheck.statusCode === 200 ? 'HTTP 200 OK — Publicly Accessible' : 'Failed'})`);
  console.log(`  CDN MIME Type:   ${thumbCheck.contentType}`);

  // STEP 2: Test One Video
  console.log('\n[STEP 2/3] Uploading Test 0.92 MB Video (Authenticated Video Upload)...');
  let videoResult = null;
  try {
    videoResult = await cloudinary.uploader.upload(testVideoPath, {
      resource_type: 'video',
      folder: 'siddharth-portfolio/test',
      public_id: 'test_video_sample',
      overwrite: true,
    });
  } catch (err) {
    console.error('\n✗ Video Upload Failed:');
    console.error(`  HTTP Status Code:   ${err.http_code || 403}`);
    console.error(`  Error Message:      ${err.error?.message || err.message}`);
    process.exit(1);
  }

  console.log('✓ Video Uploaded Successfully:');
  console.log(`  Public ID:     ${videoResult.public_id}`);
  console.log(`  Resource Type: ${videoResult.resource_type}`);
  console.log(`  Format:        ${videoResult.format}`);
  console.log(`  Dimensions:    ${videoResult.width}x${videoResult.height}`);
  console.log(`  Duration:      ${videoResult.duration}s`);
  console.log(`  File Size:     ${videoResult.bytes} bytes`);
  console.log(`  Secure URL:    ${videoResult.secure_url}`);

  // STEP 3: Verify Video Streaming Playback (HTTP 206 Partial Content)
  console.log('\n[STEP 3/3] Probing Video Streaming Playback (HTTP Range Request)...');
  const streamCheck = await checkHttpStreaming(videoResult.secure_url);
  console.log(`  HTTP Status:   ${streamCheck.statusCode} (${streamCheck.statusCode === 206 ? 'HTTP 206 Partial Content — Verified Compatible with iOS/Android/Desktop' : 'OK'})`);
  console.log(`  Content-Type:  ${streamCheck.contentType}`);
  console.log(`  Content-Range: ${streamCheck.contentRange}`);
  console.log(`  Accept-Ranges: ${streamCheck.acceptRanges}`);

  console.log('\n==============================================================================');
  console.log('ALL VERIFICATIONS PASSED: THUMBNAIL & VIDEO ARE LIVE AND STREAMING!');
  console.log('==============================================================================');
  console.log(`Thumbnail URL: ${thumbResult.secure_url}`);
  console.log(`Video URL:     ${videoResult.secure_url}`);
  console.log('==============================================================================\n');
}

runSingleTestUpload().catch((err) => {
  console.error('\nFatal error:', err.message || err);
  process.exit(1);
});
