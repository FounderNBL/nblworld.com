import fs from "node:fs";

const html=fs.readFileSync(new URL("../university.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../university.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../university.css",import.meta.url),"utf8");
const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const memberChat=fs.readFileSync(new URL("../chat.html",import.meta.url),"utf8");
const memberChatJs=fs.readFileSync(new URL("../chat.js",import.meta.url),"utf8");
const memberChatCss=fs.readFileSync(new URL("../chat.css",import.meta.url),"utf8");
const socialRealtime=fs.readFileSync(new URL("../social-realtime.js",import.meta.url),"utf8");

const errors=[];
const need=(source,text,msg)=>{if(!source.includes(text))errors.push(msg);};
const forbid=(source,text,msg)=>{if(source.includes(text))errors.push(msg);};

need(home,'src="/NBL_WORLD.png"',"NBL World hero image is missing.");
need(home,'href="/university.html#enroll"',"NBL World home does not route enrollment into its University.");
need(home,"Full NBLU Experience","NBL World does not feature Full NBLU.");
need(home,'$449.99',"NBL World does not show the Full NBLU price.");
need(home,'href="/chat.html"',"NBL World must offer the human NBL Chat member entrance.");
need(html,'href="/chat.html"',"University campus must link regular members to NBL World Chat.");
need(memberChat,'data-chat-guest',"Human Chat must have signed-out account entry.");
need(memberChat,'data-chat-app hidden',"Member messages must be hidden until signed in.");
need(memberChat,'href="/university.html#nbl-social"',"Students must be routed to protected classroom Chat.");
need(memberChat,"No University enrollment is required for direct messages.","Regular member DMs must not be gated by academic enrollment.");
need(memberChatJs,'SOCIAL_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-social"',"Member Chat must use the existing protected social API.");
need(memberChatJs,'"Authorization":"Bearer "+token',"Member Chat must use a real signed-in session token.");
for(const action of ["me","find_users","direct","list_threads","list_messages","send","mute","block","unblock","report"]){
  need(memberChatJs,'action:"'+action+'"',"Member Chat action missing: "+action);
}
need(memberChatCss,".chat-app","Member Chat responsive layout missing.");
need(memberChat,'src="/social-realtime.js?v=20261008"',"Member Chat must load private Realtime listener.");
need(html,'src="/social-realtime.js?v=20261008"',"Campus must load the same private Realtime listener.");
need(socialRealtime,'config:{private:true}',"Realtime channels must always be private.");
need(socialRealtime,'watchThread',"Thread notifications must be available.");
need(socialRealtime,'watchInbox',"Recipient inbox notifications must be available.");
need(socialRealtime,'eventsPerSecond:5',"Realtime must use a rate-limited connection.");
need(socialRealtime,'refreshPending',"Realtime refreshes must be coalesced.");
need(memberChatJs,'watchInbox()',"Regular signed-in members must listen for incoming DMs.");
need(memberChatJs,'watchOpenThread(id)',"Open member chats must subscribe to their own thread.");
need(js,'watchCampusThread(threadId)',"Campus Social rooms must subscribe only when open.");
forbid(socialRealtime,'service_role',"Service keys cannot appear in public Realtime client code.");
forbid(socialRealtime,'realtime.send',"Clients must only listen, not broadcast unverified messages.");
forbid(memberChatJs,"localStorage.setItem","Member Chat must not persist session or backend token to localStorage.");
forbid(memberChatJs,"RUNWAY_API_KEY","Provider credentials must never be in the browser.");
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
need(html,"$449.99","Full NBLU price is missing from the campus.");
need(html,"$14.99/month","Owner continuation price is missing from the campus.");
need(html,"data-release-proof-notice","University release-proof notice is missing.");
need(html,"shipping charged separately","Staged physical-book shipping disclosure is missing.");
forbid(html,'href="https://newbeansland.org/university.html"',"Campus still sends enrollment back to the public New Beansland site.");
need(html,"Your digital materials","Student library is missing.");
need(html,"Professor Grey","Professor Grey faculty panel is missing.");
need(html,"Course assessment","Protected assessment panel is missing.");
need(html,"Your course work","Registrar coursework room is missing.");
need(html,"Gradebook","Gradebook is missing.");
need(html,'id="school-office"',"School Office room must be present inside the gated campus.");
need(html,'data-school-office',"Published lesson plan room missing.");
need(html,'data-school-refresh',"School Office refresh control missing.");
need(js,'action:"university_school_plan"',"School Office must load from protected runtime instead of hard-coded public content.");
need(js,'state.schoolTaskId=task.id',"School Office task must link to Registrar submission.");
need(js,'schoolTaskId:state.schoolTaskId||undefined',"Selected NBL assignment must be sent through existing Registrar intake.");
need(js,'state.schoolTaskId=null',"Registrar assignment selection must be cleared after submission.");
need(js,'renderSchoolOffice',"Student-safe lesson and task renderer missing.");
need(css,".school-office-course","NBL School Office should keep the existing campus style.");

need(html,"approximately 9 hours of engaged learning total","Foundation learning-time guidance is missing.");
need(html,"What each course expects","Student-facing course expectations are missing.");
need(html,"Opt-in scoreboard","Opt-in class community is missing.");
need(html,"Access / accommodation","Student access-support policy is missing.");
need(html,"Request academic review","Student academic-review surface is missing.");
need(html,"Chat means people","NBL Social human-chat surface is missing.");
need(html,"Ask classmates first","Study Hall peer-help surface is missing.");
need(html,"Helper leaderboard","Helper leaderboard is missing.");
need(html,'data-social-dm-handle',"NBL handle DM control is missing.");
need(html,'data-social-messages',"Human message rail is missing.");
need(js,'SOCIAL_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-social"',"NBL Social backend endpoint is missing.");
for(const action of ["direct","room","list_threads","list_messages","list_help_cases","send","ask_help","solve_help","ask_grey","helper_board","report"]){
  need(js,'action:"'+action+'"',"NBL Social action missing from campus: "+action);
}
need(js,"Solved / This helped","Study Hall solved/helpful reward action is missing.");
need(js,"Helper Mode locked","Helper Mode milestone explanation is missing.");
need(css,".social-shell","NBL Social layout styling is missing.");
need(css,".helper-board","Helper leaderboard styling is missing.");
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

for(const secret of ["SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY","sk-proj-","sk_live_"]){
  forbid(html,secret,`Private secret marker in university.html: ${secret}`);
  forbid(js,secret,`Private secret marker in university.js: ${secret}`);
}
for(const bad of ["answer_key","grading_payload","rubricText","PROTECTED RUBRIC"]){
  forbid(js,bad,`Protected grading material leaked into campus JavaScript: ${bad}`);
}

if(errors.length){console.error("[nbl-world-campus] FAIL");errors.forEach(e=>console.error("- "+e));process.exit(1);}
console.log("[nbl-world-campus] PASS: NBL World shows the current University catalog while public checkout remains held pending controlled payment/account-binding and cross-account isolation proof; campus academic/security source rails remain intact.");
