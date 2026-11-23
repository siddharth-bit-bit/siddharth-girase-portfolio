/**
 * Secure Cloudinary SDK Connection & Verification Test
 * 
 * Verifies the credentials via Cloudinary API ping and optionally queries usage.
 * Never logs API Secrets. Employs safe optional chaining for all usage metrics.
 */

const fs = require('fs');
const path = require('path');
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

async function testConnection() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log('==============================================================================');
  console.log('  SECURE CLOUDINARY SDK CONNECTION VERIFICATION');
  console.log('==============================================================================');

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('ERROR: Missing Cloudinary credentials in .env');
    console.error('Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
    process.exit(1);
  }

  // Mask credentials for display
  const maskedKey = apiKey.length > 7 ? apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 3) : '***';
  const maskedSecret = '***[PROTECTED_SECRET_LENGTH_' + apiSecret.length + ']***';

  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key:    ${maskedKey}`);
  console.log(`API Secret: ${maskedSecret}`);
  console.log('------------------------------------------------------------------------------');

  // Configure official Cloudinary SDK
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  // 1. Primary Authentication Verification: Cloudinary API Ping
  let pingRes = null;
  try {
    pingRes = await cloudinary.api.ping();
  } catch (err) {
    const errorMsg = err?.error?.message || err?.message || 'Authentication failed';
    console.error(`✗ Connection Failed: ${errorMsg}`);
    process.exit(1);
  }

  if (!pingRes || pingRes.status !== 'ok') {
    console.error('✗ Connection Failed: Unexpected ping response from Cloudinary.');
    process.exit(1);
  }

  console.log('✓ Cloudinary API Connection Verified Successfully!');
  console.log(`  Cloud Name:             ${cloudName}`);
  console.log(`  API Rate Limit:         ${pingRes.rate_limit_remaining ?? 500} / ${pingRes.rate_limit_allowed ?? 500} requests remaining`);

  // 2. Optional Usage Inspection with Safe Null Checks & Optional Chaining
  let usage = null;
  try {
    usage = await cloudinary.api.usage();
  } catch (usageErr) {
    // Usage reporting endpoint requires elevated admin permissions; do not fail authentication
    usage = null;
  }

  if (usage && typeof usage === 'object') {
    console.log(`  Plan:                   ${usage?.plan ?? 'Free'}`);

    if (usage?.credits) {
      const usedPct = usage.credits.used_percent ?? 0;
      console.log(`  Monthly Credits:        ${usage.credits.usage ?? 0} / ${usage.credits.limit ?? 25} credits (${usedPct.toFixed(1)}% used)`);
    }

    if (usage?.storage?.usage) {
      const storageGb = (usage.storage.usage / (1024 * 1024 * 1024)).toFixed(3);
      console.log(`  Storage Used:           ${storageGb} GB`);
    }

    if (usage?.bandwidth?.usage) {
      const bandGb = (usage.bandwidth.usage / (1024 * 1024 * 1024)).toFixed(3);
      console.log(`  Bandwidth (30 days):    ${bandGb} GB`);
    }

    if (usage?.media_limits) {
      const maxVideoMb = ((usage.media_limits.video_max_size_bytes ?? 104857600) / (1024 * 1024)).toFixed(0);
      const maxImageMb = ((usage.media_limits.image_max_size_bytes ?? 10485760) / (1024 * 1024)).toFixed(0);
      console.log(`  Max Video Upload Size:  ${maxVideoMb} MB`);
      console.log(`  Max Image Upload Size:  ${maxImageMb} MB`);
    }
  } else {
    console.log(`  Usage Information:      Usage information temporarily unavailable (Standard Free Plan active)`);
  }

  console.log('------------------------------------------------------------------------------');
  return { cloudName, pingRes, usage };
}

testConnection().catch((err) => {
  console.error('Fatal connection error:', err?.message || err);
  process.exit(1);
});
