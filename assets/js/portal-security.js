(()=>{'use strict';
const P=location.pathname.split('/').pop()?.toLowerCase()||'index.html';
if(['login.html','auth-handoff.html','404.html','forgot-password.html','reset-password.html'].includes(P)){document.documentElement.classList.remove('s4u-auth-pending');return}
const C=window.PORTAL_CONFIG||window.S4U||{};const URL=C.workforceUrl||C.url;const KEY=C.workforceKey||C.key;const CODE=C.portalCode||C.portal_code;
const IDLE=10*60*1000,WARN=60*1000,KEY_LAST='s4u_idle_last:'+location.hostname;let last=Date.now(),warnOpen=false,timer=null,countTimer=null;
const sb=window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
function safeLast(signedInAt=0){let n=0;try{n=Number(localStorage.getItem(KEY_LAST)||0)}catch{}return Number.isFinite(n)&&n>0&&n>=signedInAt?n:Date.now()}
function setLast(){last=Date.now();try{localStorage.setItem(KEY_LAST,String(last))}catch{};hideWarn();schedule()}
function modal(){let m=document.getElementById('s4u-idle-modal');if(m)return m;m=document.createElement('div');m.id='s4u-idle-modal';m.innerHTML='<div class="s4u-idle-card" role="dialog" aria-modal="true" aria-labelledby="s4u-idle-title"><div class="s4u-idle-mark">screenings4u</div><h2 id="s4u-idle-title">Your session is about to expire</h2><p>For your security, you will be signed out after 10 minutes of inactivity.</p><div class="s4u-idle-count"><strong id="s4u-idle-seconds">60</strong><span>seconds remaining</span></div><div class="s4u-idle-actions"><button id="s4u-stay" type="button">Stay Logged In</button><button id="s4u-signout" type="button">Sign Out Now</button></div></div>';document.body.appendChild(m);m.querySelector('#s4u-stay').onclick=setLast;m.querySelector('#s4u-signout').onclick=logout;return m}
function showWarn(){if(warnOpen)return;warnOpen=true;const m=modal();m.classList.add('open');let left=Math.max(0,Math.ceil((IDLE-(Date.now()-safeLast()))/1000));const el=m.querySelector('#s4u-idle-seconds');el.textContent=String(left);clearInterval(countTimer);countTimer=setInterval(()=>{left=Math.max(0,Math.ceil((IDLE-(Date.now()-safeLast()))/1000));el.textContent=String(left);if(left<=0)logout()},250)}
function hideWarn(){warnOpen=false;document.getElementById('s4u-idle-modal')?.classList.remove('open');clearInterval(countTimer)}
async function logout(){clearTimeout(timer);clearInterval(countTimer);try{await sb?.auth.signOut()}catch{};try{Object.keys(localStorage).filter(k=>k.startsWith('s4u_')||k.startsWith('sb-')).forEach(k=>localStorage.removeItem(k))}catch{};location.replace('https://portal.screenings4u.com/')}
function schedule(){clearTimeout(timer);const age=Date.now()-safeLast();if(age>=IDLE){logout();return}if(age>=IDLE-WARN)showWarn();timer=setTimeout(schedule,Math.min(1000,Math.max(250,(IDLE-WARN)-age)))}
function bindActivity(){['pointerdown','keydown','touchstart','scroll'].forEach(ev=>addEventListener(ev,()=>{if(!warnOpen)setLast()},{passive:true}));addEventListener('storage',e=>{if(e.key===KEY_LAST){last=safeLast();hideWarn();schedule()}})}
function authNotice(message,retry=false){
  document.documentElement.classList.remove('s4u-auth-pending');
  document.body.replaceChildren();
  const panel=document.createElement('main');
  panel.style.cssText='max-width:540px;margin:12vh auto;padding:32px;border:1px solid #dae5f0;border-radius:14px;background:#fff;font:16px/1.6 Arial,sans-serif;color:#102f55';
  const title=document.createElement('h1');title.textContent='Unable to open this portal page';title.style.fontSize='24px';
  const p=document.createElement('p');p.textContent=message;
  panel.append(title,p);
  if(retry){const button=document.createElement('button');button.textContent='Try again';button.style.cssText='padding:12px 20px;background:#102f55;color:white;border:0;border-radius:8px;cursor:pointer';button.onclick=()=>location.reload();panel.append(button)}
  document.body.append(panel);
}
async function guard(){
  if(!sb||!URL||!KEY||!CODE){authNotice('Portal configuration could not be loaded. Please contact support.');return}
  let session;
  try{const result=await sb.auth.getSession();if(result.error)throw result.error;session=result.data?.session}
  catch{authNotice('We could not verify your sign-in session. Please try again.',true);return}
  if(!session){location.replace('https://portal.screenings4u.com/');return}
  const signedInAt=Date.parse(session.user?.last_sign_in_at||'')||0;
  const storedActivity=(()=>{try{return Number(localStorage.getItem(KEY_LAST)||0)||0}catch{return 0}})();
  // An old idle timer must never invalidate a newly completed sign-in.
  last=storedActivity&&storedActivity>=signedInAt?storedActivity:Date.now();
  if(Date.now()-last>=IDLE){await logout();return}
  try{localStorage.setItem(KEY_LAST,String(last))}catch{}
  let r,d;
  try{
    const membership=localStorage.getItem('s4u_'+CODE+'_membership')||'';
    r=await fetch(URL+'/functions/v1/employer-dot-session',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':KEY},body:JSON.stringify({portal_code:CODE,membership_id:membership||undefined,page:P.replace('.html','')})});
    d=await r.json().catch(()=>({}));
  }catch{authNotice('The employer portal is temporarily unavailable. Your sign-in has been preserved.',true);return}
  if(!r.ok||d.error||d.has_access===false){
    if(r.status===401){authNotice('Your sign-in needs to be refreshed. Please sign in again.');return}
    if(r.status===403||d.has_access===false){authNotice('This account does not have permission to view this employer portal page. Contact your portal administrator.');return}
    authNotice('We could not check your portal access right now. Your sign-in has been preserved.',true);return;
  }
  bindActivity();schedule();
  document.documentElement.classList.remove('s4u-auth-pending');
  window.dispatchEvent(new CustomEvent('s4u:dot-authenticated',{detail:d}));
}

const css=document.createElement('style');css.textContent='#s4u-idle-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(5,18,35,.72);z-index:2147483647;padding:20px}#s4u-idle-modal.open{display:flex}.s4u-idle-card{width:min(460px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 28px 80px rgba(0,0,0,.28);font-family:Arial,sans-serif;color:#102f55}.s4u-idle-mark{font-size:12px;font-weight:900;letter-spacing:.08em;color:#ff6b00;text-transform:uppercase}.s4u-idle-card h2{font-size:24px;margin:10px 0}.s4u-idle-card p{font-size:14px;line-height:1.55;color:#516174}.s4u-idle-count{display:flex;align-items:baseline;gap:9px;margin:20px 0}.s4u-idle-count strong{font-size:36px}.s4u-idle-count span{font-size:12px;color:#6b7788}.s4u-idle-actions{display:flex;gap:10px}.s4u-idle-actions button{flex:1;border:0;border-radius:10px;padding:12px 14px;font-weight:800;cursor:pointer}.s4u-idle-actions button:first-child{background:#102f55;color:#fff}.s4u-idle-actions button:last-child{background:#eef2f6;color:#102f55}';document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',guard,{once:true});else guard();
})();