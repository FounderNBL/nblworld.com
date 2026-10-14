import fs from "node:fs";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shop=read("index.html"),humanChat=read("chat.html"),campus=read("university.html"),voice=read("voice-lab.html");
const errors=[];
const need=(source,value,why)=>{if(!source.includes(value))errors.push(why);};
const forbid=(source,value,why)=>{if(source.includes(value))errors.push(why);};

// NBL World .com is now an independent commerce/discovery site, not a Clerk satellite.
need(shop,'NBL World Shop',"Commercial NBL World title is missing.");
need(shop,'https://new-beansland.myshopify.com',"NBL independent Shopify storefront is missing.");
need(shop,'https://books.newbeansland.org/',"Independent books store is missing.");
need(shop,'href="https://newbeansland.org/"',"Customer services need an .org route.");
need(shop,'src="/NBL_WORLD.png"',"Approved NBL World image must stay available.");
forbid(shop,'clerk.browser.js',"Sales home may not run Clerk sign-in.");
forbid(shop,'data-nblu-checkout',"Sales home may not duplicate NBL University checkout.");
forbid(shop,'https://buy.stripe.com/',"Sales home may not bypass the NBL account-billing gateway.");
forbid(shop,'data-chat-find-form',"Sales home may not host NBL people messaging.");

for(const [name,html,to] of [
  ["member Chat",humanChat,"https://newbeansland.org/chat.html"],
  ["University campus",campus,"https://newbeansland.org/campus.html"],
  ["Founder voice",voice,"https://newbeansland.org/voice-lab.html"]
]){
  need(html,'http-equiv="refresh"',"Old "+name+" URL must safely redirect.");
  need(html,'content="0;url='+to+'"',"Old "+name+" URL must hand off to the correct .org destination.");
  need(html,'location.replace("'+to+'")',"Old "+name+" URL must not retain .com session state.");
  need(html,'href="'+to+'"',"Old "+name+" fallback must point to .org.");
  forbid(html,'clerk.browser.js',"Old "+name+" URL still loads Clerk on .com.");
  forbid(html,'data-signin',"Old "+name+" URL still advertises local sign-in.");
  forbid(html,'data-nblu-checkout',"Old "+name+" URL still advertises checkout.");
  forbid(html,'data-chat-app',"Old "+name+" URL still exposes member chats.");
}
for(const secret of ["STRIPE_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","sk-proj-"]){
  for(const [name,html] of [["shop",shop],["human Chat",humanChat],["campus",campus],["voice",voice]]){
    forbid(html,secret,"Unexpected credential marker on public .com "+name+".");
  }
}
if(errors.length){console.error("[nbl-world-sales-only] FAIL");errors.forEach(e=>console.error("- "+e));process.exitCode=1;}
else console.log("[nbl-world-sales-only] PASS: sales-only NBL World, independent Shopify/books, no Clerk or NBL-owned checkout, safe member-service redirect to primary .org.");
