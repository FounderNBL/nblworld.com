import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../voice-lab.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../voice-lab.html", import.meta.url), "utf8");

test("Founder Voice Lab uses NBL-owned Core and not a direct provider secret", () => {
  assert.ok(ui.includes('const VOICE = CORE + "/voice"'));
  assert.ok(ui.includes('authorization: "Bearer " + bearer'));
  assert.ok(ui.includes("clerk.session.getToken()"));
  assert.doesNotMatch(ui + page, /ELEVENLABS_API_KEY|xi-api-key|sk_(?:live|test)_/);
  assert.doesNotMatch(ui + page, /buy\.stripe\.com|NBL_GOOGLE_FIXER_API_KEY|new PaymentRequest/);
});

test("No customer checkout or existing plan price change", () => {
  assert.match(page, /not a public product/);
  assert.match(page, /does not create a customer checkout/);
  assert.match(page, /No customer payment/);
  assert.doesNotMatch(page, /\$0\.70|\$7\.00|\$29\.99/);
});

test("Only an opted-in Founder sample can request paid generation", () => {
  assert.ok(ui.includes("if (state.busy || !state.owner || !state.sampleReady || !$("));
  assert.ok(ui.includes('action: "founder_sample"'));
  assert.ok(ui.includes("confirmPaidUsage: true"));
  assert.ok(ui.includes('$("[data-voice-consent]").checked = false'));
  assert.ok(page.includes('data-voice-generate disabled'));
  assert.ok(page.includes('data-voice-consent'));
  assert.ok(page.includes('data-voice-owner hidden'));
});

test("Provider status and text preview are read-only", () => {
  assert.ok(ui.includes('action: "provider_status"'));
  assert.ok(ui.includes('action: "preview"'));
  assert.ok(page.includes("Check text only"));
  assert.ok(page.includes("automatic top-ups"));
  assert.ok(page.includes('name="robots" content="noindex,nofollow"'));
});


test("Founder identity verification is not blocked by a missing ElevenLabs key or balance", () => {
  const init = ui.split("async function initialize() {")[1].split('$("[data-voice-status-check]").addEventListener')[0];
  assert.ok(init.includes('action: "founder_access"'));
  assert.ok(!init.includes('action: "provider_status"'));
  assert.ok(ui.includes('state.sampleReady = result.sampleEnabled === true'));
  assert.ok(ui.includes('$("[data-voice-consent]").disabled = !state.sampleReady'));
});
