(()=>{
"use strict";

const API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-foundation-runtime";
const CLERK_KEY="pk_live_Y2xlcmsubmV3YmVhbnNsYW5kLm9yZyQ";
const ACCOUNT_PORTAL="https://accounts.newbeansland.org";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={clerk:null,university:null,course:"APSK 101",greyHistory:[],conversationId:null,assessment:null,reader:null};

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
function setStatus(text){$$("[data-campus-status]").forEach(el=>el.textContent=text);}
function openSignIn(){location.href=signInUrl();}
function summary(code){
  return {"APSK 101":"Slow a claim down, identify the burden, and decide what would actually count as evidence.","ANSY 110":"Test whether a comparison really carries weight, where it maps, and where it breaks.","EBPR 120":"Use evidence to make a decision without claiming more than the evidence earns."}[code]||"NBL University course.";
}
function syncCourse(){
  $$("[data-course-select]").forEach(el=>el.value=state.course);
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
    card.innerHTML=`<span class="course-code">${course.code} · ${course.creditHours||3} credit hours</span><h3>${course.title}</h3><p>${summary(course.code)}</p><div class="course-foot"><span class="course-state">${course.completed?"Completed":course.current?"Current course":"In sequence"}</span><button class="btn ghost" type="button">Enter course</button></div>`;
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
function renderUniversity(u){
  state.university=u;
  if(!u?.allowed){$("[data-campus-gate]").hidden=false;$("[data-campus]").hidden=true;setStatus("This NBL account does not currently have University enrollment.");return;}
  $("[data-campus-gate]").hidden=true;$("[data-campus]").hidden=false;
  $("[data-student-role]").textContent=u.role==="founder"?"Founder University access":"Enrolled NBL University student";
  $("[data-enrollment-status]").textContent="Enrollment: "+String(u.enrollment?.status||u.role||"active").replaceAll("_"," ");
  $("[data-program-name]").textContent=u.program?.title||"New Beansland University Foundation Program";
  const pct=progressPercent(u);$("[data-progress-label]").textContent=pct+"%";$("[data-progress-fill]").style.width=pct+"%";
  const current=(u.courses||[]).find(x=>x.current)||(u.courses||[]).find(x=>!x.completed)||(u.courses||[])[0];if(current)state.course=current.code;
  renderCourses(u);renderLibrary(u);syncCourse();
  const p=u.progress||{};
  $("[data-last-result]").textContent=p.assessment_result?(`${p.assessment_result}${p.assessment_score!==null&&p.assessment_score!==undefined?" · "+p.assessment_score+"%":""}`):"No completed course assessment yet.";
  $("[data-last-feedback]").textContent=p.safe_feedback||"Course grades and safe feedback will appear here after an official assessment is graded.";
  setStatus("University access confirmed by LOCKE.");
}
async function refreshUniversity(){
  setStatus("Checking NBL University enrollment…");
  try{const payload=await api({action:"university_status"});renderUniversity(payload.university);}
  catch(error){if(error.status===401){$("[data-campus-gate]").hidden=false;$("[data-campus]").hidden=true;setStatus("Sign in with your NBL account to enter the campus.");}else setStatus(error.message||"University status could not be loaded.");}
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

async function boot(){
  $$("[data-signin]").forEach(b=>b.addEventListener("click",openSignIn));
  $("[data-signout]").addEventListener("click",async()=>{try{const clerk=await getClerk();await clerk.signOut();location.reload();}catch{location.href=ACCOUNT_PORTAL;}});
  $("[data-grey-form]").addEventListener("submit",async e=>{e.preventDefault();const input=$("[data-grey-input]"),value=input.value.trim();if(!value)return;input.value="";await askGrey(value);});
  $$("[data-course-select]").forEach(el=>el.addEventListener("change",e=>{state.course=e.target.value;syncCourse();renderAssessment(null);}));
  $("[data-start-assessment]").addEventListener("click",startAssessment);
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