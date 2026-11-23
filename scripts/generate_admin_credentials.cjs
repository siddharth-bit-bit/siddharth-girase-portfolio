#!/usr/bin/env node
/**
 * ==============================================================================
 * SIDDHARTH GIRASE PORTFOLIO — SECURE ADMIN CREDENTIAL GENERATOR
 * ==============================================================================
 * Generates cryptographic password hash, salt, and JWT signing secret
 * for Cloudflare Pages Environment Variables and local .env configuration.
 *
 * Usage:
 *   node scripts/generate_admin_credentials.cjs "YourNewSecurePassword"
 *   OR run without arguments to enter password securely:
 *   node scripts/generate_admin_credentials.cjs
 *
 * Algorithm:
 *   - PBKDF2 with SHA-512, 100,000 iterations, 64-byte key length
 *   - Cryptographically secure 24-byte random salt (48 hex chars)
 *   - Cryptographically secure 48-byte random JWT secret (96 hex chars)
 * ==============================================================================
 */

const crypto = require("crypto");
const readline = require("readline");

function generateCredentials(password) {
  if (!password || password.length < 8) {
    console.error("\n❌ Error: Password must be at least 8 characters long for security.\n");
    process.exit(1);
  }

  // Generate 24-byte cryptographic random salt (48 hex chars)
  const salt = crypto.randomBytes(24).toString("hex");

  // Derive 64-byte PBKDF2 SHA-512 hash (100,000 iterations)
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

  // Generate 48-byte cryptographic random session signing secret (96 hex chars)
  const jwtSecret = crypto.randomBytes(48).toString("hex");

  console.log("\n==============================================================================");
  console.log("  🔐 SECURE ADMIN CREDENTIALS GENERATED SUCCESSFULLY");
  console.log("==============================================================================\n");
  console.log("Add the following 3 variables to your Cloudflare Pages project:\n");
  console.log("  Cloudflare Dashboard -> Workers & Pages -> your-project -> Settings");
  console.log("  -> Environment variables -> Production (and Preview)\n");
  console.log("------------------------------------------------------------------------------");
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`ADMIN_SALT=${salt}`);
  console.log(`ADMIN_JWT_SECRET=${jwtSecret}`);
  console.log("------------------------------------------------------------------------------\n");
  console.log("For local development, you can also add these to your local .env file.");
  console.log("⚠️  NEVER commit real credentials, hashes, or secrets to Git or GitHub.\n");
}

const argPassword = process.argv[2];

if (argPassword) {
  generateCredentials(argPassword);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter your new secure admin password: ", (pwd) => {
    rl.close();
    generateCredentials(pwd.trim());
  });
}
