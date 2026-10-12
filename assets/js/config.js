window.PORTAL_CONFIG=Object.freeze({"domain":"fmcsa-employer-dot.screenings4u.com","portalCode":"employer_dot","catalogPortalCode":"dot_fmcsa_employer","label":"FMCSA Direct Employer","kind":"employer","surface":"dot","agency":"FMCSA","workforceUrl":"https://elpbnytpciqnbexiaebp.supabase.co","workforceKey":"sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC","mainUrl":"https://elpbnytpciqnbexiaebp.supabase.co","mainKey":"sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC"});
/* Reuse one Supabase Auth client per portal/browser context. */
(()=>{const C=window.PORTAL_CONFIG;if(!C)return;const wrap=lib=>{if(!lib?.createClient||lib.__s4uSingleClient)return lib;const create=lib.createClient.bind(lib);lib.createClient=(url,key,options)=>{if(url===C.workforceUrl&&key===C.workforceKey)return window.S4U_SUPABASE||(window.S4U_SUPABASE=create(url,key,options));return create(url,key,options)};try{Object.defineProperty(lib,'__s4uSingleClient',{value:true})}catch{}return lib};if(window.supabase)wrap(window.supabase);else{let assigned;try{Object.defineProperty(window,'supabase',{configurable:true,get(){return assigned},set(v){assigned=wrap(v)}})}catch{}}})();

/* Route legacy employer UI actions only through its isolated, authorized DOT backend. */
(()=>{'use strict';
 const C=window.PORTAL_CONFIG,original=window.fetch.bind(window);
 const routes=new Set(['dot-session-context']);
 window.fetch=function(input,init){
  try{
   const raw=typeof input==='string'?input:input?.url||'';
   if(!raw.includes('/functions/v1/'))return original(input,init);
   const u=new URL(raw,location.href),part=u.pathname.split('/').pop();
   if(part==='dot-session-context'){
    u.pathname=u.pathname.replace(/dot-session-context$/,'employer-dot-session');
    return original(u.toString(),init);
   }
   if(part==='employer-dot-actions'||part==='employer-dot-session'||part==='portal-session-handoff')return original(input,init);
   if(!init?.body||typeof init.body!=='string')return original(input,init);
   const b=JSON.parse(init.body);
   if(!b||typeof b!=='object'||Array.isArray(b))return original(input,init);
   u.pathname=u.pathname.replace(/[^/]+$/,'employer-dot-actions');
   return original(u.toString(),{...init,body:JSON.stringify({...b,portal_code:'employer_dot',requested_portal_code:'employer_dot',legacy_endpoint:part})});
  }catch{return original(input,init)}
 };
})();
