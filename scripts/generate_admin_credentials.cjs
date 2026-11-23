#!/usr/bin/env node
/**
 * ==============================================================================
 * SIDDHARTH GIRASE PORTFOLIO — SECURE ADMIN CREDENTIAL GENERATOR
 * ==============================================================================
 * Generates cryptographic password hash, salt, and JWT signing secret
 * for Cloudflare Pages Environment Variables and local .env configuration.
 *
 * SECURITY ENFORCEMENT:
 * - Command-line password arguments are strictly prohibited to prevent
 *   exposure in process tables, shell history, and system logs.
 * - Password input is captured interactively with hidden character echo.
 * - Output values are displayed in standard key-value format for manual copy.
 *
 * Usage:
 *   node scripts/generate_admin_credentials.cjs
 * ==============================================================================
 */

const crypto = require("crypto");

// Strictly reject command-line password arguments
if (process.argv.length > 2) {
  console.error("\n❌ Security Error: Passing passwords as command-line arguments is strictly prohibited.");
  console.error("Command-line arguments are exposed in process listings, terminal history, and system logs.");
  console.error("Please run the command interactively without arguments:\n");
  console.error("   node scripts/generate_admin_credentials.cjs\n");
  process.exit(1);
}

function promptHiddenPassword(promptText) {
  return new Promise((resolve, reject) => {
    process.stdout.write(promptText);

    if (!process.stdin.isTTY) {
      // Handle piped input for automated non-interactive environments
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => {
        const lines = data.split(/\r?\n/).filter((l) => l.trim().length > 0);
        resolve(lines[0] || "");
      });
      process.stdin.on("error", reject);
      return;
    }

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";
    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          if (stdin.setRawMode) {
            stdin.setRawMode(wasRaw || false);
          }
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          return;
        } else if (char === "\u0003") {
          // Ctrl+C
          if (stdin.setRawMode) {
            stdin.setRawMode(wasRaw || false);
          }
          process.stdout.write("\n");
          process.exit(1);
        } else if (char === "\b" || char === "\x7f") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      }
    }
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("\n==============================================================================");
  console.log("  🔐 SIDDHARTH GIRASE PORTFOLIO — INTERACTIVE CREDENTIAL GENERATOR");
  console.log("==============================================================================\n");

  const password = await promptHiddenPassword("Enter new admin password (min 8 characters): ");

  if (!password || password.length < 8) {
    console.error("\n❌ Error: Password must be at least 8 characters long for security.\n");
    process.exit(1);
  }

  // If in interactive TTY mode, ask for confirmation
  if (process.stdin.isTTY) {
    const confirmPassword = await promptHiddenPassword("Confirm new admin password: ");
    if (password !== confirmPassword) {
      console.error("\n❌ Error: Passwords do not match. Please re-run to try again.\n");
      process.exit(1);
    }
  }

  // Generate 24-byte cryptographic random salt (48 hex chars)
  const salt = crypto.randomBytes(24).toString("hex");

  // Derive 64-byte PBKDF2 SHA-512 hash (100,000 iterations -> 128 hex chars)
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

  // Generate 48-byte cryptographic random session signing secret (96 hex chars)
  const jwtSecret = crypto.randomBytes(48).toString("hex");

  console.log("\n==============================================================================");
  console.log("  ✅ SECURE ADMIN CREDENTIALS GENERATED SUCCESSFULLY");
  console.log("==============================================================================\n");
  console.log("Configure these 3 variables in your Cloudflare Pages project:\n");
  console.log("  Cloudflare Dashboard -> Workers & Pages -> your-project -> Settings");
  console.log("  -> Environment variables -> Production (and Preview)\n");
  console.log("------------------------------------------------------------------------------");
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`ADMIN_SALT=${salt}`);
  console.log(`ADMIN_JWT_SECRET=${jwtSecret}`);
  console.log("------------------------------------------------------------------------------\n");
  console.log("For local development, copy these 3 lines into your local .env file.");
  console.log("Never commit passwords, hashes, salts, or secrets to version control.\n");
}

main().catch((err) => {
  console.error("Credential generation error:", err);
  process.exit(1);
});
