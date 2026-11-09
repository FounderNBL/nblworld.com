import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(source,/<link rel="canonical" href="https:\/\/nblworld\.com\/">/);
assert.match(source,/class="social-gateway"/);
for(const target of ["https://newbeansland.org/pulse/","https://newbeansland.org/messenger/"]){
  assert.ok(source.includes('href="'+target+'"'),"Missing member doorway "+target);
  assert.ok(source.includes('<a class="social-gateway-card'),"Expected real accessible anchors");
}
assert.match(source,/aria-label="Explore NBL Pulse on NewBeansland\.org"/);
assert.match(source,/aria-label="Open NBL Messenger on NewBeansland\.org"/);
assert.match(source,/no second sign-in or checkout on NBL World/);
assert.match(source,/There is no separate NBL World member sign-in\./);
assert.match(source,/https:\/\/new-beansland\.myshopify\.com/);
assert.match(source,/https:\/\/books\.newbeansland\.org\//);
assert.match(source,/https:\/\/newbeansland\.org\/pricing\.html/);
assert.doesNotMatch(source,/<iframe\b|clerk\.load|signIn\(|checkout\.sessions|stripe\.redirectToCheckout/i);
assert.match(source,/@media\(max-width:600px\)/);
console.log("PASS: NBL World shop remains commercial-only and Pulse/Messenger link to existing .org member apps.");
