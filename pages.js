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
</style>`;

const PREFJS = `
const THEMES=[['monolith','Monolith'],['iris','Nightfall Iris'],['neon','Neon Grid'],['halon','Halon']];
const MARKS={head:'<path d="M24 60 C30 44 46 34 66 36 L80 28 L82 44 C92 46 98 50 102 48 L90 58 L110 60 L90 68 C92 86 74 98 54 92 C62 82 62 74 57 68 C44 70 30 68 24 60 Z"/><circle cx="70" cy="54" r="4.5" class="eye"/>',strike:'<path d="M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z"/><path d="M64 44 L60 54 L64 50 L68 54 Z"/><path d="M60 48 L59 70 L69 70 L68 48 Z"/><path d="M60 50 L16 28 L30 47 L47 51 L58 62 Z"/><path d="M68 50 L112 28 L98 47 L81 51 L70 62 Z"/><path d="M64 68 L60 90 L64 84 L68 90 Z"/><path d="M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z"/><path d="M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z"/>',wing:'<path d="M28 40 C60 42 90 56 106 94 C96 86 84 82 72 82 C82 73 74 66 64 66 C74 58 64 51 54 52 C64 45 50 42 28 40 Z"/>'};
function tileSvg(mark){return '<svg width="26" height="26" viewBox="0 0 128 128" style="vertical-align:middle;border-radius:7px;background:var(--card)"><g fill="var(--accent)">'+(MARKS[mark]||MARKS.strike).replace(/class="eye"/g,'fill="var(--card)"')+'</g></svg>';}
function buildLogo(mark){mark=mark||'strike';const el=document.getElementById('logo');if(el)el.innerHTML=tileSvg(mark)+'<span style="letter-spacing:1.5px">SKYHAWK</span>';}
function applyPrefs(p){document.documentElement.dataset.theme=p.theme||'monolith';buildLogo(p.mark||'strike');const t=document.getElementById('selTheme'),m=document.getElementById('selMark');if(t)t.value=p.theme||'monolith';if(m)m.value=p.mark||'strike';}
function buildAppx(uid){const el=document.getElementById('appx');if(!el)return;el.innerHTML='<select id="selTheme" title="Theme" onchange="savePrefs(\\''+uid+'\\')">'+THEMES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join('')+'</select><select id="selMark" title="Logo" onchange="savePrefs(\\''+uid+'\\')"><option value="strike">Striking</option><option value="head">Hawk head</option><option value="wing">Wing</option></select>';}
async function savePrefs(uid){const p={theme:document.getElementById('selTheme').value,mark:document.getElementById('selMark').value};localStorage.setItem('sky_prefs',JSON.stringify(p));applyPrefs(p);try{await fetch('/api/users/'+uid+'/prefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});}catch(e){}}
async function initPrefs(uid){let p=null;try{p=JSON.parse(localStorage.getItem('sky_prefs'));}catch(e){}if(p)applyPrefs(p);try{const us=await (await fetch('/api/users')).json();const me=us.find(u=>u.id===uid);if(me&&me.prefs){applyPrefs(me.prefs);localStorage.setItem('sky_prefs',JSON.stringify(me.prefs));}}catch(e){}}
`;
const CHATHTML = `<button class="chtoggle" onclick="toggleChat()">\u{1F4AC} Chat</button><div class="chatd" id="chatDrawer"><div class="chd-hd"><span>Team</span><a href="#" onclick="toggleChat();return false" style="color:var(--mut)">\u2715</a></div><div class="chd-ch" id="chChannels"></div><div class="chd-msgs" id="chMsgs"></div><div class="chd-input"><input id="chInput" placeholder="Message\u2026" onkeydown="if(event.key===\'Enter\')chSend()"><button onclick="chSend()">Send</button></div></div>`;
const CHATJS = `
var chUid=localStorage.getItem('hs_uid'),chChannel='team';
function toggleChat(){document.getElementById('chatDrawer').classList.toggle('open');}
async function chLoadChannels(){if(!chUid)return;const cs=await (await fetch('/api/chat/channels?me='+encodeURIComponent(chUid))).json();document.getElementById('chChannels').innerHTML=cs.map(function(c){return '<span class="chch'+(c.id===chChannel?' on':'')+'" onclick="chPick(\\''+c.id+'\\',\\''+c.name.replace(/[^a-zA-Z0-9 ._-]/g,'')+'\\')">'+(c.dm?'@ ':'# ')+esc(c.name)+'</span>';}).join('');}
function chPick(id,name){chChannel=id;var h=document.querySelector('.chd-hd span');if(h)h.textContent=name;chLoadChannels();chLoadMsgs(true);}
async function chLoadMsgs(scroll){if(!chUid)return;const ms=await (await fetch('/api/chat/messages?channel='+encodeURIComponent(chChannel))).json();const box=document.getElementById('chMsgs');if(!box)return;const near=box.scrollTop+box.clientHeight>box.scrollHeight-40;box.innerHTML=ms.map(function(m){return '<div class="chmsg'+(m.from===chUid?' me':'')+'"><div class="who">'+esc(m.fromName)+' \u00b7 '+new Date(m.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>'+esc(m.text)+'</div>';}).join('');if(scroll||near)box.scrollTop=box.scrollHeight;}
async function chSend(){const i=document.getElementById('chInput');const t=i.value.trim();if(!t)return;i.value='';await fetch('/api/chat/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actorId:chUid,channel:chChannel,text:t})});chLoadMsgs(true);}
if(chUid){chLoadChannels();chLoadMsgs(true);setInterval(chLoadMsgs,2500);}
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
<div class="card" style="margin:0"><div class="k">Formal reports frozen</div><div class="v" id="mFin">—</div></div>
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
  document.getElementById('list').innerHTML=p.length?p.map(i=>{if(i.status==='open')open++;if(i.finalized)fin++;fnd+=i.findings;
    return '<div class="card invcard"><div><a href="/inv?id='+encodeURIComponent(i.id)+'"><b>'+esc(i.id)+'</b> · '+esc(i.title)+'</a><div class="k" style="margin-top:3px">'+i.findings+' findings · '+i.technical+' technical · '+i.formal+' formal'+(i.finalized?' · <span class="badge b-ok">formal frozen</span>':'')+'</div></div><a href="/inv?id='+encodeURIComponent(i.id)+'">Open →</a></div>';}).join(''):'<div class="empty">No investigations yet. Create one above.</div>';
  document.getElementById('mOpen').textContent=open;document.getElementById('mFin').textContent=fin;document.getElementById('mFnd').textContent=fnd;
}
load();setInterval(load,3000);
</script>${CHATHTML}<script>${CHATJS}</script></body></html>`;
}
module.exports = { login, portfolio, esc, HEAD, APPCSS };

// ---------------- workspace ----------------
function workspace(id) {
  return HEAD("Skyhawk · " + esc(id)) + APPCSS + `<body><div class="wrap">
<div class="top"><div class="logo" id="logo">SKYHAWK</div><div style="flex:1"><div><a href="/">← Portfolio</a> &nbsp; <b id="ititle"></b></div><div class="sub" id="imeta"></div></div><div class="appx" id="appx"></div><div class="me" id="me"></div></div>
<div class="grid" style="margin-bottom:6px">
<div class="card" style="margin:0"><div class="k">Findings</div><div class="v" id="nf">—</div></div>
<div class="card" style="margin:0"><div class="k">In technical</div><div class="v" id="tc">—</div></div>
<div class="card" style="margin:0"><div class="k">In formal</div><div class="v" id="fc">—</div></div></div>
<div class="row" style="margin-bottom:6px"><a href="/investigations/${encodeURIComponent(id)}/report/technical" target="_blank">📄 Technical report</a> &nbsp;·&nbsp; <a href="/investigations/${encodeURIComponent(id)}/report/formal" target="_blank">📄 Formal report</a></div>

<h2>Add finding</h2>
<div class="card" id="addCard">
  <div class="row" style="margin-bottom:8px"><input id="ftitle" class="t" placeholder="Finding title"><select id="fsev" style="width:110px"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select><input id="fattack" style="width:150px" placeholder="ATT&CK e.g. T1133"></div>
  <textarea id="fdetail" style="width:100%;min-height:50px;margin-bottom:8px" placeholder="Technical detail (timestamps, hosts, IOCs, commands run)"></textarea>
  <div class="k" style="margin:2px 0 4px">Affected systems</div>
  <div class="row" style="margin-bottom:6px"><select id="adtype" style="width:180px"></select><input id="adname" placeholder="hostname / IP (e.g. WEB01 · 10.0.1.20)" style="flex:1;min-width:150px"><button class="ghost" onclick="addAsset()">Add asset</button></div>
  <div id="assetChips" class="row" style="margin-bottom:8px"></div>
  <div class="k" style="margin:2px 0 4px">Screenshots</div>
  <div class="row" style="margin-bottom:6px"><input id="shotcap" placeholder="caption" style="flex:1;min-width:150px"><input type="file" id="shotfile" accept="image/*"><button class="ghost" onclick="addShot()">Attach</button></div>
  <div id="shotChips" class="row" style="margin-bottom:8px"></div>
  <input id="ftools" class="t" style="width:100%;margin-bottom:8px" placeholder="Tools used (comma-separated)">
  <textarea id="fqueries" style="width:100%;min-height:42px;margin-bottom:8px" placeholder="Queries — one per line as:  SPL | index=web uri=/x"></textarea>
  <button onclick="addF()">Add finding</button>
</div>

<h2>Findings board</h2><div id="board"></div>

<h2>Network map <span class="empty">(auto-built from affected systems)</span></h2>
<div class="card"><div class="map" id="mapbox" style="height:300px"></div></div>

<h2>Finalize formal report</h2><div class="card" id="finalCard"></div>

<h2>Logs &amp; audit</h2><div class="card"><div class="row" style="margin-bottom:7px"><span class="k">Audit chain:</span><span id="auditbadge"></span></div><div class="logs" id="logs"></div></div>
<div class="foot">Skyhawk · offline</div></div>
<script>
const INV=${JSON.stringify(id)};
${PREFJS}
const uid=localStorage.getItem('hs_uid');if(!uid){location.href='/login';}
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let devices=[],caps=[],sigF="",sigM="",finalized=null,pendingAssets=[],pendingShots=[],expanded=new Set();
const hasCap=c=>caps.includes(c);
document.getElementById('me').innerHTML='<span class="badge b-pro">'+localStorage.getItem('hs_title')+'</span> '+esc(localStorage.getItem('hs_name'))+' · <a href="#" onclick="fetch(\\'/api/auth/logout\\',{method:\\'POST\\'}).then(function(){localStorage.clear();location.href=\\'/login\\';});return false">switch</a>';
buildAppx(uid);initPrefs(uid);
async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({actorId:uid},b||{}))});const j=await r.json().catch(()=>({}));if(!r.ok){alert(j.error||'error');throw new Error(j.error);}return j;}
// staging (new finding)
function renderStaging(){document.getElementById('assetChips').innerHTML=pendingAssets.map((a,i)=>'<span class="pill">'+esc(a.type)+' · '+esc(a.name)+' <a href="#" onclick="pendingAssets.splice('+i+',1);renderStaging();return false" style="color:#f88">×</a></span>').join(' ');document.getElementById('shotChips').innerHTML=pendingShots.map((s,i)=>'<span class="pill"><img src="'+s.dataUrl+'" style="height:20px;vertical-align:middle;border-radius:3px"> '+esc(s.caption||'shot')+' <a href="#" onclick="pendingShots.splice('+i+',1);renderStaging();return false" style="color:#f88">×</a></span>').join(' ');}
function addAsset(){const n=document.getElementById('adname');if(!n.value.trim())return;pendingAssets.push({type:document.getElementById('adtype').value,name:n.value.trim()});n.value='';renderStaging();}
function addShot(){const f=document.getElementById('shotfile'),cap=document.getElementById('shotcap');if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=()=>{pendingShots.push({caption:cap.value,dataUrl:rd.result});cap.value='';f.value='';renderStaging();};rd.readAsDataURL(f.files[0]);}
async function addF(){const t=document.getElementById('ftitle');if(!t.value.trim())return;
  const tools=(document.getElementById('ftools').value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const queries=(document.getElementById('fqueries').value||'').split('\\n').map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.indexOf('|');return i>0?{lang:l.slice(0,i).trim(),text:l.slice(i+1).trim()}:{lang:'query',text:l};});
  await post('/api/findings',{investigationId:INV,title:t.value,technicalDetail:document.getElementById('fdetail').value,severity:document.getElementById('fsev').value,attack:document.getElementById('fattack').value,assets:pendingAssets,screenshots:pendingShots.map(s=>({caption:s.caption,dataUrl:s.dataUrl})),tools,queries});
  t.value=document.getElementById('fdetail').value=document.getElementById('fattack').value=document.getElementById('ftools').value=document.getElementById('fqueries').value='';pendingAssets=[];pendingShots=[];renderStaging();sigF='';tick();}
// finding actions
async function fAct(id,a,b){await post('/api/findings/'+id+'/'+a,b);sigF='';tick();}
async function draft(id){const j=await post('/api/findings/'+id+'/draft');const ta=document.getElementById('sum-'+id);if(ta)ta.value=j.text;}
async function saveSum(id){await fAct(id,'summary',{text:document.getElementById('sum-'+id).value});}
function toggleExp(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);sigF='';tick();}
async function evShot(id){const f=document.getElementById('ev-shot-'+id),cap=document.getElementById('ev-cap-'+id);if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=async()=>{await post('/api/findings/'+id+'/evidence',{screenshots:[{caption:cap.value,dataUrl:rd.result}]});sigF='';tick();};rd.readAsDataURL(f.files[0]);}
async function evAsset(id){const n=document.getElementById('ev-name-'+id);if(!n.value.trim())return;await post('/api/findings/'+id+'/evidence',{assets:[{type:document.getElementById('ev-type-'+id).value,name:n.value.trim()}]});sigF='';tick();}
async function evTool(id){const v=document.getElementById('ev-tool-'+id).value.trim();if(!v)return;await post('/api/findings/'+id+'/evidence',{tools:v.split(',').map(x=>x.trim()).filter(Boolean)});sigF='';tick();}
async function saveEdit(id){await post('/api/findings/'+id+'/edit',{title:document.getElementById('ed-title-'+id).value,severity:document.getElementById('ed-sev-'+id).value,attack:document.getElementById('ed-attack-'+id).value,technicalDetail:document.getElementById('ed-detail-'+id).value});sigF='';tick();}
async function finalize(){await post('/api/investigations/'+INV+'/finalize',{execSummary:document.getElementById('exec').value,scope:document.getElementById('scope').value,remediation:document.getElementById('rem').value});tick();}

function canEdit(f){return f.authorId===uid?hasCap('finding.editOwn'):hasCap('finding.editAny');}
function evPanel(f){
  const opts=devices.map(d=>'<option value="'+d+'">'+d+'</option>').join('');
  return '<div class="card" style="margin-top:8px;background:#0d1830">'+
    '<div class="k" style="margin-bottom:4px">Edit</div><div class="row" style="margin-bottom:6px"><input id="ed-title-'+f.id+'" class="t" value="'+esc(f.title)+'"><select id="ed-sev-'+f.id+'" style="width:100px">'+['critical','high','medium','low'].map(s=>'<option'+(f.severity===s?' selected':'')+'>'+s+'</option>').join('')+'</select><input id="ed-attack-'+f.id+'" style="width:140px" value="'+esc((f.attack||[]).join(', '))+'"></div><textarea id="ed-detail-'+f.id+'" style="width:100%;min-height:44px;margin-bottom:6px">'+esc(f.technicalDetail)+'</textarea><button class="ghost" onclick="saveEdit(\\''+f.id+'\\')">Save edits</button>'+
    '<div class="k" style="margin:10px 0 4px">Add evidence</div>'+
    '<div class="row" style="margin-bottom:6px"><select id="ev-type-'+f.id+'" style="width:170px">'+opts+'</select><input id="ev-name-'+f.id+'" placeholder="host / IP" style="flex:1;min-width:120px"><button class="ghost" onclick="evAsset(\\''+f.id+'\\')">+ asset</button></div>'+
    '<div class="row" style="margin-bottom:6px"><input id="ev-cap-'+f.id+'" placeholder="screenshot caption" style="flex:1;min-width:120px"><input type="file" id="ev-shot-'+f.id+'" accept="image/*"><button class="ghost" onclick="evShot(\\''+f.id+'\\')">+ screenshot</button></div>'+
    '<div class="row"><input id="ev-tool-'+f.id+'" placeholder="tools (comma-separated)" style="flex:1;min-width:120px"><button class="ghost" onclick="evTool(\\''+f.id+'\\')">+ tools</button></div></div>';
}
function fCard(f){
  const controls=[];
  if(hasCap('finding.curate')){
    if(f.state==='submitted')controls.push('<button onclick="fAct(\\''+f.id+'\\',\\'approve\\')">Approve</button>','<button class="ghost" onclick="fAct(\\''+f.id+'\\',\\'park\\')">Park</button>','<button class="ghost" onclick="fAct(\\''+f.id+'\\',\\'reject\\')">Reject</button>');
    else if(f.state==='approved')controls.push('<button class="'+(f.inFormal?'on':'ghost')+'" onclick="fAct(\\''+f.id+'\\',\\'formal\\',{include:'+(!f.inFormal)+'})">'+(f.inFormal?'✓ in formal':'Include in formal')+'</button>','<button class="ghost" onclick="fAct(\\''+f.id+'\\',\\'park\\')">Park</button>');
  }
  if(canEdit(f))controls.push('<button class="ghost" onclick="toggleExp(\\''+f.id+'\\')">'+(expanded.has(f.id)?'Close':'Edit / +evidence')+'</button>');
  const badge=f.state==='approved'?'<span class="badge b-ok">approved</span>':f.state==='submitted'?'<span class="badge b-warn">submitted</span>':'<span class="badge b-mut">'+f.state+'</span>';
  let ev='';
  if(f.assets&&f.assets.length)ev+='<div class="k" style="margin-top:6px">Affected: '+f.assets.map(a=>'<span class="pill">'+esc(a.type)+' · '+esc(a.name)+'</span>').join(' ')+'</div>';
  if(f.screenshots&&f.screenshots.length)ev+='<div class="row" style="margin-top:6px">'+f.screenshots.map(s=>'<a href="'+s.url+'" target="_blank"><img src="'+s.url+'" title="'+esc(s.caption)+'" style="height:52px;border:1px solid #22314d;border-radius:5px"></a>').join('')+'</div>';
  if(f.tools&&f.tools.length)ev+='<div class="k" style="margin-top:6px">Tools: '+f.tools.map(t=>'<span class="pill">'+esc(t)+'</span>').join(' ')+'</div>';
  if(f.queries&&f.queries.length)ev+='<div class="k" style="margin-top:6px">'+f.queries.length+' query(ies) captured</div>';
  let sum='';
  if(f.state==='approved'&&f.inFormal&&hasCap('finding.curate'))sum='<div style="margin-top:9px"><div class="k" style="margin-bottom:4px">Formal summary (lead writes)</div><textarea id="sum-'+f.id+'" style="width:100%;min-height:56px">'+esc(f.formalSummary||'')+'</textarea><div class="row" style="margin-top:6px"><button class="ghost" onclick="draft(\\''+f.id+'\\')">Draft from technical detail</button><button onclick="saveSum(\\''+f.id+'\\')">Save summary</button></div></div>';
  return '<div class="card fnd '+f.state+'"><div><span class="dot '+f.severity+'"></span><b>'+esc(f.title)+'</b> '+badge+(f.inFormal?' <span class="badge b-ok">formal</span>':'')+'<div class="k" style="margin-top:3px">'+esc(f.by)+' · '+(f.attack||[]).map(a=>'<span class="pill">'+esc(a)+'</span>').join(' ')+'</div></div>'+ev+(controls.length?'<div class="row" style="margin-top:9px">'+controls.join('')+'</div>':'')+sum+(expanded.has(f.id)?evPanel(f):'')+'</div>';
}
// network map
const ZONE={'external host':0,'cloud / SaaS':0,firewall:1,router:1,'VPN gateway':1,'load balancer':1,'domain controller':3};
const zoneOf=t=>ZONE[t]!==undefined?ZONE[t]:2;
const COLX=[95,345,595,835];
function drawMap(findings){
  const nodes=new Map(),edges=[];
  findings.forEach(f=>{const as=f.assets||[];as.forEach(a=>{const k=a.type+'|'+a.name;if(!nodes.has(k))nodes.set(k,{k,type:a.type,name:a.name,comp:false});if(f.inTechnical)nodes.get(k).comp=true;});for(let i=0;i<as.length;i++)for(let j=i+1;j<as.length;j++){const ka=as[i].type+'|'+as[i].name,kb=as[j].type+'|'+as[j].name;if(!edges.find(e=>(e.a===ka&&e.b===kb)||(e.a===kb&&e.b===ka)))edges.push({a:ka,b:kb,label:(f.attack||[])[0]||''});}});
  const cols=[[],[],[],[]];[...nodes.values()].forEach(n=>cols[zoneOf(n.type)].push(n));
  const pos={};let maxlen=1;cols.forEach((col,ci)=>{maxlen=Math.max(maxlen,col.length);col.forEach((n,ri)=>{pos[n.k]={x:COLX[ci],y:55+ri*74};});});
  const box=document.getElementById('mapbox');const H=Math.max(300,maxlen*74+40);box.style.height=H+'px';
  if(!nodes.size){box.innerHTML='<div class="empty" style="padding:16px">Tag affected systems on findings to build the map.</div>';return;}
  let svg='<svg width="960" height="'+H+'" style="position:absolute;inset:0"><defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0L8,4L0,8Z" fill="#E24B4A"/></marker></defs>';
  edges.forEach(e=>{const A=pos[e.a],B=pos[e.b];if(!A||!B)return;svg+='<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="#E24B4A" stroke-width="2" marker-end="url(#a)"/>';});
  svg+='</svg>';
  let labs=edges.map(e=>{const A=pos[e.a],B=pos[e.b];if(!A||!B||!e.label)return'';return '<div class="elab" style="left:'+((A.x+B.x)/2)+'px;top:'+((A.y+B.y)/2)+'px">'+esc(e.label)+'</div>';}).join('');
  let nds=[...nodes.values()].map(n=>{const pp=pos[n.k];return '<div class="node'+(n.comp?' comp':'')+'" style="left:'+pp.x+'px;top:'+pp.y+'px"><div class="nt">'+esc(n.type)+'</div><b>'+esc(n.name)+'</b></div>';}).join('');
  const zlab=['External','Edge / DMZ','Internal','Core'].map((z,i)=>'<div style="position:absolute;left:'+COLX[i]+'px;top:14px;transform:translateX(-50%);font-size:10px;color:var(--mut);text-transform:uppercase">'+z+'</div>').join('');
  box.innerHTML=svg+zlab+labs+nds;
}
function finalPanel(s){
  if(!hasCap('formal.finalize'))return '<div class="empty">Only an MC (manager) can freeze and sign the formal report.'+(s.finalized?' Current: <span class="badge b-ok">FROZEN v'+s.finalized.version+'</span> <a href="/investigations/'+encodeURIComponent(INV)+'/report/formal" target="_blank">view →</a>':'')+'</div>';
  if(s.finalized)return '<div><span class="badge b-ok">FROZEN v'+s.finalized.version+'</span> signed by '+esc(s.finalized.frozenBy)+' · '+new Date(s.finalized.frozenAt).toLocaleString()+' &nbsp; <a href="/investigations/'+encodeURIComponent(INV)+'/report/formal" target="_blank">View →</a><div class="row" style="margin-top:8px"><button class="ghost" onclick="finalize()">Re-finalize (new version)</button></div></div>';
  return '<textarea id="exec" style="width:100%;min-height:48px;margin-bottom:6px" placeholder="Executive summary (what happened, impact, status)"></textarea><textarea id="scope" style="width:100%;min-height:38px;margin-bottom:6px" placeholder="Scope & impact"></textarea><textarea id="rem" style="width:100%;min-height:38px;margin-bottom:6px" placeholder="Remediation & recommendations"></textarea><div class="row"><button onclick="finalize()">Freeze &amp; sign formal report</button><span class="empty">'+s.formalCount+' finding(s) will be included</span></div>';
}
async function tick(){
  const sr=await fetch('/api/investigations/'+encodeURIComponent(INV)+'/state?me='+encodeURIComponent(uid));if(sr.status===401){localStorage.clear();location.href='/login';return;}const s=await sr.json();
  if(s.error){document.querySelector('.wrap').innerHTML='<p>'+s.error+'</p><a href="/">← Portfolio</a>';return;}
  caps=s.me.caps;finalized=s.finalized;
  document.getElementById('ititle').textContent=s.investigation.id+' · '+s.investigation.title;
  document.getElementById('imeta').textContent='status '+s.investigation.status;
  if(!devices.length){devices=await (await fetch('/api/devices')).json();document.getElementById('adtype').innerHTML=devices.map(d=>'<option value="'+d+'">'+d+'</option>').join('');}
  document.getElementById('nf').textContent=s.findings.length;document.getElementById('tc').textContent=s.technicalCount;document.getElementById('fc').textContent=s.formalCount;
  const sf=JSON.stringify(s.findings)+[...expanded].join(',')+caps.join(',');
  if(sf!==sigF){sigF=sf;document.getElementById('board').innerHTML=s.findings.length?s.findings.map(fCard).join(''):'<div class="empty">No findings yet.</div>';document.getElementById('finalCard').innerHTML=finalPanel(s);}
  const sm=JSON.stringify(s.findings.map(f=>[f.assets,f.inTechnical]));
  if(sm!==sigM){sigM=sm;drawMap(s.findings);}
  document.getElementById('auditbadge').innerHTML=s.audit.intact?'<span class="badge b-ok">✓ intact · '+s.audit.events+' events</span>':'<span class="badge b-red">✗ broken</span>';
}
async function pollLogs(){const l=await (await fetch('/api/logs?n=70')).json();const box=document.getElementById('logs');box.innerHTML=l.map(e=>'<div class="lg-'+e.level+'">'+e.ts.slice(11,19)+' '+e.level.toUpperCase()+' '+esc(e.msg)+(e.meta?' '+esc(JSON.stringify(e.meta)):'')+'</div>').join('');box.scrollTop=box.scrollHeight;}
tick();setInterval(tick,4000);pollLogs();setInterval(pollLogs,3000);
</script>${CHATHTML}<script>${CHATJS}</script></body></html>`;
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
