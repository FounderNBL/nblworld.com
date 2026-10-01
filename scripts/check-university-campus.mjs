import fs from "node:fs";

const html=fs.readFileSync(new URL("../university.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../university.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../university.css",import.meta.url),"utf8");
const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

const errors=[];
const need=(source,text,msg)=>{if(!source.includes(text))errors.push(msg);};
const forbid=(source,text,msg)=>{if(source.includes(text))errors.push(msg);};

need(home,'src="/NBL_WORLD.png"',"NBL World hero image is missing.");
need(home,'href="/university.html#enroll"',"NBL World home does not route enrollment into its University.");
need(home,"Full NBLU Experience","NBL World does not feature Full NBLU.");
need(home,'$149.99',"NBL World does not show the Full NBLU price.");
need(home,"regular Beans","NBL World does not preserve the Chat / University surface boundary.");
need(home,"Visit New Beansland","The quiet public New Beansland handoff is missing.");
if(!(home.indexOf('src="/NBL_WORLD.png"') < home.indexOf("New Beansland University") &&
     home.indexOf("New Beansland University") < home.lastIndexOf("Visit New Beansland"))){
  errors.push("NBL World hierarchy must be hero image -> University -> quiet New Beansland handoff.");
}
need(html,"LOCKE opens the classroom only when that account has University enrollment.","Campus enrollment gate is missing.");
need(html,'id="enroll"',"NBL World enrollment section is missing.");
need(html,'data-nblu-checkout="foundation"',"Foundation checkout is missing from NBL World.");
need(html,'data-nblu-checkout="full_foundation"',"Guided Foundation checkout is missing from NBL World.");
need(html,'data-nblu-checkout="full_nblu"',"Full NBLU checkout is missing from NBL World.");
need(html,'data-nblu-checkout="nblu_continuation"',"Full NBLU owner continuation control is missing.");
need(html,"$149.99","Full NBLU price is missing from the campus.");
need(html,"$14.99/month","Owner continuation price is missing from the campus.");
need(html,"shipping charged separately","Staged physical-book shipping disclosure is missing.");
forbid(html,'href="https://newbeansland.org/university.html"',"Campus still sends enrollment back to the public New Beansland site.");
need(html,"Your digital materials","Student library is missing.");
need(html,"Professor Grey","Professor Grey faculty panel is missing.");
need(html,"Course assessment","Protected assessment panel is missing.");
need(html,"Your course work","Registrar coursework room is missing.");
need(html,"Gradebook","Gradebook is missing.");
need(html,"approximately 9 hours of engaged learning total","Foundation learning-time guidance is missing.");
need(html,"What each course expects","Student-facing course expectations are missing.");
need(html,"Opt-in scoreboard","Opt-in class community is missing.");
need(html,"Access / accommodation","Student access-support policy is missing.");
need(html,"Request academic review","Student academic-review surface is missing.");
need(html,"data-student-number","Student-number display is missing.");
need(js,'action:"university_submissions"',"Student submission listing is missing.");
need(js,'action:"university_submit_work"',"Student coursework submission action is missing.");
need(js,"renderSubmissions","Safe submission rendering is missing.");
need(js,'a.status==="review_pending"',"Pending academic-review UI is missing.");
need(js,"Pending final academic review","Pending academic-review message is missing.");

need(html,"The Frontier Check","Frontier Baseline panel is missing.");
need(html,"Some are trying to get you to confidently say some bullshit","Frontier Check lost the intended NBL baseline tone.");
need(html,"Welcome%20to%20the%20Frontier.pdf","Frontier entrance statement link is missing.");
need(js,'action:"frontier_start"',"Frontier start API call is missing.");
need(js,'action:"frontier_submit"',"Frontier submit API call is missing.");
need(js,"renderFrontier","Frontier campus gate rendering is missing.");

need(js,'BILLING_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-billing-link"',"Authenticated University billing endpoint is missing.");
need(js,'["foundation","full_foundation","full_nblu","nblu_continuation"]',"Expected University checkout plans are not whitelisted.");
need(js,"trustedBillingDestination","Stripe destination allowlist is missing.");
need(js,'location.href=destination',"University checkout does not hand off to validated Stripe.");
forbid(js,"https://buy.stripe.com/","Raw Stripe links must not be embedded in campus JavaScript.");
need(js,'action:"university_status"',"Campus status API call is missing.");
need(js,'action:"university_material"',"Secure material reader API call is missing.");
need(js,'action:"grey"',"Professor Grey API call is missing.");
need(js,'action:"assessment_start"',"Assessment start API call is missing.");
need(js,'action:"assessment_submit"',"Assessment submit API call is missing.");
need(js,'action:"academic_review_request"',"Academic review request API call is missing.");
need(js,'action:"university_community"',"University community API call is missing.");
need(js,'action:"university_community_update"',"University community settings API call is missing.");
need(js,"renderGradebook","Student-safe gradebook rendering is missing.");
need(js,"renderCommunity","Class community rendering is missing.");
need(js,"clerk.session.getToken()","Clerk bearer identity is missing.");
need(css,".reader{","Secure reader styling is missing.");
need(css,".frontier{","Frontier Check styling is missing.");
need(css,".gradebook{","Gradebook styling is missing.");
need(css,".community-grid","Community styling is missing.");

for(const secret of ["SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY","sk-proj-","sk_live_"]){
  forbid(html,secret,`Private secret marker in university.html: ${secret}`);
  forbid(js,secret,`Private secret marker in university.js: ${secret}`);
}
for(const bad of ["answer_key","grading_payload","rubricText","PROTECTED RUBRIC"]){
  forbid(js,bad,`Protected grading material leaked into campus JavaScript: ${bad}`);
}

if(errors.length){console.error("[nbl-world-campus] FAIL");errors.forEach(e=>console.error("- "+e));process.exit(1);}
console.log("[nbl-world-campus] PASS: NBL World leads with its world image and University, authenticated Full NBLU pricing is wired here, the New Beansland handoff is quiet/last, and the campus academic/security rails remain intact.");
