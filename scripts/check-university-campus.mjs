import fs from "node:fs";

const html=fs.readFileSync(new URL("../university.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../university.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../university.css",import.meta.url),"utf8");
const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

const errors=[];
const need=(source,text,msg)=>{if(!source.includes(text))errors.push(msg);};
const forbid=(source,text,msg)=>{if(source.includes(text))errors.push(msg);};

need(home,'href="/university.html"',"NBL World home does not open the University campus.");
need(home,"University enrollment is separate from NBL Chat Plus.","Home does not state the Chat / University separation.");
need(html,"LOCKE opens the classroom only when that account has University enrollment.","Campus enrollment gate is missing.");
need(html,"Your digital materials","Student library is missing.");
need(html,"Professor Grey","Professor Grey faculty panel is missing.");
need(html,"Course assessment","Protected assessment panel is missing.");
need(html,"Your course work","Registrar coursework room is missing.");
need(html,"data-student-number","Student-number display is missing.");
need(js,'action:"university_submissions"',"Student submission listing is missing.");
need(js,'action:"university_submit_work"',"Student coursework submission action is missing.");
need(js,"renderSubmissions","Safe submission rendering is missing.");

need(html,"The Frontier Check","Frontier Baseline panel is missing.");
need(html,"Some are trying to get you to confidently say some bullshit","Frontier Check lost the intended NBL baseline tone.");
need(html,"Welcome%20to%20the%20Frontier.pdf","Frontier entrance statement link is missing.");
need(js,'action:"frontier_start"',"Frontier start API call is missing.");
need(js,'action:"frontier_submit"',"Frontier submit API call is missing.");
need(js,"renderFrontier","Frontier campus gate rendering is missing.");

need(js,'action:"university_status"',"Campus status API call is missing.");
need(js,'action:"university_material"',"Secure material reader API call is missing.");
need(js,'action:"grey"',"Professor Grey API call is missing.");
need(js,'action:"assessment_start"',"Assessment start API call is missing.");
need(js,'action:"assessment_submit"',"Assessment submit API call is missing.");
need(js,"clerk.session.getToken()","Clerk bearer identity is missing.");
need(css,".reader{","Secure reader styling is missing.");
need(css,".frontier{","Frontier Check styling is missing.");

for(const secret of ["SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY","sk-proj-","sk_live_"]){
  forbid(html,secret,`Private secret marker in university.html: ${secret}`);
  forbid(js,secret,`Private secret marker in university.js: ${secret}`);
}
for(const bad of ["answer_key","grading_payload","rubricText","PROTECTED RUBRIC"]){
  forbid(js,bad,`Protected grading material leaked into campus JavaScript: ${bad}`);
}

if(errors.length){console.error("[nbl-world-campus] FAIL");errors.forEach(e=>console.error("- "+e));process.exit(1);}
console.log("[nbl-world-campus] PASS: NBL World campus has enrollment gating, Frontier Baseline, Registrar student/coursework UI, student library, learner-adaptive Grey, protected assessments, shared identity, and public-secret guards.");
