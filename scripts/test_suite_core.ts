/**
 * Complete Automated Verification Suite for Siddharth Girase Portfolio Security & Endpoints
 * Tests all 18 security and operational assertions before production deployment.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AUTHORIZED_OWNER_EMAIL,
  SESSION_TTL_MS,
  REMEMBER_ME_TTL_MS,
  hashPassword,
  createSessionToken,
  verifySessionToken,
  verifyAdminRequest,
  validateSameOrigin,
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
import { onRequestPost as requestResetHandler } from "../functions/api/auth/request-password-reset.ts";
import { onRequestPost as verifyResetHandler } from "../functions/api/auth/verify-reset-code.ts";
import { onRequestPost as completeResetHandler } from "../functions/api/auth/reset-password.ts";

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
  console.log("SIDDHARTH GIRASE PORTFOLIO — COMPLETE 18-CATEGORY VERIFICATION SUITE");
  console.log("==============================================================================\n");

  // Derive dynamic password hash using PBKDF2 Web Crypto API
  TEST_ENV.ADMIN_PASSWORD_HASH = await hashPassword(TEST_PASSWORD, TEST_ENV.ADMIN_SALT);

  // ----------------------------------------------------------------------------
  // 1. PASSWORD AUTHENTICATION (VALID & INVALID)
  // ----------------------------------------------------------------------------
  console.log("--- 1. Testing Password Authentication ---");
  // Bad email
  const badEmailReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: "wrong@example.com", password: TEST_PASSWORD }),
  });
  const badEmailRes = await loginHandler({ env: TEST_ENV, request: badEmailReq });
  assert(badEmailRes.status === 403, "Login rejects non-owner email with 403 Forbidden");

  // Wrong password
  const wrongPwdReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: "IncorrectPassword!" }),
  });
  const wrongPwdRes = await loginHandler({ env: TEST_ENV, request: wrongPwdReq });
  assert(wrongPwdRes.status === 401, "Login rejects incorrect password with 401 Unauthorized");

  // Valid password
  const validLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const validLoginRes = await loginHandler({ env: TEST_ENV, request: validLoginReq });
  assert(validLoginRes.status === 200, "Login succeeds with valid password (200 OK)");

  // ----------------------------------------------------------------------------
  // 2. MISSING ENVIRONMENT VARIABLE FAILURES (FAIL CLOSED 500)
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Testing Fail-Closed Behavior on Missing Secrets ---");

  // Missing ADMIN_PASSWORD_HASH -> 500
  const envNoHash = { ...TEST_ENV, ADMIN_PASSWORD_HASH: undefined };
  const loginNoHashReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoHashRes = await loginHandler({ env: envNoHash, request: loginNoHashReq });
  assert(loginNoHashRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_PASSWORD_HASH is missing");

  // Missing ADMIN_SALT -> 500
  const envNoSalt = { ...TEST_ENV, ADMIN_SALT: undefined };
  const loginNoSaltReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoSaltRes = await loginHandler({ env: envNoSalt, request: loginNoSaltReq });
  assert(loginNoSaltRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_SALT is missing");

  // Missing ADMIN_JWT_SECRET -> 500
  const envNoSecret = { ...TEST_ENV, ADMIN_JWT_SECRET: undefined };
  const loginNoSecretReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const loginNoSecretRes = await loginHandler({ env: envNoSecret, request: loginNoSecretReq });
  assert(loginNoSecretRes.status === 500, "Login fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing");

  // verifyAdminRequest fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing
  const dummyToken = await createSessionToken(AUTHORIZED_OWNER_EMAIL, TEST_ENV.ADMIN_JWT_SECRET);
  const adminReqNoSecret = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Cookie: `sg_admin_jwt=${dummyToken}` },
  });
  const adminResNoSecret = await verifyAdminRequest({ env: envNoSecret, request: adminReqNoSecret });
  assert(
    adminResNoSecret.authorized === false && adminResNoSecret.errorResponse?.status === 500,
    "verifyAdminRequest fails closed (HTTP 500) when ADMIN_JWT_SECRET is missing"
  );

  // ----------------------------------------------------------------------------
  // 3. NORMAL 24-HOUR SESSIONS (persist: false)
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Testing Normal 24-Hour Sessions ---");
  const normalLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD, persist: false }),
  });
  const normalLoginRes = await loginHandler({ env: TEST_ENV, request: normalLoginReq });
  const normalCookie = normalLoginRes.headers.get("Set-Cookie") || "";
  const normalTokenMatch = normalCookie.match(/sg_admin_jwt=([^;]+)/);
  const normalToken = normalTokenMatch ? decodeURIComponent(normalTokenMatch[1].trim()) : "";

  assert(normalCookie.includes("Max-Age=86400"), "Normal login sets cookie Max-Age=86400 (24 hours)");

  const normalVerify = await verifySessionToken(normalToken, TEST_ENV.ADMIN_JWT_SECRET);
  const normalRemainingHours = ((normalVerify.payload?.expiresAt || 0) - Date.now()) / (1000 * 60 * 60);
  assert(
    normalRemainingHours > 23.5 && normalRemainingHours <= 24.1,
    `Normal token expires in ~24 hours (got ${normalRemainingHours.toFixed(1)}h)`
  );

  // ----------------------------------------------------------------------------
  // 4. REMEMBER ME 30-DAY SESSIONS (persist: true)
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Testing Remember Me 30-Day Sessions ---");
  const persistLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD, persist: true }),
  });
  const persistLoginRes = await loginHandler({ env: TEST_ENV, request: persistLoginReq });
  const persistCookie = persistLoginRes.headers.get("Set-Cookie") || "";
  const persistTokenMatch = persistCookie.match(/sg_admin_jwt=([^;]+)/);
  const persistToken = persistTokenMatch ? decodeURIComponent(persistTokenMatch[1].trim()) : "";

  assert(persistCookie.includes("Max-Age=2592000"), "Remember Me sets cookie Max-Age=2592000 (30 days)");

  const persistVerify = await verifySessionToken(persistToken, TEST_ENV.ADMIN_JWT_SECRET);
  const persistRemainingDays = ((persistVerify.payload?.expiresAt || 0) - Date.now()) / (1000 * 60 * 60 * 24);
  assert(
    persistRemainingDays > 29.5 && persistRemainingDays <= 30.1,
    `Remember Me token expires in ~30 days (got ${persistRemainingDays.toFixed(1)}d)`
  );

  // ----------------------------------------------------------------------------
  // 5. COOKIE & TOKEN EXPIRATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Testing Token Expiration Handling ---");
  // Construct an expired token
  const enc = new TextEncoder();
  const expiredPayload = {
    email: AUTHORIZED_OWNER_EMAIL,
    role: "owner",
    issuedAt: Date.now() - 100000,
    expiresAt: Date.now() - 1000, // already expired
    sessionId: "expired_session_test",
  };
  const expB64 = btoa(JSON.stringify(expiredPayload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(TEST_ENV.ADMIN_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expSigBytes = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(expB64));
  let binStr = "";
  for (const b of new Uint8Array(expSigBytes)) binStr += String.fromCharCode(b);
  const expSigB64 = btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const expiredToken = `${expB64}.${expSigB64}`;

  const expVerify = await verifySessionToken(expiredToken, TEST_ENV.ADMIN_JWT_SECRET);
  assert(expVerify.valid === false && expVerify.reason === "Session expired", "Expired session token is rejected");

  const expCookieReq = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Cookie: `sg_admin_jwt=${expiredToken}` },
  });
  const expCookieRes = await verifyHandler({ env: TEST_ENV, request: expCookieReq });
  assert(expCookieRes.status === 403, "Request bearing expired session cookie returns 403 Access Denied");

  // ----------------------------------------------------------------------------
  // 6. LOGOUT (INVALIDATES COOKIE)
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Testing /api/auth/logout Cookie Invalidation ---");
  const logoutReq = new Request("https://example.com/api/auth/logout", {
    method: "POST",
    headers: { Origin: "https://example.com" },
  });
  const logoutRes = await logoutHandler({ request: logoutReq });
  const logoutCookie = logoutRes.headers.get("Set-Cookie") || "";
  assert(logoutRes.status === 200, "Logout returns 200 OK");
  assert(logoutCookie.includes("Max-Age=0"), "Logout expires cookie with Max-Age=0");
  assert(logoutCookie.includes("HttpOnly"), "Logout cookie maintains HttpOnly flag");

  // ----------------------------------------------------------------------------
  // 7. NO TOKEN IN JSON LOGIN RESPONSE
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Testing No Token in JSON Login Response ---");
  const loginBody: any = await validLoginRes.json();
  assert(loginBody.token === undefined, "Login JSON body does NOT contain token property");
  assert(loginBody.jwt === undefined, "Login JSON body does NOT contain jwt property");
  assert(loginBody.owner?.email === AUTHORIZED_OWNER_EMAIL, "Login response returns non-sensitive owner profile info");

  // ----------------------------------------------------------------------------
  // 8. NO BROWSER JWT STORAGE IN FRONTEND SOURCE CODE
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. Testing Frontend Source Code for Token Storage ---");
  const authClientSrc = fs.readFileSync(path.join(process.cwd(), "src", "utils", "authClient.ts"), "utf-8");
  const videoStorageSrc = fs.readFileSync(path.join(process.cwd(), "src", "data", "videoStorage.ts"), "utf-8");

  assert(
    !authClientSrc.includes("localStorage.setItem('sg_admin_token'") &&
    !authClientSrc.includes("localStorage.setItem(\"sg_admin_token\"") &&
    !authClientSrc.includes("sessionStorage.setItem('sg_admin_token'") &&
    !authClientSrc.includes("sessionStorage.setItem(\"sg_admin_token\""),
    "authClient.ts does NOT store JWT tokens in localStorage or sessionStorage"
  );
  assert(
    authClientSrc.includes('credentials: "same-origin"'),
    "authClient.ts enforces credentials: 'same-origin' for API calls"
  );
  assert(
    !videoStorageSrc.includes("getAuthToken()"),
    "videoStorage.ts does NOT call getAuthToken()"
  );
  assert(
    !videoStorageSrc.includes("Authorization: `Bearer ${token}`") &&
    !videoStorageSrc.includes("Authorization: `Bearer ${auth}"),
    "videoStorage.ts does NOT send Bearer token headers for admin operations"
  );

  // ----------------------------------------------------------------------------
  // 9. BEARER AUTHENTICATION REJECTED (401)
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Testing Bearer Authentication Rejection ---");
  const bearerReq = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: { Authorization: `Bearer ${persistToken}` },
  });
  const bearerRes = await verifyHandler({ env: TEST_ENV, request: bearerReq });
  assert(bearerRes.status === 401, "Bearer header token authentication is REJECTED (401 Unauthorized)");

  // ----------------------------------------------------------------------------
  // 10. BODY-TOKEN AUTHENTICATION REJECTED (401)
  // ----------------------------------------------------------------------------
  console.log("\n--- 10. Testing Body-Token Authentication Rejection ---");
  const bodyTokenReq = new Request("https://example.com/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ token: persistToken }),
  });
  const bodyTokenRes = await verifyHandler({ env: TEST_ENV, request: bodyTokenReq });
  assert(bodyTokenRes.status === 401, "JSON body token authentication is REJECTED (401 Unauthorized)");

  // ----------------------------------------------------------------------------
  // 11. INVALID AND MISMATCHED ORIGIN REJECTED (403)
  // ----------------------------------------------------------------------------
  console.log("\n--- 11. Testing Invalid and Mismatched Origin Rejection ---");
  // Cross-origin Origin header
  const crossOriginReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://malicious-attacker.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const crossOriginRes = await projectSaveHandler({ env: TEST_ENV, request: crossOriginReq });
  assert(crossOriginRes.status === 403, "Mismatched Origin header returns 403 Forbidden");

  // Sec-Fetch-Site: cross-site
  const secFetchReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      "Sec-Fetch-Site": "cross-site",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const secFetchRes = await projectSaveHandler({ env: TEST_ENV, request: secFetchReq });
  assert(secFetchRes.status === 403, "Sec-Fetch-Site: cross-site returns 403 Forbidden");

  // Invalid Origin syntax
  const invalidOriginReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "not_a_valid_url",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const invalidOriginRes = await projectSaveHandler({ env: TEST_ENV, request: invalidOriginReq });
  assert(invalidOriginRes.status === 403, "Malformed Origin header returns 403 Forbidden");

  // ----------------------------------------------------------------------------
  // 12. MISSING ORIGIN REJECTED FOR STATE-CHANGING OPERATIONS (403)
  // ----------------------------------------------------------------------------
  console.log("\n--- 12. Testing Missing Origin Rejection on State-Changing Operations ---");
  const missingOriginReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const missingOriginRes = await projectSaveHandler({ env: TEST_ENV, request: missingOriginReq });
  assert(missingOriginRes.status === 403, "Missing Origin/Referer on state-changing POST returns 403 Forbidden");

  // ----------------------------------------------------------------------------
  // 13. SAME-ORIGIN REQUESTS ACCEPTED (200)
  // ----------------------------------------------------------------------------
  console.log("\n--- 13. Testing Same-Origin Requests Accepted ---");
  const sameOriginReq = new Request("https://example.com/api/auth/verify", {
    method: "GET",
    headers: {
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
  });
  const sameOriginRes = await verifyHandler({ env: TEST_ENV, request: sameOriginReq });
  assert(sameOriginRes.status === 200, "Same-Origin verified session request returns 200 OK");

  // ----------------------------------------------------------------------------
  // 14. ALL SIX ADMIN ENDPOINTS REJECT UNAUTHORIZED REQUESTS (401)
  // ----------------------------------------------------------------------------
  console.log("\n--- 14. Testing All Six Admin Endpoints Reject Unauthorized Requests ---");

  // 1) cloudinary-sign
  const unauthSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ resource_type: "video" }),
  });
  const unauthSignRes = await cldSignHandler({ env: TEST_ENV, request: unauthSignReq });
  assert(unauthSignRes.status === 401, "1/6: /api/admin/cloudinary-sign rejects unauthorized access (401)");

  // 2) cloudinary-usage
  const unauthUsageReq = new Request("https://example.com/api/admin/cloudinary-usage", {
    method: "GET",
    headers: { Origin: "https://example.com" },
  });
  const unauthUsageRes = await cldUsageHandler({ env: TEST_ENV, request: unauthUsageReq });
  assert(unauthUsageRes.status === 401, "2/6: /api/admin/cloudinary-usage rejects unauthorized access (401)");

  // 3) cloudinary-delete
  const unauthCldDelReq = new Request("https://example.com/api/admin/cloudinary-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ publicId: "test_asset" }),
  });
  const unauthCldDelRes = await cldDeleteHandler({ env: TEST_ENV, request: unauthCldDelReq });
  assert(unauthCldDelRes.status === 401, "3/6: /api/admin/cloudinary-delete rejects unauthorized access (401)");

  // 4) projects/save
  const unauthSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const unauthSaveRes = await projectSaveHandler({ env: TEST_ENV, request: unauthSaveReq });
  assert(unauthSaveRes.status === 401, "4/6: /api/admin/projects/save rejects unauthorized access (401)");

  // 5) projects/delete
  const unauthDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ projectId: "custom-vid-1" }),
  });
  const unauthDeleteRes = await projectDeleteHandler({ env: TEST_ENV, request: unauthDeleteReq });
  assert(unauthDeleteRes.status === 401, "5/6: /api/admin/projects/delete rejects unauthorized access (401)");

  // 6) showreel/save
  const unauthShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ showreel: { videoUrl: "https://example.com/v.mp4", posterUrl: "https://example.com/p.jpg" } }),
  });
  const unauthShowreelRes = await showreelSaveHandler({ env: TEST_ENV, request: unauthShowreelReq });
  assert(unauthShowreelRes.status === 401, "6/6: /api/admin/showreel/save rejects unauthorized access (401)");

  // ----------------------------------------------------------------------------
  // 15. ALL SIX ADMIN ENDPOINTS ALLOW VALID COOKIE AUTHENTICATION (200)
  // ----------------------------------------------------------------------------
  console.log("\n--- 15. Testing All Six Admin Endpoints Allow Valid Cookie Authentication ---");

  // Mock D1 for safe local testing
  let lastD1Query = "";
  const MOCK_DB = {
    prepare: (query: string) => {
      lastD1Query = query;
      return {
        bind: (...params: any[]) => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
          first: async () => null,
        }),
      };
    },
  };
  const ENV_WITH_DB = { ...TEST_ENV, DB: MOCK_DB };

  // 1) cloudinary-sign
  const authSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ resource_type: "video", public_id: "test_new_video" }),
  });
  const authSignRes = await cldSignHandler({ env: TEST_ENV, request: authSignReq });
  assert(authSignRes.status === 200, "1/6: Authorized cloudinary-sign returns 200 OK");

  // 2) cloudinary-usage (without credentials configured, returns 503 data.configured=false, which confirms auth passed)
  const authUsageReq = new Request("https://example.com/api/admin/cloudinary-usage", {
    method: "GET",
    headers: { Cookie: `sg_admin_jwt=${persistToken}` },
  });
  const authUsageRes = await cldUsageHandler({ env: { ...TEST_ENV, CLOUDINARY_API_SECRET: "" }, request: authUsageReq });
  assert(authUsageRes.status === 503, "2/6: Authorized cloudinary-usage passes authentication check");

  // 3) cloudinary-delete (with unconfigured mock credentials, returns 503 after passing auth check)
  const authCldDelReq = new Request("https://example.com/api/admin/cloudinary-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ public_id: "siddharth-portfolio/videos/test_delete" }),
  });
  const authCldDelRes = await cldDeleteHandler({
    env: { ...TEST_ENV, CLOUDINARY_API_SECRET: "" },
    request: authCldDelReq,
  });
  assert(authCldDelRes.status === 503, "3/6: Authorized cloudinary-delete passes auth check");

  // 4) projects/save
  const authSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ project: { id: "test-save-1", title: "Test", videoUrl: "https://res.cloudinary.com/sample.mp4" } }),
  });
  const authSaveRes = await projectSaveHandler({ env: ENV_WITH_DB, request: authSaveReq });
  assert(authSaveRes.status === 200, "4/6: Authorized projects/save returns 200 OK");

  // 5) projects/delete
  const authDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
    },
    body: JSON.stringify({ projectId: "test-save-1" }),
  });
  const authDeleteRes = await projectDeleteHandler({ env: ENV_WITH_DB, request: authDeleteReq });
  assert(authDeleteRes.status === 200, "5/6: Authorized projects/delete returns 200 OK");

  // 6) showreel/save
  const authShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Cookie: `sg_admin_jwt=${persistToken}`,
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
  assert(authShowreelRes.status === 200, "6/6: Authorized showreel/save returns 200 OK");

  // ----------------------------------------------------------------------------
  // 16. PROJECTS ENDPOINT
  // ----------------------------------------------------------------------------
  console.log("\n--- 16. Testing Projects Endpoint (/api/projects) ---");
  const pubProjectsReq = new Request("https://example.com/api/projects", { method: "GET" });
  const pubProjectsRes = await projectsGetHandler({ env: TEST_ENV, request: pubProjectsReq });
  const pubProjectsData: any = await pubProjectsRes.json();
  assert(pubProjectsRes.status === 200 && pubProjectsData.success === true, "Public GET /api/projects returns 200 OK");
  assert(pubProjectsData.count === 19, `Public /api/projects returns all 19 active projects (got ${pubProjectsData.count})`);
  assert(
    pubProjectsData.projects.every((p: any) => p.videoUrl && p.videoUrl.startsWith("https://res.cloudinary.com/")),
    "All projects use permanent Cloudinary CDN video URLs"
  );

  // ----------------------------------------------------------------------------
  // 17. SHOWREEL ENDPOINT
  // ----------------------------------------------------------------------------
  console.log("\n--- 17. Testing Showreel Endpoint (/api/showreel) ---");
  const pubShowreelReq = new Request("https://example.com/api/showreel", { method: "GET" });
  const pubShowreelRes = await showreelGetHandler({ env: TEST_ENV });
  const pubShowreelData: any = await pubShowreelRes.json();
  assert(pubShowreelRes.status === 200 && pubShowreelData.success === true, "Public GET /api/showreel returns 200 OK");
  assert(
    pubShowreelData.showreel?.videoUrl.startsWith("https://res.cloudinary.com/"),
    "Showreel videoUrl uses permanent Cloudinary CDN"
  );

  // ----------------------------------------------------------------------------
  // 18. CONTACT FORM VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 18. Testing Contact Form Validation (/api/inquiry) ---");
  // Missing fields
  const missingFieldReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "test@example.com", phone: "123456", message: "Hi" }),
  });
  const missingFieldRes = await inquiryHandler({ env: TEST_ENV, request: missingFieldReq });
  assert(missingFieldRes.status === 400, "Inquiry with missing name returns 400 Bad Request");

  // Invalid email format
  const badEmailInqReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Rohit", email: "not-an-email", phone: "123456", message: "Hi" }),
  });
  const badEmailInqRes = await inquiryHandler({ env: TEST_ENV, request: badEmailInqReq });
  assert(badEmailInqRes.status === 400, "Inquiry with invalid email format returns 400 Bad Request");

  // Missing RESEND_API_KEY
  const noKeyInqReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rohit Sharma",
      email: "rohit@example.com",
      phone: "+91 9876543210",
      projectType: "Reel / Short-Form",
      message: "Need 5 Instagram reels edited this month.",
    }),
  });
  const noKeyInqRes = await inquiryHandler({ env: TEST_ENV, request: noKeyInqReq });
  const noKeyData: any = await noKeyInqRes.json();
  assert(noKeyInqRes.status === 503, "Inquiry without RESEND_API_KEY gracefully returns 503 Service Unavailable");
  assert(noKeyData.message.includes("WhatsApp"), "Inquiry returns helpful WhatsApp fallback message to the user");

  // ----------------------------------------------------------------------------
  // 19. PASSWORD RESET & EMAIL OTP SECURITY FLOW
  // ----------------------------------------------------------------------------
  console.log("\n--- 19. Testing Password Reset & Email OTP Security Flow ---");

  // In-memory mock D1 database implementation for tests
  const mockD1Tables: {
    otps: any[];
    tokens: any[];
    admin: any[];
  } = {
    otps: [],
    tokens: [],
    admin: [{ id: "admin_1", email: AUTHORIZED_OWNER_EMAIL.toLowerCase(), password_hash: TEST_ENV.ADMIN_PASSWORD_HASH, salt: TEST_SALT, updated_at: Date.now() }],
  };

  const mockDB: any = {
    prepare: (query: string) => {
      let boundParams: any[] = [];
      const stmt = {
        bind: (...params: any[]) => {
          boundParams = params;
          return stmt;
        },
        first: async () => {
          if (query.includes("FROM admin_auth")) {
            const email = boundParams[0];
            return mockD1Tables.admin.find((a) => a.email === email) || null;
          }
          if (query.includes("FROM password_reset_otps")) {
            const email = boundParams[0];
            const active = mockD1Tables.otps.filter((o) => o.email === email && o.used === 0);
            return active.sort((a, b) => b.created_at - a.created_at)[0] || null;
          }
          if (query.includes("FROM password_reset_tokens")) {
            const token = boundParams[0];
            return mockD1Tables.tokens.find((t) => t.token === token) || null;
          }
          return null;
        },
        run: async () => {
          if (query.includes("UPDATE password_reset_otps SET used = 1 WHERE email = ? AND used = 0")) {
            const email = boundParams[0];
            mockD1Tables.otps.forEach((o) => {
              if (o.email === email && o.used === 0) o.used = 1;
            });
          } else if (query.includes("INSERT INTO password_reset_otps")) {
            mockD1Tables.otps.push({
              id: boundParams[0],
              email: boundParams[1],
              otp_hash: boundParams[2],
              attempts: 0,
              expires_at: boundParams[3],
              used: 0,
              created_at: boundParams[4],
            });
          } else if (query.includes("UPDATE password_reset_otps SET attempts = ? WHERE id = ?")) {
            const target = mockD1Tables.otps.find((o) => o.id === boundParams[1]);
            if (target) target.attempts = boundParams[0];
          } else if (query.includes("UPDATE password_reset_otps SET used = 1 WHERE id = ?")) {
            const target = mockD1Tables.otps.find((o) => o.id === boundParams[0]);
            if (target) target.used = 1;
          } else if (query.includes("INSERT INTO password_reset_tokens")) {
            mockD1Tables.tokens.push({
              token: boundParams[0],
              email: boundParams[1],
              expires_at: boundParams[2],
              used: 0,
              created_at: boundParams[3],
            });
          } else if (query.includes("UPDATE password_reset_tokens SET used = 1 WHERE token = ?")) {
            const target = mockD1Tables.tokens.find((t) => t.token === boundParams[0]);
            if (target) target.used = 1;
          } else if (query.includes("UPDATE admin_auth SET password_hash = ?, salt = ?, updated_at = ? WHERE email = ?")) {
            const target = mockD1Tables.admin.find((a) => a.email === boundParams[3]);
            if (target) {
              target.password_hash = boundParams[0];
              target.salt = boundParams[1];
              target.updated_at = boundParams[2];
            }
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };

  const RESET_TEST_ENV = {
    ...TEST_ENV,
    DB: mockDB,
    RESEND_API_KEY: "mock_resend_key_for_testing",
  };

  // Mock global fetch for Resend API dispatch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any, init?: any) => {
    if (typeof url === "string" && url.includes("api.resend.com/emails")) {
      return new Response(JSON.stringify({ id: "mock_resend_email_id_12345" }), { status: 200 });
    }
    return originalFetch(url, init);
  };

  // 19.1 Unauthorized email rejection
  const badResetReq = new Request("https://example.com/api/auth/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: "attacker@gmail.com" }),
  });
  const badResetRes = await requestResetHandler({ env: RESET_TEST_ENV, request: badResetReq });
  assert(badResetRes.status === 403, "Request reset rejects non-owner email with 403 Forbidden");

  // 19.2 Valid OTP request
  const validResetReq = new Request("https://example.com/api/auth/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL }),
  });
  const validResetRes = await requestResetHandler({ env: RESET_TEST_ENV, request: validResetReq });
  assert(validResetRes.status === 200, "Request reset dispatches OTP and returns 200 OK");
  assert(mockD1Tables.otps.length === 1, "OTP record is securely saved in database");

  // 19.3 Cooldown enforcement (60s)
  const cooldownReq = new Request("https://example.com/api/auth/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL }),
  });
  const cooldownRes = await requestResetHandler({ env: RESET_TEST_ENV, request: cooldownReq });
  assert(cooldownRes.status === 429, "Immediate repeat reset request is rate-limited (429 Too Many Requests)");

  // 19.4 Incorrect OTP verification
  const wrongOtpReq = new Request("https://example.com/api/auth/verify-reset-code", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, code: "000000" }),
  });
  const wrongOtpRes = await verifyResetHandler({ env: RESET_TEST_ENV, request: wrongOtpReq });
  assert(wrongOtpRes.status === 401, "Incorrect OTP code is rejected with 401 Unauthorized");
  assert(mockD1Tables.otps[0].attempts === 1, "Failed attempt counter is incremented in database");

  // Derive the active OTP code from the stored hash
  let generatedOtp = "";
  const textEnc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEnc.encode(RESET_TEST_ENV.ADMIN_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  for (let c = 100000; c <= 999999; c++) {
    const sig = await crypto.subtle.sign("HMAC", keyMaterial, textEnc.encode(c.toString()));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex === mockD1Tables.otps[0].otp_hash) {
      generatedOtp = c.toString();
      break;
    }
  }

  // 19.5 Correct OTP verification
  const correctOtpReq = new Request("https://example.com/api/auth/verify-reset-code", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, code: generatedOtp }),
  });
  const correctOtpRes = await verifyResetHandler({ env: RESET_TEST_ENV, request: correctOtpReq });
  const correctOtpData: any = await correctOtpRes.json();
  assert(correctOtpRes.status === 200 && Boolean(correctOtpData.resetToken), "Valid OTP verification returns 200 and issues single-use resetToken");
  assert(mockD1Tables.otps[0].used === 1, "OTP is invalidated immediately upon successful verification to prevent replay");

  // 19.6 Replay rejection of used OTP
  const replayOtpReq = new Request("https://example.com/api/auth/verify-reset-code", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, code: generatedOtp }),
  });
  const replayOtpRes = await verifyResetHandler({ env: RESET_TEST_ENV, request: replayOtpReq });
  assert(replayOtpRes.status === 400, "Replaying an already consumed OTP is rejected (400 Bad Request)");

  // 19.7 Password reset completion
  const issuedToken = correctOtpData.resetToken;
  const NEW_ADMIN_PWD = "BrandNewSecurePassword#2026!";
  const resetCompleteReq = new Request("https://example.com/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ resetToken: issuedToken, newPassword: NEW_ADMIN_PWD }),
  });
  const resetCompleteRes = await completeResetHandler({ env: RESET_TEST_ENV, request: resetCompleteReq });
  assert(resetCompleteRes.status === 200, "Password reset completion succeeds (200 OK)");
  assert(mockD1Tables.tokens[0].used === 1, "Reset token is atomically consumed");

  // 19.8 Old password rejection after reset
  const oldPwdLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: TEST_PASSWORD }),
  });
  const oldPwdLoginRes = await loginHandler({ env: RESET_TEST_ENV, request: oldPwdLoginReq });
  assert(oldPwdLoginRes.status === 401, "Old password is now rejected after successful reset in D1 (401 Unauthorized)");

  // 19.9 New password login success
  const newPwdLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: NEW_ADMIN_PWD }),
  });
  const newPwdLoginRes = await loginHandler({ env: RESET_TEST_ENV, request: newPwdLoginReq });
  assert(newPwdLoginRes.status === 200, "Login succeeds with the newly set password (200 OK)");

  // Restore fetch
  globalThis.fetch = originalFetch;

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
