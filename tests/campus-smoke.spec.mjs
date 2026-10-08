import {test,expect} from "@playwright/test";

test("NBL World exposes the University as a real inner-world door",async({page})=>{
  await page.goto("/");
  await expect(page).toHaveTitle(/NBL World/i);
  await expect(page.locator(".world-hero img")).toBeVisible();
  await expect(page.getByRole("heading",{name:"New Beansland University"})).toBeVisible();
  await expect(page.locator("body")).toContainText("Full NBLU Experience");
  await expect(page.locator("body")).toContainText("$184.99");
  await expect(page.getByRole("link",{name:/View Full NBLU/i})).toBeVisible();
  await expect(page.locator("body")).toContainText("End-to-end enrollment is not release-proven yet");
  await expect(page.getByRole("link",{name:"Visit New Beansland"})).toBeVisible();
});

test("University campus loads with a protected enrollment gate",async({page})=>{
  await page.goto("/university.html");
  await expect(page).toHaveTitle(/NBL University Campus/i);
  await expect(page.getByRole("heading",{name:"Student Campus"})).toBeVisible();
  await expect(page.locator("#enroll")).toBeVisible();
  await expect(page.locator("[data-nblu-checkout=\"full_nblu\"]")).toBeVisible();
  await expect(page.locator("[data-nblu-checkout=\"full_nblu\"]")).toBeDisabled();
  await expect(page.locator("[data-release-proof-notice]")).toBeVisible();
  await expect(page.locator("body")).toContainText("$184.99");
  await expect(page.locator("body")).toContainText("$14.99/month");
  await expect(page.locator("[data-campus-gate]")).toBeVisible();
  await expect(page.locator("body")).toContainText("LOCKE opens the classroom only when that account has University enrollment");
  await expect(page.locator("[data-campus]")).toBeHidden();
  await expect(page.locator("[data-frontier]")).toBeHidden();
  await expect(page.locator("body")).toContainText("The Frontier Check");
  await expect(page.locator("body")).toContainText("Some are trying to get you to confidently say some bullshit");
  await expect(page.locator("body")).toContainText("Professor Grey");
  await expect(page.locator("body")).toContainText("Your digital materials");
  await expect(page.locator("body")).toContainText("Course assessment");
  await expect(page.locator("body")).toContainText("Your course work");
  await expect(page.locator("body")).toContainText("Registrar rail");
  await expect(page.locator("body")).toContainText("Gradebook");
  await expect(page.locator("body")).toContainText("approximately 9 hours of engaged learning total");
  await expect(page.locator("body")).toContainText("What each course expects");
  await expect(page.locator("body")).toContainText("Opt-in scoreboard");
  await expect(page.locator("body")).toContainText("Access / accommodation");
  await expect(page.locator("body")).toContainText("Request academic review");
  await expect(page.locator("body")).toContainText("People talking to people");
  await expect(page.locator("#nbl-chat")).toContainText("NBL Chat");
  await expect(page.locator("#helper-board")).toContainText("Helper Board");
  await expect(page.locator("#student-access-fund")).toContainText("NBL Student Access Fund");
  await expect(page.locator("#student-access-fund")).toContainText("Optional $1+ contributions");
});
