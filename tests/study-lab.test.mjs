import { test } from "node:test";
import assert from "node:assert/strict";
import { evidenceReflection, guidedStudyPrompt, reviewQueue } from "../study-lab.mjs";

const course = "APSK 101";
const start = Date.parse("2026-10-11T10:00:00Z");
function entry(title, when, options = {}) {
  return {
    course_code: options.course ?? course,
    submission_type: options.type ?? "reflection",
    title,
    submitted_at: when
  };
}

test("revisit topics appear only for the selected student-safe course and reflection type", () => {
  const rows = [
    entry("Study Lab revisit · Evidence", new Date(start - 2 * 86400000).toISOString()),
    entry("Study Lab revisit · Other course", new Date(start - 2 * 86400000).toISOString(), { course: "ANSY 110" }),
    entry("Study Lab revisit · Assessment", new Date(start - 2 * 86400000).toISOString(), { type: "assessment" })
  ];
  assert.deepEqual(reviewQueue(rows, course, start).map(row => row.topic), ["Evidence"]);
});

test("self-marked revisit waits 24 hours; no mastery is inferred", () => {
  const before = new Date(start - 23 * 3600000).toISOString();
  const after = new Date(start - 25 * 3600000).toISOString();
  const queue = reviewQueue([
    entry("Study Lab revisit · Fresh", before),
    entry("Study Lab revisit · Due", after)
  ], course, start);
  assert.equal(queue[0].topic, "Due");
  assert.equal(queue[0].due, true);
  assert.equal(queue[1].due, false);
  assert.equal(Object.hasOwn(queue[0], "mastered"), false);
});

test("newer self-report of review removes a topic; newer revisit reopens it", () => {
  const rows = [
    entry("Study Lab revisit · Claim", new Date(start - 4 * 86400000).toISOString()),
    entry("Study Lab reviewed · Claim", new Date(start - 2 * 86400000).toISOString())
  ];
  assert.equal(reviewQueue(rows, course, start).length, 0);
  rows.push(entry("Study Lab revisit · Claim", new Date(start - 86400000).toISOString()));
  assert.deepEqual(reviewQueue(rows, course, start).map(x => x.topic), ["Claim"]);
});

test("invalid, future and empty review titles are ignored", () => {
  assert.equal(reviewQueue([
    entry("Study Lab revisit · ", new Date(start).toISOString()),
    entry("Study Lab revisit · Bad", "not-a-date"),
    entry("Study Lab revisit · Tomorrow", new Date(start + 2 * 86400000).toISOString())
  ], course, start).length, 0);
});

test("most recent event wins even when the API returns events out of order", () => {
  const rows = [
    entry("Study Lab reviewed · Alternative", new Date(start - 5 * 3600000).toISOString()),
    entry("Study Lab revisit · Alternative", new Date(start - 4 * 3600000).toISOString()),
    entry("Study Lab revisit · Alternative", new Date(start - 10 * 3600000).toISOString())
  ];
  assert.equal(reviewQueue(rows, course, start).length, 1);
});

test("study notebook reflection keeps each original reasoning step", () => {
  const written = evidenceReflection({
    topic: "Evidence testing",
    claim: "My hypothesis",
    evidence: "Witness and timeline",
    alternative: "Could be a coincidence",
    revision: "A contrary record"
  });
  for (const phrase of ["My hypothesis", "Witness and timeline", "Could be a coincidence", "A contrary record"]) {
    assert.ok(written.includes(phrase));
  }
  assert.match(written, /not an official grade/);
});

test("Grey practice prompt requests original student-safe questioning, not protected answers", () => {
  for (const type of ["practice", "alternate", "challenge"]) {
    const prompt = guidedStudyPrompt(type, "APSK 101", "Identify the claim");
    assert.ok(prompt.includes("approved student-safe"));
    assert.ok(prompt.includes("protected exam"));
    assert.ok(prompt.includes("one"));
    assert.ok(prompt.includes("APSK 101"));
  }
});

test("revisit queue handles no rows and caps output", () => {
  assert.deepEqual(reviewQueue(null, course, start), []);
  const rows = Array.from({ length: 50 }, (_, i) => entry("Study Lab revisit · Concept " + i, new Date(start - 2 * 86400000).toISOString()));
  assert.equal(reviewQueue(rows, course, start).length, 12);
});
