/**
 * Automated Verification Suite for Cloudflare Pages Functions
 * Executed locally to test all ported endpoints before production deployment.
 */

import {
  AUTHORIZED_OWNER_EMAIL,
  hashPassword,
  createSessionToken,
  verifySessionToken,
  verifyAdminRequest,
} from "../functions/utils/auth.ts";

import { onRequestPost as loginHandler } from "../functions/api/auth/login.ts";
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

// Test Environment Mock
const TEST_ENV: any = {
  ADMIN_JWT_SECRET: "test_secret_for_automated_verification_2026",
  CLOUDINARY_CLOUD_NAME: "he2zkdrt",
  CLOUDINARY_API_KEY: "619221426496247",
  CLOUDINARY_API_SECRET: "mock_secret_test_only",
  ADMIN_SALT: "e4f8a1c93b7d2e5f8a0b4c6e8d1a3f5b7c9e0a2d4f6b8a1c",
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
  console.log("CLOUDFLARE PAGES FUNCTIONS AUTOMATED ENDPOINT VERIFICATION");
  console.log("==============================================================================\n");

  // Generate test password hash for "Siddharth@2026!"
  TEST_ENV.ADMIN_PASSWORD_HASH = await hashPassword("Siddharth@2026!", TEST_ENV.ADMIN_SALT);

  // ----------------------------------------------------------------------------
  // 1. AUTH HELPER TESTS
  // ----------------------------------------------------------------------------
  console.log("--- 1. Testing Web Crypto Auth Helpers ---");
  const token = await createSessionToken(AUTHORIZED_OWNER_EMAIL, TEST_ENV.ADMIN_JWT_SECRET);
  assert(typeof token === "string" && token.includes("."), "createSessionToken generates valid JWT");

  const verifyValid = await verifySessionToken(token, TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyValid.valid === true && verifyValid.payload?.email === AUTHORIZED_OWNER_EMAIL, "verifySessionToken approves valid token");

  const verifyTampered = await verifySessionToken(token + "tampered", TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyTampered.valid === false, "verifySessionToken rejects tampered signature");

  const badEmailToken = await createSessionToken("intruder@example.com", TEST_ENV.ADMIN_JWT_SECRET);
  const verifyBadEmail = await verifySessionToken(badEmailToken, TEST_ENV.ADMIN_JWT_SECRET);
  assert(verifyBadEmail.valid === false, "verifySessionToken rejects unauthorized non-owner email");

  // ----------------------------------------------------------------------------
  // 2. /api/auth/login TESTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Testing /api/auth/login ---");
  // Bad email
  const badEmailReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "wrong@example.com", password: "Password123!" }),
  });
  const badEmailRes = await loginHandler({ env: TEST_ENV, request: badEmailReq });
  assert(badEmailRes.status === 403, "Login rejects non-owner email with 403 Forbidden");

  // Wrong password
  const wrongPwdReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: "IncorrectPassword!" }),
  });
  const wrongPwdRes = await loginHandler({ env: TEST_ENV, request: wrongPwdReq });
  assert(wrongPwdRes.status === 401, "Login rejects incorrect password with 401 Unauthorized");

  // Correct login
  const validLoginReq = new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTHORIZED_OWNER_EMAIL, password: "Siddharth@2026!", persist: true }),
  });
  const validLoginRes = await loginHandler({ env: TEST_ENV, request: validLoginReq });
  const loginData: any = await validLoginRes.json();
  const setCookie = validLoginRes.headers.get("Set-Cookie");
  assert(validLoginRes.status === 200 && loginData.success === true, "Login succeeds with valid credentials (200 OK)");
  assert(Boolean(loginData.token), "Login response returns valid token");
  assert(Boolean(setCookie && setCookie.includes("HttpOnly") && setCookie.includes("Secure")), "Login sets HttpOnly Secure Cookie");

  const validToken = loginData.token;

  // ----------------------------------------------------------------------------
  // 3. /api/auth/verify TESTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Testing /api/auth/verify ---");
  // Without token
  const noTokenReq = new Request("https://example.com/api/auth/verify", { method: "POST" });
  const noTokenRes = await verifyHandler({ env: TEST_ENV, request: noTokenReq });
  assert(noTokenRes.status === 401, "Verify without token returns 401 Unauthorized");

  // With valid token in Bearer header
  const authVerifyReq = new Request("https://example.com/api/auth/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}` },
  });
  const authVerifyRes = await verifyHandler({ env: TEST_ENV, request: authVerifyReq });
  const verifyData: any = await authVerifyRes.json();
  assert(authVerifyRes.status === 200 && verifyData.success === true, "Verify with valid Bearer token returns 200 OK");

  // ----------------------------------------------------------------------------
  // 4. PROTECTED ADMIN ENDPOINTS — UNAUTHORIZED REQUESTS (401/403)
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Testing Admin Endpoint Security (Unauthorized Access Blocked) ---");

  const unauthSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource_type: "video" }),
  });
  const unauthSignRes = await cldSignHandler({ env: TEST_ENV, request: unauthSignReq });
  assert(unauthSignRes.status === 401, "/api/admin/cloudinary-sign blocks unauthenticated request (401)");

  const unauthUsageReq = new Request("https://example.com/api/admin/cloudinary-usage", { method: "GET" });
  const unauthUsageRes = await cldUsageHandler({ env: TEST_ENV, request: unauthUsageReq });
  assert(unauthUsageRes.status === 401, "/api/admin/cloudinary-usage blocks unauthenticated request (401)");

  const unauthSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: { id: "test", title: "Test", videoUrl: "https://example.com/v.mp4" } }),
  });
  const unauthSaveRes = await projectSaveHandler({ env: TEST_ENV, request: unauthSaveReq });
  assert(unauthSaveRes.status === 401, "/api/admin/projects/save blocks unauthenticated request (401)");

  const unauthDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "custom-vid-1" }),
  });
  const unauthDeleteRes = await projectDeleteHandler({ env: TEST_ENV, request: unauthDeleteReq });
  assert(unauthDeleteRes.status === 401, "/api/admin/projects/delete blocks unauthenticated request (401)");

  const unauthShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showreel: { videoUrl: "https://example.com/v.mp4", posterUrl: "https://example.com/p.jpg" } }),
  });
  const unauthShowreelRes = await showreelSaveHandler({ env: TEST_ENV, request: unauthShowreelReq });
  assert(unauthShowreelRes.status === 401, "/api/admin/showreel/save blocks unauthenticated request (401)");

  const unauthCldDelReq = new Request("https://example.com/api/admin/cloudinary-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: "test_asset" }),
  });
  const unauthCldDelRes = await cldDeleteHandler({ env: TEST_ENV, request: unauthCldDelReq });
  assert(unauthCldDelRes.status === 401, "/api/admin/cloudinary-delete blocks unauthenticated request (401)");

  // ----------------------------------------------------------------------------
  // 5. PROTECTED ADMIN ENDPOINTS — AUTHORIZED REQUESTS (200 OK)
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Testing Admin Endpoint Functionality (Authorized Access) ---");

  // Mock D1 Database for CRUD operations
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

  // Authorized Cloudinary Sign
  const authSignReq = new Request("https://example.com/api/admin/cloudinary-sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({ resource_type: "video", public_id: "test_new_video" }),
  });
  const authSignRes = await cldSignHandler({ env: TEST_ENV, request: authSignReq });
  const signData: any = await authSignRes.json();
  assert(authSignRes.status === 200 && signData.success === true, "Authorized Cloudinary Sign returns 200 OK");
  assert(Boolean(signData.data?.signature), "Generated signature is present");
  assert(signData.data?.apiKey === TEST_ENV.CLOUDINARY_API_KEY, "API Key is returned");
  assert(!signData.data?.apiSecret, "API Secret is NOT returned in client response");

  // Authorized Project Save
  const testProject = {
    id: "test-proj-new-1",
    title: "Cinematic Reel 2026",
    category: "REELS",
    description: "New project description",
    aspectRatio: "9:16",
    duration: "0:30",
    videoUrl: "https://res.cloudinary.com/he2zkdrt/video/upload/sample.mp4",
    videoPublicId: "siddharth-portfolio/videos/sample",
    thumbnailUrl: "https://res.cloudinary.com/he2zkdrt/image/upload/sample.jpg",
    thumbnailPublicId: "siddharth-portfolio/thumbnails/sample",
  };
  const authSaveReq = new Request("https://example.com/api/admin/projects/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({ project: testProject }),
  });
  const authSaveRes = await projectSaveHandler({ env: ENV_WITH_DB, request: authSaveReq });
  const saveData: any = await authSaveRes.json();
  assert(authSaveRes.status === 200 && saveData.success === true, "Authorized Project Save returns 200 OK");
  assert(lastD1Query.includes("INSERT OR REPLACE INTO projects"), "Project Save executes INSERT OR REPLACE against D1");
  assert(lastD1Params[0] === "test-proj-new-1", "Project ID correctly bound to D1 query");

  // Authorized Project Delete
  const authDeleteReq = new Request("https://example.com/api/admin/projects/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({ projectId: "test-proj-new-1" }),
  });
  const authDeleteRes = await projectDeleteHandler({ env: ENV_WITH_DB, request: authDeleteReq });
  const delData: any = await authDeleteRes.json();
  assert(authDeleteRes.status === 200 && delData.success === true, "Authorized Project Delete returns 200 OK");
  assert(lastD1Query.includes("DELETE FROM projects WHERE id = ?"), "Project Delete executes DELETE against D1");
  assert(lastD1Params[0] === "test-proj-new-1", "Delete ID correctly bound to D1 query");

  // Authorized Showreel Save
  const authShowreelReq = new Request("https://example.com/api/admin/showreel/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({
      showreel: {
        title: "Siddharth Girase — Official Showreel 2026",
        videoUrl: "https://res.cloudinary.com/he2zkdrt/video/upload/showreel.mp4",
        posterUrl: "https://res.cloudinary.com/he2zkdrt/image/upload/showreel.jpg",
      },
    }),
  });
  const authShowreelRes = await showreelSaveHandler({ env: ENV_WITH_DB, request: authShowreelReq });
  const srSaveData: any = await authShowreelRes.json();
  assert(authShowreelRes.status === 200 && srSaveData.success === true, "Authorized Showreel Save returns 200 OK");
  assert(lastD1Query.includes("INSERT OR REPLACE INTO showreel"), "Showreel Save executes INSERT OR REPLACE against D1");

  // ----------------------------------------------------------------------------
  // 6. PUBLIC ENDPOINTS TESTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Testing Public Endpoints (/api/projects & /api/showreel) ---");
  const pubProjectsReq = new Request("https://example.com/api/projects", { method: "GET" });
  const pubProjectsRes = await projectsGetHandler({ env: TEST_ENV, request: pubProjectsReq });
  const pubProjectsData: any = await pubProjectsRes.json();
  assert(pubProjectsRes.status === 200 && pubProjectsData.success === true, "Public GET /api/projects returns 200 OK");
  assert(pubProjectsData.count === 19, `Public /api/projects returns all 19 active projects (got ${pubProjectsData.count})`);
  assert(pubProjectsData.projects[0].videoUrl.startsWith("https://res.cloudinary.com/"), "Public project videoUrl uses permanent Cloudinary CDN");

  const pubShowreelReq = new Request("https://example.com/api/showreel", { method: "GET" });
  const pubShowreelRes = await showreelGetHandler({ env: TEST_ENV });
  const pubShowreelData: any = await pubShowreelRes.json();
  assert(pubShowreelRes.status === 200 && pubShowreelData.success === true, "Public GET /api/showreel returns 200 OK");
  assert(pubShowreelData.showreel?.videoUrl.startsWith("https://res.cloudinary.com/"), "Public showreel videoUrl uses permanent Cloudinary CDN");

  // ----------------------------------------------------------------------------
  // 7. CONTACT FORM (/api/inquiry) TESTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Testing Contact Form (/api/inquiry) Validation & Error Handling ---");
  // Missing fields
  const missingFieldReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "test@example.com", phone: "123456", message: "Hi" }),
  });
  const missingFieldRes = await inquiryHandler({ env: TEST_ENV, request: missingFieldReq });
  assert(missingFieldRes.status === 400, "Inquiry with missing name returns 400 Bad Request");

  // Invalid email
  const badEmailInqReq = new Request("https://example.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Client", email: "not-an-email", phone: "123456", message: "Hi" }),
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
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==============================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
