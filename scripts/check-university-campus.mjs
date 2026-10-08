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
need(home,'$184.99',"NBL World does not show the Full NBLU price.");
need(home,"regular Beans","NBL World does not preserve the Chat / University surface boundary.");
need(home,"End-to-end enrollment is not release-proven yet","NBL World release-status hold is missing.");
need(home,"Visit New Beansland","The quiet public New Beansland handoff is missing.");
if(!(home.indexOf('src="/NBL_WORLD.png"') < home.indexOf('<h1 id="nblu-title">New Beansland University</h1>') &&
     home.indexOf('<h1 id="nblu-title">New Beansland University</h1>') < home.lastIndexOf("Visit New Beansland"))){
  errors.push("NBL World hierarchy must be hero image -> University -> quiet New Beansland handoff.");
}
need(html,"LOCKE opens the classroom only when that account has University enrollment.","Campus enrollment gate is missing.");
need(html,'id="enroll"',"NBL World enrollment section is missing.");
need(html,'data-nblu-checkout="foundation"',"Foundation checkout is missing from NBL World.");
need(html,'data-nblu-checkout="full_foundation"',"Guided Foundation checkout is missing from NBL World.");
need(html,'data-nblu-checkout="full_nblu" disabled',"Full NBLU checkout must remain disabled pending proof.");
need(html,'data-nblu-checkout="nblu_continuation"',"Full NBLU owner continuation control is missing.");
need(html,"$184.99","Full NBLU price is missing from the campus.");
need(html,"$14.99/month","Owner continuation price is missing from the campus.");
need(html,"data-release-proof-notice","University release-proof notice is missing.");
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
need(html,"PDF for TEST","TEST PDF intake surface is missing.");
need(html,'data-coursework-pdf',"TEST PDF picker is missing.");
need(js,'action:"university_submit_pdf"',"TEST PDF backend action is missing from campus.");
need(js,"universityPdfPayload","Secure TEST PDF client validation is missing.");
need(js,"renderAfterGrey","After Grey rendering is missing.");
need(js,'action:"after_grey"',"After Grey backend action is missing from campus.");
need(html,"After Grey","After Grey campus seat is missing.");
need(css,".after-grey-card","After Grey styling is missing.");
need(css,".submission-attachment","TEST PDF submission styling is missing.");
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
need(js,"UNIVERSITY_PUBLIC_CHECKOUT_ENABLED=false","Public University checkout hold is not enforced in JavaScript.");
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
need(html,'id="nbl-chat"',"Human NBL Chat room is missing.");
need(html,"People talking to people","Chat is not defined as human communication.");
need(html,'data-social-dm-form',"Direct-message surface is missing.");
need(html,'data-social-message-list',"Human message list is missing.");
need(html,'id="helper-board"',"Helper Board is missing.");
need(html,"2 bonus Beans replies","Real helper reward copy is missing.");
need(html,"500 NBL Usage credits","Monthly Helper winner reward copy is missing.");
need(html,'id="student-access-fund"',"Student Access Fund is missing.");
need(html,"Optional $1+ contributions","Student Access Fund minimum/purpose copy is missing.");
need(js,'SOCIAL_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-social"',"NBL social backend is not wired.");
need(js,'action:"start_dm"',"Direct messages are not wired.");
need(js,'action:"send"',"Human Chat send is not wired.");
need(js,'action:"mark_helpful"',"Helper reward action is not wired.");
need(js,'action:"helper_board"',"Helper Board backend is not wired.");
need(js,'action:"fund_board"',"Student Access Fund board is not wired.");
need(js,'plan:"studios_support"',"Student Access Fund checkout rail is not wired.");
need(js,'action:"founder_broadcast"',"Founder broadcast is not wired.");
need(js,'action:"create_group"',"Founder group Chat creation is not wired.");
need(css,".social-shell","Human Chat styling is missing.");
need(css,".helper-grid","Helper Board styling is missing.");
need(css,".fund-grid","Student Access Fund styling is missing.");

for(const secret of ["SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY","sk-proj-","sk_live_"]){
  forbid(html,secret,`Private secret marker in university.html: ${secret}`);
  forbid(js,secret,`Private secret marker in university.js: ${secret}`);
}
for(const bad of ["answer_key","grading_payload","rubricText","PROTECTED RUBRIC"]){
  forbid(js,bad,`Protected grading material leaked into campus JavaScript: ${bad}`);
}

if(errors.length){console.error("[nbl-world-campus] FAIL");errors.forEach(e=>console.error("- "+e));process.exit(1);}
console.log("[nbl-world-campus] PASS: NBL World shows the current University catalog while public checkout remains held pending controlled payment/account-binding and cross-account isolation proof; campus academic/security source rails remain intact.");
