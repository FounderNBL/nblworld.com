(()=>{
"use strict";

const NBL_CORE_API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-core";
const SOCIAL_API=NBL_CORE_API+"/social";
const CLERK_PUBLISHABLE_KEY="pk_live_Y2xlcmsubmV3YmVhbnNsYW5kLm9yZyQ";
const ACCOUNT_PORTAL="https://accounts.newbeansland.org";
const $=selector=>document.querySelector(selector);
const state={clerk:null,me:null,threads:[],selectedId:null,selected:null,busy:false,realtimeThread:null,realtimeStop:null,inboxStop:null};
const status=message=>{const el=$("[data-chat-status]");if(el)el.textContent=message;};
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};

function signInUrl(){
  const dest=new URL(window.location.href);
  dest.hash="";
  if(!["https:","http:"].includes(dest.protocol))return ACCOUNT_PORTAL+"/sign-in";
  return ACCOUNT_PORTAL+"/sign-in?redirect_url="+encodeURIComponent(dest.href);
}
function clerkDomain(){
  const encoded=(CLERK_PUBLISHABLE_KEY.split("_")[2]||"").replace(/-/g,"+").replace(/_/g,"/");
  return atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,"=")).replace(/\$/,"");
}
async function clerk(){
  if(state.clerk)return state.clerk;
  const domain=clerkDomain(),src="https://"+domain+"/npm/@clerk/clerk-js@6/dist/clerk.browser.js";
  if(!window.Clerk){
    await new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src=src;script.async=true;script.crossOrigin="anonymous";
      script.setAttribute("data-clerk-publishable-key",CLERK_PUBLISHABLE_KEY);
      script.onload=resolve;script.onerror=()=>reject(new Error("NBL account service could not load."));
      document.head.appendChild(script);
    });
  }
  if(!window.Clerk)throw new Error("NBL account service is unavailable.");
  await window.Clerk.load();
  state.clerk=window.Clerk;
  return state.clerk;
}
async function authToken(){
  const session=(await clerk()).session;
  if(!session||!state.clerk.isSignedIn)throw new Error("Sign in with your NBL account first.");
  const token=await session.getToken();
  if(!token)throw new Error("NBL session expired. Sign in again.");
  return token;
}
async function social(body){
  const token=await authToken();
  const response=await fetch(SOCIAL_API,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify(body),cache:"no-store"
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload?.ok!==true){
    const error=new Error(payload?.message||"NBL Chat is temporarily unavailable. Try again.");
    error.status=response.status;error.reason=payload?.reason;throw error;
  }
  return payload;
}
function displayThread(row){
  if(row.thread_type==="direct")return row.peer?.handle?"@"+row.peer.handle:"Direct message";
  return row.title||"NBL conversation";
}
function resetComposer(){
  const ready=Boolean(state.selectedId);
  const composer=$("[data-chat-compose]");
  if(composer)composer.disabled=!ready;
  const button=$("[data-chat-send-form] button[type=submit]");
  if(button)button.disabled=!ready||state.busy;
  $("[data-chat-mute]").hidden=!ready;
  $("[data-chat-block]").hidden=!ready||state.selected?.thread_type!=="direct"||!state.selected?.peer?.handle;
  $("[data-chat-unblock]").hidden=!ready||state.selected?.thread_type!=="direct"||!state.selected?.peer?.handle;
}
function renderIdentity(me){
  state.me=me||{};
  const label=$("[data-chat-myhandle]");
  label.textContent=me?.handle?"@"+me.handle:"Your NBL account";
  const entry=$(".campus-link a");
  if(entry&&me?.university!==true){
    entry.textContent="See University";
  }
}
function renderThreads(){
  const area=$("[data-chat-threads]");
  area.replaceChildren();
  if(!state.threads.length){area.append(node("p","hint","No chats yet. Start one by handle."));return;}
  for(const row of state.threads){
    const item=node("button","thread"+(row.id===state.selectedId?" selected":""),displayThread(row));
    item.type="button";
    const info=node("small",null,(row.thread_type==="direct"?"Direct message":String(row.thread_type||"Chat").replaceAll("_"," "))+(row.muted?" · Muted":""));
    item.append(info);
    item.addEventListener("click",()=>{void openThread(row.id).catch(error=>status(error.message));});
    area.append(item);
  }
}
async function loadThreads(){
  const response=await social({action:"list_threads"});
  state.threads=response.threads||[];
  renderThreads();
}
function renderMessages(messages){
  const area=$("[data-chat-messages]");
  area.replaceChildren();
  if(!messages.length){area.append(node("p","hint","Nothing here yet. Say hello!"));return;}
  const me=String(state.me?.handle||"").toLowerCase();
  for(const message of messages){
    const from=message.sender?.handle||((message.officialRole==="grey")?"greyhart":"NBL member");
    const mine=from.toLowerCase()===me;
    const bubble=node("div","message"+(mine?" mine":""));
    const verified=message.sender?.verified||Boolean(message.officialRole);
    bubble.append(node("div","byline","@"+from+(verified?" · Verified":"")+(message.createdAt?" · "+new Date(message.createdAt).toLocaleString():"")));
    bubble.append(node("p",null,message.body||""));
    if(!mine&&!message.deleted&&message.id){
      const actions=node("div","msg-actions");
      const button=node("button",null,"Report message");
      button.type="button";
      button.addEventListener("click",()=>{void reportMessage(message.id);});
      actions.append(button);bubble.append(actions);
    }
    area.append(bubble);
  }
  area.scrollTop=area.scrollHeight;
}
function watchOpenThread(id){
  if(state.realtimeThread===id)return;
  state.realtimeStop?.();state.realtimeStop=null;
  state.realtimeThread=id;
  if(!window.NBLSocialRealtime)return;
  state.realtimeStop=window.NBLSocialRealtime.watchThread(id,authToken,async()=>{
    if(state.selectedId!==id)return;
    const payload=await social({action:"list_messages",threadId:id});
    if(state.selectedId===id)renderMessages(payload.messages||[]);
  });
}
function watchInbox(){
  if(state.inboxStop||!window.NBLSocialRealtime||!state.clerk?.user?.id)return;
  state.inboxStop=window.NBLSocialRealtime.watchInbox(state.clerk.user.id,authToken,async()=>{
    if(document.hidden)return;
    await loadThreads();
  });
}
async function openThread(id){
  if(!id)return;
  const row=state.threads.find(t=>t.id===id);
  state.selectedId=id;state.selected=row||null;
  watchOpenThread(id);
  $("[data-chat-thread-title]").textContent=displayThread(row||{});
  $("[data-chat-thread-kind]").textContent=row?.thread_type==="direct"?"Direct message":String(row?.thread_type||"Message").replaceAll("_"," ");
  $("[data-chat-messages]").replaceChildren(node("p","hint","Loading messages…"));
  $("[data-chat-mute]").textContent=row?.muted?"Unmute":"Mute";
  $("[data-chat-block]").textContent="Block member";
  resetComposer();renderThreads();
  const payload=await social({action:"list_messages",threadId:id});
  if(state.selectedId!==id)return;
  renderMessages(payload.messages||[]);
  status("Conversation ready. NBL human messages do not use AI credits.");
}
async function refresh(){
  try{
    status("Refreshing NBL Chat…");
    const [identity,threads]=await Promise.all([social({action:"me"}),social({action:"list_threads"})]);
    renderIdentity(identity.me||{});
    state.threads=threads.threads||[];
    if(state.selectedId&&!state.threads.some(t=>t.id===state.selectedId)){
      state.selectedId=null;state.selected=null;
      state.realtimeStop?.();state.realtimeStop=null;state.realtimeThread=null;
      resetComposer();
      $("[data-chat-thread-title]").textContent="Choose a conversation";
      $("[data-chat-messages]").replaceChildren(node("p","hint","Choose a conversation."));
    }
    renderThreads();
    if(state.selectedId)await openThread(state.selectedId);
    else status("NBL Chat is ready. Open a DM or select a conversation.");
  }catch(error){status(error.message||"NBL Chat could not refresh.");}
}
async function openDM(handle){
  if(!handle||state.busy)return;
  state.busy=true;
  status("Opening private conversation…");
  try{
    const payload=await social({action:"direct",handle});
    $("[data-chat-dm-handle]").value="";
    await loadThreads();
    await openThread(payload.threadId);
  }catch(error){status(error.message||"That member could not be reached.");}
  finally{state.busy=false;resetComposer();}
}
async function searchMembers(event){
  event.preventDefault();
  const q=$("[data-chat-find-input]").value.trim();
  const area=$("[data-chat-search-results]");
  area.replaceChildren();
  if(q.replace(/^@/,"").length<2){status("Enter at least two characters of an NBL handle.");return;}
  try{
    const payload=await social({action:"find_users",q:q.replace(/^@/,"")});
    const users=payload.users||[];
    if(!users.length){area.append(node("p","hint","No matching NBL handles found."));return;}
    for(const user of users){
      const line=node("div","search-result"),label=node("strong",null,"@"+user.handle+(user.verified?" · Verified":""));
      const button=node("button","btn small","Message");button.type="button";
      button.addEventListener("click",()=>{void openDM(user.handle);});
      line.append(label,button);area.append(line);
    }
    status("Choose a member to open a private conversation.");
  }catch(error){status(error.message||"Search unavailable.");}
}
async function sendMessage(event){
  event.preventDefault();
  const textarea=$("[data-chat-compose]"),message=textarea.value.trim();
  if(!state.selectedId||!message||state.busy)return;
  const id=state.selectedId;
  state.busy=true;resetComposer();
  try{
    await social({action:"send",threadId:id,message});
    textarea.value="";
    await openThread(id);
  }catch(error){status(error.message||"Message not sent.");}
  finally{state.busy=false;resetComposer();}
}
async function toggleMute(){
  if(!state.selectedId||state.busy)return;
  const row=state.selected;
  try{
    await social({action:"mute",threadId:state.selectedId,muted:!Boolean(row?.muted)});
    await refresh();
  }catch(error){status(error.message||"Unable to update mute.");}
}
async function blockPeer(){
  const peer=state.selected?.peer?.handle;
  if(!peer||!confirm("Block @"+peer+"? This prevents new direct messages between you."))return;
  try{
    await social({action:"block",handle:peer});
    status("@"+peer+" blocked. You can unblock this member from the conversation controls.");
    await refresh();
  }catch(error){status(error.message||"Unable to block this member.");}
}
async function unblockPeer(){
  const peer=state.selected?.peer?.handle;
  if(!peer)return;
  try{
    await social({action:"unblock",handle:peer});
    status("@"+peer+" unblocked.");
    await refresh();
  }catch(error){status(error.message||"Unable to unblock this member.");}
}
async function reportMessage(messageId){
  const reason=prompt("Why are you reporting this message? Do not include passwords or private information.");
  if(!reason||!reason.trim())return;
  try{
    await social({action:"report",messageId,reason:reason.trim().slice(0,500)});
    status("Report recorded for review.");
  }catch(error){status(error.message||"Report could not be submitted.");}
}
async function boot(){
  $("[data-chat-signin]").href=signInUrl();
  $("[data-chat-find-form]").addEventListener("submit",searchMembers);
  $("[data-chat-dm-form]").addEventListener("submit",event=>{event.preventDefault();void openDM($("[data-chat-dm-handle]").value.trim());});
  $("[data-chat-send-form]").addEventListener("submit",sendMessage);
  $("[data-chat-refresh]").addEventListener("click",()=>{void refresh();});
  $("[data-chat-mute]").addEventListener("click",()=>{void toggleMute();});
  $("[data-chat-block]").addEventListener("click",()=>{void blockPeer();});
  $("[data-chat-unblock]").addEventListener("click",()=>{void unblockPeer();});
  $("[data-chat-signout]").addEventListener("click",async()=>{
    try{state.realtimeStop?.();state.inboxStop?.();await(await clerk()).signOut();window.location.reload();}
    catch{window.location.href=ACCOUNT_PORTAL;}
  });
  try{
    const connection=await clerk();
    if(!connection.isSignedIn||!connection.session){
      $("[data-chat-auth-status]").textContent="Sign in to send and read human-to-human messages. University enrollment is not required for direct messages.";
      return;
    }
    $("[data-chat-guest]").hidden=true;
    $("[data-chat-userbar]").hidden=false;
    $("[data-chat-app]").hidden=false;
    watchInbox();
    await refresh();
  }catch(error){
    $("[data-chat-auth-status]").textContent="NBL account connection is unavailable. Try signing in again.";
    status(error.message||"NBL account service unavailable.");
  }
}
void boot();
})();
