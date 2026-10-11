// NBL University Study Lab: student-safe guided practice, no provider credentials or grading.
const REVIEW_PREFIX = "Study Lab revisit · ";
const CLEARED_PREFIX = "Study Lab reviewed · ";
const NOTE_PREFIX = "Study Lab notebook · ";
const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (value, max = 200) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function reviewQueue(rows, courseCode, now = Date.now()) {
  const latest = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.course_code !== courseCode || row?.submission_type !== "reflection") continue;
    const title = clean(row.title, 180);
    const flagged = title.startsWith(REVIEW_PREFIX);
    const cleared = title.startsWith(CLEARED_PREFIX);
    if (!flagged && !cleared) continue;
    const topic = clean(title.slice((flagged ? REVIEW_PREFIX : CLEARED_PREFIX).length), 140);
    if (!topic) continue;
    const savedAt = Date.parse(row.submitted_at || row.created_at || "");
    if (!Number.isFinite(savedAt) || savedAt > now + DAY_MS) continue;
    const old = latest.get(topic);
    if (!old || savedAt > old.savedAt || (savedAt === old.savedAt && cleared)) {
      latest.set(topic, { topic, savedAt, cleared });
    }
  }
  return [...latest.values()].filter(item => !item.cleared)
    .map(item => ({ topic: item.topic, due: now - item.savedAt >= DAY_MS, nextReviewAt: item.savedAt + DAY_MS }))
    .sort((a, b) => Number(b.due) - Number(a.due) || a.nextReviewAt - b.nextReviewAt)
    .slice(0, 12);
}

export function evidenceReflection({ topic, claim, evidence, alternative, revision }) {
  const parts = [
    "NBL Study Lab · independent practice reflection (not an official grade)",
    "Topic: " + clean(topic, 140),
    "Claim: " + clean(claim, 2500),
    "Evidence: " + clean(evidence, 2500),
    "Alternative interpretation: " + clean(alternative, 2500),
    "What would change my conclusion: " + clean(revision, 2500)
  ];
  return parts.join("\n");
}

export function guidedStudyPrompt(mode, courseCode, topic) {
  const subject = clean(topic, 140);
  const course = clean(courseCode, 20);
  const common = "Use only approved student-safe material from " + course + " about " + subject +
    ". Do not use, reveal, or paraphrase protected exam questions, answers or rubrics. Teach one step at a time.";
  if (mode === "alternate") return common + " Explain this concept in a different way with a simple original example, then ask me one question that checks my reasoning.";
  if (mode === "challenge") return common + " Ask me to distinguish a claim from evidence, consider an alternative explanation, and tell you what would change my mind. Ask one question and wait.";
  return common + " Give one new low-stakes practice question, wait for my attempt, and help me reason it through before giving feedback.";
}

export function mountStudyLab({ api, askGrey, checkReadiness, topicsFor }) {
  const root = document.querySelector("[data-study-lab]");
  if (!root) throw new Error("Study Lab area missing.");
  const field = name => root.querySelector("[data-study-" + name + "]");
  let course = "";
  let unlocked = false;
  let loadSerial = 0;
  let saving = false;
  const status = message => { const node = field("status"); if (node) node.textContent = message; };
  const topic = () => clean(field("topic")?.value, 140);
  const preview = () => {
    for (const name of ["claim", "evidence", "alternative", "revision"]) {
      const node = field("preview-" + name);
      if (node) node.textContent = clean(field(name)?.value, 500) || "Add your " + name + "…";
    }
  };
  const nextCourse = code => {
    course = clean(code, 20);
    const select = field("topic");
    select.replaceChildren();
    for (const item of topicsFor(course)) {
      const opt = document.createElement("option");
      opt.value = clean(item, 140);
      opt.textContent = opt.value;
      select.appendChild(opt);
    }
    preview();
  };
  function textNode(tag, value, cls = "") {
    const node = document.createElement(tag);
    node.textContent = value;
    if (cls) node.className = cls;
    return node;
  }
  function render(rows) {
    const notes = field("notes");
    const review = field("review");
    notes.replaceChildren(); review.replaceChildren();
    const notebook = rows.filter(row => row?.course_code === course && row?.submission_type === "reflection" && clean(row.title).startsWith(NOTE_PREFIX)).slice(0, 8);
    if (!notebook.length) notes.append(textNode("p", "No Study Lab reflections submitted yet. Your note titles will appear here.", "small-note"));
    for (const row of notebook) {
      const item = textNode("li", clean(row.title, 180).slice(NOTE_PREFIX.length) + " · " + new Date(row.submitted_at || row.created_at).toLocaleDateString());
      notes.append(item);
    }
    const pending = reviewQueue(rows, course);
    if (!pending.length) review.append(textNode("p", "No self-marked topics awaiting a revisit.", "small-note"));
    for (const item of pending) {
      const row = document.createElement("div");
      row.className = "study-review-row";
      row.append(textNode("strong", item.topic));
      row.append(textNode("span", item.due ? "Ready to revisit" : "Next reminder: " + new Date(item.nextReviewAt).toLocaleDateString(), "small-note"));
      const action = document.createElement("button");
      action.type = "button"; action.className = "btn ghost";
      action.textContent = "Practice again";
      action.addEventListener("click", () => {
        if (!unlocked || course !== activeCourse) return;
        field("topic").value = item.topic;
        void ask("practice");
      });
      const clear = document.createElement("button");
      clear.type = "button"; clear.className = "btn ghost";
      clear.textContent = "I reviewed this";
      clear.addEventListener("click", () => void saveEvent(CLEARED_PREFIX, item.topic, "Student reports reviewing this topic; no mastery or grade is asserted."));
      row.append(action, clear); review.append(row);
    }
  }
  let activeCourse = "";
  async function refresh() {
    if (!unlocked || !course) return;
    const current = course, seq = ++loadSerial;
    try {
      const payload = await api({ action: "university_submissions", courseCode: current });
      if (!unlocked || course !== current || loadSerial !== seq) return;
      render(Array.isArray(payload.submissions) ? payload.submissions : []);
      status("Your Study Lab history is loaded from your authenticated student record. These are reflections, not academic grades.");
    } catch (err) {
      if (unlocked && course === current && loadSerial === seq) status(err.message || "Study Lab history could not load.");
    }
  }
  async function saveEvent(prefix, eventTopic, content) {
    if (!unlocked || saving || !course || !eventTopic) return;
    saving = true; status("Saving through the NBL Registrar…");
    try {
      await api({
        action: "university_submit_work", courseCode: course, submissionType: "reflection",
        title: prefix + clean(eventTopic, 140), content,
        clientSubmissionKey: crypto.randomUUID()
      });
      await refresh();
      status("Saved to your protected Registrar record. Practice reflections do not change official grades.");
    } catch (err) { status(err.message || "Study Lab could not save your reflection."); }
    finally { saving = false; }
  }
  async function saveNote() {
    if (!unlocked || saving) return;
    const claim = clean(field("claim")?.value, 2500);
    const evidence = clean(field("evidence")?.value, 2500);
    if (!claim || !evidence) { status("Add both a claim and evidence before saving your reflection."); return; }
    await saveEvent(NOTE_PREFIX, topic(), evidenceReflection({
      topic: topic(), claim, evidence,
      alternative: field("alternative")?.value, revision: field("revision")?.value
    }));
  }
  async function ask(mode) {
    if (!unlocked || !topic()) return;
    activeCourse = course;
    document.getElementById("grey")?.scrollIntoView({ behavior: "smooth" });
    await askGrey(guidedStudyPrompt(mode, course, topic()));
  }
  for (const name of ["claim", "evidence", "alternative", "revision"]) field(name)?.addEventListener("input", preview);
  field("save")?.addEventListener("click", () => void saveNote());
  field("flag")?.addEventListener("click", () => void saveEvent(REVIEW_PREFIX, topic(), "Student wants to review this concept again. This is self-reported practice, not evidence of mastery."));
  field("practice")?.addEventListener("click", () => void ask("practice"));
  field("alternate")?.addEventListener("click", () => void ask("alternate"));
  field("challenge")?.addEventListener("click", () => void ask("challenge"));
  field("readiness")?.addEventListener("click", async () => {
    if (!unlocked) return;
    document.getElementById("grey")?.scrollIntoView({ behavior: "smooth" });
    await checkReadiness();
  });
  field("refresh")?.addEventListener("click", () => void refresh());
  return {
    open(code) { unlocked = true; nextCourse(code); void refresh(); },
    setCourse(code) { if (!unlocked) return; nextCourse(code); void refresh(); },
    close() { unlocked = false; course = ""; ++loadSerial; field("notes")?.replaceChildren(); field("review")?.replaceChildren(); status("Sign in and enter the University to use Study Lab."); },
    refresh
  };
}
