/**
 * ==============================================================================
 * SIDDHARTH GIRASE PORTFOLIO — COMPLETE CLOUDINARY MIGRATION ENGINE
 * ==============================================================================
 * Safe execution script that:
 * 1. Performs a dry-run check confirming original files are read-only and mapped.
 * 2. Uploads 3 pending <100MB videos and 9 pending thumbnails.
 * 3. Compresses 10 oversized videos to staging/compressed/ (<95MB, H.264+AAC).
 * 4. Verifies compressed file sizes and integrity.
 * 5. Uploads compressed videos with chunked/single uploads and checkpointing.
 * 6. Validates HTTP 206 (Range request) for all 21 videos & HTTP 200 for all 21 thumbnails.
 * 7. Backs up api/projects_data.json and updates it with permanent Cloudinary URLs.
 * 8. Generates Cloudflare D1 SQL file.
 * 9. Tests npm run build to verify zero regressions.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

// 1. CONFIGURATION
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const MANIFEST_FILE = path.join(__dirname, 'cloudinary_migration_manifest.json');
const D1_SQL_OUTPUT = path.join(__dirname, 'cloudflare_d1_cloudinary_migration.sql');
const PROJECTS_DATA_FILE = path.join(ROOT_DIR, 'api', 'projects_data.json');
const PROJECTS_BACKUP_FILE = path.join(ROOT_DIR, 'api', 'projects_data.json.bak');
const STAGING_DIR = path.join(ROOT_DIR, 'staging', 'compressed');

function getEnvConfig() {
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
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

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    chunkSize: 20 * 1024 * 1024,
  };
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save manifest:', err.message);
  }
}

// 2. FFMPEG RESOLUTION
function getFFmpegPath() {
  try {
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer && installer.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
  } catch {}
  return 'ffmpeg';
}

function getDurationInSeconds(ffmpegPath, filePath) {
  try {
    const res = spawnSync(ffmpegPath, ['-i', filePath], { encoding: 'utf8' });
    const output = (res.stdout || '') + (res.stderr || '');
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  } catch {}
  return 30; // default fallback
}

// 3. INVENTORY DEFINITION
function getInventory() {
  const { prepareMediaInventory } = require('./migrate_to_cloudinary.cjs');
  return prepareMediaInventory();
}

// 4. CLOUDINARY HELPERS
function generateCloudinarySignature(params, apiSecret) {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();
  const toSign = keys.map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

function uploadSingle(filePath, resourceType, folder, publicId, config) {
  return new Promise((resolve, reject) => {
    const { cloudName, apiKey, apiSecret } = config;
    const timestamp = Math.floor(Date.now() / 1000);
    const boundary = `----CloudinaryFormBoundary${Date.now()}${crypto.randomBytes(4).toString('hex')}`;

    const signParams = {
      folder,
      overwrite: 'true',
      public_id: publicId,
      timestamp,
      unique_filename: 'false',
    };

    const signature = generateCloudinarySignature(signParams, apiSecret);
    const fileStat = fs.statSync(filePath);
    const fileName = path.basename(filePath);

    let mimeType = 'application/octet-stream';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (filePath.endsWith('.png')) mimeType = 'image/png';
    else if (filePath.endsWith('.webp')) mimeType = 'image/webp';
    else if (filePath.endsWith('.mp4')) mimeType = 'video/mp4';

    const formFields = {
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
      folder,
      public_id: publicId,
      overwrite: 'true',
      unique_filename: 'false',
    };

    let headerParts = '';
    for (const [key, val] of Object.entries(formFields)) {
      headerParts += `--${boundary}\r\n`;
      headerParts += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      headerParts += `${val}\r\n`;
    }

    headerParts += `--${boundary}\r\n`;
    headerParts += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    headerParts += `Content-Type: ${mimeType}\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;
    const totalContentLength = Buffer.byteLength(headerParts) + fileStat.size + Buffer.byteLength(footer);

    const reqOptions = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${cloudName}/${resourceType}/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalContentLength,
        'User-Agent': 'Siddharth-Portfolio-Migration/1.0',
      },
    };

    const req = https.request(reqOptions, (res) => {
      let responseBody = '';
      res.on('data', (d) => (responseBody += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Cloudinary Upload Error (${res.statusCode}): ${json.error?.message || responseBody}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse upload response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(headerParts);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => req.end(footer));
    fileStream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
  });
}

async function uploadChunked(filePath, folder, publicId, config, onProgress) {
  const { cloudName, apiKey, apiSecret, chunkSize } = config;
  const fileStat = fs.statSync(filePath);
  const totalBytes = fileStat.size;
  const uniqueUploadId = `cld_upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const totalChunks = Math.ceil(totalBytes / chunkSize);
  const fileName = path.basename(filePath);

  let offset = 0;
  let chunkIndex = 0;
  let finalResponse = null;

  while (offset < totalBytes) {
    chunkIndex++;
    const end = Math.min(offset + chunkSize, totalBytes);
    const chunkBytes = end - offset;
    const isLastChunk = end === totalBytes;

    const fd = fs.openSync(filePath, 'r');
    const chunkBuffer = Buffer.alloc(chunkBytes);
    fs.readSync(fd, chunkBuffer, 0, chunkBytes, offset);
    fs.closeSync(fd);

    const timestamp = Math.floor(Date.now() / 1000);
    const boundary = `----CloudinaryChunkBoundary${Date.now()}${crypto.randomBytes(4).toString('hex')}`;

    const signParams = {
      folder,
      overwrite: 'true',
      public_id: publicId,
      timestamp,
      unique_filename: 'false',
    };

    const signature = generateCloudinarySignature(signParams, apiSecret);
    const formFields = {
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
      folder,
      public_id: publicId,
      overwrite: 'true',
      unique_filename: 'false',
    };

    let headerParts = '';
    for (const [key, val] of Object.entries(formFields)) {
      headerParts += `--${boundary}\r\n`;
      headerParts += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      headerParts += `${val}\r\n`;
    }

    headerParts += `--${boundary}\r\n`;
    headerParts += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    headerParts += `Content-Type: video/mp4\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;
    const totalContentLength = Buffer.byteLength(headerParts) + chunkBytes + Buffer.byteLength(footer);

    let attempt = 0;
    let chunkSuccess = false;
    let lastError = null;

    while (attempt < 3 && !chunkSuccess) {
      attempt++;
      try {
        const resp = await new Promise((resolveChunk, rejectChunk) => {
          const reqOptions = {
            hostname: 'api.cloudinary.com',
            port: 443,
            path: `/v1_1/${cloudName}/video/upload`,
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': totalContentLength,
              'Content-Range': `bytes ${offset}-${end - 1}/${totalBytes}`,
              'X-Unique-Upload-Id': uniqueUploadId,
              'User-Agent': 'Siddharth-Portfolio-Migration/1.0',
            },
          };

          const req = https.request(reqOptions, (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => {
              try {
                const json = JSON.parse(body);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolveChunk(json);
                } else {
                  rejectChunk(new Error(`Chunk upload failed (${res.statusCode}): ${json.error?.message || body}`));
                }
              } catch (e) {
                rejectChunk(new Error(`Failed to parse chunk response: ${e.message}`));
              }
            });
          });

          req.on('error', rejectChunk);
          req.write(headerParts);
          req.write(chunkBuffer);
          req.end(footer);
        });

        if (isLastChunk) {
          finalResponse = resp;
        }
        chunkSuccess = true;
        if (onProgress) {
          const pct = Math.min(100, Math.round((end / totalBytes) * 100));
          onProgress(chunkIndex, totalChunks, pct);
        }
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    if (!chunkSuccess) {
      throw new Error(`Chunk ${chunkIndex}/${totalChunks} failed after 3 attempts: ${lastError?.message}`);
    }

    offset = end;
  }

  return finalResponse;
}

// 5. PROBING STREAMING & ACCESSIBILITY
function probeUrl(url, isVideo) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: isVideo ? { Range: 'bytes=0-1024' } : {},
      };

      const req = https.request(options, (res) => {
        let bytes = 0;
        res.on('data', (d) => (bytes += d.length));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            acceptRanges: res.headers['accept-ranges'],
            contentRange: res.headers['content-range'],
            contentType: res.headers['content-type'],
            contentLength: res.headers['content-length'],
            success: isVideo ? res.statusCode === 206 : res.statusCode === 200,
          });
        });
      });

      req.on('error', (err) => resolve({ statusCode: 0, error: err.message, success: false }));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ statusCode: 408, error: 'Timeout', success: false });
      });
      req.end();
    } catch (e) {
      resolve({ statusCode: 0, error: e.message, success: false });
    }
  });
}

module.exports = {
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
};
