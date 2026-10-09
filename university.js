(()=>{
"use strict";

const API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-foundation-runtime";
const BILLING_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-billing-link";
const SOCIAL_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-social";
const UNIVERSITY_PUBLIC_CHECKOUT_ENABLED=false;
const CLERK_KEY="pk_live_Y2xlcmsubmV3YmVhbnNsYW5kLm9yZyQ";
const ACCOUNT_PORTAL="https://accounts.newbeansland.org";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={clerk:null,university:null,course:"APSK 101",greyHistory:[],conversationId:null,assessment:null,reader:null,social:{me:null,threadId:null,threadType:null,threadTitle:null,threads:[],helpCases:[],realtimeThread:null,realtimeStop:null}};

function safeReturnUrl(){const u=new URL(location.href);u.hash="";return u.href;}
function signInUrl(){return ACCOUNT_PORTAL+"/sign-in?redirect_url="+encodeURIComponent(safeReturnUrl());}
function loadScript(src,attrs={}){
  return new Promise((resolve,reject)=>{
    const found=[...document.scripts].find(s=>s.src===src);
    if(found){
      if(found.dataset.nblLoaded==="true")return resolve();
      found.addEventListener("load",resolve,{once:true});found.addEventListener("error",reject,{once:true});return;
    }
    const s=document.createElement("script");s.src=src;s.async=true;
    Object.entries(attrs).forEach(([k,v])=>s.setAttribute(k,v));
    s.addEventListener("load",()=>{s.dataset.nblLoaded="true";resolve();},{once:true});
    s.addEventListener("error",reject,{once:true});document.head.appendChild(s);
  });
}
function clerkDomain(){
  const encoded=(CLERK_KEY.split("_")[2]||"").replace(/-/g,"+").replace(/_/g,"/");
  return atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,"=")).replace(/\$/,"");
}
async function getClerk(){
  if(state.clerk)return state.clerk;
  const domain=clerkDomain();
  await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,{crossorigin:"anonymous","data-clerk-publishable-key":CLERK_KEY});
  if(!window.Clerk)throw new Error("NBL account service did not load.");
  await window.Clerk.load();state.clerk=window.Clerk;return state.clerk;
}
async function authToken(){
  const clerk=await getClerk();
  if(!clerk?.isSignedIn||!clerk.session)return null;
  const value=await clerk.session.getToken();
  return typeof value==="string"&&value.trim()?value.trim():null;
}
async function api(body){
  const token=await authToken();
  if(!token){const e=new Error("Sign in with your NBL account first.");e.status=401;throw e;}
  const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body),cache:"no-store"});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(payload?.message||"NBL University is temporarily unavailable.");e.status=response.status;e.code=payload?.code;e.payload=payload;throw e;}
  return payload;
}

async function socialApi(body){
  const token=await authToken();
  if(!token){const e=new Error("Sign in with your NBL account first.");e.status=401;throw e;}
  const response=await fetch(SOCIAL_API,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body),cache:"no-store"});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(payload?.message||payload?.reason||"NBL Social is temporarily unavailable.");e.status=response.status;e.code=payload?.reason;e.payload=payload;throw e;}
  return payload;
}

async function universityPdfPayload(file){
  if(!file)return null;
  if(file.type&&file.type!=="application/pdf")throw new Error("TEST only accepts PDF files here.");
  if(file.size<1)throw new Error("That PDF is empty.");
  if(file.size>4*1024*1024)throw new Error("University PDF submissions are limited to 4 MB.");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const magic=new TextDecoder().decode(bytes.subarray(0,5));
  if(magic!=="%PDF-")throw new Error("That file does not appear to be a real PDF.");
  let binary="";
  const step=0x8000;
  for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+step)));
  return {name:file.name||"student-work.pdf",mime:"application/pdf",data:btoa(binary)};
}
async function billingApi(body){
  const token=await authToken();
  if(!token){const e=new Error("Sign in with your NBL account before enrollment.");e.status=401;throw e;}
  const response=await fetch(BILLING_API,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body),cache:"no-store"});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(payload?.message||"University checkout is temporarily unavailable.");e.status=response.status;e.code=payload?.code;e.payload=payload;throw e;}
  return payload;
}
function trustedBillingDestination(value){
  try{
    const url=new URL(String(value||""));
    return url.protocol==="https:"&&["buy.stripe.com","billing.stripe.com"].includes(url.hostname)?url.href:"";
  }catch{return "";}
}
async function openNbluCheckout(button){
  const status=$("[data-enrollment-checkout-status]");
  if(!UNIVERSITY_PUBLIC_CHECKOUT_ENABLED){
    if(status)status.textContent="University checkout is held pending one controlled real checkout and a second-account record-isolation test.";
    return;
  }
  const plan=String(button?.dataset?.nbluCheckout||"").trim();
  if(!["foundation","full_foundation","full_nblu","nblu_continuation"].includes(plan))return;
  const buttons=$("[data-nblu-checkout]");
  buttons.forEach(item=>item.disabled=true);
  if(status)status.textContent="Preparing secure University checkout…";
  try{
    const token=await authToken();
    if(!token){
      if(status)status.textContent="Sign in first so LOCKE can attach enrollment to the correct NBL account.";
      openSignIn();
      return;
    }
    const result=await billingApi({action:"checkout",plan});
    if(result?.route==="already_owned"){
      if(status)status.textContent=result.message||"Full NBLU is already attached to this account.";
      return;
    }
    if(result?.route==="manage_existing_subscription"){
      const destination=trustedBillingDestination(result.portalUrl);
      if(!destination)throw new Error("Billing management destination was rejected.");
      location.href=destination;
      return;
    }
    const destination=trustedBillingDestination(result?.checkoutUrl);
    if(!destination)throw new Error("Secure Stripe checkout destination was rejected.");
    if(status)status.textContent="Opening Stripe secure checkout…";
    location.href=destination;
  }catch(error){
    if(status)status.textContent=error?.message||"University checkout is temporarily unavailable.";
  }finally{
    buttons.forEach(item=>item.disabled=false);
  }
}
function setStatus(text){$$("[data-campus-status]").forEach(el=>el.textContent=text);}
function openSignIn(){location.href=signInUrl();}
const COURSE_DETAILS={
  "APSK 101":{
    summary:"Slow a claim down, identify the burden, and decide what would actually count as evidence.",
    objectives:["Identify the claim and burden of proof.","Separate evidence from assertion and authority.","Calibrate confidence and say what could change your mind."]
  },
  "ANSY 110":{
    summary:"Test whether a comparison really carries weight, where it maps, and where it breaks.",
    objectives:["Map relevant similarities instead of surface resemblance.","Name important differences and the analogy breakpoint.","Reject unearned transfer while preserving useful comparison."]
  },
  "EBPR 120":{
    summary:"Use evidence to make a decision without claiming more than the evidence earns.",
    objectives:["Match evidence to the question or decision.","Weigh source quality, conflict, and missing evidence.","State a judgment, confidence, limits, and alternatives."]
  }
};
function summary(code){return COURSE_DETAILS[code]?.summary||"NBL University course.";}

function syncCourse(){
  $("[data-course-select]").forEach(el=>el.value=state.course);
  if($("[data-review-course]"))$("[data-review-course]").value=state.course;
}
function progressPercent(u){
  const rows=Array.isArray(u?.courses)?u.courses:[];
  return rows.length?Math.round(rows.filter(x=>x.completed).length/rows.length*100):0;
}
function renderCourses(u){
  const host=$("[data-course-grid]");host.replaceChildren();
  for(const course of u.courses||[]){
    const card=document.createElement("article");
    card.className="course"+(course.current?" is-current":"")+(course.completed?" is-complete":"");
    const detail=COURSE_DETAILS[course.code]||{summary:summary(course.code),objectives:[]};
    const hours=Number(course.estimatedLearningHours||3);
    card.innerHTML=`<span class="course-code">${course.code} · Foundation course · self-paced</span><h3>${course.title}</h3><p>${detail.summary}</p><p class="course-time">Estimated engaged learning · ~${hours} hours</p><ul class="course-objectives">${detail.objectives.map(item=>`<li>${item}</li>`).join("")}</ul><div class="course-foot"><span class="course-state">${course.completed?"Completed":course.current?"Current course":"In sequence"}</span><button class="btn ghost" type="button">Enter course</button></div>`;
    card.querySelector("button").addEventListener("click",()=>{state.course=course.code;syncCourse();$("#grey")?.scrollIntoView({behavior:"smooth"});});
    host.appendChild(card);
  }
}
function renderLibrary(u){
  const labels={course_book:"Course Book",student_workbook:"Workbook",student_guide:"Student Guide"};
  const host=$("[data-library]");host.replaceChildren();
  for(const item of u.materials||[]){
    const card=document.createElement("article");card.className="book";
    card.innerHTML=`<span class="book-type">${labels[item.materialType]||"Student Material"}</span><h3>${item.title}</h3><p>${item.chunks} secure reading sections. Enrollment is checked every time the reader opens.</p><button class="btn" type="button">Open secure reader</button>`;
    card.querySelector("button").addEventListener("click",()=>openMaterial(item.sourceKey,0));
    host.appendChild(card);
  }
}
function renderFrontier(frontier){
  const section=$("[data-frontier]"),stage=$("[data-frontier-stage]");
  section.hidden=false;
  $("[data-campus]").hidden=true;
  const next=frontier?.nextQuestion;
  if(frontier?.completed){
    stage.innerHTML='<div class="frontier-finish"><strong>Baseline complete.</strong><p>Interesting. I know where to start with you now. Welcome to New Beansland University.</p><button class="btn primary" type="button" data-frontier-enter>Enter class</button></div>';
    stage.querySelector("[data-frontier-enter]")?.addEventListener("click",refreshUniversity);
    return;
  }
  if(!next){
    stage.innerHTML='<p class="small-note">This is a baseline, not a grade. Nothing here is one of your official assessment questions.</p><button class="btn primary" type="button" data-frontier-start>Alright, try me.</button>';
    stage.querySelector("[data-frontier-start]")?.addEventListener("click",startFrontier);
    return;
  }
  stage.innerHTML='<p class="frontier-progress">Question '+next.sequence+' of '+next.total+'</p><p class="frontier-question"></p><textarea data-frontier-response maxlength="8000" placeholder="Tell us what you actually think."></textarea><div class="actions"><button class="btn primary" type="button" data-frontier-submit>Lock it in</button></div><p class="small-note">No score. No trick answer sheet. We are watching how you handle the problem.</p>';
  stage.querySelector(".frontier-question").textContent=next.prompt;
  stage.querySelector("[data-frontier-submit]")?.addEventListener("click",submitFrontier);
}
async function startFrontier(){
  const button=$("[data-frontier-start]");if(button)button.disabled=true;
  try{const payload=await api({action:"frontier_start"});renderFrontier(payload.frontier);}
  catch(error){setStatus(error.message||"The Frontier Check could not start.");if(button)button.disabled=false;}
}
async function submitFrontier(){
  const value=$("[data-frontier-response]")?.value.trim();if(!value)return;
  const button=$("[data-frontier-submit]");if(button)button.disabled=true;
  const key=state.university?.frontier?.nextQuestion?.questionKey;
  try{
    const payload=await api({action:"frontier_submit",questionKey:key,response:value});
    if(payload?.frontier)state.university.frontier=payload.frontier;
    renderFrontier(payload.frontier);
  }catch(error){setStatus(error.message||"That Frontier answer could not be saved.");if(button)button.disabled=false;}
}

function prettyKey(value){
  return String(value||"").replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase());
}
function renderStartingPoint(u){
  const panel=$("[data-starting-point]"),summaryEl=$("[data-starting-summary]"),host=$("[data-starting-dimensions]");
  if(!panel||!summaryEl||!host)return;
  const start=u?.startingPoint;
  if(!start){panel.hidden=true;return;}
  panel.hidden=false;
  summaryEl.textContent=start.summary||"Your Frontier Check is complete. Professor Grey will use the pattern of your reasoning to choose examples and pacing.";
  host.replaceChildren();
  for(const item of Array.isArray(start.dimensions)?start.dimensions:[]){
    const row=document.createElement("div");row.className="dimension";
    const name=document.createElement("strong");name.textContent=prettyKey(item.key);
    const level=document.createElement("span");level.textContent=prettyKey(item.level||"observed");
    const note=document.createElement("p");note.textContent=item.note||"";
    row.append(name,level,note);host.appendChild(row);
  }
}
function renderStudentRecord(u){
  const courses=Array.isArray(u?.courses)?u.courses:[];
  const p=u?.progress||{};
  const current=courses.find(x=>x.current)||courses.find(x=>!x.completed)||courses[0];
  const completed=courses.filter(x=>x.completed).length;
  if($("[data-record-course]"))$("[data-record-course]").textContent=current?.code||"Not set";
  if($("[data-record-progress]"))$("[data-record-progress]").textContent=`${completed} of ${courses.length||3} complete`;
  if($("[data-record-assessment]")){
    const status=String(p.assessment_status||"not_started").replaceAll("_"," ");
    const score=p.assessment_score!==null&&p.assessment_score!==undefined?` · ${p.assessment_score}%`:"";
    $("[data-record-assessment]").textContent=prettyKey(status)+score;
  }
}

function renderGradebook(u){
  const host=$("[data-gradebook-body]");if(!host)return;
  host.replaceChildren();
  const rows=Array.isArray(u?.gradebook)?u.gradebook:[];
  const p=u?.progress||{};
  for(const course of u?.courses||[]){
    const row=rows.find(x=>x.courseCode===course.code)||{courseCode:course.code,status:"not_started",attemptNo:null,score:null};
    let status=String(row.status||"not_started");
    if(p.current_course_code===course.code&&p.assessment_status==="submitted")status="review_pending";
    if(course.completed&&status==="not_started")status="completed";
    const tr=document.createElement("tr");
    const recorded=row.gradedAt||row.submittedAt||row.startedAt;
    tr.innerHTML=`<td><strong>${course.code}</strong><span>${course.title}</span></td><td>${status==="review_pending"?"Pending academic review":prettyKey(status)}</td><td>${row.attemptNo??"—"}</td><td>${row.score===null||row.score===undefined?"—":Number(row.score)+"%"}</td><td>${recorded?new Date(recorded).toLocaleDateString():"—"}</td>`;
    host.appendChild(tr);
  }
}

function renderCommunity(payload){
  const profile=payload?.profile||{};
  const name=$("[data-community-name]"),opt=$("[data-community-optin]"),rank=$("[data-community-rank]"),progress=$("[data-community-progress]"),badges=$("[data-community-badges]");
  if(name)name.value=profile.public_display_name||"";
  if(opt)opt.checked=profile.opt_in===true;
  if(rank)rank.checked=profile.show_weekly_rank!==false;
  if(progress)progress.checked=profile.show_progress_percent!==false;
  if(badges)badges.checked=profile.show_course_badges!==false;
  const host=$("[data-community-list]");if(!host)return;
  host.replaceChildren();
  const rows=Array.isArray(payload?.classmates)?payload.classmates:[];
  if(!rows.length){const p=document.createElement("p");p.className="small-note";p.textContent="No students have opted into the class board yet.";host.appendChild(p);return;}
  for(const row of rows){
    const item=document.createElement("div");item.className="community-row"+(row.isYou?" is-you":"");
    const rankText=row.weeklyRank?"#"+row.weeklyRank:"—";
    const detail=[];
    if(row.progressPercent!==null&&row.progressPercent!==undefined)detail.push(row.progressPercent+"% Foundation");
    if(row.completedCourses!==null&&row.completedCourses!==undefined)detail.push(row.completedCourses+" course"+(row.completedCourses===1?"":"s")+" complete");
    item.innerHTML=`<strong><span class="community-rank">${rankText}</span>${row.displayName}${row.isYou?" · You":""}</strong><span>${detail.length?detail.join(" · "):"Participating"}</span>`;
    host.appendChild(item);
  }
}
async function loadCommunity(){
  const host=$("[data-community-list]");if(host)host.innerHTML='<p class="small-note">Loading opted-in classmates…</p>';
  try{const payload=await api({action:"university_community"});renderCommunity(payload);}
  catch(error){if(host){host.replaceChildren();const p=document.createElement("p");p.className="small-note";p.textContent=error.message||"Class community could not be loaded.";host.appendChild(p);}}
}
async function saveCommunity(event){
  event.preventDefault();
  const button=event.currentTarget.querySelector('button[type="submit"]'),status=$("[data-community-status]");
  if(button)button.disabled=true;if(status)status.textContent="Saving your community settings…";
  try{
    await api({
      action:"university_community_update",
      displayName:$("[data-community-name]")?.value.trim()||"",
      optIn:Boolean($("[data-community-optin]")?.checked),
      showWeeklyRank:Boolean($("[data-community-rank]")?.checked),
      showProgressPercent:Boolean($("[data-community-progress]")?.checked),
      showCourseBadges:Boolean($("[data-community-badges]")?.checked)
    });
    if(status)status.textContent="Saved. Only the class details you chose are eligible to appear.";
    await loadCommunity();
  }catch(error){if(status)status.textContent=error.message||"Community settings could not be saved.";}
  finally{if(button)button.disabled=false;}
}
async function submitReviewRequest(event){
  event.preventDefault();
  const button=event.currentTarget.querySelector('button[type="submit"]'),status=$("[data-review-status]");
  const reason=$("[data-review-reason]")?.value.trim()||"";
  if(reason.length<10){if(status)status.textContent="Tell the Registrar what you want reviewed.";return;}
  if(button)button.disabled=true;if(status)status.textContent="Adding your request to the Registrar record…";
  try{
    const payload=await api({action:"academic_review_request",courseCode:$("[data-review-course]")?.value||state.course,reason});
    if(status)status.textContent=payload?.message||"Academic review request recorded.";
    if($("[data-review-reason]"))$("[data-review-reason]").value="";
    await loadSubmissions();
  }catch(error){if(status)status.textContent=error.message||"Academic review request could not be saved.";}
  finally{if(button)button.disabled=false;}
}

function renderUniversity(u){
  state.university=u;
  if(!u?.allowed){state.social.realtimeStop?.();state.social.realtimeStop=null;state.social.realtimeThread=null;}
  if(!u?.allowed){$("[data-campus-gate]").hidden=false;$("[data-frontier]").hidden=true;$("[data-campus]").hidden=true;setStatus("This NBL account does not currently have University enrollment.");return;}
  $("[data-campus-gate]").hidden=true;
  if(u.frontier?.required&&!u.frontier?.completed){
    renderFrontier(u.frontier);
    setStatus("University access confirmed. Finish the Frontier Check before class opens.");
    return;
  }
  $("[data-frontier]").hidden=true;$("[data-campus]").hidden=false;
  $("[data-student-role]").textContent=u.role==="founder"?"Founder University access":"Enrolled NBL University student";
  $("[data-enrollment-status]").textContent="Enrollment: "+String(u.enrollment?.status||u.role||"active").replaceAll("_"," ");
  $("[data-student-number]").textContent=u.student?.student_number?("Student: "+u.student.student_number):(u.role==="founder"?"Founder University access":"Student record pending");
  $("[data-program-name]").textContent=u.program?.title||"New Beansland University Foundation Program";
  const pct=progressPercent(u);$("[data-progress-label]").textContent=pct+"%";$("[data-progress-fill]").style.width=pct+"%";
  const current=(u.courses||[]).find(x=>x.current)||(u.courses||[]).find(x=>!x.completed)||(u.courses||[])[0];if(current)state.course=current.code;
  renderCourses(u);renderLibrary(u);syncCourse();renderStartingPoint(u);renderStudentRecord(u);renderGradebook(u);
  void loadSubmissions();void loadCommunity();void loadAfterGrey();void refreshSocial();
  const p=u.progress||{};
  $("[data-last-result]").textContent=p.assessment_result?(`${p.assessment_result}${p.assessment_score!==null&&p.assessment_score!==undefined?" · "+p.assessment_score+"%":""}`):"No completed course assessment yet.";
  $("[data-last-feedback]").textContent=p.safe_feedback||"Course grades and safe feedback will appear here after an official assessment is graded.";
  setStatus("University access confirmed by LOCKE.");
}
async function refreshUniversity(){
  setStatus("Checking NBL University enrollment…");
  try{const payload=await api({action:"university_status"});renderUniversity(payload.university);}
  catch(error){if(error.status===401){$("[data-campus-gate]").hidden=false;$("[data-frontier]").hidden=true;$("[data-campus]").hidden=true;setStatus("Sign in with your NBL account to enter the campus.");}else setStatus(error.message||"University status could not be loaded.");}
}

function renderSubmissions(rows){
  const host=$("[data-submission-list]");host.replaceChildren();
  if(!rows.length){
    const p=document.createElement("p");p.className="small-note";p.textContent="No submitted course work for "+state.course+" yet.";host.appendChild(p);return;
  }
  for(const row of rows){
    const card=document.createElement("article");card.className="submission";
    const head=document.createElement("div");head.className="submission-title";
    const title=document.createElement("strong");title.textContent=row.title||row.submission_type||"Course work";
    const status=document.createElement("span");status.textContent=String(row.status||"submitted").replaceAll("_"," ");
    head.append(title,status);
    const meta=document.createElement("p");meta.className="small-note";
    const when=row.submitted_at?new Date(row.submitted_at).toLocaleString():"Saved";
    meta.textContent=(row.course_code||state.course)+" · "+String(row.submission_type||"work").replaceAll("_"," ")+" · "+when;
    card.append(head,meta);
    if(row.attachment?.filename){
      const attachment=document.createElement("div");attachment.className="submission-attachment";
      const line=document.createElement("strong");line.textContent="PDF · "+row.attachment.filename;
      const detail=document.createElement("span");
      const size=Number(row.attachment.sizeBytes||0);
      detail.textContent="TEST: "+String(row.attachment.status||"readable").replaceAll("_"," ")+(size?" · "+Math.max(1,Math.round(size/1024))+" KB":"");
      attachment.append(line,detail);
      if(row.attachment.note){
        const note=document.createElement("p");note.textContent=row.attachment.note;attachment.appendChild(note);
      }
      if(Array.isArray(row.attachment.warnings)&&row.attachment.warnings.length){
        const warnings=document.createElement("ul");
        for(const warning of row.attachment.warnings){const li=document.createElement("li");li.textContent=warning;warnings.appendChild(li);}
        attachment.appendChild(warnings);
      }
      card.appendChild(attachment);
    }
    if(row.safe_feedback){
      const feedback=document.createElement("p");feedback.textContent=row.safe_feedback;card.appendChild(feedback);
    }
    host.appendChild(card);
  }
}
async function loadSubmissions(){
  const host=$("[data-submission-list]");if(!host)return;
  host.innerHTML='<p class="small-note">Loading your course work…</p>';
  try{
    const payload=await api({action:"university_submissions",courseCode:state.course});
    renderSubmissions(Array.isArray(payload?.submissions)?payload.submissions:[]);
  }catch(error){
    host.replaceChildren();const p=document.createElement("p");p.className="small-note";p.textContent=error.message||"Course work could not be loaded.";host.appendChild(p);
  }
}
async function submitCourseWork(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=$("[data-coursework-status]");
  const content=$("[data-coursework-content]").value.trim();
  const file=$("[data-coursework-pdf]")?.files?.[0]||null;
  if(!content&&!file){status.textContent="Write some course work or attach a PDF for TEST.";return;}
  button.disabled=true;
  try{
    let payload;
    const common={
      courseCode:state.course,
      submissionType:$("[data-coursework-type]").value,
      title:$("[data-coursework-title]").value.trim(),
      clientSubmissionKey:globalThis.crypto?.randomUUID?.()||("work-"+Date.now())
    };
    if(file){
      status.textContent="TEST is reading and checking your PDF…";
      const pdf=await universityPdfPayload(file);
      payload=await api({...common,action:"university_submit_pdf",note:content,file:pdf});
    }else{
      status.textContent="Submitting to your student record…";
      payload=await api({...common,action:"university_submit_work",content});
    }
    status.textContent=payload?.submission?.attachment
      ?"Submitted. TEST checked the PDF and Elara's Registrar rail has the extracted work."
      :"Submitted. Elara's Registrar rail has it.";
    $("[data-coursework-content]").value="";
    $("[data-coursework-title]").value="";
    if($("[data-coursework-pdf]"))$("[data-coursework-pdf]").value="";
    await loadSubmissions();
  }catch(error){status.textContent=error.message||"Course work could not be submitted.";}
  finally{button.disabled=false;}
}

function renderAfterGrey(payload){
  const host=$("[data-after-grey]");if(!host)return;
  host.replaceChildren();
  const heading=document.createElement("h3");
  const text=document.createElement("p");
  if(!payload?.ready){
    heading.textContent="Not open yet";
    text.textContent=payload?.message||"After Grey opens when this course is passed.";
    host.append(heading,text);return;
  }
  heading.textContent=payload?.course?.code+" complete";
  text.textContent=payload?.message||"Grey's part in this course is complete.";
  host.append(heading,text);
  if(Array.isArray(payload?.carryForward)&&payload.carryForward.length){
    const label=document.createElement("strong");label.textContent="Carry forward";
    const list=document.createElement("ul");
    for(const item of payload.carryForward){const li=document.createElement("li");li.textContent=item;list.appendChild(li);}
    host.append(label,list);
  }
  if(payload?.nextCourse){
    const next=document.createElement("p");next.className="after-grey-next";next.textContent="Next door: "+payload.nextCourse.code+" · "+payload.nextCourse.title;host.appendChild(next);
  }else if(payload?.programComplete){
    const done=document.createElement("p");done.className="after-grey-next";done.textContent="Current Foundation sequence complete. The Registrar keeps the official completion state.";host.appendChild(done);
  }
}
async function loadAfterGrey(){
  const host=$("[data-after-grey]");if(!host)return;
  host.innerHTML='<p class="small-note">Checking the post-class handoff…</p>';
  try{const payload=await api({action:"after_grey",courseCode:state.course});renderAfterGrey(payload);}
  catch(error){host.innerHTML="";const p=document.createElement("p");p.className="small-note";p.textContent=error.message||"After Grey could not load.";host.appendChild(p);}
}

function appendGrey(role,text){
  const log=$("[data-grey-log]"),box=document.createElement("div");box.className="msg "+(role==="user"?"user":"grey");
  const who=document.createElement("strong");who.textContent=role==="user"?"You":"Professor Grey";
  const body=document.createElement("div");body.textContent=text;box.append(who,body);log.appendChild(box);log.scrollTop=log.scrollHeight;
}
async function askGrey(message){
  state.greyHistory.push({role:"user",content:message});appendGrey("user",message);
  const button=$("[data-grey-form] button[type=submit]");button.disabled=true;
  try{
    const payload=await api({action:"grey",courseCode:state.course,messages:state.greyHistory.slice(-12),conversationId:state.conversationId});
    const reply=String(payload?.message||"Professor Grey did not return a lesson response.");
    state.conversationId=payload?.conversationId||state.conversationId;state.greyHistory.push({role:"assistant",content:reply});appendGrey("assistant",reply);
  }catch(error){appendGrey("assistant",error.message||"Professor Grey is temporarily unavailable.");}
  finally{button.disabled=false;}
}

async function checkReadiness(){
  const button=$("[data-grey-readiness]");if(button)button.disabled=true;
  appendGrey("user","Check my readiness for "+state.course+".");
  try{
    const payload=await api({action:"readiness",courseCode:state.course});
    appendGrey("assistant",String(payload?.message||"Professor Grey could not complete the readiness check."));
  }catch(error){appendGrey("assistant",error.message||"Professor Grey could not complete the readiness check.");}
  finally{if(button)button.disabled=false;}
}
function startPractice(){
  void askGrey("Give me one low-stakes practice problem for "+state.course+" based on what I am learning. Do not use or paraphrase an official assessment question. Ask me to reason through it before you explain the answer.");
}

async function openMaterial(sourceKey,index){
  const shell=$("[data-reader]");shell.hidden=false;document.body.style.overflow="hidden";$("[data-reader-body]").textContent="Opening secure course material…";
  try{
    const payload=await api({action:"university_material",sourceKey,chunkIndex:index});state.reader=payload;
    $("[data-reader-title]").textContent=payload.title;$("[data-reader-body]").textContent=payload.content;
    $("[data-reader-position]").textContent=`Section ${payload.chunkIndex+1} of ${payload.totalChunks}${payload.page?" · page "+payload.page:""}`;
    $("[data-reader-prev]").disabled=payload.chunkIndex<=0;$("[data-reader-next]").disabled=payload.chunkIndex>=payload.totalChunks-1;
  }catch(error){$("[data-reader-body]").textContent=error.message||"That material could not be opened.";}
}
function closeReader(){$("[data-reader]").hidden=true;document.body.style.overflow="";}

function renderAssessment(a){
  state.assessment=a;const box=$("[data-assessment-box]");
  if(!a){box.innerHTML="<p>Select a course and start its official assessment when you are ready.</p>";return;}
  if(a.status==="graded"){
    box.innerHTML=`<div class="assessment-result"><h3>${a.result||"Assessment complete"}</h3><p><strong>Score: ${Number(a.score||0)}%</strong></p><p>${a.safeFeedback||"Your result is recorded."}</p></div>`;
    refreshUniversity();return;
  }
  if(a.status==="review_pending"){
    box.innerHTML=`<div class="assessment-result"><h3>${a.result||"Pending final academic review"}</h3><p>${a.safeFeedback||"Your assessment is submitted. A final result will appear after the unresolved academic review is completed."}</p></div>`;
    return;
  }
  const q=a.question;if(!q){box.innerHTML="<p>The next assessment question is not available.</p>";return;}
  box.innerHTML=`<h3>${q.title||("Question "+q.questionNumber)}</h3><p class="assessment-meta">Question ${q.position||q.questionNumber} of ${q.total||"?"} · ${q.points||0} points</p><p>${q.prompt}</p>${q.instructions?`<p class="small-note">${q.instructions}</p>`:""}<textarea data-assessment-response placeholder="Write your reasoning here."></textarea><div class="actions" style="justify-content:flex-start"><button class="btn primary" type="button" data-submit-assessment>Submit response</button></div>`;
  box.querySelector("[data-submit-assessment]").addEventListener("click",submitAssessment);
}
async function startAssessment(){
  const button=$("[data-start-assessment]");button.disabled=true;
  try{const payload=await api({action:"assessment_start",courseCode:state.course});renderAssessment(payload.assessment);}
  catch(error){$("[data-assessment-box]").innerHTML=`<p>${error.message||"Assessment could not be opened."}</p>`;}
  finally{button.disabled=false;}
}
async function submitAssessment(){
  const response=$("[data-assessment-response]")?.value.trim();if(!response)return;
  const button=$("[data-submit-assessment]");if(button)button.disabled=true;
  try{
    const a=state.assessment,payload=await api({action:"assessment_submit",courseCode:state.course,attemptId:a.attemptId,questionNumber:a.question.questionNumber,response});
    renderAssessment(payload.assessment);
  }catch(error){if(button)button.disabled=false;alert(error.message||"Assessment response could not be submitted.");}
}

function socialStatus(text){const el=$("[data-social-status]");if(el)el.textContent=text;}
function socialThreadLabel(row){
  if(row?.thread_type==="direct")return row?.peer?.handle?"@"+row.peer.handle:"Direct message";
  return row?.title||row?.course_code||String(row?.thread_type||"Chat").replaceAll("_"," ");
}
function setSocialComposer(enabled){
  const input=$("[data-social-send-input]"),button=$("[data-social-send-form] button[type=submit]");
  if(input)input.disabled=!enabled;if(button)button.disabled=!enabled;
  const helpInput=$("[data-help-question]"),helpButton=$("[data-help-form] button[type=submit]");
  const study=enabled&&state.social.threadType==="study_hall"&&!state.social.me?.assessmentHelpLocked;
  if(helpInput)helpInput.disabled=!study;if(helpButton)helpButton.disabled=!study;
}
function renderSocialIdentity(me){
  state.social.me=me;
  const handle=$("[data-social-handle]");if(handle)handle.textContent=me?.handle?"@"+me.handle:"@NBL account";
  const helper=$("[data-social-helper]");
  if(helper)helper.textContent=me?.helperMode?("Helper Mode · "+(me.helperLevel||"Unlocked")):"Helper Mode locked · help 5 different classmates to unlock it";
  const credits=$("[data-social-credits]");if(credits)credits.textContent=(Number(me?.studioCredits)||0)+" NBL creative credits";
  if(me?.assessmentHelpLocked)socialStatus("Study Hall peer help is locked during your active official assessment.");
}
async function loadSocialIdentity(){
  const payload=await socialApi({action:"me"});renderSocialIdentity(payload.me||{});return payload.me||{};
}
function renderSocialThreads(rows){
  state.social.threads=rows||[];
  const host=$("[data-social-threads]");if(!host)return;host.replaceChildren();
  if(!state.social.threads.length){const p=document.createElement("p");p.className="small-note";p.textContent="No human chats yet. Open a DM, Class Chat, or Study Hall.";host.appendChild(p);return;}
  for(const row of state.social.threads){
    const b=document.createElement("button");b.type="button";b.className="social-thread-button"+(row.id===state.social.threadId?" is-active":"");
    const strong=document.createElement("strong");strong.textContent=socialThreadLabel(row);
    const meta=document.createElement("span");meta.textContent=String(row.thread_type||"chat").replaceAll("_"," ")+(row.muted?" · muted":"");
    b.append(strong,meta);b.addEventListener("click",()=>openSocialThread(row.id));host.appendChild(b);
  }
}
async function loadSocialThreads(){
  const payload=await socialApi({action:"list_threads"});renderSocialThreads(payload.threads||[]);return payload.threads||[];
}
function ownOpenHelpCase(){
  return (state.social.helpCases||[]).find(x=>x.isYours&&x.status==="open")||null;
}
function renderHelpCases(rows){
  state.social.helpCases=rows||[];
  const host=$("[data-help-cases]");if(!host)return;host.replaceChildren();
  const relevant=state.social.helpCases.filter(x=>x.isYours||x.status==="solved").slice(0,12);
  if(!relevant.length){const p=document.createElement("p");p.className="small-note";p.textContent=state.social.threadType==="study_hall"?"No Study Hall help cases yet.":"Open a Study Hall to use peer help.";host.appendChild(p);return;}
  for(const row of relevant){
    const box=document.createElement("div");box.className="help-case";
    const title=document.createElement("strong");title.textContent=row.status==="open"?"Waiting for classmates":row.status==="escalated"?"Professor Grey answered":row.status==="solved"?"Solved":"Closed";
    const meta=document.createElement("span");
    meta.textContent=(row.courseCode||"Study Hall")+(row.helper?.handle?" · helped by @"+row.helper.handle:"")+(row.pointsAwarded?" · "+row.pointsAwarded+" Helper Points":"");
    box.append(title,meta);
    if(row.isYours&&row.status==="open"){
      const grey=document.createElement("button");grey.type="button";grey.className="btn ghost";grey.textContent="Ask Professor Grey instead";
      grey.addEventListener("click",()=>askGreyFromHelp(row.id));box.appendChild(grey);
    }
    host.appendChild(box);
  }
}
function renderSocialMessages(rows){
  const host=$("[data-social-messages]");if(!host)return;host.replaceChildren();
  if(!rows.length){const p=document.createElement("p");p.className="small-note";p.textContent="No messages yet. Say something.";host.appendChild(p);return;}
  const meHandle=String(state.social.me?.handle||"").toLowerCase(),openCase=ownOpenHelpCase();
  for(const row of rows){
    const sender=String(row?.sender?.handle||"member"),isMe=sender.toLowerCase()===meHandle;
    const box=document.createElement("div");box.className="social-message"+(isMe?" is-me":"")+(row.officialRole?" is-official":"");
    const head=document.createElement("div");head.className="social-message-head";
    const who=document.createElement("strong");who.textContent="@"+sender+(row.officialRole?" ✓":"");
    const when=document.createElement("span");when.textContent=new Date(row.createdAt).toLocaleString();
    head.append(who,when);
    const text=document.createElement("p");text.textContent=row.body||"";
    box.append(head,text);
    const actions=document.createElement("div");actions.className="social-message-actions";
    if(openCase&&!isMe&&!row.officialRole&&row.id!==openCase.questionMessageId){
      const solved=document.createElement("button");solved.type="button";solved.className="btn ghost";solved.textContent="Solved / This helped";
      solved.addEventListener("click",()=>solveSocialHelp(openCase.id,row.id));actions.appendChild(solved);
    }
    if(!isMe&&!row.deleted){
      const report=document.createElement("button");report.type="button";report.className="btn ghost";report.textContent="Report";
      report.addEventListener("click",()=>reportSocialMessage(row.id));actions.appendChild(report);
    }
    if(actions.childNodes.length)box.appendChild(actions);
    host.appendChild(box);
  }
  host.scrollTop=host.scrollHeight;
}
function watchCampusThread(id){
  if(state.social.realtimeThread===id)return;
  state.social.realtimeStop?.();state.social.realtimeStop=null;
  state.social.realtimeThread=id;
  if(!window.NBLSocialRealtime)return;
  state.social.realtimeStop=window.NBLSocialRealtime.watchThread(id,authToken,async()=>{
    if(state.social.threadId!==id||!state.university?.allowed)return;
    const [messages,cases]=await Promise.all([
      socialApi({action:"list_messages",threadId:id}),
      socialApi({action:"list_help_cases",threadId:id})
    ]);
    if(state.social.threadId!==id)return;
    renderHelpCases(cases.cases||[]);renderSocialMessages(messages.messages||[]);
  });
}
async function openSocialThread(threadId){
  state.social.threadId=threadId;
  watchCampusThread(threadId);
  const row=state.social.threads.find(x=>x.id===threadId)||{};
  state.social.threadType=row.thread_type||null;state.social.threadTitle=socialThreadLabel(row);
  const type=$("[data-social-thread-type]"),title=$("[data-social-thread-title]");
  if(type)type.textContent=String(state.social.threadType||"Chat").replaceAll("_"," ");
  if(title)title.textContent=state.social.threadTitle||"Chat";
  const mute=$("[data-social-mute]");if(mute){mute.hidden=false;mute.textContent=row.muted?"Unmute":"Mute";mute.dataset.muted=row.muted?"true":"false";}
  setSocialComposer(true);
  const [messages,cases]=await Promise.all([
    socialApi({action:"list_messages",threadId}),
    socialApi({action:"list_help_cases",threadId})
  ]);
  renderHelpCases(cases.cases||[]);renderSocialMessages(messages.messages||[]);
  renderSocialThreads(state.social.threads);
}
async function refreshSocial(){
  try{
    await loadSocialIdentity();await loadSocialThreads();await loadHelperBoard();
    if(state.social.threadId)await openSocialThread(state.social.threadId);
  }catch(error){socialStatus(error.message||"NBL Social could not refresh.");}
}
async function openStudyHall(){
  try{
    const payload=await socialApi({action:"room",type:"study_hall",courseCode:state.course,title:state.course+" Study Hall"});
    await loadSocialThreads();await openSocialThread(payload.threadId);socialStatus("Study Hall open. Ask classmates first; Grey is still available if you need him.");
  }catch(error){socialStatus(error.message);}
}
async function openClassChat(){
  try{
    const payload=await socialApi({action:"room",type:"class",courseCode:"FOUNDATION",title:"Foundation Class Chat"});
    await loadSocialThreads();await openSocialThread(payload.threadId);socialStatus("Class Chat open.");
  }catch(error){socialStatus(error.message);}
}
async function openDirectMessage(event){
  event.preventDefault();const input=$("[data-social-dm-handle]"),handle=input?.value.trim();if(!handle)return;
  try{
    const payload=await socialApi({action:"direct",handle});if(input)input.value="";
    await loadSocialThreads();await openSocialThread(payload.threadId);socialStatus("Direct message opened with @"+(payload.target?.handle||handle.replace(/^@/,""))+".");
  }catch(error){socialStatus(error.message);}
}
async function sendSocialMessage(event){
  event.preventDefault();const input=$("[data-social-send-input]"),message=input?.value.trim();
  if(!message||!state.social.threadId)return;
  const button=event.currentTarget.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{await socialApi({action:"send",threadId:state.social.threadId,message});input.value="";await openSocialThread(state.social.threadId);}
  catch(error){socialStatus(error.message);}finally{if(button)button.disabled=false;}
}
async function askClassmates(event){
  event.preventDefault();const input=$("[data-help-question]"),question=input?.value.trim();
  if(!question||!state.social.threadId||state.social.threadType!=="study_hall")return;
  const button=event.currentTarget.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{await socialApi({action:"ask_help",threadId:state.social.threadId,question});input.value="";socialStatus("Question posted to classmates.");await openSocialThread(state.social.threadId);}
  catch(error){socialStatus(error.message);}finally{if(button)button.disabled=false;}
}
async function solveSocialHelp(caseId,messageId){
  try{
    const payload=await socialApi({action:"solve_help",caseId,messageId});
    const reward=payload?.solution?.rewards?.newRewards||[];
    socialStatus(reward.length?"Solved. Your classmate earned Helper Points and unlocked an NBL reward.":"Solved. Your classmate earned Helper Points.");
    await Promise.all([loadSocialIdentity(),loadHelperBoard()]);await openSocialThread(state.social.threadId);
  }catch(error){socialStatus(error.message);}
}
async function askGreyFromHelp(caseId){
  try{
    socialStatus("Professor Grey is taking this one…");
    await socialApi({action:"ask_grey",caseId});socialStatus("Grey answered in the Study Hall.");
    await openSocialThread(state.social.threadId);
  }catch(error){socialStatus(error.message);}
}
async function reportSocialMessage(messageId){
  const reason=prompt("Why are you reporting this message?");if(!reason?.trim())return;
  try{await socialApi({action:"report",messageId,reason:reason.trim()});socialStatus("Report recorded for review.");}
  catch(error){socialStatus(error.message);}
}
async function toggleSocialMute(){
  if(!state.social.threadId)return;const button=$("[data-social-mute]"),muted=button?.dataset?.muted==="true";
  try{await socialApi({action:"mute",threadId:state.social.threadId,muted:!muted});await loadSocialThreads();await openSocialThread(state.social.threadId);}
  catch(error){socialStatus(error.message);}
}
function renderHelperBoard(payload){
  const host=$("[data-helper-board]");if(!host)return;host.replaceChildren();
  const rows=payload?.board?.helpers||payload?.helpers||[];
  if(!rows.length){const p=document.createElement("p");p.className="small-note";p.textContent="Nobody has a solved peer-help case this month yet.";host.appendChild(p);return;}
  const list=document.createElement("div");list.className="helper-board";
  for(const row of rows){
    const item=document.createElement("div");item.className="helper-row";
    const rank=document.createElement("strong");rank.textContent="#"+row.rank;
    const name=document.createElement("span");name.textContent="@"+row.username+(row.helperMode?" · "+(row.helperLevel||"Helper Mode"):"");
    const count=document.createElement("b");count.textContent=row.uniqueStudentsHelped+" helped";
    item.append(rank,name,count);list.appendChild(item);
  }
  host.appendChild(list);
}
async function loadHelperBoard(){
  try{const payload=await socialApi({action:"helper_board"});renderHelperBoard(payload.board||payload);}
  catch(error){const host=$("[data-helper-board]");if(host)host.textContent=error.message||"Helper board unavailable.";}
}

async function boot(){
  $("[data-signin]").forEach(b=>b.addEventListener("click",openSignIn));
  $("[data-nblu-checkout]").forEach(button=>button.addEventListener("click",()=>openNbluCheckout(button)));
  $("[data-signout]").addEventListener("click",async()=>{try{const clerk=await getClerk();state.social.realtimeStop?.();await clerk.signOut();location.reload();}catch{location.href=ACCOUNT_PORTAL;}});
  $("[data-grey-form]").addEventListener("submit",async e=>{e.preventDefault();const input=$("[data-grey-input]"),value=input.value.trim();if(!value)return;input.value="";await askGrey(value);});
  $("[data-coursework-form]").addEventListener("submit",submitCourseWork);
  $("[data-community-form]")?.addEventListener("submit",saveCommunity);
  $("[data-review-form]")?.addEventListener("submit",submitReviewRequest);
  $("[data-social-dm-form]")?.addEventListener("submit",openDirectMessage);
  $("[data-social-send-form]")?.addEventListener("submit",sendSocialMessage);
  $("[data-help-form]")?.addEventListener("submit",askClassmates);
  $("[data-social-study]")?.addEventListener("click",openStudyHall);
  $("[data-social-class]")?.addEventListener("click",openClassChat);
  $("[data-social-refresh]")?.addEventListener("click",refreshSocial);
  $("[data-social-mute]")?.addEventListener("click",toggleSocialMute);
  $("[data-coursework-refresh]").addEventListener("click",loadSubmissions);
  $("[data-after-grey-refresh]")?.addEventListener("click",loadAfterGrey);
  $("[data-course-select]").forEach(el=>el.addEventListener("change",e=>{state.course=e.target.value;syncCourse();renderAssessment(null);void loadSubmissions();void loadAfterGrey();}));
  $("[data-start-assessment]").addEventListener("click",startAssessment);
  $("[data-grey-practice]")?.addEventListener("click",startPractice);
  $("[data-grey-readiness]")?.addEventListener("click",checkReadiness);
  $("[data-reader-close]").addEventListener("click",closeReader);$("[data-reader]").addEventListener("click",e=>{if(e.target===e.currentTarget)closeReader();});
  $("[data-reader-prev]").addEventListener("click",()=>state.reader&&openMaterial(state.reader.sourceKey,state.reader.chunkIndex-1));
  $("[data-reader-next]").addEventListener("click",()=>state.reader&&openMaterial(state.reader.sourceKey,state.reader.chunkIndex+1));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("[data-reader]").hidden)closeReader();});
  try{
    const clerk=await getClerk(),signed=Boolean(clerk?.isSignedIn&&clerk.session);
    $$("[data-signin]").forEach(b=>b.hidden=signed);$("[data-signout]").hidden=!signed;
    if(signed)await refreshUniversity();else setStatus("Sign in with your NBL account to enter the campus.");
  }catch{setStatus("NBL account connection is unavailable here right now. Use the sign-in button and try again.");}
}
boot();
})();