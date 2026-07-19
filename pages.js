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
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.crit,.critical{background:var(--red)}.high{background:var(--amber)}.medium{background:#6b7a99}.low{background:#4a5b7d}
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
.mnode{position:absolute;transform:translate(-50%,-50%);width:118px;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:6px 8px;font-size:12px;cursor:grab;user-select:none;box-shadow:0 1px 3px rgba(0,0,0,.15)}
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
.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px}
.bar{height:8px;background:var(--bg);border:1px solid var(--line);border-radius:6px;overflow:hidden;flex:1}.bar>div{height:100%;background:var(--accent);transition:width .2s}
.tlrow{display:flex;gap:10px;align-items:baseline;padding:7px 10px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;margin-bottom:6px;background:var(--card)}
.iocrow{display:flex;gap:9px;align-items:center;padding:6px 9px;border:1px solid var(--line);border-radius:8px;margin-bottom:5px;background:var(--card)}
.srow{border:1px solid var(--line);border-radius:8px;padding:7px 10px;margin-bottom:4px;background:var(--card);cursor:pointer;font-size:13px}
.srow:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}
.rawbox{font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:9px;margin-top:7px;max-height:300px;overflow:auto;white-space:pre-wrap;word-break:break-word;color:var(--txt)}
.tkrow{display:flex;gap:9px;align-items:center;padding:6px 9px;border:1px solid var(--line);border-radius:8px;margin-bottom:5px;background:var(--card)}
.tkrow.done{opacity:.55}.tkrow.done .tktext{text-decoration:line-through}
.subtabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:12px}
.filterchip{font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid var(--line);background:var(--bg);color:var(--mut);cursor:pointer}
.filterchip.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.srchres{border:1px solid var(--line);border-radius:8px;padding:6px 9px;margin-bottom:5px;background:var(--card);font-size:13px}
.modalbox.wide{width:760px}
.advsec{margin:14px 0 4px;font-weight:600;display:flex;align-items:center;gap:8px}
.advsec .n{font-size:11px;color:var(--mut);border:1px solid var(--line);border-radius:20px;padding:0 7px}
.advitem{border:1px solid var(--line);border-radius:9px;padding:9px 11px;margin-bottom:8px;background:var(--card)}
.advitem .h{display:flex;gap:8px;align-items:baseline;justify-content:space-between}
.advitem .txt{font-weight:500}
.advitem .plat{font-size:10px;color:var(--mut);border:1px solid var(--line);border-radius:20px;padding:1px 7px;white-space:nowrap}
.advitem .why{color:var(--mut);font-size:12px;margin-top:3px}
.cmdwrap{position:relative;margin-top:7px}
.cmd{font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.5;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 11px;white-space:pre-wrap;word-break:break-word;overflow-x:auto;color:var(--txt)}
.cmd .c{color:var(--mut)}
.cmdcopy{position:absolute;top:6px;right:6px;font-size:11px;padding:3px 8px;background:var(--card);color:var(--mut);border:1px solid var(--line)}
.phase-triage{color:var(--signal)}.phase-contain{color:var(--red)}.phase-eradicate{color:var(--amber)}.phase-recover{color:var(--green)}.phase-block{color:var(--red)}.phase-harden{color:var(--accent)}
</style>`;

const PREFJS = `
var Q=String.fromCharCode(39);
const THEMES=[['monolith','Monolith'],['iris','Nightfall Iris'],['neon','Neon Grid'],['halon','Halon']];
const MARKS={head:'<path d="M24 60 C30 44 46 34 66 36 L80 28 L82 44 C92 46 98 50 102 48 L90 58 L110 60 L90 68 C92 86 74 98 54 92 C62 82 62 74 57 68 C44 70 30 68 24 60 Z"/><circle cx="70" cy="54" r="4.5" class="eye"/>',strike:'<path d="M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z"/><path d="M64 44 L60 54 L64 50 L68 54 Z"/><path d="M60 48 L59 70 L69 70 L68 48 Z"/><path d="M60 50 L16 28 L30 47 L47 51 L58 62 Z"/><path d="M68 50 L112 28 L98 47 L81 51 L70 62 Z"/><path d="M64 68 L60 90 L64 84 L68 90 Z"/><path d="M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z"/><path d="M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z"/>',wing:'<path d="M28 40 C60 42 90 56 106 94 C96 86 84 82 72 82 C82 73 74 66 64 66 C74 58 64 51 54 52 C64 45 50 42 28 40 Z"/>'};
function tileSvg(mark){return '<svg width="26" height="26" viewBox="0 0 128 128" style="vertical-align:middle;border-radius:7px;background:var(--card)"><g fill="var(--accent)">'+(MARKS[mark]||MARKS.strike).replace(/class="eye"/g,'fill="var(--card)"')+'</g></svg>';}
function buildLogo(mark){mark=mark||'strike';const el=document.getElementById('logo');if(el)el.innerHTML=tileSvg(mark)+'<span style="letter-spacing:1.5px">SKYHAWK</span>';}
function applyPrefs(p){document.documentElement.dataset.theme=p.theme||'monolith';buildLogo(p.mark||'strike');const t=document.getElementById('selTheme');if(t)t.value=p.theme||'monolith';}
function buildAppx(uid){const el=document.getElementById('appx');if(!el)return;el.innerHTML='<select id="selTheme" title="Theme" onchange="savePrefs(\\''+uid+'\\')">'+THEMES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join('')+'</select>';}
async function savePrefs(uid){const p={theme:document.getElementById('selTheme').value,mark:'strike'};localStorage.setItem('sky_prefs',JSON.stringify(p));applyPrefs(p);try{await fetch('/api/users/'+uid+'/prefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});}catch(e){}}
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
<div class="foot">Seeded accounts: Morgan (Manager), Chen (Tech Lead), Rivera (Analyst), Patel (Analyst) — password <code>skyhawk</code>. Change these in production.</div>
</div>
<script>
const TITLES={'Analyst':'Analyst — create & edit your own findings.','Tech Lead':'Tech Lead — control the technical report + edit any finding.','Manager':'Manager — full control incl. freezing & signing the formal report.'};
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
<div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:6px">
<div class="card" style="margin:0"><div class="k">Active cases</div><div class="v" id="mOpen">—</div></div>
<div class="card" style="margin:0"><div class="k">Critical cases</div><div class="v" id="mCrit">—</div></div>
<div class="card" style="margin:0"><div class="k">Total findings</div><div class="v" id="mFnd">—</div></div>
<div class="card" style="margin:0"><div class="k">IOCs tracked</div><div class="v" id="mIoc">—</div></div>
</div>
<h2>Search everything</h2>
<div class="card"><div class="row"><input id="gq" class="t" placeholder="Search cases, findings, IOCs (e.g. LSASS, 45.155.204.11, T1486)" oninput="gSearch()"></div><div id="gres" style="margin-top:8px"></div></div>
<h2>New investigation</h2>
<div class="card"><div class="row"><input id="nt" class="t" placeholder="Case title (e.g. Contoso BEC / account takeover)"><select id="nsev" style="width:110px"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select><button onclick="mk()">Create case</button></div></div>
<h2>Investigations</h2>
<div class="row" id="filters" style="margin-bottom:9px"></div>
<div id="list"></div>
<div class="row" id="adminrow" style="margin-top:12px"></div>
<div class="foot">Skyhawk · runs offline</div></div>
<input type="file" id="impfile" accept="application/json" style="display:none" onchange="impCase(this)">
<script>
${PREFJS}
const uid=localStorage.getItem('hs_uid');if(!uid){location.href='/login';}
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
document.getElementById('me').innerHTML='<span class="badge b-pro">'+localStorage.getItem('hs_title')+'</span> '+esc(localStorage.getItem('hs_name'))+' · <a href="#" onclick="fetch(\\'/api/auth/logout\\',{method:\\'POST\\'}).then(function(){localStorage.clear();location.href=\\'/login\\';});return false">switch</a>';
buildAppx(uid);initPrefs(uid);
let pcache=[],pfilter='active',myCaps=[];
const FILTERS=[['active','Active'],['all','All'],['open','Open'],['contained','Contained'],['eradicated','Eradicated'],['recovered','Recovered'],['closed','Closed'],['frozen','Frozen']];
function dl(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);}
async function mk(){const t=document.getElementById('nt');if(!t.value.trim())return;const r=await fetch('/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t.value,severity:document.getElementById('nsev').value,actorId:uid})});const j=await r.json();if(j.error){alert(j.error);return;}t.value='';load();}
function setFilter(f){pfilter=f;renderList();}
function renderFilters(){document.getElementById('filters').innerHTML=FILTERS.map(function(f){return '<span class="filterchip'+(pfilter===f[0]?' on':'')+'" onclick="setFilter(\\''+f[0]+'\\')">'+f[1]+'</span>';}).join('');}
function invCard(i){
  const tk=i.tasksTotal?' · tasks '+i.tasksDone+'/'+i.tasksTotal:'';
  const frozen=i.finalized?' <span class="badge b-ok">formal v'+i.formalVersion+' frozen</span>':'';
  const who=i.assignee?' · lead: '+esc(i.assignee):'';
  return '<div class="card invcard"><div><a href="/inv?id='+encodeURIComponent(i.id)+'"><span class="dot '+esc(i.severity)+'"></span><b>'+esc(i.id)+'</b> · '+esc(i.title)+'</a> <span class="badge '+(i.status==='closed'?'b-mut':i.status==='open'?'b-warn':'b-pro')+'">'+esc(i.status)+'</span>'+frozen+'<div class="k" style="margin-top:3px">'+i.findings+' findings · '+i.technical+' technical · '+i.formal+' formal · '+i.iocs+' IOCs'+tk+who+'</div></div><a href="/inv?id='+encodeURIComponent(i.id)+'">Open →</a></div>';}
function renderList(){
  renderFilters();
  const rows=pcache.filter(function(i){
    if(pfilter==='all')return true;
    if(pfilter==='active')return i.status!=='closed';
    if(pfilter==='frozen')return i.finalized;
    return i.status===pfilter;});
  document.getElementById('list').innerHTML=rows.length?rows.map(invCard).join(''):'<div class="empty">'+(pcache.length?'No cases match this filter.':'No investigations yet. Create one above.')+'</div>';
}
let gqTimer=null;
function gSearch(){clearTimeout(gqTimer);gqTimer=setTimeout(gSearchNow,220);}
async function gSearchNow(){
  const q=document.getElementById('gq').value.trim();const box=document.getElementById('gres');
  if(q.length<2){box.innerHTML='';return;}
  const r=await (await fetch('/api/search?q='+encodeURIComponent(q))).json();
  let h='';
  h+=r.cases.map(function(c){return '<div class="srchres"><a href="/inv?id='+encodeURIComponent(c.id)+'"><b>'+esc(c.id)+'</b> · '+esc(c.title)+'</a> <span class="badge b-pro">case · '+esc(c.status)+'</span></div>';}).join('');
  h+=r.findings.map(function(f){return '<div class="srchres"><a href="/inv?id='+encodeURIComponent(f.invId)+'"><span class="dot '+esc(f.severity)+'"></span>'+esc(f.title)+'</a> <span class="badge b-mut">finding · '+esc(f.invId)+'</span></div>';}).join('');
  h+=r.iocs.map(function(x){return '<div class="srchres"><a href="/inv?id='+encodeURIComponent(x.invId)+'"><span class="mono">'+esc(x.value)+'</span></a> <span class="badge b-mut">IOC · '+esc(x.type)+' · '+esc(x.invId)+'</span></div>';}).join('');
  box.innerHTML=h||'<div class="empty">No matches.</div>';
}
async function dlBackup(){const r=await fetch('/api/backup');const j=await r.json();if(j.error){alert(j.error);return;}dl('skyhawk-backup-'+new Date().toISOString().slice(0,10)+'.json',j);}
async function impCase(inp){
  const f=inp.files&&inp.files[0];if(!f)return;inp.value='';
  try{
    const bundle=JSON.parse(await f.text());
    const r=await fetch('/api/investigations/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bundle,actorId:uid})});
    const j=await r.json();if(j.error){alert(j.error);return;}
    alert('Imported as '+j.id+(j.chainIntact?' — audit chain intact':' — WARNING: audit chain did not verify'));load();
  }catch(e){alert('Not a valid SKYHAWK bundle: '+e.message);}
}
async function initMe(){try{const me=await (await fetch('/api/me')).json();myCaps=me.caps||[];if(myCaps.indexOf('user.manage')>=0){document.getElementById('adminrow').innerHTML='<button class="ghost" onclick="document.getElementById(\\'impfile\\').click()">Import case bundle</button><button class="ghost" onclick="dlBackup()">Download full backup</button><span class="k">Manager only — case bundles move investigations between air-gapped enclaves.</span>';}}catch(e){}}
initMe();
async function load(){
  const h=await (await fetch('/health')).json();document.getElementById('store').textContent='store: '+h.store;
  const pr=await fetch('/api/portfolio');if(pr.status===401){localStorage.clear();location.href='/login';return;}const p=await pr.json();
  pcache=p;let open=0,crit=0,fnd=0,ioc=0;
  p.forEach(function(i){if(i.status!=='closed')open++;if(i.severity==='critical'&&i.status!=='closed')crit++;fnd+=i.findings;ioc+=i.iocs;});
  renderList();
  document.getElementById('mOpen').textContent=open;document.getElementById('mCrit').textContent=crit;document.getElementById('mFnd').textContent=fnd;document.getElementById('mIoc').textContent=ioc;
}
load();setInterval(load,3000);
</script>${CHATHTML}<script>${CHATJS}</script></body></html>`;
}

// ---------------- workspace ----------------
function workspace(id) {
  return HEAD("SKYHAWK · " + esc(id)) + APPCSS + `<body><div class="wrap">
<div class="top"><div class="logo" id="logo">SKYHAWK</div><div style="flex:1"><div><a href="/">← Portfolio</a> &nbsp; <b id="ititle"></b></div><div class="sub" id="imeta"></div></div><div class="appx" id="appx"></div><div class="me" id="me"></div></div>
<div class="row" id="invctl" style="margin-bottom:10px"></div>
<div class="tabs">
  <div class="tab on" onclick="showTab('findings')" id="tab-findings">Findings</div>
  <div class="tab" onclick="showTab('ingest')" id="tab-ingest">Ingest</div>
  <div class="tab" onclick="showTab('siem')" id="tab-siem">SIEM</div>
  <div class="tab" onclick="showTab('agents')" id="tab-agents">Agents</div>
  <div class="tab" onclick="showTab('timeline')" id="tab-timeline">Timeline</div>
  <div class="tab" onclick="showTab('iocs')" id="tab-iocs">IOCs</div>
  <div class="tab" onclick="showTab('tasks')" id="tab-tasks">Tasks</div>
  <div class="tab" onclick="showTab('map')" id="tab-map">Network map</div>
  <div class="tab" onclick="showTab('report')" id="tab-report">Report</div>
  <div class="tab" onclick="showTab('audit')" id="tab-audit">Audit</div>
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
    <div class="row" style="margin-bottom:6px"><select id="adtype" style="width:180px"></select><input id="adname" placeholder="Name (e.g. WEB01)" style="flex:1;min-width:130px"><input id="adip" placeholder="IP (optional)" style="width:130px"><button class="ghost" onclick="addAsset()">Add asset</button></div>
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
    <select id="adtype2" style="width:170px"></select><input id="adname2" placeholder="Name (optional)" style="width:150px" onkeydown="if(event.key==='Enter')addDevice()"><button class="ghost" onclick="addDevice()">+ Device</button>
    <button class="ghost" onclick="mSync()">Sync from findings</button>
    <button class="ghost" onclick="mTidy()">Tidy</button>
    <button onclick="mSave()">Save map</button>
    <span class="k" id="msaved" style="margin-left:6px"></span>
  </div>
  <div class="empty" style="margin-bottom:8px">Drag devices to arrange · drag the dot onto another device to link · click a device to edit it. Build the whole environment; findings can seed it.</div>
  <div style="overflow:auto"><div class="mcanvas" id="mcanvas"></div></div>
  <div class="card" id="mdetail" style="margin-top:10px"></div>
</div>
<div class="panel" id="p-ingest">
  <h2>Ingest evidence</h2>
  <div class="card">
    <div class="k" style="margin-bottom:8px">Drop a tool export — <b>Chainsaw</b>, <b>Suricata</b> (eve.json), <b>Zeek</b> logs, or a <b>PCAP</b>. It's parsed <b>locally</b> into findings, timeline, IOCs, raw events (searchable in the SIEM tab) and network-map hosts + links; nothing leaves this machine. Review and pick what to import.</div>
    <div class="row" style="margin-bottom:8px"><input type="file" id="ingFile" accept=".csv,.json,.jsonl,.ndjson,.tsv,.log,.pcap,.pcapng,.cap" style="flex:1;min-width:180px"><select id="ingProfile" style="width:190px"><option value="">auto-detect profile</option></select><button onclick="ingAnalyze()">Analyze</button></div>
    <textarea id="ingText" style="width:100%;min-height:64px" placeholder="…or paste the export contents here"></textarea>
    <div class="k" id="ingStatus" style="margin-top:6px"></div>
  </div>
  <div id="ingPreview"></div>
</div>
<div class="panel" id="p-siem">
  <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">SIEM · event lake</h2><button class="ghost" onclick="loadSiem(true)">Refresh</button></div>
  <div class="row" style="margin-bottom:8px">
    <input id="siemQ" class="t" placeholder="Search events — IP, host, signature, command, domain…" onkeydown="if(event.key==='Enter')loadSiem(true)">
    <select id="siemSrc" style="width:170px" onchange="loadSiem(true)"><option value="">all sources</option></select>
    <button onclick="loadSiem(true)">Search</button>
  </div>
  <div class="k" id="siemMeta" style="margin-bottom:8px"></div>
  <div id="siemRows"></div>
  <div class="row" style="margin-top:10px"><button class="ghost" id="siemMore" onclick="loadSiem(false)" style="display:none">Load more</button></div>
</div>
<div class="panel" id="p-agents">
  <div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="margin:0">Collection agents</h2><button class="ghost" onclick="loadAgents()">Refresh</button></div>
  <div class="empty" style="margin-bottom:10px">Read-only forensic collectors deployed to hosts on your network. Queue a collection and the results land in <b>this case</b>. Authorised IR use only — agents never run arbitrary commands and never modify the host.</div>
  <div id="agentEnroll"></div>
  <div id="agentList"></div>
</div>
<div class="panel" id="p-timeline">
  <h2>Add event</h2>
  <div class="card"><div class="row">
    <input type="datetime-local" id="tlat" style="width:200px">
    <select id="tlsrc" style="width:130px"></select>
    <input id="tltext" class="t" placeholder="What happened (e.g. beacon to 45.155.204.11 from WEB01)" onkeydown="if(event.key==='Enter')tlAdd()">
    <button onclick="tlAdd()">Add event</button>
  </div></div>
  <h2>Incident timeline <span class="k" id="tlcount"></span></h2>
  <div id="tllist"></div>
</div>
<div class="panel" id="p-iocs">
  <h2>Track indicator</h2>
  <div class="card">
    <div class="row"><input id="iocv" class="t mono" placeholder="Value — IP, domain, hash, URL, email, CVE, path (type auto-detected)" onkeydown="if(event.key==='Enter')iocAdd()"><input id="iocn" placeholder="Note" style="width:170px"><button onclick="iocAdd()">Add IOC</button><button class="ghost" onclick="iocExtract()">Extract from findings</button></div>
    <div id="iocsug" style="margin-top:8px"></div>
  </div>
  <h2>Indicators of compromise <span class="k" id="ioccount"></span></h2>
  <div id="ioclist"></div>
</div>
<div class="panel" id="p-tasks">
  <h2>Response checklist</h2>
  <div class="card">
    <div class="row" style="margin-bottom:9px"><select id="tktpl" style="width:150px"></select><button class="ghost" onclick="tkTpl()">Apply playbook</button><span class="k" style="flex:1"></span><select id="tkphase" style="width:120px"></select><input id="tktext" placeholder="Custom task" style="flex:2;min-width:160px" onkeydown="if(event.key==='Enter')tkAdd()"><button onclick="tkAdd()">Add</button></div>
    <div class="row"><div class="bar"><div id="tkbar" style="width:0%"></div></div><span class="k" id="tkpct"></span></div>
  </div>
  <div id="tklist"></div>
</div>
<div class="panel" id="p-report">
  <div class="subtabs">
    <div class="tab on" id="rt-technical" onclick="setRMode('technical')">Technical (live)</div>
    <div class="tab" id="rt-formal" onclick="setRMode('formal')">Formal (frozen)</div>
  </div>
  <div id="formalPane" style="display:none">
    <div id="fzbanner"></div>
    <div id="formalCompose"></div>
  </div>
  <div class="row" style="margin-bottom:8px"><a id="rlink" target="_blank">Open in new tab / Print</a> <span class="k" id="rnote">— live technical report</span></div>
  <iframe class="rframe" id="rframe"></iframe>
</div>
<div class="panel" id="p-audit">
  <div class="row" style="margin-bottom:9px"><span id="auditBadge"></span><span class="k" id="auditMeta"></span><button class="ghost" onclick="loadAudit()">Re-verify</button></div>
  <div class="empty" style="margin-bottom:8px">Every action on this case is recorded in a hash-chained, tamper-evident log. Any retroactive edit breaks the chain.</div>
  <div id="auditList"></div>
</div>
</div>
${CHATHTML}
<div id="attackModal"></div>
<div id="adviceModal"></div>
<script>
const INV=${JSON.stringify(id)};
${PREFJS}
const uid=localStorage.getItem('hs_uid');if(!uid){location.href='/login';}
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let devices=[],caps=[],sigF="",pendingAssets=[],pendingShots=[],expanded=new Set(),lastFindings=[];
let mNodes=[],mEdges=[],mSel=null,mLoaded=false,mDrag=null,mMoved=false,mLink=null,ATT=null;
let S=null,rmode='technical',sigT='',sigI='',sigK='',sigC='',sigFm='',selsInit=false,iocSugs=[];
const hasCap=c=>caps.includes(c);
document.getElementById('me').innerHTML='<span class="badge b-pro">'+localStorage.getItem('hs_title')+'</span> '+esc(localStorage.getItem('hs_name'))+' · <a href="#" onclick="doLogout();return false">switch</a>';
function doLogout(){fetch('/api/auth/logout',{method:'POST'}).then(function(){localStorage.clear();location.href='/login';});}
buildAppx(uid);initPrefs(uid);
document.getElementById('rlink').href='/investigations/'+encodeURIComponent(INV)+'/report/technical';
async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({actorId:uid},b||{}))});const j=await r.json().catch(()=>({}));if(!r.ok){alert(j.error||'error');throw new Error(j.error);}return j;}
function showTab(t){['findings','ingest','siem','agents','timeline','iocs','tasks','map','report','audit'].forEach(function(x){document.getElementById('tab-'+x).classList.toggle('on',x===t);document.getElementById('p-'+x).classList.toggle('on',x===t);});
  if(t==='report'){refreshReport();}
  if(t==='map'){mRender();}
  if(t==='audit'){loadAudit();}
  if(t==='ingest'){ingInitProfiles();}
  if(t==='siem'){loadSiem(true);}
  if(t==='agents'){loadAgents();}
  if(t==='timeline'&&!document.getElementById('tlat').value){setTlNow();}}
function dl(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);}
async function postQ(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({actorId:uid},b||{}))});return r.json().catch(function(){return{};});}
function userNameOf(id){const u=((S&&S.users)||[]).find(function(x){return x.id===id;});return u?u.name:(id||'');}

function renderStaging(){document.getElementById('assetChips').innerHTML=pendingAssets.map(function(a,i){return '<span class="pill">'+esc(a.type)+' · '+esc(a.name)+(a.ip?' · '+esc(a.ip):'')+' <a href="#" onclick="rmAsset('+i+');return false" style="color:var(--red)">×</a></span>';}).join(' ');document.getElementById('shotChips').innerHTML=pendingShots.map(function(s,i){return '<span class="pill"><img src="'+s.dataUrl+'" style="height:20px;vertical-align:middle;border-radius:3px"> '+esc(s.caption||'shot')+' <a href="#" onclick="rmShot('+i+');return false" style="color:var(--red)">×</a></span>';}).join(' ');}
function rmAsset(i){pendingAssets.splice(i,1);renderStaging();}
function rmShot(i){pendingShots.splice(i,1);renderStaging();}
function addAsset(){const n=document.getElementById('adname');const ipEl=document.getElementById('adip');if(!n.value.trim())return;pendingAssets.push({type:document.getElementById('adtype').value,name:n.value.trim(),ip:(ipEl.value||'').trim()});n.value='';ipEl.value='';renderStaging();}
function addShot(){const f=document.getElementById('shotfile'),cap=document.getElementById('shotcap');if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=function(){pendingShots.push({caption:cap.value,dataUrl:rd.result});cap.value='';f.value='';renderStaging();};rd.readAsDataURL(f.files[0]);}
async function addF(){const t=document.getElementById('ftitle');if(!t.value.trim())return;
  const tools=(document.getElementById('ftools').value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const queries=(document.getElementById('fqueries').value||'').split(String.fromCharCode(10)).map(l=>l.trim()).filter(Boolean).map(function(l){const i=l.indexOf('|');return i>0?{lang:l.slice(0,i).trim(),text:l.slice(i+1).trim()}:{lang:'query',text:l};});
  await post('/api/findings',{investigationId:INV,title:t.value,technicalDetail:document.getElementById('fdetail').value,severity:document.getElementById('fsev').value,attack:document.getElementById('fattack').value,assets:pendingAssets,screenshots:pendingShots.map(s=>({caption:s.caption,dataUrl:s.dataUrl})),tools,queries});
  t.value=document.getElementById('fdetail').value=document.getElementById('fattack').value=document.getElementById('ftools').value=document.getElementById('fqueries').value='';pendingAssets=[];pendingShots=[];renderStaging();sigF='';tick();}
async function fAct(id,a,b){await post('/api/findings/'+id+'/'+a,b);sigF='';tick();}
function toggleExp(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);sigF='';tick();}
async function evShot(id){const f=document.getElementById('ev-shot-'+id),cap=document.getElementById('ev-cap-'+id);if(!f.files||!f.files[0])return;const rd=new FileReader();rd.onload=async function(){await post('/api/findings/'+id+'/evidence',{screenshots:[{caption:cap.value,dataUrl:rd.result}]});sigF='';tick();};rd.readAsDataURL(f.files[0]);}
async function evAsset(id){const n=document.getElementById('ev-name-'+id);const ipEl=document.getElementById('ev-ip-'+id);if(!n.value.trim())return;await post('/api/findings/'+id+'/evidence',{assets:[{type:document.getElementById('ev-type-'+id).value,name:n.value.trim(),ip:(ipEl.value||'').trim()}]});sigF='';tick();}
async function evTool(id){const v=document.getElementById('ev-tool-'+id).value.trim();if(!v)return;await post('/api/findings/'+id+'/evidence',{tools:v.split(',').map(x=>x.trim()).filter(Boolean)});sigF='';tick();}
async function saveEdit(id){await post('/api/findings/'+id+'/edit',{title:document.getElementById('ed-title-'+id).value,severity:document.getElementById('ed-sev-'+id).value,attack:document.getElementById('ed-attack-'+id).value,technicalDetail:document.getElementById('ed-detail-'+id).value});sigF='';tick();}
function canEdit(f){return f.authorId===uid?hasCap('finding.editOwn'):hasCap('finding.editAny');}
function evPanel(f){const opts=devices.map(d=>'<option value="'+d+'">'+d+'</option>').join('');const A='fAct',id=f.id;
  return '<div class="card" style="margin-top:8px;background:var(--bg)"><div class="k" style="margin-bottom:4px">Edit</div><div class="row" style="margin-bottom:6px"><input id="ed-title-'+id+'" class="t" value="'+esc(f.title)+'"><select id="ed-sev-'+id+'" style="width:100px">'+['critical','high','medium','low'].map(function(s){return '<option'+(f.severity===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select><input id="ed-attack-'+id+'" style="width:140px" value="'+esc((f.attack||[]).join(', '))+'"></div><textarea id="ed-detail-'+id+'" style="width:100%;min-height:44px;margin-bottom:6px">'+esc(f.technicalDetail)+'</textarea><button class="ghost" onclick="saveEdit('+Q+id+Q+')">Save edits</button><div class="k" style="margin:10px 0 4px">Add evidence</div><div class="row" style="margin-bottom:6px"><select id="ev-type-'+id+'" style="width:170px">'+opts+'</select><input id="ev-name-'+id+'" placeholder="Name" style="flex:1;min-width:100px"><input id="ev-ip-'+id+'" placeholder="IP (optional)" style="width:110px"><button class="ghost" onclick="evAsset('+Q+id+Q+')">+ asset</button></div><div class="row" style="margin-bottom:6px"><input id="ev-cap-'+id+'" placeholder="screenshot caption" style="flex:1;min-width:120px"><input type="file" id="ev-shot-'+id+'" accept="image/*"><button class="ghost" onclick="evShot('+Q+id+Q+')">+ screenshot</button></div><div class="row"><input id="ev-tool-'+id+'" placeholder="tools (comma-separated)" style="flex:1;min-width:120px"><button class="ghost" onclick="evTool('+Q+id+Q+')">+ tools</button></div></div>';}
function fCard(f){const controls=[];const id=f.id;
  if(hasCap('finding.curate')){if(f.state==='submitted'){controls.push('<button onclick="fAct('+Q+id+Q+','+Q+'approve'+Q+')">Approve</button>');controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'park'+Q+')">Park</button>');controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'reject'+Q+')">Reject</button>');}else if(f.state==='approved'){controls.push('<button class="ghost" onclick="fAct('+Q+id+Q+','+Q+'park'+Q+')">Remove from report</button>');}}
  controls.push('<button class="ghost" onclick="openAdvice('+Q+id+Q+')">⚡ Advice</button>');
  if(canEdit(f))controls.push('<button class="ghost" onclick="toggleExp('+Q+id+Q+')">'+(expanded.has(id)?'Close':'Edit / +evidence')+'</button>');
  const badge=(f.state==='approved'?'<span class="badge b-ok">in report</span>':f.state==='submitted'?'<span class="badge b-warn">submitted</span>':'<span class="badge b-mut">'+f.state+'</span>')+(f.inFormalReport?' <span class="badge b-pro">formal</span>':'');
  let ev='';
  if(f.assets&&f.assets.length)ev+='<div class="k" style="margin-top:6px">Affected: '+f.assets.map(function(a){return '<span class="pill">'+esc(a.type)+' · '+esc(a.name)+(a.ip?' · '+esc(a.ip):'')+'</span>';}).join(' ')+'</div>';
  if(f.screenshots&&f.screenshots.length)ev+='<div class="row" style="margin-top:6px">'+f.screenshots.map(function(s){return '<a href="'+s.url+'" target="_blank"><img src="'+s.url+'" title="'+esc(s.caption)+'" style="height:52px;border:1px solid var(--line);border-radius:5px"></a>';}).join('')+'</div>';
  if(f.tools&&f.tools.length)ev+='<div class="k" style="margin-top:6px">Tools: '+f.tools.map(function(t){return '<span class="pill">'+esc(t)+'</span>';}).join(' ')+'</div>';
  if(f.queries&&f.queries.length)ev+='<div class="k" style="margin-top:6px">'+f.queries.length+' query(ies) captured</div>';
  return '<div class="card fnd '+f.state+'"><div><span class="dot '+f.severity+'"></span><b>'+esc(f.title)+'</b> '+badge+'<div class="k" style="margin-top:3px">'+esc(f.by)+' · '+(f.attack||[]).map(function(a){return '<span class="pill">'+esc(a)+'</span>';}).join(' ')+'</div></div>'+ev+(controls.length?'<div class="row" style="margin-top:9px">'+controls.join('')+'</div>':'')+(expanded.has(id)?evPanel(f):'')+'</div>';}

async function openAttack(){if(!ATT)ATT=await (await fetch('/api/attack')).json();
  document.getElementById('attackModal').innerHTML='<div class="modal" onclick="if(event.target===this)closeAttack()"><div class="modalbox"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>MITRE ATT&CK helper</b><a href="#" onclick="closeAttack();return false" class="k">close</a></div><div class="row" style="margin-bottom:8px"><input class="t" placeholder="Search technique / tactic / keyword" oninput="renderAttack(this.value)"><button class="ghost" onclick="attackSuggestNow()">Suggest from finding</button></div><div id="attackRows"></div><div class="k" style="margin-top:8px">Click a technique to add its ID to the finding.</div></div></div>';
  renderAttack('');}
function closeAttack(){document.getElementById('attackModal').innerHTML='';}
async function attackSuggestNow(){const text=document.getElementById('ftitle').value+' '+document.getElementById('fdetail').value;const sug=await (await fetch('/api/attack/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})).json();renderAttack('',sug);}
function pickTech(tid){const el=document.getElementById('fattack');const cur=el.value.split(',').map(x=>x.trim()).filter(Boolean);if(!cur.includes(tid))cur.push(tid);el.value=cur.join(', ');closeAttack();}
function trow(x,tn){return '<div class="trow" onclick="pickTech('+Q+x.id+Q+')"><span><b>'+x.id+'</b> · '+esc(x.name)+'</span><span class="k">'+esc(tn[x.tactic]||'')+'</span></div>';}
function renderAttack(q,sug){const tn={};ATT.tactics.forEach(function(t){tn[t.id]=t.name;});let rows;
  if(sug){rows='<div class="k" style="margin:2px 0 6px">Suggested from your finding text:</div>'+(sug.length?sug.map(function(x){return trow(x,tn);}).join(''):'<div class="empty">No suggestions — try the search.</div>');}
  else{const ql=(q||'').toLowerCase();const f=ATT.techniques.filter(function(x){return !ql||x.id.toLowerCase().includes(ql)||x.name.toLowerCase().includes(ql)||(tn[x.tactic]||'').toLowerCase().includes(ql)||x.keywords.some(function(k){return k.includes(ql);});});rows=f.slice(0,60).map(function(x){return trow(x,tn);}).join('');}
  const rowsEl=document.getElementById('attackRows');if(rowsEl)rowsEl.innerHTML=rows;}

// ---- response advisor (offline, copy-pasteable remediation) ----
let advCmds=[];
function highlightCmd(s){return esc(s).split(String.fromCharCode(10)).map(function(l){return /^\\s*(#|!|REM\\b)/.test(l)?'<span class="c">'+l+'</span>':l;}).join(String.fromCharCode(10));}
async function openAdvice(id){
  document.getElementById('adviceModal').innerHTML='<div class="modal"><div class="modalbox wide"><div class="row" style="justify-content:space-between"><b>Loading response plan…</b><a href="#" onclick="closeAdvice();return false" class="k">close</a></div></div></div>';
  let d;try{d=await (await fetch('/api/findings/'+encodeURIComponent(id)+'/advice')).json();}catch(e){d={error:'could not load advice'};}
  renderAdvice(d);
}
function closeAdvice(){document.getElementById('adviceModal').innerHTML='';}
function copyCmd(i,btn){var t=advCmds[i]||'';function ok(){var o=btn.textContent;btn.textContent='copied ✓';setTimeout(function(){btn.textContent=o;},1000);}
  function fb(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){}document.body.removeChild(ta);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok).catch(fb);}else fb();}
function renderAdvice(d){
  advCmds=[];
  if(d.error){document.getElementById('adviceModal').innerHTML='<div class="modal" onclick="if(event.target===this)closeAdvice()"><div class="modalbox"><b>'+esc(d.error)+'</b> <a href="#" onclick="closeAdvice();return false" class="k">close</a></div></div>';return;}
  var hosts=(d.hosts||[]).filter(function(h){return h.host;}).map(function(h){return esc(h.host)+(h.ip?' ('+esc(h.ip)+')':'');}).join(', ');
  var pills=(d.matched||[]).map(function(t){return '<span class="pill">'+esc(t.id)+(t.name?' · '+esc(t.name):'')+'</span>';}).join(' ');
  var head='<div class="row" style="justify-content:space-between;margin-bottom:6px"><b>⚡ Response plan — '+esc(d.title)+'</b><a href="#" onclick="closeAdvice();return false" class="k">close</a></div>';
  head+='<div class="k" style="margin-bottom:4px">'+(hosts?'Targeting: '+hosts:'No systems attached to this finding.')+(d.attackerIp?' · attacker IP '+esc(d.attackerIp):'')+'</div>';
  head+=pills?'<div style="margin-bottom:6px">'+pills+'</div>':'';
  head+=(d.tacticGuidance&&d.tacticGuidance.length)?'<div class="k" style="margin-bottom:4px">Includes tactic-level guidance for: '+d.tacticGuidance.map(esc).join(', ')+'.</div>':'';
  head+='<div class="k" style="margin-bottom:8px">Offline guidance — review before running. Commands use placeholders like &lt;samAccountName&gt; and admin subnets you must adjust for your environment.</div>';
  var body=(d.sections||[]).map(function(s){
    var items=s.items.map(function(it){
      var cmd='';
      if(it.cmd){var idx=advCmds.push(it.cmd)-1;cmd='<div class="cmdwrap"><button class="cmdcopy" onclick="copyCmd('+idx+',this)">copy</button><div class="cmd">'+highlightCmd(it.cmd)+'</div></div>';}
      return '<div class="advitem"><div class="h"><span class="txt">'+esc(it.text)+'</span><span class="plat">'+esc(it.platformLabel)+'</span></div>'+(it.why?'<div class="why">'+esc(it.why)+'</div>':'')+cmd+'</div>';
    }).join('');
    return '<div class="advsec phase-'+s.key+'">'+esc(s.label)+'<span class="n">'+s.items.length+'</span></div>'+items;
  }).join('');
  document.getElementById('adviceModal').innerHTML='<div class="modal" onclick="if(event.target===this)closeAdvice()"><div class="modalbox wide">'+head+body+'</div></div>';
}

// ---- case controls (status / severity / lead / export) ----
function renderCtl(s){
  const inv=s.investigation;const el=document.getElementById('invctl');
  const sig=JSON.stringify([inv.status,inv.severity,inv.assigneeId,caps,s.users.map(function(u){return u.id;})]);
  if(sig===sigC)return;sigC=sig;
  let h='';
  if(hasCap('tech.control')){
    h+='<span class="k">status</span><select onchange="invUpd({status:this.value})">'+s.statuses.map(function(x){return '<option'+(inv.status===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>';
    h+='<span class="k">severity</span><select onchange="invUpd({severity:this.value})">'+s.severities.map(function(x){return '<option'+((inv.severity||'medium')===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>';
    h+='<span class="k">lead</span><select onchange="invUpd({assigneeId:this.value})"><option value="">unassigned</option>'+s.users.map(function(u){return '<option value="'+u.id+'"'+(inv.assigneeId===u.id?' selected':'')+'>'+esc(u.name)+' ('+u.title+')</option>';}).join('')+'</select>';
  }else{
    const lead=(s.users.find(function(u){return u.id===inv.assigneeId;})||{}).name;
    h+='<span class="badge b-warn">'+esc(inv.status)+'</span><span class="badge b-mut"><span class="dot '+esc(inv.severity||'medium')+'"></span>'+esc(inv.severity||'medium')+'</span>'+(lead?'<span class="k">lead: '+esc(lead)+'</span>':'');
  }
  h+='<span style="flex:1"></span><button class="ghost" onclick="exportCase()">Export case bundle</button>';
  el.innerHTML=h;
}
async function invUpd(patch){try{await post('/api/investigations/'+encodeURIComponent(INV)+'/update',patch);}catch(e){}sigC='';tick();}
async function exportCase(){const r=await fetch('/api/investigations/'+encodeURIComponent(INV)+'/export');const j=await r.json();if(j.error){alert(j.error);return;}dl(INV+'.skyhawk-case.json',j);}

// ---- incident timeline ----
function setTlNow(){const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);document.getElementById('tlat').value=d.toISOString().slice(0,16);}
function renderTimeline(s){
  const sig=JSON.stringify(s.timeline)+caps.join(',');if(sig===sigT)return;sigT=sig;
  document.getElementById('tlcount').textContent=s.timeline.length?('· '+s.timeline.length+' events'):'';
  const fmap={};s.findings.forEach(function(f){fmap[f.id]=f.title;});
  document.getElementById('tllist').innerHTML=s.timeline.length?s.timeline.map(function(e){
    return '<div class="tlrow"><span class="mono" style="white-space:nowrap">'+new Date(e.at).toLocaleString([],{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span><span class="pill">'+esc(e.source)+'</span><span style="flex:1">'+esc(e.text)+(e.findingId&&fmap[e.findingId]?' <span class="k">('+esc(fmap[e.findingId])+')</span>':'')+'</span><span class="k">'+esc(userNameOf(e.by))+'</span>'+(hasCap('finding.create')?'<a href="#" style="color:var(--red)" onclick="tlDel('+Q+e.id+Q+');return false">×</a>':'')+'</div>';
  }).join(''):'<div class="empty">No events yet. Reconstruct the attack chronologically — every entry lands in the technical report.</div>';
}
async function tlAdd(){const t=document.getElementById('tltext');if(!t.value.trim())return;const at=document.getElementById('tlat').value;await post('/api/investigations/'+encodeURIComponent(INV)+'/timeline',{text:t.value,at:at?new Date(at).toISOString():null,source:document.getElementById('tlsrc').value});t.value='';sigT='';tick();}
async function tlDel(id){await post('/api/investigations/'+encodeURIComponent(INV)+'/timeline/'+id+'/remove');sigT='';tick();}

// ---- IOC tracking ----
function renderIocs(s){
  const sig=JSON.stringify(s.iocs)+caps.join(',');if(sig===sigI)return;sigI=sig;
  document.getElementById('ioccount').textContent=s.iocs.length?('· '+s.iocs.length):'';
  const groups={};s.iocs.forEach(function(x){(groups[x.type]=groups[x.type]||[]).push(x);});
  document.getElementById('ioclist').innerHTML=s.iocs.length?Object.keys(groups).sort().map(function(t){
    return '<h2 style="margin-top:12px">'+esc(t)+' ('+groups[t].length+')</h2>'+groups[t].map(function(x){
      return '<div class="iocrow"><span class="mono" style="flex:1;word-break:break-all">'+esc(x.value)+'</span>'+(x.note?'<span class="k">'+esc(x.note)+'</span>':'')+'<span class="k">'+esc(userNameOf(x.by))+'</span><button class="ghost" onclick="copyIoc('+Q+x.id+Q+',this)">copy</button>'+(hasCap('finding.create')?'<a href="#" style="color:var(--red)" onclick="iocDel('+Q+x.id+Q+');return false">×</a>':'')+'</div>';
    }).join('');
  }).join(''):'<div class="empty">No IOCs yet. Add indicators manually or extract them from finding text.</div>';
}
function copyIoc(id,btn){const x=((S&&S.iocs)||[]).find(function(i){return i.id===id;});if(!x)return;
  function ok(){btn.textContent='copied';setTimeout(function(){btn.textContent='copy';},900);}
  function fb(){const ta=document.createElement('textarea');ta.value=x.value;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){}document.body.removeChild(ta);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(x.value).then(ok).catch(fb);}else fb();}
async function iocAdd(){const v=document.getElementById('iocv');if(!v.value.trim())return;await post('/api/investigations/'+encodeURIComponent(INV)+'/iocs',{value:v.value,note:document.getElementById('iocn').value});v.value='';document.getElementById('iocn').value='';sigI='';tick();}
async function iocDel(id){await post('/api/investigations/'+encodeURIComponent(INV)+'/iocs/'+id+'/remove');sigI='';tick();}
async function iocExtract(){iocSugs=await post('/api/investigations/'+encodeURIComponent(INV)+'/iocs/extract');renderSugs();}
function renderSugs(){const el=document.getElementById('iocsug');el.innerHTML=iocSugs.length?'<div class="k" style="margin-bottom:5px">Found in finding text — click to track:</div>'+iocSugs.map(function(x,i){return '<span class="pill" style="cursor:pointer;margin:2px;display:inline-block" onclick="iocPick('+i+')">+ '+esc(x.type)+' · '+esc(x.value)+'</span>';}).join(' ')+' <button class="ghost" onclick="iocPickAll()">Track all</button>':'<div class="empty">Nothing new found in finding text.</div>';}
async function iocPick(i){const x=iocSugs.splice(i,1)[0];await postQ('/api/investigations/'+encodeURIComponent(INV)+'/iocs',{value:x.value,type:x.type,note:'extracted from findings'});renderSugs();sigI='';tick();}
async function iocPickAll(){for(const x of iocSugs){await postQ('/api/investigations/'+encodeURIComponent(INV)+'/iocs',{value:x.value,type:x.type,note:'extracted from findings'});}iocSugs=[];renderSugs();sigI='';tick();}

// ---- response checklist ----
function renderTasks(s){
  const sig=JSON.stringify(s.tasks)+caps.join(',');if(sig===sigK)return;sigK=sig;
  const done=s.tasks.filter(function(t){return t.done;}).length,total=s.tasks.length;
  document.getElementById('tkbar').style.width=(total?Math.round(done*100/total):0)+'%';
  document.getElementById('tkpct').textContent=total?done+'/'+total+' done':'no tasks yet';
  const phases=(s.phases||[]);
  document.getElementById('tklist').innerHTML=total?phases.map(function(ph){
    const rows=s.tasks.filter(function(t){return t.phase===ph;});if(!rows.length)return'';
    return '<h2 style="margin-top:12px">'+esc(ph)+'</h2>'+rows.map(function(t){
      return '<div class="tkrow'+(t.done?' done':'')+'"><input type="checkbox"'+(t.done?' checked':'')+(hasCap('finding.create')?'':' disabled')+' onchange="tkToggle('+Q+t.id+Q+')"><span class="tktext" style="flex:1">'+esc(t.text)+'</span>'+(t.done&&t.doneBy?'<span class="k">'+esc(userNameOf(t.doneBy))+'</span>':'')+(hasCap('finding.create')?'<a href="#" style="color:var(--red)" onclick="tkDel('+Q+t.id+Q+');return false">×</a>':'')+'</div>';
    }).join('');
  }).join(''):'<div class="empty">No tasks yet. Apply an incident playbook or add your own.</div>';
}
async function tkAdd(){const t=document.getElementById('tktext');if(!t.value.trim())return;await post('/api/investigations/'+encodeURIComponent(INV)+'/tasks',{text:t.value,phase:document.getElementById('tkphase').value});t.value='';sigK='';tick();}
async function tkTpl(){await post('/api/investigations/'+encodeURIComponent(INV)+'/tasks',{template:document.getElementById('tktpl').value});sigK='';tick();}
async function tkToggle(id){await post('/api/investigations/'+encodeURIComponent(INV)+'/tasks/'+id+'/toggle');sigK='';tick();}
async function tkDel(id){await post('/api/investigations/'+encodeURIComponent(INV)+'/tasks/'+id+'/remove');sigK='';tick();}

// ---- report modes + formal compose ----
function setRMode(m2){rmode=m2;['technical','formal'].forEach(function(x){document.getElementById('rt-'+x).classList.toggle('on',x===rmode);});document.getElementById('formalPane').style.display=rmode==='formal'?'block':'none';refreshReport();}
function refreshReport(){const u='/investigations/'+encodeURIComponent(INV)+'/report/'+rmode;document.getElementById('rlink').href=u;document.getElementById('rnote').textContent=rmode==='technical'?'— live technical report':'— formal report (immutable signed snapshot once finalized)';document.getElementById('rframe').src=u+'?ts='+Date.now();sigFm='';if(S)renderFormalCompose(S);}
function refreshFrame(){document.getElementById('rframe').src='/investigations/'+encodeURIComponent(INV)+'/report/'+rmode+'?ts='+Date.now();}
function renderFormalCompose(s){
  if(rmode!=='formal')return;
  const inv=s.investigation;
  const sig=JSON.stringify([s.findings.map(function(f){return [f.id,f.state,f.inFormal,f.formalSummary];}),inv.formalFrozen&&inv.formalFrozen.version,inv.execSummary,inv.scope,inv.remediation,caps]);
  if(sig===sigFm)return;sigFm=sig;
  document.getElementById('fzbanner').innerHTML=inv.formalFrozen
    ?'<div class="card" style="border-color:var(--green)"><span class="badge b-ok">FROZEN v'+inv.formalFrozen.version+'</span> signed by <b>'+esc(inv.formalFrozen.frozenBy)+'</b> · '+new Date(inv.formalFrozen.frozenAt).toLocaleString()+(hasCap('formal.finalize')?' <span class="k">— re-finalize below to publish a new signed version</span>':'')+'</div>'
    :'<div class="card" style="border-color:var(--amber)"><span class="badge b-warn">DRAFT</span> <span class="k">not yet finalized — a Manager freezes &amp; signs it below</span></div>';
  const box=document.getElementById('formalCompose');
  if(!hasCap('finding.curate')){box.innerHTML='';return;}
  const appr=s.findings.filter(function(f){return f.state==='approved';});
  let h='<div class="card"><h2 style="margin-top:0">Compose — flag findings &amp; write plain-language summaries</h2>';
  h+=appr.length?appr.map(function(f){
    return '<div class="card" style="background:var(--bg)"><label class="row" style="cursor:pointer"><input type="checkbox"'+(f.inFormal?' checked':'')+' onchange="fFormal('+Q+f.id+Q+',this.checked)"><b>'+esc(f.title)+'</b>'+(f.inFormalReport?'<span class="badge b-ok">in formal</span>':f.inFormal?'<span class="badge b-warn">needs summary</span>':'')+'</label>'
      +(f.inFormal?'<textarea id="fsum-'+f.id+'" style="width:100%;min-height:44px;margin-top:6px" placeholder="Plain-language summary for executives (no analyst names, no raw tech)">'+esc(f.formalSummary||'')+'</textarea><div class="row" style="margin-top:6px"><button class="ghost" onclick="fSummary('+Q+f.id+Q+')">Save summary</button><button class="ghost" onclick="fDraft('+Q+f.id+Q+')">Draft for me (offline)</button></div>':'')
      +'</div>';
  }).join(''):'<div class="empty">No approved findings yet — approve findings on the Findings tab first.</div>';
  h+='<h2>Narrative</h2>';
  h+='<div class="k" style="margin-bottom:4px">Executive summary</div><textarea id="nExec" style="width:100%;min-height:44px;margin-bottom:8px">'+esc(inv.execSummary||'')+'</textarea>';
  h+='<div class="k" style="margin-bottom:4px">Scope &amp; impact</div><textarea id="nScope" style="width:100%;min-height:44px;margin-bottom:8px">'+esc(inv.scope||'')+'</textarea>';
  h+='<div class="k" style="margin-bottom:4px">Remediation &amp; recommendations</div><textarea id="nRem" style="width:100%;min-height:44px;margin-bottom:8px">'+esc(inv.remediation||'')+'</textarea>';
  h+='<div class="row"><button class="ghost" onclick="saveNarr()">Save narrative</button>'+(hasCap('formal.finalize')?'<button onclick="finalizeNow()">'+(inv.formalFrozen?'Re-finalize (v'+(inv.formalFrozen.version+1)+')':'Finalize &amp; sign')+'</button>':'<span class="k">Only a Manager can finalize &amp; sign.</span>')+'</div></div>';
  box.innerHTML=h;
}
async function fFormal(id,inc){try{await post('/api/findings/'+id+'/formal',{include:inc});}catch(e){}sigFm='';sigF='';await tick();refreshFrame();}
async function fSummary(id){await post('/api/findings/'+id+'/summary',{text:document.getElementById('fsum-'+id).value});sigFm='';sigF='';await tick();refreshFrame();}
async function fDraft(id){const j=await post('/api/findings/'+id+'/draft');const ta=document.getElementById('fsum-'+id);if(ta)ta.value=j.text||'';}
async function saveNarr(){await post('/api/investigations/'+encodeURIComponent(INV)+'/update',{execSummary:document.getElementById('nExec').value,scope:document.getElementById('nScope').value,remediation:document.getElementById('nRem').value});sigFm='';await tick();refreshFrame();}
async function finalizeNow(){if(!confirm('Freeze & sign the formal report? This creates an immutable signed snapshot.'))return;await post('/api/investigations/'+encodeURIComponent(INV)+'/finalize',{});sigFm='';await tick();refreshFrame();}

// ---- audit chain viewer ----
async function loadAudit(){
  const r=await fetch('/api/investigations/'+encodeURIComponent(INV)+'/audit');const j=await r.json();if(j.error)return;
  document.getElementById('auditBadge').innerHTML=j.intact?'<span class="badge b-ok">chain intact ✓</span>':'<span class="badge b-red">CHAIN BROKEN — tampering detected</span>';
  document.getElementById('auditMeta').textContent=j.events.length+' events · verified '+new Date().toLocaleTimeString();
  document.getElementById('auditList').innerHTML=j.events.slice().reverse().map(function(e){
    return '<div class="iocrow"><span class="mono" style="color:var(--mut)">#'+e.seq+'</span><span class="mono" style="white-space:nowrap">'+new Date(e.timestamp).toLocaleString()+'</span><b style="min-width:90px">'+esc(e.actorName)+'</b><span class="pill">'+esc(e.action)+'</span><span class="k" style="flex:1;word-break:break-all">'+esc(e.targetId)+'</span><span class="mono" title="'+esc(e.hash)+'" style="color:var(--mut)">'+esc((e.hash||'').slice(0,10))+'…</span></div>';
  }).join('')||'<div class="empty">No events recorded yet.</div>';
}
// ---- evidence ingestion ----
let ingData=null,ingProfilesLoaded=false,ingSrcText='',ingSrcName='';
async function ingInitProfiles(){if(ingProfilesLoaded)return;ingProfilesLoaded=true;try{const ps=await (await fetch('/api/ingest/profiles')).json();const sel=document.getElementById('ingProfile');ps.forEach(function(p){const o=document.createElement('option');o.value=p.id;o.textContent=p.label;sel.appendChild(o);});}catch(e){}}
function ingReadFile(){return new Promise(function(res){const f=document.getElementById('ingFile');if(f.files&&f.files[0]){const file=f.files[0];const isBin=/\.pcap$|\.pcapng$|\.cap$/i.test(file.name);const rd=new FileReader();rd.onload=function(){let text=rd.result;if(isBin){const i=String(text).indexOf('base64,');text=i>=0?String(text).slice(i+7):String(text);}res({text:text,name:file.name});};if(isBin)rd.readAsDataURL(file);else rd.readAsText(file);}else res({text:document.getElementById('ingText').value,name:''});});}
async function ingAnalyze(){
  const st=document.getElementById('ingStatus');st.textContent='Parsing locally…';
  const src=await ingReadFile();
  if(!src.text||!src.text.trim()){st.textContent='Choose a file or paste an export first.';return;}
  ingSrcText=src.text;ingSrcName=src.name;
  const r=await post('/api/investigations/'+encodeURIComponent(INV)+'/ingest/preview',{text:src.text,filename:src.name,profile:document.getElementById('ingProfile').value});
  if(r.error){st.textContent=r.error;document.getElementById('ingPreview').innerHTML='';return;}
  ingData=r;
  const ev=(r.stats&&r.stats.events)||0;
  st.innerHTML='Parsed with <b>'+esc(r.profileLabel)+'</b> — '+r.findings.length+' findings, '+r.timeline.length+' timeline, '+r.iocs.length+' IOCs'+(ev?', <b>'+ev+'</b> raw events → SIEM lake + map':'')+' ('+r.newCounts.findings+'/'+r.newCounts.timeline+'/'+r.newCounts.iocs+' new).';
  renderIngest();
}
function ingGroup(title,key,items,render){
  if(!items.length)return'';
  const rows=items.map(function(it,i){return '<label class="iocrow" style="cursor:pointer"><input type="checkbox" data-ing="'+key+'" data-i="'+i+'"'+(it.dup?'':' checked')+'><span style="flex:1">'+render(it)+'</span>'+(it.dup?'<span class="badge b-mut">already in case</span>':'<span class="badge b-ok">new</span>')+'</label>';}).join('');
  const newN=items.filter(function(x){return !x.dup;}).length;
  return '<h2 style="margin-top:14px">'+esc(title)+' <span class="k">'+newN+' new / '+items.length+'</span> <a href="#" class="k" onclick="ingToggle('+Q+key+Q+',true);return false">all</a> · <a href="#" class="k" onclick="ingToggle('+Q+key+Q+',false);return false">none</a></h2>'+rows;
}
function renderIngest(){
  const d=ingData;if(!d)return;
  let h='';
  h+=ingGroup('Findings','findings',d.findings,function(f){return '<span class="dot '+esc(f.severity)+'"></span><b>'+esc(f.title)+'</b> '+(f.attack||[]).map(function(a){return '<span class="pill">'+esc(a)+'</span>';}).join(' ')+(f.assets&&f.assets.length?'<span class="k"> · '+f.assets.map(function(a){return esc(a.name);}).join(', ')+'</span>':'');});
  h+=ingGroup('Timeline events','timeline',d.timeline,function(e){return '<span class="mono" style="white-space:nowrap">'+esc((e.at||'').slice(0,16).replace('T',' '))+'</span> <span class="pill">'+esc(e.source)+'</span> '+esc(e.text);});
  h+=ingGroup('IOCs','iocs',d.iocs,function(x){return '<span class="pill">'+esc(x.type)+'</span> <span class="mono">'+esc(x.value)+'</span>';});
  h+='<div class="row" style="margin-top:12px"><button onclick="ingImport()">Import selected</button><span class="k" id="ingImportStatus"></span></div>';
  document.getElementById('ingPreview').innerHTML=h;
}
function ingToggle(key,on){[].forEach.call(document.querySelectorAll('input[data-ing="'+key+'"]'),function(c){c.checked=on;});}
async function ingImport(){
  if(!ingData)return;
  const pick=function(key,arr){return [].filter.call(document.querySelectorAll('input[data-ing="'+key+'"]'),function(c){return c.checked;}).map(function(c){return arr[+c.getAttribute('data-i')];});};
  const evAvail=(ingData.stats&&ingData.stats.events)||0;
  const body={source:ingData.profileLabel||'ingest',findings:pick('findings',ingData.findings),timeline:pick('timeline',ingData.timeline),iocs:pick('iocs',ingData.iocs),
    text:ingSrcText,profile:ingData.profile,filename:ingSrcName};
  const total=body.findings.length+body.timeline.length+body.iocs.length;
  if(!total&&!evAvail){document.getElementById('ingImportStatus').textContent='Nothing selected.';return;}
  document.getElementById('ingImportStatus').textContent='Importing…';
  const r=await post('/api/investigations/'+encodeURIComponent(INV)+'/ingest/commit',body);
  let extra='';if(r.events)extra+=' · '+r.events+' events → lake';if(r.mapNodes||r.mapEdges)extra+=' · map +'+(r.mapNodes||0)+' hosts/'+(r.mapEdges||0)+' links';
  document.getElementById('ingImportStatus').innerHTML='<span class="badge b-ok">imported</span> '+r.findings+' findings · '+r.timeline+' timeline · '+r.iocs+' IOCs'+extra;
  ingData=null;ingSrcText='';document.getElementById('ingPreview').innerHTML='';document.getElementById('ingText').value='';document.getElementById('ingFile').value='';
  sigF='';sigT='';sigI='';mLoaded=false;tick();
}

// ---- SIEM tab (browse/search the event lake) ----
let siemOffset=0,siemTotal=0;
function siemRow(e){
  const t=(e.ts||'').replace('T',' ').slice(0,19);
  const flow=(e.saddr||e.daddr)?((e.saddr||'?')+(e.sport?':'+e.sport:'')+' → '+(e.daddr||'?')+(e.dport?':'+e.dport:'')):'';
  const hit=(e.attack&&e.attack.length)?'<span class="dot high"></span>':'';
  const atk=(e.attack&&e.attack.length)?' '+e.attack.map(function(a){return '<span class="pill">'+esc(a)+'</span>';}).join(''):'';
  return '<div class="srow" onclick="siemExpand(this)"><div class="row" style="gap:9px;align-items:baseline;flex-wrap:nowrap">'
    +'<span class="mono" style="white-space:nowrap;color:var(--mut)">'+esc(t)+'</span>'
    +'<span class="pill">'+esc(e.source)+'</span><span class="mono k" style="white-space:nowrap">'+esc(e.type)+'</span>'
    +'<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+hit+esc(e.msg||'')+atk+(flow?' <span class="mono" style="color:var(--mut)">'+esc(flow)+'</span>':'')+'</span></div>'
    +'<pre class="rawbox" style="display:none">'+esc(JSON.stringify(e.raw!=null?e.raw:{ts:e.ts,source:e.source,type:e.type,fields:e.fields},null,2))+'</pre></div>';
}
function siemExpand(el){const p=el.querySelector('.rawbox');if(p)p.style.display=(p.style.display==='none'?'block':'none');}
async function loadSiem(reset){
  if(reset)siemOffset=0;
  const q=document.getElementById('siemQ').value.trim();const src=document.getElementById('siemSrc').value;
  let r;try{r=await (await fetch('/api/investigations/'+encodeURIComponent(INV)+'/lake?q='+encodeURIComponent(q)+'&source='+encodeURIComponent(src)+'&limit=100&offset='+siemOffset)).json();}catch(e){document.getElementById('siemMeta').textContent='Could not load events.';return;}
  if(r.error){document.getElementById('siemMeta').textContent=r.error;return;}
  siemTotal=r.total;
  if(reset){
    const sel=document.getElementById('siemSrc');
    sel.innerHTML=['<option value="">all sources ('+r.count+')</option>'].concat(Object.keys(r.sources).sort().map(function(s){return '<option value="'+esc(s)+'"'+(s===src?' selected':'')+'>'+esc(s)+' ('+r.sources[s]+')</option>';})).join('');
  }
  document.getElementById('siemMeta').innerHTML=r.count?('<b>'+r.total+'</b> matching · '+r.count+' events in the lake'+((q||src)?' · filtered':'')+' · click a row for the raw event'):'No events yet — ingest Suricata, Zeek, a PCAP, or run an agent <b>event logs</b> collection, then they appear here.';
  const rows=r.events.map(siemRow).join('');
  const box=document.getElementById('siemRows');box.innerHTML=(reset?'':box.innerHTML)+(rows||(reset?'<div class="empty">No matching events.</div>':''));
  siemOffset+=r.events.length;
  document.getElementById('siemMore').style.display=(siemOffset<siemTotal)?'inline-block':'none';
}

// ---- collection agents ----
let agentEnrollShown=false;
function ago(ts){if(!ts)return'never';const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
async function loadAgents(){
  const box=document.getElementById('agentList');if(!box)return;
  // Manager-only enrollment helper
  if(!agentEnrollShown&&hasCap('user.manage')){agentEnrollShown=true;try{const c=await (await fetch('/api/agents/config')).json();if(!c.error){
    const skyhost=(c.serverHosts&&c.serverHosts.length)?c.serverHosts[0]:location.hostname;
    const base=(c.tls?'https':'http')+'://'+skyhost+':'+c.port;const tok=esc(c.enrollToken);const ck=c.tls?'k':'';
    const winPre=c.tls?'[Net.ServicePointManager]::ServerCertificateValidationCallback={$true}; ':'';
    const blk=function(id,cmd){return '<div class="cmdwrap"><button class="cmdcopy" onclick="copyText(this,'+Q+id+Q+')">copy</button><div class="cmd" id="'+id+'">'+cmd+'</div></div>';};
    let h='<div class="card"><div class="k" style="margin-bottom:6px">Run one of these on the <b>target</b> host (not on SKYHAWK itself). Each downloads the agent from SKYHAWK ('+esc(base)+') and enrols it. Manager view.</div>';
    h+='<div class="k" style="margin:8px 0 3px">Windows &mdash; PowerShell on the target</div>'+blk('dlWin',winPre+'$f=\"$env:TEMP/skyhawk-agent.ps1\"; iwr '+base+'/agent/skyhawk-agent.ps1 -OutFile $f; powershell -ExecutionPolicy Bypass -File $f -Server '+base+' -EnrollToken '+tok);
    h+='<div class="k" style="margin:10px 0 3px">Linux &mdash; bash on the target</div>'+blk('dlLin','curl -fsSL'+ck+' '+base+'/agent/skyhawk-agent.sh | bash -s -- --server '+base+' --enroll-token '+tok);
    h+='<div class="k" style="margin:10px 0 3px">Push over SSH &mdash; from your box, set USER@TARGET</div>'+blk('sshCmd','curl -fsSL'+ck+' '+base+'/agent/skyhawk-agent.sh -o sky.sh &amp;&amp; scp sky.sh USER@TARGET:/tmp/ &amp;&amp; ssh USER@TARGET '+Q+'bash /tmp/sky.sh --server '+base+' --enroll-token '+tok+Q);
    if(c.serverHosts&&c.serverHosts.length>1){h+='<div class="k" style="margin-top:8px">This server has several network addresses. If the target cannot reach '+esc(skyhost)+', swap it for one of: '+c.serverHosts.slice(1).map(esc).join(', ')+'.</div>';}
    h+='</div>';document.getElementById('agentEnroll').innerHTML=h;
  }}catch(e){}}
  let rows;try{rows=await (await fetch('/api/agents')).json();}catch(e){box.innerHTML='<div class="empty">Could not load agents.</div>';return;}
  if(!rows.length){box.innerHTML='<div class="empty">No agents enrolled yet.'+(hasCap('user.manage')?' Use the command above to enrol one.':'')+'</div>';return;}
  const canCollect=hasCap('tech.control');
  box.innerHTML=rows.map(function(a){
    const last=a.lastCollection?('last: '+a.lastCollection.collector+' → '+esc(a.lastCollection.invId)+' ('+a.lastCollection.result.findings+'f/'+a.lastCollection.result.timeline+'e/'+a.lastCollection.result.iocs+'i) '+ago(a.lastCollection.at)):'no collections yet';
    const ctrl=canCollect?'<select id="col-'+a.id+'" style="width:128px" title="triage: processes/connections/logons · eventlog: Windows event-log detections (no Chainsaw needed) · chainsaw: bundled Chainsaw"><option value="triage">triage</option><option value="eventlog">event logs</option><option value="chainsaw">chainsaw</option></select><button onclick="doCollect('+Q+a.id+Q+')">Collect → '+esc(INV)+'</button>'+(hasCap('user.manage')?'<button class="ghost" onclick="dropAgent('+Q+a.id+Q+')">remove</button>':''):'';
    return '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><div><span class="dot" style="background:'+(a.online?'var(--green)':'var(--mut)')+'"></span><b>'+esc(a.name)+'</b> <span class="k">'+esc(a.os||'')+'</span><div class="k" style="margin-top:3px">'+(a.online?'online':'seen '+ago(a.lastSeen))+(a.pending?' · '+a.pending+' pending':'')+' · '+last+'</div></div><div class="row" style="gap:6px">'+ctrl+'</div></div></div>';
  }).join('');
}
async function doCollect(id){
  const collector=document.getElementById('col-'+id).value;
  try{await post('/api/agents/'+id+'/collect',{invId:INV,collector});loadAgents();}catch(e){}
}
async function dropAgent(id){if(!confirm('Remove this agent? It can re-enrol with the token.'))return;await post('/api/agents/'+id+'/remove');loadAgents();}
function copyText(btn,elId){var el=document.getElementById(elId);var t=el?el.textContent:'';function ok(){var o=btn.textContent;btn.textContent='copied ✓';setTimeout(function(){btn.textContent=o;},1000);}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok).catch(function(){});}else ok();}

function initSelects(s){
  document.getElementById('tlsrc').innerHTML=s.tlSources.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');
  document.getElementById('tktpl').innerHTML=s.playbooks.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');
  document.getElementById('tkphase').innerHTML=s.phases.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');
}

const ZONES=[{n:'External',x0:0,x1:225},{n:'DMZ',x0:225,x1:470},{n:'Internal',x0:470,x1:700},{n:'Restricted',x0:700,x1:900}];
const zoneX=[110,345,585,800];
const ZMAP={'external host':0,'cloud / SaaS':0,'firewall':1,'router':1,'VPN gateway':1,'load balancer':1,'mail server':1,'domain controller':3};
function zoneFor(t){return ZMAP[t]!==undefined?ZMAP[t]:2;}
const ST=['clean','entry','compromised','encrypted','external'];
function mXY(e){const r=document.getElementById('mcanvas').getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function mNodeAt(e){const el=document.elementFromPoint(e.clientX,e.clientY);const n=el&&el.closest?el.closest('[data-mn]'):null;return n?n.getAttribute('data-mn'):null;}
function mFind(id){return mNodes.find(function(n){return n.id===id;});}
const NODE_HW=68,NODE_HH=29;
function mEdgePoint(cx,cy,ox,oy,hw,hh){const dx=ox-cx,dy=oy-cy;if(!dx&&!dy)return{x:cx,y:cy};const sx=dx?hw/Math.abs(dx):Infinity;const sy=dy?hh/Math.abs(dy):Infinity;const s=Math.min(sx,sy,1);return{x:cx+dx*s,y:cy+dy*s};}
function mEdgeSvg(){let s='<svg width="900" height="430" style="position:absolute;inset:0;pointer-events:none"><defs><marker id="ma" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0L8,4L0,8Z" fill="#E24B4A"/></marker></defs>';
  mEdges.forEach(function(e){const a=mFind(e.a),b=mFind(e.b);if(!a||!b)return;const p1=mEdgePoint(a.x,a.y,b.x,b.y,NODE_HW+4,NODE_HH+4);const p2=mEdgePoint(b.x,b.y,a.x,a.y,NODE_HW+10,NODE_HH+10);s+='<line x1="'+p1.x+'" y1="'+p1.y+'" x2="'+p2.x+'" y2="'+p2.y+'" stroke="#E24B4A" stroke-width="2" marker-end="url(#ma)"/>';});
  if(mLink){const a=mFind(mLink.from);const p1=mEdgePoint(a.x,a.y,mLink.x,mLink.y,NODE_HW+4,NODE_HH+4);s+='<line x1="'+p1.x+'" y1="'+p1.y+'" x2="'+mLink.x+'" y2="'+mLink.y+'" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 4"/>';}
  return s+'</svg>';}
function mRender(){const c=document.getElementById('mcanvas');if(!c)return;
  let zones=ZONES.map(function(z){return '<div class="mzone" style="left:'+z.x0+'px;width:'+(z.x1-z.x0)+'px"></div>';}).join('')+ZONES.map(function(z){return '<div class="mzlab" style="left:'+((z.x0+z.x1)/2)+'px">'+z.n+'</div>';}).join('');
  let labs=mEdges.map(function(e,i){const a=mFind(e.a),b=mFind(e.b);if(!a||!b)return'';return '<div class="melab" style="left:'+((a.x+b.x)/2)+'px;top:'+((a.y+b.y)/2)+'px" onclick="mLabelEdge('+i+')">'+esc(e.label||'+ label')+'</div>';}).join('');
  let nodes=mNodes.map(function(n){return '<div class="mnode '+(n.state||'clean')+(n.id===mSel?' sel':'')+'" data-mn="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px" onpointerdown="mStartDrag(event,'+Q+n.id+Q+')"><div style="font-weight:500">'+esc(n.name)+'</div><div class="mt">'+esc(n.type)+'</div><div class="mip">'+esc(n.ip||'')+'</div><div class="mhandle" title="drag to link" onpointerdown="mStartLink(event,'+Q+n.id+Q+')"></div></div>';}).join('');
  c.innerHTML=zones+mEdgeSvg()+labs+nodes;
  const s=mFind(mSel);const md=document.getElementById('mdetail');
  if(s){md.innerHTML='<div class="row" style="align-items:center"><input id="mname" value="'+esc(s.name)+'" placeholder="Name" style="width:150px;font-weight:500" onchange="mSetName(this.value)"><span class="k">'+esc(s.type)+'</span><input id="mip" value="'+esc(s.ip||'')+'" placeholder="IP" style="width:150px" onchange="mSetIp(this.value)"><button class="ghost" onclick="mCycle()">State: '+(s.state||'clean')+'</button><button class="ghost" onclick="mDel()">Delete</button></div>';}
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
function addDevice(){const type=document.getElementById('adtype2').value;const nameEl=document.getElementById('adname2');const name=(nameEl.value||'').trim()||type;nameEl.value='';const nid='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,4);mNodes.push({id:nid,type:type,name:name,ip:'',state:type==='external host'?'external':'clean',x:zoneX[zoneFor(type)],y:210});mSel=nid;mRender();mSave(1);}
function mSync(){let added=0;(lastFindings||[]).forEach(function(f){(f.assets||[]).forEach(function(a){if(!mNodes.find(function(n){return n.name===a.name;})){mNodes.push({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:a.type,name:a.name,ip:a.ip||'',state:f.inTechnical?'compromised':'clean',x:zoneX[zoneFor(a.type)],y:60});added++;}});});mTidy();mSave(1);document.getElementById('msaved').textContent=added?('added '+added+' from findings'):'nothing new to sync';}
function mTidy(){const cols=[[],[],[],[]];mNodes.forEach(function(n){cols[zoneFor(n.type)].push(n);});cols.forEach(function(col,ci){col.forEach(function(n,ri){n.x=zoneX[ci];n.y=60+ri*74;});});mRender();}
async function mSave(quiet){try{await post('/api/investigations/'+encodeURIComponent(INV)+'/map',{nodes:mNodes,edges:mEdges});document.getElementById('msaved').textContent='saved ✓';}catch(e){document.getElementById('msaved').textContent='save failed';}}

async function tick(){
  const sr=await fetch('/api/investigations/'+encodeURIComponent(INV)+'/state?me='+encodeURIComponent(uid));if(sr.status===401){localStorage.clear();location.href='/login';return;}const s=await sr.json();
  if(s.error){document.querySelector('.wrap').innerHTML='<p>'+s.error+'</p><a href="/">← Portfolio</a>';return;}
  S=s;caps=s.me.caps;lastFindings=s.findings;
  document.getElementById('ititle').textContent=s.investigation.id+' · '+s.investigation.title;
  document.getElementById('imeta').textContent=(s.investigation.createdAt?'opened '+new Date(s.investigation.createdAt).toLocaleDateString()+' · ':'')+s.findings.length+' findings · '+s.iocs.length+' IOCs · '+s.timeline.length+' timeline events';
  if(!devices.length){devices=await (await fetch('/api/devices')).json();const o=devices.map(function(d){return '<option value="'+d+'">'+d+'</option>';}).join('');document.getElementById('adtype').innerHTML=o;document.getElementById('adtype2').innerHTML=o;}
  if(!selsInit){initSelects(s);selsInit=true;}
  document.getElementById('nf').textContent=s.findings.length;document.getElementById('tc').textContent=s.technicalCount;
  const sf=JSON.stringify(s.findings)+[...expanded].join(',')+caps.join(',');
  if(sf!==sigF){sigF=sf;document.getElementById('board').innerHTML=s.findings.length?s.findings.map(fCard).join(''):'<div class="empty">No findings yet.</div>';}
  renderCtl(s);renderTimeline(s);renderIocs(s);renderTasks(s);renderFormalCompose(s);
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
      const assets = (f.assets && f.assets.length) ? `<div class="print" style="margin:4px 0"><b>Affected systems:</b> ${f.assets.map((a) => `${esc(a.type)} — ${esc(a.name)}${a.ip ? " (" + esc(a.ip) + ")" : ""}`).join("; ")}</div>` : "";
      const shots = (f.screenshots || []).map((sc) => `<figure style="margin:8px 0"><img src="${sc.url}" style="max-width:100%;border:1px solid #ccc;border-radius:4px"><figcaption class="by">${esc(sc.caption)}${sc.sha256 ? ` · sha256 <span style="font-family:ui-monospace,monospace">${esc(sc.sha256)}</span>` : ""}</figcaption></figure>`).join("");
      const tools = (f.tools && f.tools.length) ? `<div class="print" style="margin:4px 0"><b>Tools used:</b> ${f.tools.map(esc).join(", ")}</div>` : "";
      const queries = (f.queries || []).map((qy) => `<div class="tech"><b>${esc(qy.lang)}</b><br>${esc(qy.text)}</div>`).join("");
      return `<div class="f"><div class="t">${esc(f.title)} ${(f.attack || []).map((a) => `<span class="pill">${esc(a)}</span>`).join(" ")}</div><div class="by">Logged by ${esc(f.by || f.authorId)} · severity ${esc(f.severity)}</div><div class="tech">${esc(f.technicalDetail)}</div>${assets}${shots}${queries ? `<div class="print" style="margin-top:6px"><b>Queries</b></div>${queries}` : ""}${tools}</div>`;
    }).join("") : `<p class="mut">No approved findings yet.</p>`;
    const timeline = (d.timeline && d.timeline.length) ? `<h2>Incident timeline</h2>` + d.timeline.map((e) =>
      `<div class="print" style="margin:4px 0"><b style="font-family:ui-monospace,monospace">${esc(new Date(e.at).toISOString().slice(0, 16).replace("T", " "))}Z</b> <span class="pill">${esc(e.source)}</span> ${esc(e.text)}</div>`).join("") : "";
    const iocGroups = {};
    (d.iocs || []).forEach((x) => { (iocGroups[x.type] = iocGroups[x.type] || []).push(x); });
    const iocs = (d.iocs && d.iocs.length) ? `<h2>Indicators of compromise (${d.iocs.length})</h2>` + Object.keys(iocGroups).sort().map((t) =>
      `<div class="print" style="margin:6px 0"><b>${esc(t)}</b>${iocGroups[t].map((x) => `<div class="tech" style="margin-top:3px">${esc(x.value)}${x.note ? ` <span class="mut">— ${esc(x.note)}</span>` : ""}</div>`).join("")}</div>`).join("") : "";
    return head + `<div class="banner">LIVE — regenerates as findings change. Internal / restricted.</div>` +
      (inv.execSummary ? `<h2>Executive summary</h2><p>${esc(inv.execSummary)}</p>` : "") +
      timeline +
      `<h2>Findings (${findings.length})</h2>${body}` + attack + iocs +
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
  return head + `<div class="banner">DRAFT — not finalized. A Manager finalizes in the workspace to freeze and sign.</div><h2>What happened</h2>${body}</body></html>`;
}

module.exports = { login, portfolio, workspace, report };
