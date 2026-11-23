/**
 * Automated Verification Suite for Siddharth Girase Portfolio Security & Endpoints
 * Executed locally to test all security assertions before production deployment.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AUTHORIZED_OWNER_EMAIL,
  hashPassword,
  createSessionToken,
  verifySessionToken,
  verifyAdminRequest,
  extractCookieToken,
} from "../functions/utils/auth.ts";

import { onRequestPost as loginHandler } from "../functions/api/auth/login.ts";
import { onRequest as logoutHandler } from "../functions/api/auth/logout.ts";
import { onRequest as verifyHandler } from "../functions/api/auth/verify.ts";
import { onRequestPost as inquiryHandler } from "../functions/api/inquiry.ts";
import { onRequestPost as cldSignHandler } from "../functions/api/admin/cloudinary-sign.ts";
import { onRequestGet as cldUsageHandler } from "../functions/api/admin/cloudinary-usage.ts";
import { onRequestPost as cldDeleteHandler } from "../functions/api/admin/cloudinary-delete.ts";
import { onRequestPost as projectSaveHandler } from "../functions/api/admin/projects/save.ts";
import { onRequestPost as projectDeleteHandler } from "../functions/api/admin/projects/delete.ts";
import { onRequestPost as showreelSaveHandler } from "../functions/api/admin/showreel/save.ts";
import { onRequestGet as projectsGetHandler } from "../functions/api/projects.ts";
import { onRequestGet as showreelGetHandler } from "../functions/api/showreel.ts";

// Test Environment Mock with isolated ephemeral credentials
const TEST_PASSWORD = "AutomatedSecureTest#2026!";
const TEST_SALT = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0";

const TEST_ENV: any = {
  ADMIN_JWT_SECRET: "dynamic_jwt_secret_for_automated_test_suite_2026",
  CLOUDINARY_CLOUD_NAME: "he2zkdrt",
  CLOUDINARY_API_KEY: "619221426496247",
  CLOUDINARY_API_SECRET: "mock_secret_test_only",
  ADMIN_SALT: TEST_SALT,
};

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
    failCount++;
  }
}

async function runTests() {
  console.log("==============================================================================");
  console.log("SIDDHARTH GIRASE PORTFOLIO — COMPLETE SECURITY & ENDPOINT VERIFICATION SUITE");
  console.log("==============================================================================\n");

  // Derive dynamic password hash using PBKDF2 Web Crypto API
  TEST_ENV.ADMIN_PASSWORD_HASH = await hashPassword(TEST_PASSWORD, TEST_ENV.ADMIN_SALT);

  // ----------------------------------------------------------------------------
  // 1. WEB CRYPTO AUTH HELPERS & TOKEN GENERATION
  // ----------------------------------------------------------------------------
  console.log("--- 1. Testing Web Crypto Auth Helpers ---");
  const rawToken = await createSessionToken(AUTHORIZED_OWNER_EMAIL, TEST_ENV.ADMIN_JWT_SECRET);
  assert(typeof rawToken === "string" && rawToken.includes("."), "createSessionToken generates valid JWT");

  const verifyValid = await verifySessionToken(rawToken, TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyValid.valid === true && verifyValid.payload?.email === AUTHORIZED_OWNER_EMAIL, "verifySessionToken approves valid token");

  const verifyTampered = await verifySessionToken(rawToken + "tampered", TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyTampered.valid === false, "verifySessionToken rejects tampered signature");

  const badEmailToken = await createSessionToken("intruder@example.com", TEST_ENV.ADMIN_JWT_SECRET);
  const verifyBadEmail = await verifySessionToken(badEmailToken, TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyBadEmail.valid === false, "verifySessionToken rejects unauthorized non-owner email");

  // ----------------------------------------------------------------------------
  // 2. FAIL-CLOSED BEHAVIOR ON MISSING SECRETS
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Testing Fail-Closed Behavior on Missing Secrets ---");

  // Missing ADMIN_PASSWORD_HASH -> 500
  const envNoHash = { ...TEST_ENV, ADMIN_PASSWORD_HASH: undefined };
  const loginNoHashReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoHashRes = await loginHandler({ env: envNoHash, request: loginNoHashReq });
  assert(loginNoHashRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_PASSWORD_HASH is missing");

  // Missing ADMIN_SALT -> 500
  const envNoSalt = { ...TEST_ENV, ADMIN_SALT: undefined };
  const loginNoSaltReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoSaltRes = await loginHandler({ env: envNoSalt, request: loginNoSaltReq });
  assert(loginNoSaltRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_SALT is missing");

  // Missing ADMIN_JWT_SECRET -> 500
  const envNoSecret = { ...TEST_ENV, ADMIN_JWT_SECRET: undefined };
  const loginNoSecretReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoSecretRes = await loginHandler({ env: envNoSecret, request: loginNoSecretReq });
  assert(loginNoSecretRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing");

  // verifyAdminRequest fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing
  const adminReqNoSecret = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Cookie: `sg_admin_jwt=${rawToken}` },
  });
  const adminResNoSecret = await verifyAdminRequest({ env: envNoSecret, request: adminReqNoSecret });
  assert(
    adminResNoSecret.authorized === false && adminResNoSecret.errorResponse?.status === 500,
    "verifyAdminRequest fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing"
  );

  // ----------------------------------------------------------------------------
  // 3. /api/auth/login — TOKEN NOT IN JSON & COOKIE SETTINGS
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Testing /api/auth/login Token Exposure & Cookie Handling ---");

  // Login request
  const validLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD, persist: true }),
  });
  const validLoginRes = await loginHandler({ env: TEST_ENV, request: validLoginReq });
  const loginData: any = await validLoginRes.json();
  const setCookie = validLoginRes.headers.get("Set-Cookie");

  assert(validLoginRes.status === 200 && loginData.success === true, "Login succeeds with valid credentials (200 OK)");
  assert(loginData.token === undefined, "Login JSON response does NOT expose the JWT token");
  assert(
    Boolean(setCookie && setCookie.includes("sg_admin_jwt=")),
    "Login response sets the sg_admin_jwt cookie"
  );
  assert(
    Boolean(setCookie && setCookie.includes("HttpOnly")),
    "Login session cookie is flagged as HttpOnly"
  );
  assert(
    Boolean(setCookie && setCookie.includes("Secure")),
    "Login session cookie is flagged as Secure"
  );
  assert(
    Boolean(setCookie && setCookie.includes("SameSite=Lax")),
    "Login session cookie has SameSite=Lax attribute"
  );

  // Extract the issued cookie token
  const cookieMatch = setCookie?.match(/sg_admin_jwt=([^;]+)/);
  const issuedCookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1].trim()) : "";
  assert(issuedCookieToken.length > 0, "Successfully parsed issued session token from Set-Cookie header");

  // ----------------------------------------------------------------------------
  // 4. /api/auth/logout — EXPIRES COOKIE
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Testing /api/auth/logout Cookie Expiration ---");
  const logoutRes = await logoutHandler();
  const logoutData: any = await logoutRes.json();
  const logoutCookie = logoutRes.headers.get("Set-Cookie");
  assert(logoutRes.status === 200 && logoutData.success === true, "Logout succeeds (200 OK)");
  assert(Boolean(logoutCookie && logoutCookie.includes("Max-Age=0")), "Logout expires the cookie with Max-Age=0");
  assert(Boolean(logoutCookie && logoutCookie.includes("HttpOnly")), "Logout cookie retains HttpOnly flag");

  // ----------------------------------------------------------------------------
  // 5. AUTHORIZATION REJECTIONS — BEARER & BODY TOKENS REJECTED
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Testing Authorization Rejections (Bearer & Body Tokens Rejected) ---");

  // 1. Missing cookie -> 401
  const noCookieReq = new Request("https://example.com/api/auth/verify", { method: "GET" });
  const noCookieRes = await verifyHandler({ env: TEST_ENV, request: noCookieReq });
  assert(noCookieRes.status === 401, "Requests without session cookie return 401 Unauthorized");

  // 2. Bearer header alone -> REJECTED (401)
  const bearerOnlyReq = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Authorization: `Bearer ${issuedCookieToken}` },
  });
  const bearerOnlyRes = await verifyHandler({ env: TEST_ENV, request: bearerOnlyReq });
  assert(bearerOnlyRes.status === 401, "Bearer header token authentication is REJECTED (401 Unauthorized)");

  // 3. JSON body token alone -> REJECTED (401)
  const jsonBodyReq = new Request("https://example.com/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: issuedCookieToken }),
  });
  const jsonBodyRes = await verifyHandler({ env: TEST_ENV, request: jsonBodyReq });
  assert(jsonBodyRes.status === 401, "JSON body token authentication is REJECTED (401 Unauthorized)");

  // 4. Cookie authentication -> SUCCEEDS (200)
  const cookieReq = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Cookie: `sg_admin_jwt=${issuedCookieToken}` },
  });
  const cookieRes = await verifyHandler({ env: TEST_ENV, request: cookieReq });
  const cookieData: any = await cookieRes.json();
  assert(cookieRes.status === 200 && cookieData.success === true, "HttpOnly Cookie authentication SUCCEEDS (200 OK)");

  // ----------------------------------------------------------------------------
  // 6. ALL SIX ADMIN ENDPOINTS — UNAUTHORIZED REQUESTS REJECTED (401)
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Testing All Six Admin Endpoints Reject Unauthorized Requests ---");

  // 1) cloudinary-sign
  const unauthSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource_type: "video" }),
  });
  const unauthSignRes = await cldSignHandler({ env: TEST_ENV, request: unauthSignReq });
  assert(unauthSignRes.status === 401, "1/6: /api/admin/cloudinary-sign rejects unauthorized access (401)");

  // 2) cloudinary-usage
  const unauthUsageReq = new Request("https://example.com/api/admin/cloudinary-usage", { method: "GET" });
  const unauthUsageRes = await cldUsageHandler({ env: TEST_ENV, request: unauthUsageReq });
  assert(unauthUsageRes.status === 401, "2/6: /api/admin/cloudinary-usage rejects unauthorized access (401)");

  // 3) cloudinary-delete
  const unauthCldDelReq = new Request("https://example.com/api/admin/cloudinary-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: "test_asset" }),
  });
  const unauthCldDelRes = await cldDeleteHandler({ env: TEST_ENV, request: unauthCldDelReq });
  assert(unauthCldDelRes.status === 401, "3/6: /api/admin/cloudinary-delete rejects unauthorized access (401)");

  // 4) projects/save
  const unauthSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const unauthSaveRes = await projectSaveHandler({ env: TEST_ENV, request: unauthSaveReq });
  assert(unauthSaveRes.status === 401, "4/6: /api/admin/projects/save rejects unauthorized access (401)");

  // 5) projects/delete
  const unauthDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "custom-vid-1" }),
  });
  const unauthDeleteRes = await projectDeleteHandler({ env: TEST_ENV, request: unauthDeleteReq });
  assert(unauthDeleteRes.status === 401, "5/6: /api/admin/projects/delete rejects unauthorized access (401)");

  // 6) showreel/save
  const unauthShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showreel: { videoUrl: "https://example.com/v.mp4", posterUrl: "https://example.com/p.jpg" } }),
  });
  const unauthShowreelRes = await showreelSaveHandler({ env: TEST_ENV, request: unauthShowreelReq });
  assert(unauthShowreelRes.status === 401, "6/6: /api/admin/showreel/save rejects unauthorized access (401)");

  // ----------------------------------------------------------------------------
  // 7. AUTHORIZED ADMIN ACCESS VIA COOKIE
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Testing Authorized Admin Operations via Session Cookie ---");

  // Mock D1
  let lastD1Query = "";
  let lastD1Params: any[] = [];
  const MOCK_DB = {
    prepare: (query: string) => {
      lastD1Query = query;
      return {
        bind: (...params: any[]) => {
          lastD1Params = params;
          return {
            run: async () => ({ success: true }),
            all: async () => ({ results: [] }),
            first: async () => null,
          };
        },
      };
    },
  };
  const ENV_WITH_DB = { ...TEST_ENV, DB: MOCK_DB };

  // Authorized Cloudinary Sign (via Cookie)
  const authSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sg_admin_jwt=${issuedCookieToken}`,
    },
    body: JSON.stringify({ resource_type: "video", public_id: "test_new_video" }),
  });
  const authSignRes = await cldSignHandler({ env: TEST_ENV, request: authSignReq });
  const signData: any = await authSignRes.json();
  assert(authSignRes.status === 200 && signData.success === true, "Authorized Cloudinary Sign via Cookie succeeds (200 OK)");

  // Authorized Project Save (via Cookie)
  const testProject = {
    id: "test-proj-cookie-1",
    title: "Cinematic Reel 2026",
    category: "REELS",
    description: "New project description",
    aspectRatio: "9:16",
    duration: "0:30",
    videoUrl: "https://res.cloudinary.com/he2zkdrt/video/upload/sample.mp4",
  };
  const authSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sg_admin_jwt=${issuedCookieToken}`,
    },
    body: JSON.stringify({ project: testProject }),
  });
  const authSaveRes = await projectSaveHandler({ env: ENV_WITH_DB, request: authSaveReq });
  assert(authSaveRes.status === 200, "Authorized Project Save via Cookie succeeds (200 OK)");
  assert(lastD1Query.includes("INSERT OR REPLACE INTO projects"), "Project Save executed D1 query");

  // Authorized Project Delete (via Cookie)
  const authDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sg_admin_jwt=${issuedCookieToken}`,
    },
    body: JSON.stringify({ projectId: "test-proj-cookie-1" }),
  });
  const authDeleteRes = await projectDeleteHandler({ env: ENV_WITH_DB, request: authDeleteReq });
  assert(authDeleteRes.status === 200, "Authorized Project Delete via Cookie succeeds (200 OK)");

  // Authorized Showreel Save (via Cookie)
  const authShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sg_admin_jwt=${issuedCookieToken}`,
    },
    body: JSON.stringify({
      showreel: {
        title: "Siddharth Girase — Official Showreel",
        videoUrl: "https://res.cloudinary.com/he2zkdrt/video/upload/showreel.mp4",
        posterUrl: "https://res.cloudinary.com/he2zkdrt/image/upload/showreel.jpg",
      },
    }),
  });
  const authShowreelRes = await showreelSaveHandler({ env: ENV_WITH_DB, request: authShowreelReq });
  assert(authShowreelRes.status === 200, "Authorized Showreel Save via Cookie succeeds (200 OK)");

  // ----------------------------------------------------------------------------
  // 8. FRONTEND CODE SECURITY AUDIT (NO JWT IN LOCALSTORAGE OR SESSIONSTORAGE)
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. Testing Frontend Source Code for Token Storage ---");
  const authClientSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "utils", "authClient.ts"),
    "utf-8"
  );
  const videoStorageSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "data", "videoStorage.ts"),
    "utf-8"
  );

  // Check authClient.ts
  assert(
    !authClientSrc.includes("localStorage.setItem('sg_admin_token'") &&
    !authClientSrc.includes("localStorage.setItem(\"sg_admin_token\"") &&
    !authClientSrc.includes("sessionStorage.setItem('sg_admin_token'") &&
    !authClientSrc.includes("sessionStorage.setItem(\"sg_admin_token\""),
    "authClient.ts does NOT store JWT tokens in localStorage or sessionStorage"
  );
  assert(
    authClientSrc.includes('credentials: "same-origin"'),
    "authClient.ts enforces credentials: 'same-origin' for session verification and logout"
  );

  // Check videoStorage.ts
  assert(
    !videoStorageSrc.includes("getAuthToken()"),
    "videoStorage.ts does NOT invoke getAuthToken()"
  );
  assert(
    !videoStorageSrc.includes("Authorization: `Bearer ${token}`") &&
    !videoStorageSrc.includes("Authorization: `Bearer ${auth}"),
    "videoStorage.ts does NOT pass Authorization: Bearer tokens for admin/project operations"
  );

  // ----------------------------------------------------------------------------
  // 9. CREDENTIAL GENERATOR CLI ARGUMENT REJECTION
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Testing Credential Generator Rejects CLI Password Arguments ---");
  const scriptPath = path.join(process.cwd(), "scripts", "generate_admin_credentials.cjs");
  const cliTestResult = spawnSync(process.execPath, [scriptPath, "InsecureCliPassword123!"], {
    encoding: "utf-8",
  });

  assert(
    cliTestResult.status === 1,
    "Credential generator exits with code 1 when passwords are provided as CLI arguments"
  );
  assert(
    cliTestResult.stderr.includes("Security Error") &&
    cliTestResult.stderr.includes("Passing passwords as command-line arguments is strictly prohibited"),
    "Credential generator prints clear security error explaining CLI argument prohibition"
  );

  // ----------------------------------------------------------------------------
  // 10. PUBLIC ENDPOINTS & CONTACT FORM
  // ----------------------------------------------------------------------------
  console.log("\n--- 10. Testing Public Endpoints & Inquiry Validation ---");
  const pubProjectsReq = new Request("https://example.com/api/projects", { method: "GET" });
  const pubProjectsRes = await projectsGetHandler({ env: TEST_ENV, request: pubProjectsReq });
  const pubProjectsData: any = await pubProjectsRes.json();
  assert(pubProjectsRes.status === 200 && pubProjectsData.success === true, "Public GET /api/projects returns 200 OK");
  assert(pubProjectsData.count === 19, `Public /api/projects returns all 19 active projects (got ${pubProjectsData.count})`);

  const pubShowreelReq = new Request("https://example.com/api/showreel", { method: "GET" });
  const pubShowreelRes = await showreelGetHandler({ env: TEST_ENV });
  const pubShowreelData: any = await pubShowreelRes.json();
  assert(pubShowreelRes.status === 200 && pubShowreelData.success === true, "Public GET /api/showreel returns 200 OK");

  // Missing inquiry fields
  const missingFieldReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "test@example.com", phone: "123456", message: "Hi" }),
  });
  const missingFieldRes = await inquiryHandler({ env: TEST_ENV, request: missingFieldReq });
  assert(missingFieldRes.status === 400, "Inquiry with missing name returns 400 Bad Request");

  // Missing RESEND_API_KEY
  const noKeyInqReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Client",
      email: "client@example.com",
      phone: "+91 9876543210",
      projectType: "Commercial",
      message: "Inquiry message",
    }),
  });
  const noKeyInqRes = await inquiryHandler({ env: TEST_ENV, request: noKeyInqReq });
  const noKeyData: any = await noKeyInqRes.json();
  assert(noKeyInqRes.status === 503, "Inquiry without RESEND_API_KEY gracefully returns 503 Service Unavailable");
  assert(noKeyData.message.includes("WhatsApp"), "Inquiry returns helpful WhatsApp fallback message to the user");

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==============================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
