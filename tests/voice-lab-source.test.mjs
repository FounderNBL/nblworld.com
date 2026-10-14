import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const legacy=readFileSync(new URL("../voice-lab.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../voice-lab.html",import.meta.url),"utf8");

test("Old .com Founder Voice Lab only redirects to its protected .org home",()=>{
  const target="https://newbeansland.org/voice-lab.html";
  assert.match(page,/http-equiv="refresh"/);
  assert.ok(page.includes('content="0;url='+target+'"'));
  assert.ok(page.includes('location.replace("'+target+'")'));
  assert.ok(page.includes('href="'+target+'"'));
  assert.doesNotMatch(page,/data-voice-generate|data-voice-consent|clerk.browser|buy\.stripe\.com/);
});

test("Original guarded voice source preserved for rollback; frontend checks moved to .org",()=>{
  assert.ok(legacy.includes('const VOICE = CORE + "/voice"'));
  assert.ok(legacy.includes('authorization: "Bearer " + bearer'));
  assert.ok(legacy.includes("clerk.session.getToken()"));
  assert.doesNotMatch(legacy,/ELEVENLABS_API_KEY|xi-api-key|sk_(?:live|test)_/);
});
