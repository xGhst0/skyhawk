const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const HEAD = (t) => `<!doctype html><html><head><meta charset="utf-8"><title>${t}</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg">`;
const APPCSS = `<style>
:root{--bg:#0B0D10;--card:#15181E;--line:#20242c;--txt:#EDEFF2;--mut:#79818f;--accent:#5EEAD4;--accent-ink:#08110f;--link:#7fead9;--signal:#C3C9D2;--green:#35d3a0;--amber:#E0A93B;--red:#FF5C6A}
[data-theme="iris"]{--bg:#0A0E1A;--card:#141A2E;--line:#26304d;--txt:#E6E9F5;--mut:#8A93B2;--accent:#7C6BFF;--accent-ink:#0A0E1A;--link:#a89dff;--signal:#35E6C5}
[data-theme="neon"]{--bg:#08090D;--card:#12141C;--line:#262a36;--txt:#E9EDF5;--mut:#8b93a6;--accent:#16E0FF;--accent-ink:#04121a;--link:#7fe9ff;--signal:#FF3D8A}
[data-theme="halon"]{--bg:#0C0F0D;--card:#161B18;--line:#2a332c;--txt:#E8F0EA;--mut:#8fa094;--accent:#B8FF2E;--accent-ink:#0C0F0D;--link:#cdff7a;--signal:#4DD0E1}
*{box-sizing:border-box}body{margin:0;font:15px system-ui,Segoe UI,Roboto;background:var(--bg);color:var(--txt)}
a{color:var(--link);text-decoration:none}.wrap{max-width:960px;margin:0 auto;padding:20px}
.top{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--accent);padding-bottom:12px;margin-bottom:16px}
.logo{font-size:18px;font-weight:800;color:var(--txt);letter-spacing:.5px;display:flex;align-items:center;gap:8px}.sub{color:var(--mut);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px}
h2{font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 9px}
input,select,button,textarea{font:inherit;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--txt);padding:8px 10px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent)}
button{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.08)}button.ghost{background:transparent;color:var(--mut);border-color:var(--line);font-weight:500;padding:6px 9px}
button.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.appx{display:flex;gap:6px}.appx select{padding:5px 7px;font-size:12px;color:var(--mut)}
.row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.row .t{flex:1;min-width:170px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.k{color:var(--mut);font-size:12px}.v{font-size:22px;font-weight:700;margin-top:3px}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.b-ok{background:rgba(53,211,160,.14);color:var(--green)}.b-warn{background:rgba(224,169,59,.15);color:var(--amber)}.b-mut{background:var(--bg);color:var(--mut);border:1px solid var(--line)}.b-red{background:rgba(255,92,106,.15);color:var(--red)}.b-pro{background:var(--bg);color:var(--signal);border:1px solid var(--line)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.crit{background:var(--red)}.high{background:var(--amber)}.medium{background:#6b7a99}.low{background:#4a5b7d}
.pill{font-size:11px;padding:2px 8px;border-radius:20px;background:var(--bg);color:var(--link);border:1px solid var(--line)}
.fnd{border-left:4px solid var(--line)}.fnd.approved{border-left-color:var(--accent)}.fnd.submitted{border-left-color:var(--amber)}.fnd.rejected,.fnd.parked{border-left-color:var(--line);opacity:.7}
.empty{color:var(--mut);font-size:13px}.foot{color:var(--mut);font-size:12px;margin-top:20px;text-align:center}
.logs{font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.5;max-height:200px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px}
.lg-info{color:var(--mut)}.lg-warn{color:var(--amber)}.lg-error{color:var(--red)}.lg-debug{color:var(--mut);opacity:.6}
.invcard{display:flex;justify-content:space-between;align-items:center;gap:12px}
.me{display:flex;align-items:center;gap:8px;font-size:13px}
.map{position:relative;overflow:auto}.node{position:absolute;transform:translate(-50%,-50%);width:150px;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:7px 9px;font-size:12px}
.node.comp{border-color:var(--red);background:rgba(255,92,106,.1)}.node .nt{color:var(--mut);font-size:10px}
.elab{position:absolute;transform:translate(-50%,-50%);font-size:10px;background:var(--bg);border:1px solid var(--line);border-radius:20px;padding:1px 6px;color:var(--accent)}
.chtoggle{position:fixed;right:18px;bottom:18px;z-index:40;border-radius:24px;padding:10px 15px;box-shadow:0 4px 16px rgba(0,0,0,.4)}
.chatd{position:fixed;top:0;right:0;height:100%;width:330px;max-width:88vw;background:var(--card);border-left:1px solid var(--line);transform:translateX(100%);transition:transform .18s;z-index:50;display:flex;flex-direction:column}
.chatd.open{transform:none}
.chd-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);font-weight:600}
.chd-ch{display:flex;gap:6px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid var(--line);max-height:96px;overflow:auto}
.chch{font-size:12px;padding:4px 9px;border-radius:20px;border:1px solid var(--line);background:var(--bg);color:var(--mut);cursor:pointer}
.chch.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.chd-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.chmsg{max-width:82%;padding:7px 10px;border-radius:10px;background:var(--bg);border:1px solid var(--line);font-size:13px;word-break:break-word}
.chmsg .who{font-size:11px;color:var(--mut);margin-bottom:2px}
.chmsg.me{align-self:flex-end;background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.chmsg.me .who{color:var(--accent-ink);opacity:.8}
.chd-input{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line)}.chd-input input{flex:1}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:14px;flex-wrap:wrap}
.tab{padding:9px 16px;cursor:pointer;color:var(--mut);border-bottom:2px solid transparent;font-size:14px}
.tab.on{color:var(--txt);border-bottom-color:var(--accent);font-weight:500}
.panel{display:none}.panel.on{display:block}
.mtool{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.mcanvas{position:relative;width:900px;height:430px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg);touch-action:none}
.mzone{position:absolute;top:0;bottom:0;border-right:1px dashed var(--line)}
.mzlab{position:absolute;top:6px;transform:translateX(-50%);font-size:10px;text-transform:uppercase;color:var(--mut)}
.mnode{position:absolute;transform:translate(-50%,-50%);width:118px;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:6px 8px;font-size:12px;cursor:grab;user-select:none}
.mnode.sel{outline:2px solid var(--accent)}
.mnode.compromised{border-color:var(--red);background:rgba(255,92,106,.10)}
.mnode.entry{border-color:var(--amber)}.mnode.encrypted{border-color:var(--red);background:rgba(255,92,106,.20)}
.mnode .mt{color:var(--mut);font-size:10px}.mnode .mip{font-family:ui-monospace,monospace;font-size:10px;color:var(--mut)}
.mhandle{position:absolute;right:-7px;top:50%;transform:translateY(-50%);width:13px;height:13px;border-radius:50%;background:var(--accent);border:2px solid var(--card);cursor:crosshair}
.melab{position:absolute;transform:translate(-50%,-50%);font-size:10px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1px 6px;color:var(--accent);cursor:pointer}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:60;display:flex;align-items:center;justify-content:center}
.modalbox{background:var(--card);border:1px solid var(--line);border-radius:12px;width:560px;max-width:92vw;max-height:82vh;overflow:auto;padding:16px}
.trow{padding:7px 9px;border:1px solid var(--line);border-radius:8px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;gap:8px}
.trow:hover{background:var(--bg)}
.chbadge{position:absolute;top:-7px;right:-7px;background:var(--red);color:#fff;border-radius:20px;font-size:10px;line-height:16px;height:16px;min-width:16px;padding:0 5px;text-align:center;display:none}
.rframe{width:100%;height:560px;border:1px solid var(--line);border-radius:10px;background:#fff}
</style>`;

const PREFJS = `
var Q=String.fromCharCode(39);
const THEMES=[['monolith','Monolith'],['iris','Nightfall Iris'],['neon','Neon Grid'],['halon','Halon']];
const MARKS={head:'<path d="M24 60 C30 44 46 34 66 36 L80 28 L82 44 C92 46 98 50 102 48 L90 58 L110 60 L90 68 C92 86 74 98 54 92 C62 82 62 74 57 68 C44 70 30 68 24 60 Z"/><circle cx="70" cy="54" r="4.5" class="eye"/>',strike:'<path d="M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z"/><path d="M64 44 L60 54 L64 50 L68 54 Z"/><path d="M60 48 L59 70 L69 70 L68 48 Z"/><path d="M60 50 L16 28 L30 47 L47 51 L58 62 Z"/><path d="M68 50 L112 28 L98 47 L81 51 L70 62 Z"/><path d="M64 68 L60 90 L64 84 L68 90 Z"/><path d="M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z"/><path d="M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z"/>',wing:'<path d="M28 40 C60 42 90 56 106 94 C96 86 84 82 72 82 C82 73 74 66 64 66 C74 58 64 51 54 52 C64 45 50 42 28 40 Z"/>'};
function tileSvg(mark){return '<svg width="26" height="26" viewBox="0 0 128 128" style="vertical-align:middle;border-radius:7px;background:var(--card)"><g fill="var(--accent)">'+(MARKS[mark]||MARKS.strike).replace(/class="eye"/g,'fill="var(--card)"')+'</g></svg>';}
function buildLogo(mark){mark=mark||'strike';const el=document.getElementById('logo');if(el)el.innerHTML=tileSvg(mark)+'<span style="letter-spacing:1.5px">SKYHAWK</span>';}
function applyPrefs(p){document.documentElement.dataset.theme=p.theme||'monolith';buildLogo(p.mark||'strike');const t=document.getElementById('selTheme'),m=document.getElementById('selMark');if(t)t.value=p.theme||'monolith';if(m)m.value=p.mark||'strike';}
function buildAppx(uid){const el=document.getElementById('appx');if(!el)return;el.innerHTML='<select id="selTheme" title="Theme" onchange="savePrefs(\\''+uid+'\\')">'+THEMES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join('')+'</select><select id="selMark" title="Logo" onchange="savePrefs(\\''+uid+'\\')"><option value="strike">Striking</option><option value="head">Hawk head</option><option value="wing">Wing</option></select>';}
async function savePrefs(uid){const p={theme:document.getElementById('selTheme').value,mark:document.getElementById('selMark').value};localStorage.setItem('sky_prefs',JSON.stringify(p));applyPrefs(p);try{await fetch('/api/users/'+uid+'/prefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});}catch(e){}}
async function initPrefs(uid){let p=null;try{p=JSON.parse(localStorage.getItem('sky_prefs'));}catch(e){}if(p)applyPrefs(p);try{const us=await (await fetch('/api/users')).json();const me=us.find(u=>u.id===uid);if(me&&me.prefs){applyPrefs(me.prefs);localStorage.setItem('sky_prefs',JSON.stringify(me.prefs));}}catch(e){}}
`;
const CHATHTML = `<button class="chtoggle" onclick="toggleChat()">Chat<span class="chbadge" id="chBadge"></span></button><div class="chatd" id="chatDrawer"><div class="chd-hd"><span>Team</span><a href="#" onclick="toggleChat();return false" style="color:var(--mut)">close</a></div><div class="chd-ch" id="chChannels"></div><div class="chd-msgs" id="chMsgs"></div><div class="chd-input"><input id="chInput" placeholder="Message" onkeydown="if(event.key==='Enter')chSend()"><button onclick="chSend()">Send</button></div></div>`;
const CHATJS = `
var chUid=localStorage.getItem('hs_uid'),chChannel='team',chReads={};
try{chReads=JSON.parse(localStorage.getItem('sky_reads'))||{};}catch(e){}
function chSaveReads(){localStorage.setItem('sky_reads',JSON.stringify(chReads));}
function chMark(ch){chReads[ch]=Date.now();chSaveReads();chSummary();}
function toggleChat(){var d=document.getElementById('chatDrawer');d.classList.toggle('open');if(d.classList.contains('open')){chMark(chChannel);chLoadMsgs(true);}}
async function chLoadChannels(){if(!chUid)return;const cs=await (await fetch('/api/chat/channels?me='+encodeURIComponent(chUid))).json();document.getElementById('chChannels').innerHTML=cs.map(function(c){return '<span class="chch'+(c.id===chChannel?' on':'')+'" onclick="chPick('+Q+c.id+Q+','+Q+c.name.replace(/[^a-zA-Z0-9 ._-]/g,'')+Q+')">'+(c.dm?'@ ':'# ')+esc(c.name)+'</span>';}).join('');}
function chPick(id,name){chChannel=id;var h=document.querySelector('.chd-hd span');if(h)h.textContent=name;chLoadChannels();chLoadMsgs(true);chMark(id);}
async function chLoadMsgs(scroll){if(!chUid)return;const ms=await (await fetch('/api/chat/messages?channel='+encodeURIComponent(chChannel))).json();const box=document.getElementById('chMsgs');if(!box)return;const near=box.scrollTop+box.clientHeight>box.scrollHeight-40;box.innerHTML=ms.map(function(m){return '<div class="chmsg'+(m.from===chUid?' me':'')+'"><div class="who">'+esc(m.fromName)+' · '+new Date(m.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>'+esc(m.text)+'</div>';}).join('');if(scroll||near)box.scrollTop=box.scrollHeight;if(document.getElementById('chatDrawer').classList.contains('open'))chMark(chChannel);}
async function chSend(){const i=document.getElementById('chInput');const t=i.value.trim();if(!t)return;i.value='';await fetch('/api/chat/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actorId:chUid,channel:chChannel,text:t})});chLoadMsgs(true);}
async function chSummary(){if(!chUid)return;const rows=await (await fetch('/api/chat/summary')).json();let n=0;rows.forEach(function(r){if(r.lastTs>(chReads[r.id]||0)&&r.lastFrom!==chUid)n++;});const b=document.getElementById('chBadge');if(b){b.textContent=n;b.style.display=n>0?'inline-block':'none';}}
if(chUid){chLoadChannels();chLoadMsgs(true);setInterval(chLoadMsgs,2500);chSummary();setInterval(chSummary,3000);}
`;

// ---------------- login ----------------
function login() {
  return HEAD("SKYHAWK · sign in") + APPCSS + `<body><div class="wrap" style="max-width:460px">
<div class="top"><div class="logo"><svg width="26" height="26" viewBox="0 0 128 128" style="border-radius:7px;background:var(--card)"><g fill="var(--accent)"><path d="M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z"/><path d="M64 44 L60 54 L64 50 L68 54 Z"/><path d="M60 48 L59 70 L69 70 L68 48 Z"/><path d="M60 50 L16 28 L30 47 L47 51 L58 62 Z"/><path d="M68 50 L112 28 L98 47 L81 51 L70 62 Z"/><path d="M64 68 L60 90 L64 84 L68 90 Z"/><path d="M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z"/><path d="M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z"/></g></svg><span style="letter-spacing:1.5px">SKYHAWK</span></div><div class="sub">air-gapped · sign in</div></div>
<div class="card"><h2 style="margin-top:0">Sign in</h2>
<div class="row" style="margin-bottom:8px"><input id="lname" class="t" placeholder="Name"><input id="lpw" type="password" placeholder="Password" style="width:150px" onkeydown="if(event.key==='Enter')signin()"><button onclick="signin()">Sign in</button></div>
<div class="k" id="lerr" style="color:var(--red)"></div></div>
<div class="card"><h2 style="margin-top:0">Create account</h2>
<div class="row" style="margin-bottom:8px"><input id="rname" class="t" placeholder="Name"><select id="rtitle" style="width:150px" onchange="desc()"></select></div>
<div class="row"><input id="rpw" type="password" class="t" placeholder="Password"><button onclick="register()">Create</button></div>
<div class="k" id="titledesc" style="margin-top:6px"></div></div>
<div class="foot">Seeded accounts: Morgan (MC), Chen (TC), Rivera (NCM), Patel (HCM) — password <code>skyhawk</code>. Change these in production.</div>
</div>
<script>
const TITLES={NCM:'NCM — create & edit your own findings.',HCM:'HCM — create & edit your own findings.',TC:'TC (team lead) — control the technical report + edit any finding.',MC:'MC (manager) — full control incl. freezing the formal report.'};
document.getElementById('rtitle').innerHTML=Object.keys(TITLES).map(k=>'<option value="'+k+'">'+k+'</option>').join('');
function desc(){document.getElementById('titledesc').textContent=TITLES[document.getElementById('rtitle').value]||'';}
desc();
function save(u){localStorage.setItem('hs_uid',u.id);localStorage.setItem('hs_name',u.name);localStorage.setItem('hs_title',u.title);location.href='/';}
async function signin(){const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('lname').value,password:document.getElementById('lpw').value})});const j=await r.json();if(r.ok)save(j);else document.getElementById('lerr').textContent=j.error||'sign in failed';}
async function register(){const name=document.getElementById('rname').value.trim();if(!name)return;const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,title:document.getElementById('rtitle').value,password:document.getElementById('rpw').value})});const j=await r.json();if(r.ok)save(j);else alert(j.error||'error');}
</script></body></html>`;
}

// ---------------- portfolio ----------------
function portfolio() {
  return HEAD("Skyhawk") + APPCSS + `<body><div class="wrap">
<div class="top"><div class="logo" id="logo">SKYHAWK</div><div class="sub" style="flex:1">air-gapped · <span id="store"></span></div><div class="appx" id="appx"></div><div class="me" id="me"></div></div>
<div class="grid" style="margin-bottom:6px">
<div class="card" style="margin:0"><div class="k">Open cases</div><div class="v" id="mOpen">—</div></div>
<div class="card" style="margin:0"><div class="k">In technical report</div><div class="v" id="mFin">—</div></div>
<div class="card" style="margin:0"><div class="k">Total findings</div><div class="v" id="mFnd">—</div></div>
</div>
<h2>New investigation</h2>
<div class="card"><div class="row"><input id="nt" class="t" placeholder="Case title (e.g. Contoso BEC / account takeover)"><button onclick="mk()">Create case</button></div></div>
<h2>Investigations</h2><div id="list"></div>
<div class="foot">Skyhawk · runs offline</div></div>
<script>
${PREFJS}
const uid=localStorage.getItem('hs_uid');if(!uid){location.href='/login';}
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
document.getElementById('me').innerHTML='<span class="badge b-pro">'+localStorage.getItem('hs_title')+'</span> '+esc(localStorage.getItem('hs_name'))+' · <a href="#" onclick="fetch(\\'/api/auth/logout\\',{method:\\'POST\\'}).then(function(){localStorage.clear();location.href=\\'/login\\';});return false">switch</a>';
buildAppx(uid);initPrefs(uid);
async function mk(){const t=document.getElementById('nt');if(!t.value.trim())return;const r=await fetch('/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t.value,actorId:uid})});const j=await r.json();if(j.error){alert(j.error);return;}t.value='';load();}
async function load(){
  const h=await (await fetch('/health')).json();document.getElementById('store').textContent='store: '+h.store;
  const pr=await fetch('/api/portfolio');if(pr.status===401){localStorage.clear();location.href='/login';return;}const p=await pr.json();let open=0,fin=0,fnd=0;
  document.getElementById('list').innerHTML=p.length?p.map(i=>{if(i.status==='open')open++;fin+=i.technical;fnd+=i.findings;
    return '<div class="card invcard"><div><a href="/inv?id='+encodeURIComponent(i.id)+'"><b>'+esc(i.id)+'</b> · '+esc(i.title)+'</a><div class="k" style="margin-top:3px">'+i.findings+' findings · '+i.technical+' technical · '+i.formal+' formal'+(i.finalized?' · <span class="badge b-ok">formal frozen</span>':'')+'</div></div><a href="/inv?id='+encodeURIComponent(i.id)+'">Open →</a></div>';}).join(''):'<div class="empty">No investigations yet. Create one above.</div>';
  document.getElementById('mOpen').textContent=open;document.getElementById('mFin').textContent=fin;document.getElementById('mFnd').textContent=fnd;
}
load();setInterval(load,3000);
</script>${CHATHTML}<script>${CHATJS}</script></body></html>`;
}
module.exports = { login, portfolio, esc, HEAD, APPCSS };

// ---------------- workspace ----------------
function workspace(id) {
  return HEAD("SKYHAWK · " + esc(id)) + APPCSS + `<body><div class="wrap">
<div class="top"><div class="logo" id="logo">SKYHAWK</div><div style="flex:1"><div><a href="/">← Portfolio</a> &nbsp; <b id="ititle"></b></div><div class="sub" id="imeta"></div></div><div class="appx" id="appx"></div><div class="me" id="me"></div></div>
<div class="tabs">
  <div class="tab on" onclick="showTab('findings')" id="tab-findings">Findings</div>
  <div class="tab" onclick="showTab('map')" id="tab-map">Network map</div>
  <div class="tab" onclick="showTab('report')" id="tab-report">Report</div>
</div>
<div class="panel on" id="p-findings">
  <div class="grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:6px">
    <div class="card" style="margin:0"><div class="k">Findings</div><div class="v" id="nf">—</div></div>
    <div class="card" style="margin:0"><div class="k">In technical report</div><div class="v" id="tc">—</div></div>
  </div>
  <h2>Add finding</h2>
  <div class="card">
    <div class="row" style="margin-bottom:8px"><input id="ftitle" class="t" placeholder="Finding title"><select id="fsev" style="width:110px"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
    <textarea id="fdetail" style="width:100%;min-height:50px;margin-bottom:8px" placeholder="Technical detail (timestamps, hosts, IOCs, commands run)"></textarea>
    <div class="row" style="margin-bottom:8px"><input id="fattack" class="t" placeholder="ATT&CK e.g. T1133 (or use the helper)"><button class="ghost" onclick="openAttack()">ATT&CK helper</button></div>
    <div class="k" style="margin:2px 0 4px">Affected systems</div>
    <div class="row" style="margin-bottom:6px"><select id="adtype" style="width:180px"></select><input id="adname" placeholder="hostname / IP" style="flex:1;min-width:150px"><button class="ghost" onclick="addAsset()">Add asset</button></div>
    <div id="assetChips" class="row" style="margin-bottom:8px"></div>
    <div class="k" style="margin:2px 0 4px">Screenshots</div>
    <div class="row" style="margin-bottom:6px"><input id="shotcap" placeholder="caption" style="flex:1;min-width:150px"><input type="file" id="shotfile" accept="image/*"><button class="ghost" onclick="addShot()">Attach</button></div>
    <div id="shotChips" class="row" style="margin-bottom:8px"></div>
    <input id="ftools" class="t" style="width:100%;margin-bottom:8px" placeholder="Tools used (comma-separated)">
    <textarea id="fqueries" style="width:100%;min-height:42px;margin-bottom:8px" placeholder="Queries — one per line as:  SPL | index=web uri=/x"></textarea>
    <button onclick="addF()">Add finding</button>
  </div>
  <h2>Findings board</h2><div id="board"></div>
</div>
<div class="panel" id="p-map">
  <div class="mtool">
    <select id="adtype2" style="width:170px"></select><button class="ghost" onclick="addDevice()">+ Device</button>
    <button class="ghost" onclick="mSync()">Sync from findings</button>
    <button class="ghost" onclick="mTidy()">Tidy</button>
    <button onclick="mSave()">Save map</button>
    <span class="k" id="msaved" style="margin-left:6px"></span>
  </div>
  <div class="empty" style="margin-bottom:8px">Drag devices to arrange · drag the dot onto another device to link · click a device to edit it. Build the whole environment; findings can seed it.</div>
  <div style="overflow:auto"><div class="mcanvas" id="mcanvas"></div></div>
  <div class="card" id="mdetail" style="margin-top:10px"></div>
</div>
<div class="panel" id="p-report">
  <div class="row" style="margin-bottom:8px"><a id="rlink" target="_blank">Open in new tab / Print</a> <span class="k">— live technical report</span></div>
  <iframe class="rframe" id="rframe"></iframe>
</div>
</div>
${CHATHTML}
<div id="attackModal"></div>
<script>
const INV=${JSON.stringify(id)};
${PREFJS}
const uid=localStorage.getItem('hs_uid');if(!uid){location.href='/login';}
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let devices=[],caps=[],sigF="",pendingAssets=[],pendingShots=[],expanded=new Set(),lastFindings=[];
let mNodes=[],mEdges=[],mSel=null,mLoaded=false,mDrag=null,mMoved=false,mLink=null,ATT=null;
const hasCap=c=>caps.includes(c);
document.getElementById('me').innerHTML='<span class="badge b-pro">'+localStorage.getItem('hs_title')+'</span> '+esc(localStorage.getItem('hs_name'))+' · <a href="#" onclick="doLogout();return false">switch</a>';
function doLogout(){fetch('/api/auth/logout',{method:'POST'}).then(function(){localStorage.clear();location.href='/login';});}
document.getElementById('rlink').href='/investigations/'+encodeURIComponent(INV)+'/report/technical';
async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({actorId:uid},b||{}))});const j=await r.json().catch(()=>({}));if(!r.ok){alert(j.error||'error');throw new Error(j.error);}return j;}
function showTab(t){['findings','map','report'].forEach(function(x){document.getElementById('tab-'+x).classList.toggle('on',x===t);document.getElementById('p-'+x).classList.toggle('on',x===t);});if(t==='report'){document.getElementById('rframe').src='/investigations/'+encodeURIComponent(INV)+'/report/technical?ts='+Date.now();}if(t==='map'){mRender();}}

function renderStaging(){document.getElementById('assetChips').innerHTML=pendingAssets.map(function(a,i){return '<span class="pill">'+esc(a.type)+' · '+esc(a.name)+' <a href="#" onclick="rmAsset('+i+');return false" style="color:var(--red)">×</a></span>';}).join(' ');document.getElementById('shotChips').innerHTML=pendingShots.map(function(s,i){return '<span class="pill"><img src="'+s.dataUrl+'" style="height:20px;vertical-align:middle;border-radius:3px"> '+esc(s.caption||'shot')+' <a href="#" onclick="rmShot('+i+');return false" style="color:var(--red)">×</a></span>';}).join(' ');}
function rmAsset(i){pendingAssets.splice(i,1);renderStaging();}
function rmShot(i){pendingShots.splice(i,1);renderStaging();}
function addAsset(){const n=document.getElementById('adname');if(!n.value.trim())return;pendingAssets.push({type:document.getElementById('adtype').value,name:n.value.trim()});n.value='';renderStaging();}
function addShot(){const f=document.getElementById('shotfile'),cap=document.getElementById('shotcap');if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=function(){pendingShots.push({caption:cap.value,dataUrl:rd.result});cap.value='';f.value='';renderStaging();};rd.readAsDataURL(f.files[0]);}
async function addF(){const t=document.getElementById('ftitle');if(!t.value.trim())return;
  const tools=(document.getElementById('ftools').value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const queries=(document.getElementById('fqueries').value||'').split(String.fromCharCode(10)).map(l=>l.trim()).filter(Boolean).map(function(l){const i=l.indexOf('|');return i>0?{lang:l.slice(0,i).trim(),text:l.slice(i+1).trim()}:{lang:'query',text:l};});
  await post('/api/findings',{investigationId:INV,title:t.value,technicalDetail:document.getElementById('fdetail').value,severity:document.getElementById('fsev').value,attack:document.getElementById('fattack').value,assets:pendingAssets,screenshots:pendingShots.map(s=>({caption:s.caption,dataUrl:s.dataUrl})),tools,queries});
  t.value=document.getElementById('fdetail').value=document.getElementById('fattack').value=document.getElementById('ftools').value=document.getElementById('fqueries').value='';pendingAssets=[];pendingShots=[];renderStaging();sigF='';tick();}
async function fAct(id,a,b){await post('/api/findings/'+id+'/'+a,b);sigF='';tick();}
function toggleExp(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);sigF='';tick();}
async function evShot(id){const f=document.getElementById('ev-shot-'+id),cap=document.getElementById('ev-cap-'+id);if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=async function(){await post('/api/findings/'+id+'/evidence',{screenshots:[{caption:cap.value,dataUrl:rd.result}]});sigF='';tick();};rd.readAsDataURL(f.files[0]);}
async function evAsset(id){const n=document.getElementById('ev-name-'+id);if(!n.value.trim())return;await post('/api/findings/'+id+'/evidence',{assets:[{type:document.getElementById('ev-type-'+id).value,name:n.value.trim()}]});sigF='';tick();}
async function evTool(id){const v=document.getElementById('ev-tool-'+id).value.trim();if(!v)return;await post('/api/findings/'+id+'/evidence',{tools:v.split(',').map(x=>x.trim()).filter(Boolean)});sigF='';tick();}
async function saveEdit(id){await post('/api/findings/'+id+'/edit',{title:document.getElementById('ed-title-'+id).value,severity:document.getElementById('ed-sev-'+id).value,attack:document.getElementById('ed-attack-'+id).value,technicalDetail:document.getElementById('ed-detail-'+id).value});sigF='';tick();}
function canEdit(f){return f.authorId===uid?hasCap('finding.editOwn'):hasCap('finding.editAny');}
function evPanel(f){const opts=devices.map(d=>'<option value="'+d+'">'+d+'</option>').join('');const A='fAct',id=f.id;
  return '<div class="card" style="margin-top:8px;background:var(--bg)"><div class="k" style="margin-bottom:4px">Edit</div><div class="row" style="margin-bottom:6px"><input id="ed-title-'+id+'" class="t" value="'+esc(f.title)+'"><select id="ed-sev-'+id+'" style="width:100px">'+['critical','high','medium','low'].map(function(s){return '<option'+(f.severity===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select><input id="ed-attack-'+id+'" style="width:140px" value="'+esc((f.attack||[]).join(', '))+'"></div><textarea id="ed-detail-'+id+'" style="width:100%;min-height:44px;margin-bottom:6px">'+esc(f.technicalDetail)+'</textarea><button class="ghost" onclick="saveEdit('+Q+id+Q+')">Save edits</button><div class="k" style="margin:10px 0 4px">Add evidence</div><div class="row" style="margin-bottom:6px"><select id="ev-type-'+id+'" style="width:170px">'+opts+'</select><input id="ev-name-'+id+'" placeholder="host / IP" style="flex:1;min-width:120px"><button class="ghost" onclick="evAsset('+Q+id+Q+')">+ asset</button></div><div class="row" style="margin-bottom:6px"><input id="ev-cap-'+id+'" placeholder="screenshot caption" style="flex:1;min-width:120px"><input type="file" id="ev-shot-'+id+'" accept="image/*"><button class="ghost" onclick="evShot('+Q+id+Q+')">+ screenshot</button></div><div class="row"><input id="ev-tool-'+id+'" placeholder="tools (comma-separated)" style="flex:1;min-width:120px"><button class="ghost" onclick="evTool('+Q+id+Q+')">+ tools</button></div></div>';}
function fCard(f){const controls=[];const id=f.id;
  if(hasCap('finding.curate')){if(f.state==='submitted'){controls.push('<button onclick="fAct('+Q+id+Q+','+Q+'approve'+Q+')">Approve</button>');controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'park'+Q+')">Park</button>');controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'reject'+Q+')">Reject</button>');}else if(f.state==='approved'){controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'park'+Q+')">Remove from report</button>');}}
  if(canEdit(f))controls.push('<button class="ghost" onclick="toggleExp('+Q+id+Q+')">'+(expanded.has(id)?'Close':'Edit / +evidence')+'</button>');
  const badge=f.state==='approved'?'<span class="badge b-ok">in report</span>':f.state==='submitted'?'<span class="badge b-warn">submitted</span>':'<span class="badge b-mut">'+f.state+'</span>';
  let ev='';
  if(f.assets&&f.assets.length)ev+='<div class="k" style="margin-top:6px">Affected: '+f.assets.map(function(a){return '<span class="pill">'+esc(a.type)+' · '+esc(a.name)+'</span>';}).join(' ')+'</div>';
  if(f.screenshots&&f.screenshots.length)ev+='<div class="row" style="margin-top:6px">'+f.screenshots.map(function(s){return '<a href="'+s.url+'" target="_blank"><img src="'+s.url+'" title="'+esc(s.caption)+'" style="height:52px;border:1px solid var(--line);border-radius:5px"></a>';}).join('')+'</div>';
  if(f.tools&&f.tools.length)ev+='<div class="k" style="margin-top:6px">Tools: '+f.tools.map(function(t){return '<span class="pill">'+esc(t)+'</span>';}).join(' ')+'</div>';
  if(f.queries&&f.queries.length)ev+='<div class="k" style="margin-top:6px">'+f.queries.length+' query(ies) captured</div>';
  return '<div class="card fnd '+f.state+'"><div><span class="dot '+f.severity+'"></span><b>'+esc(f.title)+'</b> '+badge+'<div class="k" style="margin-top:3px">'+esc(f.by)+' · '+(f.attack||[]).map(function(a){return '<span class="pill">'+esc(a)+'</span>';}).join(' ')+'</div></div>'+ev+(controls.length?'<div class="row" style="margin-top:9px">'+controls.join('')+'</div>':'')+(expanded.has(id)?evPanel(f):'')+'</div>';}

async function openAttack(){if(!ATT)ATT=await (await fetch('/api/attack')).json();renderAttack('');}
function closeAttack(){document.getElementById('attackModal').innerHTML='';}
async function attackSuggestNow(){const text=document.getElementById('ftitle').value+' '+document.getElementById('fdetail').value;const sug=await (await fetch('/api/attack/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})).json();renderAttack('',sug);}
function pickTech(tid){const el=document.getElementById('fattack');const cur=el.value.split(',').map(x=>x.trim()).filter(Boolean);if(!cur.includes(tid))cur.push(tid);el.value=cur.join(', ');closeAttack();}
function trow(x,tn){return '<div class="trow" onclick="pickTech('+Q+x.id+Q+')"><span><b>'+x.id+'</b> · '+esc(x.name)+'</span><span class="k">'+esc(tn[x.tactic]||'')+'</span></div>';}
function renderAttack(q,sug){const tn={};ATT.tactics.forEach(function(t){tn[t.id]=t.name;});let rows;
  if(sug){rows='<div class="k" style="margin:2px 0 6px">Suggested from your finding text:</div>'+(sug.length?sug.map(function(x){return trow(x,tn);}).join(''):'<div class="empty">No suggestions — try the search.</div>');}
  else{const ql=(q||'').toLowerCase();const f=ATT.techniques.filter(function(x){return !ql||x.id.toLowerCase().includes(ql)||x.name.toLowerCase().includes(ql)||(tn[x.tactic]||'').toLowerCase().includes(ql)||x.keywords.some(function(k){return k.includes(ql);});});rows=f.slice(0,60).map(function(x){return trow(x,tn);}).join('');}
  document.getElementById('attackModal').innerHTML='<div class="modal" onclick="if(event.target===this)closeAttack()"><div class="modalbox"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>MITRE ATT&CK helper</b><a href="#" onclick="closeAttack();return false" class="k">close</a></div><div class="row" style="margin-bottom:8px"><input class="t" placeholder="Search technique / tactic / keyword" oninput="renderAttack(this.value)"><button class="ghost" onclick="attackSuggestNow()">Suggest from finding</button></div><div>'+rows+'</div><div class="k" style="margin-top:8px">Click a technique to add its ID to the finding.</div></div></div>';}

const ZONES=[{n:'External',x0:0,x1:225},{n:'DMZ',x0:225,x1:470},{n:'Internal',x0:470,x1:700},{n:'Restricted',x0:700,x1:900}];
const zoneX=[110,345,585,800];
const ZMAP={'external host':0,'cloud / SaaS':0,'firewall':1,'router':1,'VPN gateway':1,'load balancer':1,'mail server':1,'domain controller':3};
function zoneFor(t){return ZMAP[t]!==undefined?ZMAP[t]:2;}
const ST=['clean','entry','compromised','encrypted','external'];
function mXY(e){const r=document.getElementById('mcanvas').getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function mNodeAt(e){const el=document.elementFromPoint(e.clientX,e.clientY);const n=el&&el.closest?el.closest('[data-mn]'):null;return n?n.getAttribute('data-mn'):null;}
function mFind(id){return mNodes.find(function(n){return n.id===id;});}
function mEdgeSvg(){let s='<svg width="900" height="430" style="position:absolute;inset:0;pointer-events:none"><defs><marker id="ma" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0L8,4L0,8Z" fill="#E24B4A"/></marker></defs>';
  mEdges.forEach(function(e){const a=mFind(e.a),b=mFind(e.b);if(!a||!b)return;s+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#E24B4A" stroke-width="2" marker-end="url(#ma)"/>';});
  if(mLink){const a=mFind(mLink.from);s+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+mLink.x+'" y2="'+mLink.y+'" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 4"/>';}
  return s+'</svg>';}
function mRender(){const c=document.getElementById('mcanvas');if(!c)return;
  let zones=ZONES.map(function(z){return '<div class="mzone" style="left:'+z.x0+'px;width:'+(z.x1-z.x0)+'px"></div>';}).join('')+ZONES.map(function(z){return '<div class="mzlab" style="left:'+((z.x0+z.x1)/2)+'px">'+z.n+'</div>';}).join('');
  let labs=mEdges.map(function(e,i){const a=mFind(e.a),b=mFind(e.b);if(!a||!b)return'';return '<div class="melab" style="left:'+((a.x+b.x)/2)+'px;top:'+((a.y+b.y)/2)+'px" onclick="mLabelEdge('+i+')">'+esc(e.label||'+ label')+'</div>';}).join('');
  let nodes=mNodes.map(function(n){return '<div class="mnode '+(n.state||'clean')+(n.id===mSel?' sel':'')+'" data-mn="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px" onpointerdown="mStartDrag(event,'+Q+n.id+Q+')"><div style="font-weight:500">'+esc(n.name)+'</div><div class="mt">'+esc(n.type)+'</div><div class="mip">'+esc(n.ip||'')+'</div><div class="mhandle" title="drag to link" onpointerdown="mStartLink(event,'+Q+n.id+Q+')"></div></div>';}).join('');
  c.innerHTML=zones+mEdgeSvg()+labs+nodes;
  const s=mFind(mSel);const md=document.getElementById('mdetail');
  if(s){md.innerHTML='<div class="row" style="align-items:center"><b>'+esc(s.name)+'</b><span class="k">'+esc(s.type)+'</span><input id="mip" value="'+esc(s.ip||'')+'" placeholder="IP" style="width:150px" onchange="mSetIp(this.value)"><button class="ghost" onclick="mCycle()">State: '+(s.state||'clean')+'</button><input id="mname" value="'+esc(s.name)+'" style="width:150px" onchange="mSetName(this.value)"><button class="ghost" onclick="mDel()">Delete</button></div>';}
  else md.innerHTML='<span class="empty">Select a device to edit it, or add one from the toolbar.</span>';}
function mSetIp(v){const n=mFind(mSel);if(n){n.ip=v;mSave(1);}}
function mSetName(v){const n=mFind(mSel);if(n){n.name=v;mRender();mSave(1);}}
function mWires(){const c=document.getElementById('mcanvas');const sv=c.querySelector('svg');if(sv)sv.outerHTML=mEdgeSvg();}
function mStartDrag(e,id){e.preventDefault();mSel=id;mMoved=false;const p=mXY(e),n=mFind(id);mDrag={id:id,dx:p.x-n.x,dy:p.y-n.y};mRender();}
function mStartLink(e,id){e.preventDefault();e.stopPropagation();const p=mXY(e);mLink={from:id,x:p.x,y:p.y};}
document.addEventListener('pointermove',function(e){if(mDrag){mMoved=true;const p=mXY(e),n=mFind(mDrag.id);n.x=Math.max(60,Math.min(880,p.x-mDrag.dx));n.y=Math.max(30,Math.min(410,p.y-mDrag.dy));const el=document.querySelector('[data-mn="'+mDrag.id+'"]');if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';}mWires();}else if(mLink){const p=mXY(e);mLink.x=p.x;mLink.y=p.y;mWires();}});
document.addEventListener('pointerup',function(e){if(mLink){const t=mNodeAt(e);if(t&&t!==mLink.from&&!mEdges.find(function(x){return (x.a===mLink.from&&x.b===t)||(x.a===t&&x.b===mLink.from);})){mEdges.push({a:mLink.from,b:t,label:''});}mLink=null;mRender();mSave(1);}else if(mDrag&&mMoved){mSave(1);}mDrag=null;});
function mLabelEdge(i){const v=prompt('Link label (ATT&CK / note)',mEdges[i].label||'');if(v!==null){mEdges[i].label=v.trim();mRender();mSave(1);}}
function mCycle(){const n=mFind(mSel);n.state=ST[(ST.indexOf(n.state||'clean')+1)%ST.length];mRender();mSave(1);}
function mDel(){mNodes=mNodes.filter(function(n){return n.id!==mSel;});mEdges=mEdges.filter(function(e){return e.a!==mSel&&e.b!==mSel;});mSel=null;mRender();mSave(1);}
function addDevice(){const type=document.getElementById('adtype2').value;const nid='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,4);mNodes.push({id:nid,type:type,name:type,ip:'',state:type==='external host'?'external':'clean',x:zoneX[zoneFor(type)],y:210});mSel=nid;mRender();mSave(1);}
function mSync(){let added=0;(lastFindings||[]).forEach(function(f){(f.assets||[]).forEach(function(a){if(!mNodes.find(function(n){return n.name===a.name;})){mNodes.push({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:a.type,name:a.name,ip:'',state:f.inTechnical?'compromised':'clean',x:zoneX[zoneFor(a.type)],y:60});added++;}});});mTidy();mSave(1);document.getElementById('msaved').textContent=added?('added '+added+' from findings'):'nothing new to sync';}
function mTidy(){const cols=[[],[],[],[]];mNodes.forEach(function(n){cols[zoneFor(n.type)].push(n);});cols.forEach(function(col,ci){col.forEach(function(n,ri){n.x=zoneX[ci];n.y=60+ri*74;});});mRender();}
async function mSave(quiet){try{await post('/api/investigations/'+encodeURIComponent(INV)+'/map',{nodes:mNodes,edges:mEdges});document.getElementById('msaved').textContent='saved ✓';}catch(e){document.getElementById('msaved').textContent='save failed';}}

async function tick(){
  const sr=await fetch('/api/investigations/'+encodeURIComponent(INV)+'/state?me='+encodeURIComponent(uid));if(sr.status===401){localStorage.clear();location.href='/login';return;}const s=await sr.json();
  if(s.error){document.querySelector('.wrap').innerHTML='<p>'+s.error+'</p><a href="/">← Portfolio</a>';return;}
  caps=s.me.caps;lastFindings=s.findings;
  document.getElementById('ititle').textContent=s.investigation.id+' · '+s.investigation.title;
  document.getElementById('imeta').textContent='status '+s.investigation.status;
  if(!devices.length){devices=await (await fetch('/api/devices')).json();const o=devices.map(function(d){return '<option value="'+d+'">'+d+'</option>';}).join('');document.getElementById('adtype').innerHTML=o;document.getElementById('adtype2').innerHTML=o;}
  document.getElementById('nf').textContent=s.findings.length;document.getElementById('tc').textContent=s.technicalCount;
  const sf=JSON.stringify(s.findings)+[...expanded].join(',')+caps.join(',');
  if(sf!==sigF){sigF=sf;document.getElementById('board').innerHTML=s.findings.length?s.findings.map(fCard).join(''):'<div class="empty">No findings yet.</div>';}
  if(!mLoaded){mNodes=(s.map&&s.map.nodes)||[];mEdges=(s.map&&s.map.edges)||[];mLoaded=true;if(document.getElementById('p-map').classList.contains('on'))mRender();}
}
tick();setInterval(tick,4000);
${CHATJS}
</script></body></html>`;
}

// ---------------- printable report ----------------
const PRINTCSS = `<style>
body{font:15px Georgia,serif;color:#111;max-width:820px;margin:0 auto;padding:40px 30px;background:#fff}
.hd{border-bottom:3px solid #0B0D10;padding-bottom:12px;margin-bottom:8px}.brand{font:700 13px system-ui;letter-spacing:1px;color:#0E8C7A}
h1{font-size:26px;color:#0B0D10;margin:6px 0}.meta{color:#555;font-size:13px;font-family:system-ui}
.banner{background:#fbe7c9;border:1px solid #e6c86a;color:#7a5300;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:13px;margin:12px 0}
.sign{background:#eef5ee;border:1px solid #bcd8bc;color:#25522b;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:13px;margin:12px 0}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#0B0D10;border-bottom:1px solid #ccc;padding-bottom:4px;margin:26px 0 10px;font-family:system-ui}
.f{margin:0 0 16px}.f .t{font-weight:700}.by{color:#666;font-size:12px;font-family:system-ui}
.tech{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#f5f6f8;border:1px solid #e2e5ea;border-radius:6px;padding:9px;white-space:pre-wrap;color:#333;margin-top:5px}
.pill{font:600 11px system-ui;background:#e2f7f3;color:#0c5a4f;padding:2px 8px;border-radius:20px;margin-right:4px}.mut{color:#666}.print{font-family:system-ui;font-size:13px}
@media print{.noprint{display:none}body{padding:0}}.noprint{margin:16px 0;font-family:system-ui}
</style>`;
function report(kind, d) {
  const inv = d.inv;
  const head = HEAD("Skyhawk report · " + esc(inv.id)) + PRINTCSS + `<body>
<div class="noprint"><a href="/inv?id=${encodeURIComponent(inv.id)}">← Back to workspace</a> &nbsp; <button onclick="window.print()">Print / Save PDF</button></div>
<div class="hd"><div class="brand">SKYHAWK</div><h1>${kind === "technical" ? "Technical Incident Report" : "Incident Report"}</h1><div class="meta">${esc(inv.id)} · ${esc(inv.title)}</div></div>`;
  const attack = d.attack.length ? `<h2>ATT&CK coverage</h2><p>${d.attack.map((a) => `<span class="pill">${esc(a)}</span>`).join(" ")}</p>` : "";
  if (kind === "technical") {
    const findings = (d.findingsRaw || []).filter((f) => f.inTechnical);
    const body = findings.length ? findings.map((f) => {
      const assets = (f.assets && f.assets.length) ? `<div class="print" style="margin:4px 0"><b>Affected systems:</b> ${f.assets.map((a) => `${esc(a.type)} — ${esc(a.name)}`).join("; ")}</div>` : "";
      const shots = (f.screenshots || []).map((sc) => `<figure style="margin:8px 0"><img src="${sc.url}" style="max-width:100%;border:1px solid #ccc;border-radius:4px"><figcaption class="by">${esc(sc.caption)}</figcaption></figure>`).join("");
      const tools = (f.tools && f.tools.length) ? `<div class="print" style="margin:4px 0"><b>Tools used:</b> ${f.tools.map(esc).join(", ")}</div>` : "";
      const queries = (f.queries || []).map((qy) => `<div class="tech"><b>${esc(qy.lang)}</b><br>${esc(qy.text)}</div>`).join("");
      return `<div class="f"><div class="t">${esc(f.title)} ${(f.attack || []).map((a) => `<span class="pill">${esc(a)}</span>`).join(" ")}</div><div class="by">Logged by ${esc(f.by || f.authorId)} · severity ${esc(f.severity)}</div><div class="tech">${esc(f.technicalDetail)}</div>${assets}${shots}${queries ? `<div class="print" style="margin-top:6px"><b>Queries</b></div>${queries}` : ""}${tools}</div>`;
    }).join("") : `<p class="mut">No approved findings yet.</p>`;
    return head + `<div class="banner">LIVE — regenerates as findings change. Internal / restricted.</div>` +
      (inv.execSummary ? `<h2>Executive summary</h2><p>${esc(inv.execSummary)}</p>` : "") +
      `<h2>Findings (${findings.length})</h2>${body}` + attack +
      (inv.remediation ? `<h2>Remediation</h2><p>${esc(inv.remediation)}</p>` : "") + `</body></html>`;
  }
  if (inv.formalFrozen) {
    const ff = inv.formalFrozen;
    const body = ff.blocks.length ? ff.blocks.map((b) => `<div class="f"><div class="t">${esc(b.title)}</div><p>${esc(b.body)}</p></div>`).join("") : `<p class="mut">No findings included.</p>`;
    return head + `<div class="sign">FROZEN · version ${ff.version} · signed by ${esc(ff.frozenBy)} · ${new Date(ff.frozenAt).toLocaleString()}</div>` +
      (ff.execSummary ? `<h2>Executive summary</h2><p>${esc(ff.execSummary)}</p>` : "") +
      (ff.scope ? `<h2>Scope &amp; impact</h2><p>${esc(ff.scope)}</p>` : "") +
      `<h2>What happened</h2>${body}` +
      (ff.remediation ? `<h2>Remediation &amp; recommendations</h2><p>${esc(ff.remediation)}</p>` : "") +
      `<h2 class="print">Notice</h2><p class="print mut">Analyst names and raw technical data omitted by policy.</p></body></html>`;
  }
  const live = d.formalLive;
  const body = live.length ? live.map((b) => `<div class="f"><div class="t">${esc(b.title)}</div><p>${esc(b.body || "&lt;summary not written&gt;")}</p></div>`).join("") : `<p class="mut">No findings flagged into the formal report yet.</p>`;
  return head + `<div class="banner">DRAFT — not finalized. An MC finalizes in the workspace to freeze and sign.</div><h2>What happened</h2>${body}</body></html>`;
}

module.exports = { login, portfolio, workspace, report };
