import { test, expect } from "@playwright/test";

test("authenticated mock campus opens Study Lab and keeps practice out of official grades", async ({ page }) => {
  const calls = [];
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("requestfailed", request => browserErrors.push(request.url() + ": " + request.failure()?.errorText));
  const submitted = [];
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json"
  };
  await page.addInitScript(() => {
    window.Clerk = {load:async()=>{},isSignedIn:true,session:{getToken:async()=> "stub-signed-in-token"},signOut:async()=>{}};
  });
  await page.route("**/clerk.browser.js", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: "window.Clerk={load:async()=>{},isSignedIn:true,session:{getToken:async()=> 'stub-signed-in-token'},signOut:async()=>{}};"
    });
  });
  await page.route("**/functions/v1/nbl-core/**", async route => {
    const req = route.request();
    if (req.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers }); return;
    }
    let body = {};
    try { body = req.postDataJSON() || {}; } catch {}
    calls.push(body);
    let response = { ok: true };
    switch (body.action) {
      case "university_status":
        response = { university: {
          allowed: true, role: "founder", frontier: { required: false, completed: true },
          program: { title: "Foundation" }, materials: [], gradebook: [],
          courses: [
            { code: "APSK 101", title: "Applied Skepticism", current: true, completed: false },
            { code: "ANSY 110", title: "Analogical Systems", completed: false },
            { code: "EBPR 120", title: "Evidence-Based Practice", completed: false }
          ]
        } }; break;
      case "university_school_plan": response = { schoolOffice: { courses: [] } }; break;
      case "university_submissions": response = { submissions: submitted.filter(x => x.course_code === body.courseCode) }; break;
      case "university_submit_work": {
        const row = {
          id: String(submitted.length + 1), course_code: body.courseCode,
          submission_type: body.submissionType, title: body.title,
          submitted_at: new Date().toISOString(), status: "submitted"
        };
        submitted.unshift(row);
        response = { submission: row }; break;
      }
      case "university_community": response = { profile: {}, classmates: [] }; break;
      case "after_grey": response = { ready: false, message: "Not complete yet." }; break;
      case "grey": response = { message: "What evidence would change your mind?" }; break;
      case "readiness": response = { message: "Keep practicing." }; break;
      default: response = { ok: true };
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify(response) });
  });

  await page.goto("/university.html");
  try {
    await expect(page.locator("[data-campus]")).toBeVisible();
  } catch (error) {
    console.log("STUDY LAB TEST FAILURE", await page.locator("[data-campus-status]").allTextContents(), "ACTIONS", calls.map(c => c.action), "BROWSER ERRORS", browserErrors);
    throw error;
  }
  await expect(page.locator("[data-study-lab]")).toBeVisible();
  await expect(page.locator("[data-study-topic] option")).toHaveCount(3);

  await page.locator("[data-study-claim]").fill("The claim needs testing");
  await page.locator("[data-study-evidence]").fill("The evidence should be independent");
  await expect(page.locator("[data-study-preview-claim]")).toHaveText("The claim needs testing");
  await page.locator("[data-study-save]").click();
  await expect(page.locator("[data-study-notes]")).toContainText("Identify the claim and burden of proof.");
  await expect(page.locator("[data-study-status]")).toContainText("Saved to your protected Registrar record");

  await page.locator("[data-study-flag]").click();
  await expect(page.locator("[data-study-review]")).toContainText("Next reminder");
  await page.locator("[data-study-practice]").click();
  await expect(page.locator("[data-grey-log]")).toContainText("What evidence would change your mind?");

  const saved = calls.filter(x => x.action === "university_submit_work");
  expect(saved).toHaveLength(2);
  expect(saved.every(x => x.submissionType === "reflection")).toBe(true);
  expect(calls.some(x => x.action === "assessment_submit")).toBe(false);
  expect(calls.some(x => x.action === "university_status")).toBe(true);
});
