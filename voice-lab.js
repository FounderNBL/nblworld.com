// NBL Voice Founder workbench. Uses the NBL Core route, not a provider key.
// Paid provider calls require BOTH the verified server-side Founder authority
// and explicit confirmation for each request. No retail/checkout path exists.
(() => {
  "use strict";
  const CORE = "https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-core";
  const VOICE = CORE + "/voice";
  const CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsubmV3YmVhbnNsYW5kLm9yZyQ";
  const ACCOUNT_PORTAL = "https://accounts.newbeansland.org";
  const $ = selector => document.querySelector(selector);
  const state = { clerk: null, owner: false, sampleReady: false, busy: false, audioUrl: null };
  const text = (selector, value) => { const node = $(selector); if (node) node.textContent = String(value); };
  const signInUrl = () => {
    const here = new URL(location.href);
    here.hash = "";
    return ACCOUNT_PORTAL + "/sign-in?redirect_url=" + encodeURIComponent(here.href);
  };
  function domainFromKey() {
    const part = (CLERK_PUBLISHABLE_KEY.split("_")[2] || "").replace(/-/g, "+").replace(/_/g, "/");
    return atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")).replace(/\$$/, "");
  }
  async function loadClerk() {
    if (state.clerk) return state.clerk;
    const src = "https://" + domainFromKey() + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js";
    if (!window.Clerk) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.dataset.nblVoiceClerk = "true";
        script.setAttribute("data-clerk-publishable-key", CLERK_PUBLISHABLE_KEY);
        script.onload = resolve;
        script.onerror = () => reject(new Error("The NBL sign-in service did not load."));
        document.head.append(script);
      });
    }
    if (!window.Clerk) throw new Error("NBL sign-in is temporarily unavailable.");
    await window.Clerk.load();
    state.clerk = window.Clerk;
    return state.clerk;
  }
  async function token() {
    const clerk = await loadClerk();
    if (!clerk.isSignedIn || !clerk.session) throw new Error("Sign in with your NBL account.");
    const jwt = await clerk.session.getToken();
    if (!jwt) throw new Error("Your session has expired. Sign in again.");
    return jwt;
  }
  async function callVoice(payload, audio = false) {
    const bearer = await token();
    const response = await fetch(VOICE, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + bearer },
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit"
    });
    if (audio && response.ok && response.headers.get("content-type")?.startsWith("audio/")) {
      const blob = await response.blob();
      if (blob.size <= 0 || blob.size > 2000000) throw new Error("Invalid audio sample.");
      return { audio: blob };
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const error = new Error(String(result.reason || "voice_service_unavailable").replace(/_/g, " "));
      error.status = response.status;
      throw error;
    }
    return result;
  }
  function busy(yes) {
    state.busy = yes;
    $("[data-voice-status-check]").disabled = yes;
    $("[data-voice-preview]").disabled = yes;
    $("[data-voice-generate]").disabled = yes || !state.owner || !state.sampleReady || !$("[data-voice-consent]").checked;
  }
  async function status() {
    if (state.busy) return;
    busy(true);
    text("[data-voice-provider-status]", "Checking your NBL provider connection…");
    try {
      const v = await callVoice({ action: "provider_status" });
      text("[data-voice-provider-status]", "Provider connected. Tier: " + (v.tier || "unknown") +
        ". Status: " + (v.status || "unknown") +
        (v.characterCount === null ? "" : ". Character usage: " + v.characterCount +
          " / " + (v.characterLimit ?? "unknown")) + ".");
    } catch (error) {
      text("[data-voice-provider-status]", "Provider check unavailable: " + error.message + ".");
    } finally { busy(false); }
  }
  async function preview() {
    if (state.busy) return;
    busy(true);
    try {
      const result = await callVoice({ action: "preview", text: $("[data-voice-text]").value });
      text("[data-voice-preview-status]", "Validated " + result.characters +
        " characters. No provider generation or customer charge occurred.");
    } catch (error) {
      text("[data-voice-preview-status]", "Preview not available: " + error.message + ".");
    } finally { busy(false); }
  }
  async function generate() {
    if (state.busy || !state.owner || !state.sampleReady || !$("[data-voice-consent]").checked) return;
    // Consent is deliberately reset BEFORE the request, preventing accidental repeats.
    $("[data-voice-consent]").checked = false;
    busy(true);
    text("[data-voice-sample-status]", "Requesting ONE approved sample. This may spend provider credits…");
    try {
      const response = await callVoice({
        action: "founder_sample",
        text: $("[data-voice-text]").value,
        confirmPaidUsage: true
      }, true);
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      state.audioUrl = URL.createObjectURL(response.audio);
      const player = $("[data-voice-audio]");
      player.src = state.audioUrl;
      player.hidden = false;
      text("[data-voice-sample-status]", "Sample returned. Compare actual usage in your ElevenLabs dashboard.");
    } catch (error) {
      text("[data-voice-sample-status]", "No audio returned: " + error.message + ".");
    } finally { busy(false); }
  }
  async function initialize() {
    $("[data-voice-signin]").href = signInUrl();
    try {
      const current = await loadClerk();
      if (!current.isSignedIn || !current.session) {
        text("[data-voice-auth]", "Sign in to access the private Founder workbench.");
        return;
      }
      const result = await callVoice({ action: "founder_access" });
      state.owner = result.founder === true;
      state.sampleReady = result.sampleEnabled === true;
      $("[data-voice-owner]").hidden = !state.owner;
      $("[data-voice-signin]").hidden = state.owner;
      $("[data-voice-consent]").disabled = !state.sampleReady;
      text("[data-voice-auth]", state.owner
        ? "Founder session verified by NBL Voice. Provider status not checked yet."
        : "Founder verification required.");
      text("[data-voice-sample-status]", state.sampleReady
        ? "Founder sample ready for individual consent. A request may spend ElevenLabs credits."
        : "Paid sample is securely disabled in the NBL backend; no provider credits can be used.");
      busy(false);
    } catch (error) {
      text("[data-voice-auth]", error.status === 403
        ? "This workbench is reserved for the verified Founder."
        : "NBL Founder authorization could not be verified. Check your NBL sign-in.");
    }
  }
  $("[data-voice-status-check]").addEventListener("click", () => void status());
  $("[data-voice-preview]").addEventListener("click", () => void preview());
  $("[data-voice-generate]").addEventListener("click", () => void generate());
  $("[data-voice-consent]").addEventListener("change", () => busy(state.busy));
  window.addEventListener("pagehide", () => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  });
  void initialize();
})();
