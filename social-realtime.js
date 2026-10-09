/* NBL Social private Realtime notification client.
   Never sends messages or exposes protected social data through Realtime.
   Existing nbl-social API is the only message reader/writer.
   Falls back to authenticated auto-refresh if the project's Clerk third-party
   JWT integration has not been enabled for Realtime yet.
*/
(()=>{
"use strict";
const URL="https://tvypdakofcrlvnwporhh.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_IuiM2Ee9gJp9Vchozncc2Q_PfFkqogl";
const SDK="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js";
let sdkPromise=null;
async function loadSDK(){
  if(window.supabase?.createClient)return window.supabase;
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    const tag=document.createElement("script");tag.src=SDK;tag.async=true;
    tag.crossOrigin="anonymous";
    tag.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error("Supabase Realtime SDK unavailable"));
    tag.onerror=()=>reject(new Error("Supabase Realtime SDK download failed"));
    document.head.append(tag);
  });
  return sdkPromise;
}
function watchThread(threadId,getToken,onRefresh){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(threadId||"")))return ()=>{};
  let active=true,subscribed=false,client=null,channel=null,refreshPending=false;
  let lastFetched=Date.now(),lastReconnect=0,tokenUpdated=0;
  const notify=()=>{
    if(!active||document.hidden||refreshPending)return;
    refreshPending=true;
    Promise.resolve().then(async()=>{if(active)await onRefresh();})
      .catch(()=>{})
      .finally(()=>{lastFetched=Date.now();refreshPending=false;});
  };
  async function connect(){
    if(!active||channel||Date.now()-lastReconnect<45000)return;
    lastReconnect=Date.now();
    try{
      const sdk=await loadSDK();if(!active)return;
      const token=await getToken();if(!active||!token)return;
      client=sdk.createClient(URL,PUBLISHABLE_KEY,{
        auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
        realtime:{params:{eventsPerSecond:5}}
      });
      await client.realtime.setAuth(token);if(!active){void client.realtime.disconnect();return;}
      channel=client.channel("nbl-social:thread:"+threadId,{config:{private:true}});
      channel.on("broadcast",{event:"changed"},()=>notify())
        .subscribe(state=>{
          if(!active)return;
          subscribed=state==="SUBSCRIBED";
          if(state==="CHANNEL_ERROR"||state==="TIMED_OUT"||state==="CLOSED"){
            subscribed=false;
          }
        });
      tokenUpdated=Date.now();
    }catch{
      subscribed=false;
      if(channel&&client){void client.removeChannel(channel).catch(()=>{});}
      channel=null;
    }
  }
  const pulse=window.setInterval(()=>{
    if(!active||document.hidden)return;
    if(!subscribed&&Date.now()-lastFetched>14000)notify();
    if(subscribed&&Date.now()-lastFetched>60000)notify();
    if(!channel&&Date.now()-lastReconnect>45000)void connect();
    if(client&&channel&&Date.now()-tokenUpdated>90000){
      void getToken().then(token=>{
        if(active&&token){tokenUpdated=Date.now();return client.realtime.setAuth(token);}
      }).catch(()=>{subscribed=false;});
    }
  },4000);
  const visible=()=>{
    if(active&&!document.hidden){notify();if(!subscribed&&!channel)void connect();}
  };
  document.addEventListener("visibilitychange",visible);
  window.addEventListener("online",visible);
  void connect();
  return ()=>{
    active=false;subscribed=false;
    window.clearInterval(pulse);
    document.removeEventListener("visibilitychange",visible);
    window.removeEventListener("online",visible);
    if(channel&&client)void client.removeChannel(channel).catch(()=>{});
    else if(client)void client.realtime.disconnect();
    channel=null;
  };
}
window.NBLSocialRealtime={watchThread};
})();
