(function(){
'use strict';
const D=window.DL, KEY='dutyv1', $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayStr=()=>D.ymd(new Date());
let S=migrate(load()), tab='today', cur=todayStr(), cycle=D.cycleStart(todayStr()), filter='all', sheetFn=null, form={}, applyN=0, libq='', libKind='all';
function load(){ try{ const j=JSON.parse(localStorage.getItem(KEY)); if(j&&j.v===1){ const sd=D.seed(); for(const k in sd) if(!(k in j)) j[k]=sd[k]; return j; } }catch(e){} return D.seed(); }
function migrate(s){ if((s.libVer||0)<3){ const b=(window.GSSC_SITES||[]).map(x=>Object.assign({},x)), names=new Set(b.map(x=>x.site.toLowerCase())); s.lib=b.concat((s.lib||[]).filter(l=>!l.kind&&!names.has((l.site||'').toLowerCase()))); s.libVer=3; try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){} } return s; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function commit(){ save(); render(); if(sheetFn) paintSheet(); }
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,2600); }
const num=x=>{ const v=Math.round(x*100)/100; return Number.isInteger(v)?String(v):String(v); };
const ini=n=>n.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
const T=id=>D.tech(S,id);

/* ---------- sheet ---------- */
function openSheet(fn){ sheetFn=fn; paintSheet(); $('#backdrop').hidden=false; $('#sheet').hidden=false; }
function paintSheet(){ const sh=$('#sheet'), st=sh.scrollTop; sh.innerHTML=`<button class="x" data-act="close">✕</button>`+sheetFn(); sh.scrollTop=st; }
function closeSheet(){ sheetFn=null; $('#backdrop').hidden=true; $('#sheet').hidden=true; }

/* ---------- date bar ---------- */
function dateBar(){
  const w=D.WD[D.dow(cur)], hol=S.hol.includes(cur);
  return `<div class="datebar"><button data-act="day" data-n="-1">‹</button><div class="d">${D.fmt(cur)}<small>${w}${hol?' · Public holiday':''}${cur===todayStr()?' · Today':''}</small><input type="date" value="${cur}" data-chg="date"></div><button data-act="day" data-n="1">›</button></div>`+
   (cur!==todayStr()?`<div style="text-align:center;margin-top:6px"><button class="btn sec sm" data-act="gotoday">Go to today</button></div>`:'');
}

/* ---------- Today / schedule ---------- */
function vToday(){
  const sch=S.sched[cur], st=sch?sch.status:'none', c=D.counts(S,cur), duties=S.duties[cur]||[], w=D.dow(cur);
  let h=dateBar();
  h+=`<div class="row" style="margin:12px 2px"><span class="chip ${st==='none'?'':st}">${st==='none'?'Not generated':st==='draft'?'Draft':'Final'}</span><span class="sp"></span>${duties.length?`<span class="sub">${duties.length} site${duties.length>1?'s':''} · ${c.total} slots</span>`:''}</div>`;
  if(w===5) h+=`<div class="banner info">Friday is a day off for everyone.</div>`;
  if(sch){
    h+=`<div class="stats"><div class="stat"><b>${c.filled}/${c.total}</b><span>Slots filled</span></div><div class="stat"><b style="color:${c.unfilled?'var(--red)':'inherit'}">${c.unfilled}</b><span>Unfilled</span></div><div class="stat"><b style="color:${c.conflicts?'var(--amb)':'inherit'}">${c.conflicts}</b><span>Conflicts</span></div></div>`;
    if(st==='final'&&c.conflicts) h+=`<div class="banner">Availability changed after finalizing. Reopen to fix the conflicts.</div>`;
    if(st==='final') h+=`<div class="banner info">Schedule is final and read-only.</div>`;
  }
  h+=`<div class="bar">`;
  if(st==='none') h+=`<button class="btn" data-act="gen" ${duties.length?'':'disabled'}>Generate schedule</button>`;
  if(st==='draft') h+=`<button class="btn sec" data-act="gen">Regenerate</button><button class="btn" data-act="review">Review &amp; finalize</button>`;
  if(st==='final') h+=`<button class="btn" data-act="image">Share GSSC image</button><button class="btn sec" data-act="reopen">Reopen</button>`;
  h+=`</div>`;
  if(st==='draft') h+=`<div class="bar"><button class="btn sec sm" data-act="image">Preview image</button></div>`;
  if(!duties.length) h+=`<div class="card"><div class="empty">No sites for this day yet.<br>Add the day's sites to build the schedule.</div></div>`;
  for(const shift of ['DAY','ONCALL']){
    const ds=duties.filter(d=>d.shift===shift); if(!ds.length)continue;
    h+=`<div class="gh">${shift==='DAY'?'Day · '+(w===6?'07:30–13:00 (Sat)':'07:30–16:30 / 17:30 SA'):'On-Call · 19:00–07:00'}</div>`;
    for(const d of ds){
      h+=`<div class="card"><div class="dh row"><div class="sp"><b>${esc(D.dutyName(d))}</b><small>${esc([d.code,d.loc,d.act].filter(Boolean).join(' · '))}</small></div>${st!=='final'?`<button class="btn sec sm" data-act="editduty" data-id="${d.id}">✎</button>`:''}</div>`;
      D.slotKeys(d).forEach((k,i)=>{ const s=D.slotState(S,cur,k);
        const nm=s.state==='ok'||s.state==='conflict'?esc(T(s.id).name):s.state==='unfilled'?'UNFILLED':'—';
        const tag=s.state==='ok'||s.state==='conflict'?(s.ovr?'<span class="chip org">Override</span>':s.src==='manual'?'<span class="chip">Manual</span>':''):'';
        h+=`<div class="slot ${s.state}" data-act="slot" data-k="${k}"><div class="no">${i+1}</div><div class="sp"><div class="nm">${nm}</div>${s.state==='conflict'?`<small>Conflict · ${esc(s.why)}</small>`:s.state==='unfilled'?'<small>Tap to assign</small>':''}</div>${tag}</div>`; });
      h+=`</div>`;
    }
  }
  if(st!=='final') h+=`<div class="bar"><button class="btn sec" data-act="addsite">＋ Add site</button></div>`;
  return h;
}

/* sheets: generate, review, slot, duty editor, add site */
function sGen(){
  const duties=S.duties[cur]||[], slots=duties.reduce((a,d)=>a+d.crew,0); let av=0,un=0,uc=0;
  S.team.forEach(t=>{ const a=D.getAvail(S,cur,t.id); if(a.status==='available')av++; else if(a.status==='unavailable')un++; else uc++; });
  return `<h3>Generate schedule</h3><div class="card pad"><div class="row"><span class="sp">Slots to fill</span><b>${slots}</b></div><div class="row"><span class="sp">Available</span><b>${av}</b></div><div class="row"><span class="sp">Unavailable</span><b>${un}</b></div><div class="row"><span class="sp">Not confirmed</span><b>${uc}</b></div></div><div class="sub">Partner pairs are placed first. Manual assignments are kept. Not confirmed people are never assigned.</div><div class="bar"><button class="btn sec" data-act="close" data-go="team">Review team</button><button class="btn" data-act="dogen">Generate</button></div>`;
}
function sReview(){
  const c=D.counts(S,cur), sch=S.sched[cur], issues=[], un=[];
  for(const d of (S.duties[cur]||[])) for(const [i,k] of D.slotKeys(d).entries()){ const s=D.slotState(S,cur,k); if(s.state==='conflict') issues.push({k,t:`${D.dutyName(d)} #${i+1} · ${T(s.id).name} · ${s.why}`}); if(s.state==='unfilled') un.push({k,t:`${D.dutyName(d)} #${i+1}`}); }
  let h=`<h3>Review &amp; finalize</h3><div class="stats"><div class="stat"><b>${c.filled}</b><span>Filled</span></div><div class="stat"><b>${c.unfilled}</b><span>Unfilled</span></div><div class="stat"><b>${c.conflicts}</b><span>Conflicts</span></div></div>`;
  if(issues.length){ h+=`<div class="gh">Resolve before finalizing</div>`; issues.forEach(x=>h+=`<div class="trow"><div class="sp">${esc(x.t)}</div><button class="btn sm" data-act="slot" data-k="${x.k}">Fix →</button></div>`); }
  if(un.length){ h+=`<div class="gh">Unfilled slots</div>`; un.forEach(x=>h+=`<div class="trow"><div class="sp">${esc(x.t)}</div><button class="btn sm sec" data-act="slot" data-k="${x.k}">Assign</button></div>`);
    h+=`<label class="ack"><input type="checkbox" data-chg="ack" ${sch.ack?'checked':''}><span>Finalize with these slots unfilled</span></label>`; }
  h+=`<div class="bar"><button class="btn ok" data-act="dofinal" ${c.conflicts||(c.unfilled&&!sch.ack)?'disabled':''}>Finalize schedule</button></div>`;
  return h;
}
function sSlot(){
  const k=form.slot, d=D.dutyOf(S,cur,k); if(!d) return '<div class="empty">Slot not found</div>';
  const st=D.slotState(S,cur,k), idx=+k.split('#')[1]+1, cands=D.candidates(S,cur,k), final=S.sched[cur].status==='final';
  let h=`<h3>${esc(D.dutyName(d))}</h3><div class="sub">${esc([d.code,d.act].filter(Boolean).join(' · '))} · ${d.shift==='DAY'?'Day':'On-Call'} · slot ${idx}</div>`;
  h+=`<div class="banner ${st.state==='ok'?'info':''}" style="${st.state==='unfilled'?'background:var(--redb);color:var(--red)':''}">${st.state==='unfilled'?'Unfilled':esc(T(st.id).name)+(st.state==='conflict'?' — Conflict: '+esc(st.why):' assigned')}</div>`;
  if(final) return h+`<div class="sub">Reopen the schedule to change assignments.</div>`;
  if(st.id) h+=`<button class="btn red sm" data-act="rmslot" data-k="${k}">Remove</button>`;
  h+=`<div class="gh">Candidates</div>`;
  for(const c of cands){
    if(c.cat==='cur') continue;
    const dim=c.cat!=='ok', canOvr=c.cat==='busy'&&S.opt.override&&d.shift==='DAY';
    h+=`<div class="cand ${dim&&!canOvr?'dim':''}"><div class="av ${T(c.id).grp==='SA'?'sa':''}">${ini(c.name)}</div><div class="sp"><b>${esc(c.name)}</b>${c.partner?' <span class="chip">Partner</span>':''}<div class="sub">${esc(c.why)} · ${c.recent} duties in 7 days</div></div>`+
      (c.cat==='ok'?`<button class="btn sm" data-act="assign" data-k="${k}" data-id="${c.id}">Assign</button>`:canOvr?`<button class="btn sm sec" data-act="assign" data-k="${k}" data-id="${c.id}" data-ovr="1">Override</button>`:c.cat==='unconfirmed'?`<button class="btn sm sec" data-act="setav" data-id="${c.id}">Set availability</button>`:'')+`</div>`;
  }
  return h;
}
function sDuty(){
  const f=form.duty;
  return `<h3>${f.id?'Edit site':'New site'}</h3>
  <label class="f">Site name</label><input data-f="site" value="${esc(f.site)}" placeholder="e.g. Spark Logistics">
  <label class="f">AMC / GMC no.</label><input data-f="code" value="${esc(f.code)}" placeholder="e.g. AMC-80012">
  <label class="f">Location</label><input data-f="loc" value="${esc(f.loc)}">
  <label class="f">Activity</label><input data-f="act" value="${esc(f.act)}" placeholder="e.g. AMC (FA &amp; FF)">
  <label class="f">Shift</label><div class="seg"><button class="${f.shift==='DAY'?'on':''}" data-act="dfset" data-k="shift" data-v="DAY">Day</button><button class="${f.shift==='ONCALL'?'on':''}" data-act="dfset" data-k="shift" data-v="ONCALL">On-Call</button></div>
  <label class="f">Crew size</label><div class="seg">${[1,2,3].map(n=>`<button class="${f.crew===n?'on':''}" data-act="dfset" data-k="crew" data-v="${n}">${n}</button>`).join('')}</div>
  <div class="bar">${f.id?`<button class="btn red" data-act="delduty">Delete</button>`:''}<button class="btn" data-act="saveduty">Save</button></div>`;
}
function libHtml(){
  const q=libq.trim().toLowerCase(); let n=0, h='';
  S.lib.forEach((l,i)=>{ if(libKind!=='all'&&(l.kind||'OTHER')!==libKind)return; if(q&&!([l.code,l.site,l.loc,l.act,l.kind,l.note].join(' ').toLowerCase().includes(q)))return; n++;
    h+=`<div class="trow"><div class="sp" data-act="addlib" data-i="${i}"><b>${esc(l.site||l.code)}</b> ${l.kind?`<span class="chip">${l.kind}${l.tag?' · '+l.tag:''}</span>`:''}${l.note?` <span class="chip draft">${esc(l.note)}</span>`:''}<div class="sub">${esc([l.code,l.loc,l.act].filter(Boolean).join(' · '))} · ${l.shift==='DAY'?'Day':'On-Call'} · ${l.crew}</div></div><button class="btn sec sm" data-act="addlib" data-i="${i}" data-oc="1" title="Add as On-Call">🌙</button><button class="btn sec sm" data-act="rmlib" data-i="${i}">✕</button></div>`; });
  return n?h:`<div class="empty">${S.lib.length?'No match':'No saved sites. Upload your AMC / GMC list below.'}</div>`;
}
function sAdd(){
  const prev=prevDuties();
  return `<h3>Add site</h3><div class="bar"><button class="btn" data-act="newduty">＋ New site</button>${prev?`<button class="btn sec" data-act="copyprev">Copy ${D.fmt(prev.date)}</button>`:''}</div>
  <label class="f">Upload AMC / GMC list (.xlsx or .csv)</label><input type="file" accept=".xlsx,.csv,.txt" data-chg="amcfile">
  <div class="gh">AMC / GMC sites · ${S.lib.length} · tap to add (🌙 = On-Call)</div><div class="chips">${[["all","All"],["AMC","AMC"],["GMC","GMC"]].map(([k,t])=>`<button class="${libKind===k?'on':''}" data-act="libkind" data-v="${k}">${t}</button>`).join('')}</div><input data-q="1" placeholder="Search site, code, location" value="${esc(libq)}"><div class="card" id="liblist">${libHtml()}</div>`;
}
function sImport(){
  const im=form.imp, t=im.tbl, opts=(sel)=>`<option value="-1">— none —</option>`+t.header.map((h,i)=>`<option value="${i}" ${sel===i?'selected':''}>${esc(h||'Column '+(i+1))}</option>`).join('');
  const list=D.libFromTable(t,im.map,im.crew), field=[['code','AMC / GMC no.'],['site','Site / client'],['loc','Location'],['act','Activity / system'],['crew','Crew size (optional)'],['shift','Shift (optional)']];
  return `<h3>Import AMC / GMC list</h3><div class="sub">${esc(im.name)} · ${t.body.length} rows · check the columns</div>`+
   field.map(([k,l])=>`<label class="f">${l}</label><select data-chg="impmap" data-k="${k}">${opts(im.map[k])}</select>`).join('')+
   `<label class="f">Default crew size</label><div class="seg">${[1,2,3].map(n=>`<button class="${im.crew===n?'on':''}" data-act="impcrew" data-v="${n}">${n}</button>`).join('')}</div>
   <div class="gh">Preview · ${list.length} sites</div><div class="card">${list.slice(0,4).map(l=>`<div class="trow"><div class="sp"><b>${esc(l.site||l.code)}</b><div class="sub">${esc([l.code,l.loc,l.act].filter(Boolean).join(' · '))} · ${l.shift==='DAY'?'Day':'On-Call'} · ${l.crew}</div></div></div>`).join('')||'<div class="empty">Nothing to import. Pick the Site column.</div>'}</div>
   <div class="bar"><button class="btn sec" data-act="doimport" data-replace="1" ${list.length?'':'disabled'}>Replace list</button><button class="btn" data-act="doimport" ${list.length?'':'disabled'}>Merge into list</button></div>`;
}
function prevDuties(){ for(let i=1;i<=14;i++){ const d=D.addDays(cur,-i); if((S.duties[d]||[]).length) return {date:d,list:S.duties[d]}; } return null; }
const uid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function afterDutyChange(){ const sch=S.sched[cur]; if(sch){ for(const k of Object.keys(sch.a)) if(!D.dutyOf(S,cur,k)) delete sch.a[k]; } }

/* ---------- Team ---------- */
function vTeam(){
  const rows=S.team.map(t=>({t,a:D.getAvail(S,cur,t.id)}));
  const cnt={all:rows.length,available:rows.filter(r=>r.a.status==='available').length,unavailable:rows.filter(r=>r.a.status==='unavailable').length,unconfirmed:rows.filter(r=>r.a.status==='unconfirmed').length};
  const label={all:'All',available:'Available',unavailable:'Unavailable',unconfirmed:'Not confirmed'};
  let h=dateBar()+`<div class="chips">${Object.keys(label).map(k=>`<button class="${filter===k?'on':''}" data-act="filter" data-v="${k}">${label[k]} ${cnt[k]}</button>`).join('')}</div><div class="card">`;
  const list=rows.filter(r=>filter==='all'||r.a.status===filter);
  if(!list.length) h+=`<div class="empty">Nobody here</div>`;
  for(const {t,a} of list){
    const sites=assignedSites(t.id), p=t.partner&&T(t.partner);
    const chip=a.status==='available'?`<span class="chip final">Available${a.day&&a.oncall?'':a.day?' · Day':' · On-Call'}</span>`:a.status==='unconfirmed'?`<span class="chip draft">Not confirmed</span>`:`<span class="chip red">${esc(D.REASONS[a.reason]||'Unavailable')}</span>`;
    h+=`<div class="trow" data-act="setav" data-id="${t.id}"><div class="av ${t.grp==='SA'?'sa':''}">${ini(t.name)}</div><div class="sp"><b>${esc(t.name)}</b><div class="sub">${t.emp?'#'+esc(t.emp)+' · ':''}${t.grp==='SA'?'SA':'NS'}${p?' · Partner '+esc(p.name):''}</div>${sites?`<div class="sub">📍 ${esc(sites)}</div>`:''}</div>${chip}</div>`;
  }
  h+=`</div><div class="gh">Other projects · not scheduled</div><div class="card">`+S.other.map(o=>`<div class="trow"><div class="av g">${ini(o.name)}</div><div class="sp"><b>${esc(o.name)}</b><div class="sub">${esc(o.project)} · hours as logged</div></div></div>`).join('')+`</div>`;
  return h;
}
function assignedSites(id){ const sch=S.sched[cur]; if(!sch)return ''; const o=[]; for(const d of (S.duties[cur]||[])) for(const k of D.slotKeys(d)) if(sch.a[k]&&sch.a[k].id===id) o.push(D.dutyName(d)+(d.shift==='ONCALL'?' (On-Call)':'')); return o.join(', '); }
function sAvail(){
  const id=form.tech, t=T(id), a=D.getAvail(S,cur,id), c=D.counts(S,cur);
  let h=`<h3>${esc(t.name)}</h3><div class="sub">Availability · ${D.fmt(cur)}</div>
  <div class="seg">${[['available','Available'],['unavailable','Unavailable'],['unconfirmed','Not confirmed']].map(([v,l])=>`<button class="${a.status===v?'on':''}" data-act="avset" data-v="${v}">${l}</button>`).join('')}</div>`;
  if(a.status==='available') h+=`<label class="f">Available for</label><div class="tg"><button class="${a.day?'on':''}" data-act="avshift" data-v="day">Day</button><button class="${a.oncall?'on':''}" data-act="avshift" data-v="oncall">On-Call</button></div>`;
  if(a.status==='unavailable') h+=`<label class="f">Reason · leave = 0 h, unpaid</label><div class="tg">${Object.keys(D.REASONS).map(r=>`<button class="${a.reason===r?'on':''}" data-act="avreason" data-v="${r}">${D.REASONS[r]}</button>`).join('')}</div>`;
  if(c.conflicts) h+=`<div class="banner">This breaks ${c.conflicts} slot${c.conflicts>1?'s':''} in today's schedule. Fix in Schedule.</div>`;
  h+=`<label class="f">Apply also to next days</label><select data-chg="applyn">${[0,1,2,3,4,5,6,7,10,14,21,30].map(n=>`<option value="${n}" ${applyN===n?'selected':''}>${n===0?'This day only':'+'+n+' days'}</option>`).join('')}</select>
  <label class="f">Name</label><input data-chg="tname" value="${esc(t.name)}"><label class="f">Employee no.</label><input data-chg="temp" value="${esc(t.emp)}" inputmode="numeric">
  <div class="bar"><button class="btn" data-act="close">Done</button></div>`;
  return h;
}
function setAvail(id,patch){
  const base=Object.assign({},D.getAvail(S,cur,id),patch);
  for(let i=0;i<=applyN;i++){ const d=D.addDays(cur,i); (S.avail[d]=S.avail[d]||{})[id]=Object.assign({},base); }
  commit();
}

/* ---------- Hours ---------- */
const DT={normal:'Normal',saturday:'Saturday',friday:'Friday',holiday:'Public holiday'};
function ruleLine(dt){ return dt==='normal'?'Sun–Thu · NS 07:30–16:30 = 8.5 h normal · SA 07:30–17:30 = 9.5 h · OT after finish (NS only) · night 19:00–07:00 = double OT':dt==='saturday'?'Saturday · NS 07:30–13:00 = 5.5 h normal · after 13:00 single OT · SA off':'All worked hours are double OT · night 19:00–07:00 double OT'; }
function vHours(){
  const dt=D.dayType(S,cur), rows=D.dayRows(S,cur), sch=S.sched[cur];
  let h=dateBar()+`<div class="row" style="margin:10px 2px"><span class="sp"><select data-chg="dtype">${Object.keys(DT).map(k=>`<option value="${k}" ${dt===k?'selected':''}>${DT[k]}${D.autoType(S,cur)===k?' (auto)':''}</option>`).join('')}</select></span><span class="chip ${sch&&sch.status==='final'?'final':'draft'}" style="margin-left:8px">${sch&&sch.status==='final'?'Final':'Provisional'}</span></div><div class="sub" style="margin:0 4px 8px">${ruleLine(dt)}</div>`;
  h+=`<div class="card"><div class="hrow hd"><div>TECHNICIAN</div><div class="v">NORM</div><div class="v">S.OT</div><div class="v">D.OT</div></div>`;
  let tn=0,ts=0,td=0, shown=0;
  for(const r of rows){
    if(r.off) continue; shown++;
    if(r.leave){ h+=`<div class="hrow"><div><b>${esc(r.t.name)}</b><div class="sub">${esc(D.LEAVE[r.leave])} · 0 h unpaid</div></div><div class="v">0</div><div class="v">0</div><div class="v">0</div></div>`; continue; }
    const id=r.t.id;
    if(!r.hasDay&&!r.hasOn){ h+=`<div class="hrow"><div><b>${esc(r.t.name)}</b><div class="sub">No duty</div></div><div class="v" style="grid-column:2/-1"><button class="btn sec sm" data-act="addday" data-id="${id}">＋ Add day</button></div></div>`; continue; }
    tn+=r.n;ts+=r.s;td+=r.d;
    h+=`<div class="hrow ${r.corr?'corr':''}"><div><b>${esc(r.t.name)}</b> <span class="chip">${r.t.grp}</span><div class="sub">${esc(r.site)}${r.act?' · '+esc(r.act):''}</div></div><div class="v">${num(r.n)}</div><div class="v">${r.t.grp==='SA'?'–':num(r.s)}</div><div class="v">${num(r.d)}</div>`;
    if(r.hasDay) h+=`<div class="step"><span class="sub">Out</span><button data-act="out" data-id="${id}" data-n="-30">−</button><span><b>${r.out}</b></span><button data-act="out" data-id="${id}" data-n="30">+</button>${r.add&&!r.hasOn?`<button data-act="rmday" data-id="${id}" style="width:auto;padding:0 8px">remove</button>`:''}</div>`;
    if(r.hasOn) h+=`<div class="step"><span class="sub">Call-out h</span><button data-act="call" data-id="${id}" data-n="-0.5">−</button><span><b>${num(r.call)}</b> h <span class="sub">On-Call</span></span><button data-act="call" data-id="${id}" data-n="0.5">+</button></div>`;
    h+=`</div>`;
  }
  h+=`<div class="hrow tot"><div>Team total</div><div class="v">${num(tn)}</div><div class="v">${num(ts)}</div><div class="v">${num(td)}</div></div></div>`;
  if(!sch) h+=`<div class="banner info">No schedule for this day. Hours appear once duties are assigned. Use “Add day” for manual entries.</div>`;
  return h;
}
function hentry(id){ const m=S.hrs[cur]=S.hrs[cur]||{}; return m[id]=m[id]||{}; }

/* ---------- Timesheet cycle ---------- */
function cycleTS(){ return D.timesheet(S,cycle,todayStr()); }
function vCycle(){
  const ts=cycleTS(), end=D.cycleEnd(cycle), short=ts.filter(r=>r.short>0&&r.days.length);
  let h=`<div class="datebar"><button data-act="cyc" data-n="-1">‹</button><div class="d">${D.fmt(cycle)} → ${D.fmt(end)}<small>Pay cycle (25th–24th)</small></div><button data-act="cyc" data-n="1">›</button></div>`;
  h+=`<div class="bar"><button class="btn sec" data-act="exportall">Export all timesheets (.zip)</button></div>`;
  if(short.length) h+=`<div class="banner">Short hours: ${short.map(r=>esc(r.t.name)+' −'+num(r.short)+'h').join(' · ')}</div>`;
  h+=`<div class="card">`;
  for(const r of ts){
    const pct=Math.min(100,Math.round(100*r.n/Math.max(1,r.adj)));
    h+=`<div class="trow" data-act="tsdays" data-id="${r.t.id}" style="display:block"><div class="row"><b class="sp">${esc(r.t.name)}</b><span class="chip">${r.t.grp}</span></div>
    <div class="row sub"><span class="sp">Normal <b style="color:var(--tx)">${num(r.n)}</b> / ${num(r.adj)}</span><span>S.OT <b style="color:var(--tx)">${r.t.grp==='SA'?'–':num(r.s)}</b></span><span style="margin-left:12px">D.OT <b style="color:var(--tx)">${num(r.d)}</b></span></div>
    <div class="bar2"><i style="width:${pct}%"></i></div><div>`+
    (r.days.length&&r.short>0?`<span class="chip red">Short by ${num(r.short)} h</span> `:'')+(r.leaveDays?`<span class="chip">Leave ${r.leaveDays} d · ${num(r.leaveH)} h</span> `:'')+(r.corr?`<span class="chip org">Corrected ${r.corr}</span> `:'')+(r.unfinal?`<span class="chip draft">${r.unfinal} not finalized</span> `:'')+(r.missing?`<span class="chip yel">No record ${r.missing} d</span> `:'')+`</div></div>`;
  }
  return h+`</div><div class="sub" style="margin:4px">Tap a name for the day-by-day list and Excel export. Days count once the schedule is final.</div>`;
}
function sDays(){
  const R=cycleTS().find(r=>r.t.id===form.tech);
  let h=`<h3>${esc(R.t.name)}</h3><div class="sub">${D.fmt(cycle)} → ${D.fmt(D.cycleEnd(cycle))} · expected ${num(R.expected)} h</div><div class="bar"><button class="btn" data-act="exporttech" data-id="${R.t.id}">Export Excel</button></div><div class="card"><div class="hrow hd"><div>DAY</div><div class="v">NORM</div><div class="v">S.OT</div><div class="v">D.OT</div></div>`;
  if(!R.days.length) h+=`<div class="empty">No counted days</div>`;
  for(const x of R.days){ const r=x.r; h+=`<div class="hrow ${r.corr?'corr':''}"><div><b>${D.fmt(x.date).slice(0,5)}</b> ${D.WD[D.dow(x.date)].slice(0,3)}<div class="sub">${x.leave?esc(D.LEAVE[r.leave])+' · unpaid':esc(r.site)}</div></div><div class="v">${num(x.leave?0:r.n)}</div><div class="v">${num(x.leave?0:r.s)}</div><div class="v">${num(x.leave?0:r.d)}</div></div>`; }
  return h+`</div><div class="sub">Total · Normal ${num(R.n)} · S.OT ${num(R.s)} · D.OT ${num(R.d)}</div>`;
}

/* ---------- More ---------- */
function vMore(){
  const dates=Object.keys(S.sched).sort().reverse().slice(0,40);
  let h=`<div class="gh">AMC / GMC list</div><div class="card pad"><div class="row"><b class="sp">${S.lib.length} saved sites</b>${S.lib.length?`<button class="btn sec sm" data-act="clearlib">Clear</button>`:''}</div><label class="f">Upload list (.xlsx or .csv)</label><input type="file" accept=".xlsx,.csv,.txt" data-chg="amcfile"></div><div class="gh">Settings</div><div class="card"><div class="sw"><span>Allow a 2nd Day site for one person (override)</span><input type="checkbox" style="width:24px;height:24px" data-chg="ovr" ${S.opt.override?'checked':''}></div></div>`;
  h+=`<div class="gh">Public holidays · all hours double OT</div><div class="card pad"><div class="row"><input type="date" id="holin"><button class="btn sm" data-act="addhol">Add</button></div>`+S.hol.slice().sort().map(d=>`<div class="row" style="margin-top:8px"><span class="sp">${D.fmt(d)} · ${D.WD[D.dow(d)]}</span><button class="btn sec sm" data-act="rmhol" data-d="${d}">✕</button></div>`).join('')+`</div>`;
  h+=`<div class="gh">Saved schedules</div><div class="card">`+(dates.length?dates.map(d=>`<div class="trow" data-act="opendate" data-d="${d}"><div class="sp"><b>${D.fmt(d)}</b> <span class="sub">${D.WD[D.dow(d)]}</span></div><span class="chip ${S.sched[d].status}">${S.sched[d].status}</span></div>`).join(''):'<div class="empty">None yet</div>')+`</div>`;
  h+=`<div class="gh">Backup</div><div class="card pad"><div class="bar" style="margin:0"><button class="btn sec" data-act="backup">Export backup</button></div><label class="f">Restore from backup file</label><input type="file" accept=".json" data-chg="import"></div>`;
  h+=`<div class="bar"><button class="btn red" data-act="reset">Reset all data</button></div><div class="sub" style="text-align:center">Duty Scheduler v1 · data stays on this phone</div>`;
  return h;
}

/* ---------- render ---------- */
function render(){
  const names={today:'Schedule',team:'Team',hours:'Hours',cycle:'Timesheet',more:'More'};
  $('#sub').textContent=names[tab]+' · '+D.fmt(tab==='cycle'?cycle:cur);
  const v={today:vToday,team:vTeam,hours:vHours,cycle:vCycle,more:vMore}[tab];
  const sc=window.scrollY; $('#main').innerHTML=v(); window.scrollTo(0,sc);
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
}

/* ---------- files ---------- */
function b64(bytes){ let s=''; for(let i=0;i<bytes.length;i+=0x8000) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000)); return btoa(s); }
async function shareFile(name,mime,bytes){
  try{
    const C=window.Capacitor;
    if(C&&C.isNativePlatform&&C.isNativePlatform()){
      const FS=C.registerPlugin('Filesystem'), SH=C.registerPlugin('Share');
      const r=await FS.writeFile({path:name,data:b64(bytes),directory:'CACHE'});
      await SH.share({title:name,url:r.uri,dialogTitle:name}); return;
    }
    const file=new File([bytes],name,{type:mime});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([bytes],{type:mime})); a.download=name; document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ if(e&&e.name!=='AbortError') toast('Could not share: '+(e.message||e)); }
}
function wrap(ctx,text,w){ const words=String(text).split(/\s+/),lines=[];let l=''; for(const x of words){ const t=l?l+' '+x:x; if(ctx.measureText(t).width>w&&l){lines.push(l);l=x;}else l=t; } if(l)lines.push(l); return lines.length?lines:['']; }
function drawImage(date){
  const rows=D.imageRows(S,date), sch=S.sched[date], draft=!sch||sch.status!=='final';
  const W=1200,cw=[300,560,340],X=[0,300,860],LH=30,P=14, c=document.createElement('canvas'), ctx=c.getContext('2d');
  ctx.font='bold 22px Arial'; const nameFont='bold 22px Arial', txFont='21px Arial';
  const lay=rows.map(r=>{ ctx.font=nameFont; const ntxt=r.names.map(n=>n||'UNFILLED').join(', '); const nl=wrap(ctx,ntxt,cw[0]-2*P); ctx.font=txFont;
    const ls=r.lines.map(l=>{ const t=l.site+(l.oncall?' (ON-CALL 19:00–07:00)':''); const a=wrap(ctx,t,cw[1]-2*P),b=wrap(ctx,l.act,cw[2]-2*P); return {a,b,n:Math.max(a.length,b.length)}; });
    const lines=Math.max(nl.length,ls.reduce((s,x)=>s+x.n,0)); return {r,nl,ls,h:lines*LH+2*P}; });
  const head=110, th=44, H=head+th+lay.reduce((s,x)=>s+x.h,0)+40; c.width=W; c.height=Math.max(H,300);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,c.height);
  ctx.fillStyle='#1f3a5f'; ctx.fillRect(0,0,W,head); ctx.fillStyle='#fff'; ctx.font='bold 40px Arial'; ctx.fillText('DUTY SCHEDULE  '+D.fmt(date)+'  |  '+D.WD[D.dow(date)],30,52); ctx.font='22px Arial'; ctx.fillText('Gulf Safety & Security Co. Ltd. · Technical Services',30,90);
  let y=head; ctx.fillStyle='#e8ebf0'; ctx.fillRect(0,y,W,th); ctx.fillStyle='#1b2430'; ctx.font='bold 22px Arial'; ['NAME','SITE & LOCATION','ACTIVITY'].forEach((t,i)=>ctx.fillText(t,X[i]+P,y+30)); y+=th;
  ctx.strokeStyle='#9aa3af'; ctx.lineWidth=1.5;
  lay.forEach((L,i)=>{ if(i%2) { ctx.fillStyle='#f7f8fa'; ctx.fillRect(0,y,W,L.h); }
    ctx.fillStyle='#1b2430'; ctx.font=nameFont; let yy=y+P+22; const un=L.r.names.some(n=>!n);
    L.nl.forEach(t=>{ ctx.fillStyle=un&&t.includes('UNFILLED')?'#c0392b':'#1b2430'; ctx.fillText(t,X[0]+P,yy); yy+=LH; });
    ctx.font=txFont; yy=y+P+22; L.ls.forEach(x=>{ ctx.fillStyle='#1b2430'; x.a.forEach((t,j)=>ctx.fillText(t,X[1]+P,yy+j*LH)); x.b.forEach((t,j)=>ctx.fillText(t,X[2]+P,yy+j*LH)); yy+=x.n*LH; });
    y+=L.h; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); });
  ctx.beginPath(); [300,860].forEach(x=>{ctx.moveTo(x,head+th);ctx.lineTo(x,y);}); ctx.stroke(); ctx.strokeRect(0.75,head,W-1.5,y-head);
  if(!rows.length){ ctx.fillStyle='#6b7686'; ctx.font='24px Arial'; ctx.fillText('No sites',30,y+40); }
  ctx.fillStyle='#6b7686'; ctx.font='18px Arial'; ctx.fillText(draft?'DRAFT — not finalized':'Final · '+new Date(sch.finalizedAt||Date.now()).toLocaleString('en-GB'),30,c.height-14);
  if(draft){ ctx.save(); ctx.translate(W/2,c.height/2); ctx.rotate(-0.45); ctx.fillStyle='rgba(192,57,43,.18)'; ctx.font='bold 190px Arial'; ctx.textAlign='center'; ctx.fillText('DRAFT',0,60); ctx.restore(); }
  return c;
}
let imgBytes=null, imgUrl='';
async function showImage(){
  const c=drawImage(cur); const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.92)); imgBytes=new Uint8Array(await blob.arrayBuffer()); imgUrl=URL.createObjectURL(blob);
  openSheet(()=>`<h3>GSSC duty schedule</h3><img class="prev" src="${imgUrl}"><div class="bar"><button class="btn" data-act="shareimg">Share image</button></div>`);
}
const imgName=()=>'GSSC_Duty_Schedule_'+D.fmt(cur)+'.jpg';
const short=s=>s.replace(/[^A-Za-z0-9]+/g,'');

/* ---------- actions ---------- */
const A={
 close(el){ const go=el&&el.dataset.go; closeSheet(); if(go){ tab=go; render(); } },
 day(el){ cur=D.addDays(cur,+el.dataset.n); render(); },
 gotoday(){ cur=todayStr(); render(); },
 gen(){ if(!(S.duties[cur]||[]).length) return toast('Add sites first'); openSheet(sGen); },
 dogen(){ const c=D.generate(S,cur); closeSheet(); commit(); toast(`Draft: ${c.filled}/${c.total} filled`+(c.unfilled?`, ${c.unfilled} unfilled`:'')); },
 review(){ openSheet(sReview); },
 dofinal(){ const e=D.finalize(S,cur); if(e) return toast(e); closeSheet(); commit(); toast('Schedule finalized'); },
 reopen(){ D.reopen(S,cur); commit(); toast('Reopened as draft'); },
 slot(el){ if(!S.sched[cur]) return toast('Generate the schedule first'); form.slot=el.dataset.k; openSheet(sSlot); },
 assign(el){ const k=el.dataset.k; D.assign(S,cur,k,el.dataset.id,!!el.dataset.ovr); closeSheet(); commit(); },
 rmslot(el){ D.removeSlot(S,cur,el.dataset.k); closeSheet(); commit(); },
 addsite(){ openSheet(sAdd); },
 newduty(){ form.duty={id:null,site:'',code:'',loc:'',act:'',shift:'DAY',crew:2}; openSheet(sDuty); },
 editduty(el){ const d=(S.duties[cur]||[]).find(x=>x.id===el.dataset.id); form.duty=Object.assign({},d); openSheet(sDuty); },
 dfset(el){ const k=el.dataset.k; form.duty[k]=k==='crew'?+el.dataset.v:el.dataset.v; paintSheet(); },
 saveduty(){ const f=form.duty; if(!(f.site||f.code).trim()) return toast('Enter a site name'); if(!f.code) f.code=D.codeFor(S,f.site); const list=S.duties[cur]=S.duties[cur]||[];
   if(f.id){ const i=list.findIndex(x=>x.id===f.id); list[i]=Object.assign({},f); } else { f.id=uid(); list.push(Object.assign({},f)); if(!S.lib.some(l=>l.site===f.site&&l.shift===f.shift&&l.act===f.act)) S.lib.push({code:f.code,site:f.site,loc:f.loc,act:f.act,shift:f.shift,crew:f.crew}); }
   afterDutyChange(); closeSheet(); commit(); },
 delduty(){ const f=form.duty; S.duties[cur]=(S.duties[cur]||[]).filter(x=>x.id!==f.id); afterDutyChange(); closeSheet(); commit(); },
 addlib(el){ const l=S.lib[+el.dataset.i]; const d=Object.assign({id:uid()},l); delete d.kind; delete d.note; delete d.tag; if(el.dataset.oc){ d.shift='ONCALL'; } (S.duties[cur]=S.duties[cur]||[]).push(d); closeSheet(); commit(); toast('Site added'); },
 libkind(el){ libKind=el.dataset.v; paintSheet(); },
 impcrew(el){ form.imp.crew=+el.dataset.v; paintSheet(); },
 doimport(el){ const im=form.imp, list=D.libFromTable(im.tbl,im.map,im.crew), replace=!!el.dataset.replace; if(replace&&!confirm('Replace the whole saved site list with '+list.length+' sites?')) return; const m=D.mergeLib(S.lib,list,replace); S.lib=Array.from(m); closeSheet(); commit(); toast(replace?list.length+' sites saved':(m.added||0)+' new sites added'); },
 clearlib(){ if(confirm('Delete the saved AMC / GMC list?')){ S.lib=[]; commit(); } },
 rmlib(el){ S.lib.splice(+el.dataset.i,1); commit(); },
 copyprev(){ const p=prevDuties(); S.duties[cur]=(S.duties[cur]||[]).concat(p.list.map(d=>Object.assign({},d,{id:uid()}))); closeSheet(); commit(); toast('Copied '+D.fmt(p.date)); },
 filter(el){ filter=el.dataset.v; render(); },
 setav(el){ form.tech=el.dataset.id; applyN=0; openSheet(sAvail); },
 avset(el){ const v=el.dataset.v; const p={status:v}; if(v==='available'){p.day=true;p.oncall=true;} if(v==='unavailable'){p.day=false;p.oncall=false;p.reason=D.getAvail(S,cur,form.tech).reason&&D.getAvail(S,cur,form.tech).reason!=='off'?D.getAvail(S,cur,form.tech).reason:'vacation';} if(v==='unconfirmed'){p.day=false;p.oncall=false;} setAvail(form.tech,p); },
 avshift(el){ const a=D.getAvail(S,cur,form.tech), k=el.dataset.v; setAvail(form.tech,{[k]:!a[k]}); },
 avreason(el){ setAvail(form.tech,{reason:el.dataset.v}); },
 dtype(){},
 out(el){ const id=el.dataset.id, r=D.dayRows(S,cur).find(x=>x.t.id===id), e=hentry(id); let h=D.toH(r.out)+(+el.dataset.n)/60; h=Math.max(7.5,Math.min(23.5,h)); e.out=D.toS(h); e.corr=true; commit(); },
 call(el){ const id=el.dataset.id, e=hentry(id); e.call=Math.max(0,Math.min(12,(e.call||0)+(+el.dataset.n))); e.corr=true; commit(); },
 addday(el){ hentry(el.dataset.id).add=true; commit(); },
 rmday(el){ const e=hentry(el.dataset.id); delete e.add; delete e.out; delete e.corr; commit(); },
 cyc(el){ cycle=D.shiftCycle(cycle,+el.dataset.n); render(); },
 tsdays(el){ form.tech=el.dataset.id; openSheet(sDays); },
 async exporttech(el){ const R=cycleTS().find(r=>r.t.id===el.dataset.id); await shareFile(`TS_${short(R.t.name)}_${cycle.slice(2,7).replace('-','')}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',D.timesheetXlsx(S,R,cycle)); },
 async exportall(){ const ts=cycleTS().filter(r=>r.days.length); if(!ts.length) return toast('No hours in this cycle yet'); const files=ts.map(R=>({name:`TS_${short(R.t.name)}.xlsx`,data:D.timesheetXlsx(S,R,cycle)})); await shareFile(`Timesheets_${cycle.slice(0,7)}.zip`,'application/zip',D.zip(files)); },
 image(){ showImage(); },
 async shareimg(){ await shareFile(imgName(),'image/jpeg',imgBytes); },
 addhol(){ const v=$('#holin').value; if(v&&!S.hol.includes(v)){ S.hol.push(v); commit(); } },
 rmhol(el){ S.hol=S.hol.filter(d=>d!==el.dataset.d); commit(); },
 opendate(el){ cur=el.dataset.d; tab='today'; render(); },
 async backup(){ await shareFile('DutyScheduler_backup_'+todayStr()+'.json','application/json',D.utf8(JSON.stringify(S))); },
 reset(){ if(confirm('Delete ALL schedules, availability and hours on this phone?')){ S=migrate(D.seed()); commit(); toast('Data reset'); } }
};
document.addEventListener('click',e=>{ const el=e.target.closest('[data-act]'); if(el&&A[el.dataset.act]){ e.preventDefault(); A[el.dataset.act](el); return; } if(e.target.id==='backdrop') closeSheet(); const nb=e.target.closest('nav button'); if(nb){ tab=nb.dataset.tab; window.scrollTo(0,0); render(); } });
document.addEventListener('input',e=>{ if(e.target.dataset&&e.target.dataset.q){ libq=e.target.value; const l=$('#liblist'); if(l) l.innerHTML=libHtml(); return; } const f=e.target.dataset&&e.target.dataset.f; if(f&&form.duty) form.duty[f]=e.target.value; });
document.addEventListener('change',e=>{ const k=e.target.dataset&&e.target.dataset.chg; if(!k)return; const v=e.target.value;
  if(k==='date'&&v){ cur=v; render(); }
  else if(k==='ack'){ S.sched[cur].ack=e.target.checked; commit(); }
  else if(k==='applyn'){ applyN=+v; }
  else if(k==='tname'){ if(v.trim()){ T(form.tech).name=v.trim(); commit(); } }
  else if(k==='temp'){ T(form.tech).emp=v.trim(); commit(); }
  else if(k==='dtype'){ if(v===D.autoType(S,cur)) delete S.hrsType[cur]; else S.hrsType[cur]=v; commit(); }
  else if(k==='impmap'){ form.imp.map[e.target.dataset.k]=+v; paintSheet(); }
  else if(k==='amcfile'){ const f=e.target.files[0]; if(f) readList(f); e.target.value=''; }
  else if(k==='ovr'){ S.opt.override=e.target.checked; commit(); }
  else if(k==='import'){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ const j=JSON.parse(r.result); if(!j||j.v!==1||!j.team) throw 0; S=j; commit(); toast('Backup restored'); }catch(x){ toast('Not a valid backup file'); } }; r.readAsText(f); }
});

async function readList(f){
  try{ let rows; const buf=new Uint8Array(await f.arrayBuffer());
    if(/\.xlsx$/i.test(f.name)) rows=await D.readXlsx(buf); else if(/\.xls$/i.test(f.name)) return toast('Old .xls not supported. Save as .xlsx or .csv'); else rows=D.parseCSV(new TextDecoder().decode(buf));
    const tbl=D.tableFromRows(rows); if(!tbl.body.length) return toast('No rows found in file');
    form.imp={name:f.name,tbl,map:D.guessMap(tbl.header),crew:2}; openSheet(sImport);
  }catch(err){ toast('Could not read file: '+(err.message||err)); } }

/* ---------- auto draft 05:30 ---------- */
function autoDraft(){ const t=todayStr(), n=new Date(); if(n.getHours()*60+n.getMinutes()<330) return; if((S.duties[t]||[]).length&&!S.sched[t]){ D.generate(S,t); commit(); toast('Auto draft created for today'); } }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) autoDraft(); });
render(); autoDraft(); setInterval(autoDraft,60000);
if('serviceWorker' in navigator&&!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())) addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
window.__S=()=>S;
})();
