const http=require('http');
const { JSDOM } = require('jsdom');

function raw(path,opts={}){return new Promise((res)=>{const r=http.request(Object.assign({host:'localhost',port:8462,path},opts),(x)=>{let d=[];x.on('data',c=>d.push(c));x.on('end',()=>res({status:x.statusCode,headers:x.headers,body:Buffer.concat(d).toString()}));});if(opts.body)r.write(opts.body);r.end();});}

// a minimal fetch backed by node http, sending the session cookie
function makeFetch(cookie){
  return (url,opts={})=>{
    const path=String(url).replace(/^https?:\/\/[^/]+/,'');
    const headers=Object.assign({},opts.headers||{},{Cookie:cookie});
    return raw(path,{method:opts.method||'GET',headers,body:opts.body}).then(r=>({
      ok:r.status>=200&&r.status<300, status:r.status,
      headers:{get:(k)=>r.headers[k.toLowerCase()]},
      json:()=>Promise.resolve(JSON.parse(r.body||'{}')),
      text:()=>Promise.resolve(r.body),
    }));
  };
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function loadPage(path,cookie,seed){
  const page=await raw(path,{headers:{Cookie:cookie}});
  const errors=[];
  const dom=new JSDOM(page.body,{
    runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:8462'+path,
    beforeParse(win){
      win.fetch=makeFetch(cookie);
      win.alert=()=>{}; win.prompt=()=>'lbl'; win.confirm=()=>true;
      Object.entries(seed||{}).forEach(([k,v])=>win.localStorage.setItem(k,v));
      win.addEventListener('error',e=>errors.push('window.error: '+(e.error&&e.error.stack||e.message)));
      win.addEventListener('unhandledrejection',e=>errors.push('unhandledrejection: '+(e.reason&&e.reason.stack||e.reason)));
      const ce=win.console.error; win.console.error=(...a)=>{errors.push('console.error: '+a.join(' '));ce.apply(win.console,a);};
    }
  });
  return {dom,win:dom.window,errors};
}

(async()=>{
  const login=await raw('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Morgan',password:'skyhawk'})});
  const cookie=(login.headers['set-cookie']||[''])[0].split(';')[0];
  const seed={hs_uid:'U-MC',hs_name:'Morgan',hs_title:'Manager'};
  let fails=0;
  const ck=(name,cond,extra)=>{console.log((cond?'  OK   ':'  FAIL ')+name+(extra&&!cond?' — '+extra:''));if(!cond)fails++;};

  // ---- WORKSPACE ----
  console.log('\n== workspace page ==');
  const {win,errors}=await loadPage('/inv?id=INC-2043',cookie,seed);
  await sleep(700);
  ck('no load-time JS errors', errors.length===0, errors.join(' || '));
  const d=win.document;
  ck('title rendered', /INC-2043/.test(d.getElementById('ititle').textContent));
  ck('findings board populated', d.getElementById('board').children.length>0);
  ck('device selects populated', d.getElementById('adtype').children.length>0);

  // tab switch to map
  win.showTab('map');
  await sleep(100);
  ck('map tab active', d.getElementById('p-map').classList.contains('on'));
  ck('map canvas rendered (nodes or empty msg)', d.getElementById('mcanvas').innerHTML.length>0);

  // add a device to the map
  const before=win.eval('mNodes.length');
  d.getElementById('adtype2').value=d.getElementById('adtype2').options[0].value;
  win.addDevice();
  await sleep(200);
  const after=win.eval('mNodes.length');
  ck('addDevice added a node', after===before+1, 'before '+before+' after '+after);
  ck('map node rendered in DOM', d.querySelectorAll('.mnode').length>0);

  // click a rendered node onpointerdown handler exists (wired?)
  const node=d.querySelector('.mnode');
  ck('map node has onpointerdown handler', node&&node.getAttribute('onpointerdown')&&node.getAttribute('onpointerdown').includes('mStartDrag'));

  // ATT&CK helper
  await win.openAttack();
  await sleep(200);
  ck('ATT&CK modal opened', !!d.querySelector('#attackModal .modalbox'));
  ck('ATT&CK techniques listed', d.querySelectorAll('#attackModal .trow').length>0);
  // pick one
  const trow=d.querySelector('#attackModal .trow');
  const oc=trow.getAttribute('onclick'); ck('trow onclick is pickTech', oc&&oc.includes('pickTech'));
  win.pickTech('T1190');
  ck('pickTech filled attack field', d.getElementById('fattack').value.includes('T1190'));

  // add a finding through the form, then verify board updates + a curate button is wired
  win.showTab('findings');
  d.getElementById('ftitle').value='Harness test finding';
  d.getElementById('fdetail').value='lsass dump on DC01';
  d.getElementById('adname').value='DC01';d.getElementById('adtype').value='domain controller';win.addAsset();
  await win.addF();
  await sleep(500);
  const cards=[...d.querySelectorAll('#board .fnd')];
  const mine=cards.find(c=>c.textContent.includes('Harness test finding'));
  ck('new finding appears on board', !!mine);
  const approveBtn=mine&&[...mine.querySelectorAll('button')].find(b=>/Approve/.test(b.textContent));
  ck('Approve button present (Manager curate)', !!approveBtn);
  ck('Approve onclick wired to fAct', approveBtn&&approveBtn.getAttribute('onclick').includes('fAct'));
  // actually click it
  if(approveBtn){ approveBtn.click(); await sleep(500); }
  const cards2=[...d.querySelectorAll('#board .fnd')];
  const mine2=cards2.find(c=>c.textContent.includes('Harness test finding'));
  ck('finding approved -> shows "in report"', mine2&&mine2.textContent.includes('in report'));

  // chat: send a message, verify it renders
  win.toggleChat();
  await sleep(200);
  d.getElementById('chInput').value='harness hello';
  await win.chSend();
  await sleep(400);
  ck('chat message rendered', d.getElementById('chMsgs').textContent.includes('harness hello'));

  // response advisor: open ⚡ Advice on a finding, verify tailored plan + copyable commands
  const advCard=[...d.querySelectorAll('#board .fnd')].find(c=>[...c.querySelectorAll('button')].some(b=>/Advice/.test(b.textContent)));
  const advBtn=advCard&&[...advCard.querySelectorAll('button')].find(b=>/Advice/.test(b.textContent));
  ck('Advice button present on findings', !!advBtn);
  if(advBtn){ advBtn.click(); await sleep(400); }
  const advBox=d.querySelector('#adviceModal .modalbox');
  ck('advice modal opened', !!advBox);
  ck('advice has phase sections', d.querySelectorAll('#adviceModal .advsec').length>0);
  ck('advice has copy-pasteable commands', d.querySelectorAll('#adviceModal .cmd').length>0);
  ck('advice command has a copy button', !!d.querySelector('#adviceModal .cmdcopy'));
  ck('advice targets the finding host (WEB01/DC01)', /WEB01|DC01/.test((advBox&&advBox.textContent)||''));
  win.closeAdvice();
  ck('advice modal closed', !d.querySelector('#adviceModal .modalbox'));

  ck('no errors after interactions', errors.length===0, errors.join(' || '));

  // ---- ROLE ENFORCEMENT (Analyst) ----
  console.log('\n== role enforcement: Analyst (Rivera) ==');
  const nlogin=await raw('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Rivera',password:'skyhawk'})});
  const ncookie=(nlogin.headers['set-cookie']||[''])[0].split(';')[0];
  const R=await loadPage('/inv?id=INC-2043',ncookie,{hs_uid:'U-NCM',hs_name:'Rivera',hs_title:'Analyst'});
  await sleep(600);
  ck('Analyst: no JS errors', R.errors.length===0, R.errors.join(' || '));
  ck('Analyst lacks curate cap', R.win.eval('caps.indexOf("finding.curate")')===-1);
  R.win.document.getElementById('ftitle').value='Analyst submitted finding';
  await R.win.addF(); await sleep(500);
  const rcards=[...R.win.document.querySelectorAll('#board .fnd')];
  const rmine=rcards.find(c=>c.textContent.includes('Analyst submitted finding'));
  ck('Analyst finding shows on board', !!rmine);
  const hasApprove=rmine&&[...rmine.querySelectorAll('button')].some(b=>/Approve/.test(b.textContent));
  ck('Analyst does NOT see an Approve button', !hasApprove);

  // ---- PORTFOLIO ----
  console.log('\n== portfolio page ==');
  const P=await loadPage('/',cookie,seed);
  await sleep(500);
  ck('portfolio no JS errors', P.errors.length===0, P.errors.join(' || '));
  ck('investigation list rendered', P.win.document.getElementById('list').children.length>0);

  console.log('\n==== '+(fails===0?'ALL PASSED':fails+' CHECK(S) FAILED')+' ====');
  process.exit(fails===0?0:1);
})().catch(e=>{console.error('HARNESS CRASH',e);process.exit(2);});
