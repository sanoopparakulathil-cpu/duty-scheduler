(function(root){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const fmt=s=>{const [y,m,d]=s.split('-');return d+'-'+m+'-'+y};
const dow=s=>parse(s).getDay();
const WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const LEAVE={vacation:'Vacation',leave:'Leave',umra:'Umra',emergency:'Emergency',medical:'Medical'};
const REASONS=Object.assign({off:'Day off'},LEAVE);
const r2=x=>Math.round(x*100)/100;

function seed(){
  const T=(id,name,emp,grp,partner)=>({id,name,emp,grp,partner:partner||null});
  return {v:1,
    team:[T('sanoop','Sanoop','','NS'),T('atif','Atif','8632','NS','rajiv'),T('atifp','Atif Pervez','8683','NS','ibrahim'),
      T('prem','Prem','','NS'),T('laxman','Laxman','','NS'),T('sakthivel','Sakthivel','','NS','abdullah'),T('ismail','Ismail','','NS'),
      T('rajiv','Rajiv Gandhi','','NS','atif'),T('umer','Umer','','NS','bader'),T('santosh','Santosh','','NS'),
      T('abdhesh','Abdhesh','','NS','shihab'),T('shihab','Shihab','','NS','abdhesh'),
      T('ibrahim','Ibrahim','','SA','atifp'),T('bader','Bader','','SA','umer'),T('abdullah','Abdullah','','SA','sakthivel')],
    other:[{name:'Umar Shafiq',project:'Qiddiya'},{name:'Syed Kawish',project:'Six Flags'}],
    avail:{},duties:{},sched:{},hrs:{},hrsType:{},hol:[],opt:{override:false},
    lib:[{code:'AMC-80012',site:'Spark Logistics',loc:'Dammam',act:'AMC (FA & FF)',shift:'DAY',crew:2},
         {code:'',site:'Synthomer',loc:'Dammam 2',act:'AMC (FA & FF)',shift:'DAY',crew:2},
         {code:'',site:'Synthomer',loc:'Dammam 2',act:'On-Call',shift:'ONCALL',crew:2},
         {code:'',site:'Kanoo Tower',loc:'Dammam',act:'AMC (FA)',shift:'DAY',crew:2},
         {code:'AMC-60134',site:'Jotun Powder Coatings',loc:'Dammam 2',act:'AMC (FA & FF)',shift:'DAY',crew:2},
         {code:'AMC-70044',site:'MEBCO',loc:'Dammam 2',act:'AMC (FA)',shift:'DAY',crew:1}]};
}
const tech=(S,id)=>S.team.find(t=>t.id===id);
function autoType(S,date){ if(S.hol.includes(date))return 'holiday'; const w=dow(date); return w===5?'friday':w===6?'saturday':'normal'; }
function dayType(S,date){ return (S.hrsType&&S.hrsType[date])||autoType(S,date); }

function defaultAvail(S,date,id){
  const t=tech(S,id),w=dow(date);
  if(w===5||(t.grp==='SA'&&w===6)) return {status:'unavailable',day:false,oncall:false,reason:'off'};
  return {status:'available',day:true,oncall:true};
}
function getAvail(S,date,id){ const a=(S.avail[date]||{})[id]; return a||defaultAvail(S,date,id); }
const isLeave=a=>a.status==='unavailable'&&!!LEAVE[a.reason];

const slotKeys=d=>Array.from({length:d.crew},(_,i)=>d.id+'#'+i);
function dutyOf(S,date,k){ const id=k.split('#')[0]; return (S.duties[date]||[]).find(d=>d.id===id); }
const dutyName=d=>d.site||d.code||'Site';

function elig(S,date,id,duty,slotKey,a,ignoreBusy){
  const av=getAvail(S,date,id);
  if(av.status==='unavailable') return {ok:false,cat:'unavailable',why:'Unavailable · '+(REASONS[av.reason]||'Off')};
  if(av.status==='unconfirmed') return {ok:false,cat:'unconfirmed',why:'Not confirmed'};
  if(duty.shift==='DAY'&&!av.day) return {ok:false,cat:'unavailable',why:'Not available for Day'};
  if(duty.shift==='ONCALL'&&!av.oncall) return {ok:false,cat:'unavailable',why:'Not available for On-Call'};
  if(!ignoreBusy) for(const k in a){ if(k===slotKey||a[k].id!==id)continue; const d2=dutyOf(S,date,k); if(d2&&d2.shift===duty.shift) return {ok:false,cat:'busy',why:'Already on '+dutyName(d2)}; }
  return {ok:true,cat:'ok',why:'Available'};
}
function recent(S,date,id){ let n=0; for(let i=1;i<=7;i++){ const s=S.sched[addDays(date,-i)]; if(s) for(const k in s.a) if(s.a[k].id===id) n++; } return n; }

function slotState(S,date,k){
  const sch=S.sched[date]; if(!sch) return {state:'none'};
  const v=sch.a[k]; if(!v) return {state:'unfilled'};
  const d=dutyOf(S,date,k); if(!d) return {state:'unfilled'};
  const e=elig(S,date,v.id,d,k,sch.a,!!v.ovr);
  return {state:e.ok?'ok':'conflict',id:v.id,src:v.src,ovr:!!v.ovr,why:e.ok?'':e.why};
}
function counts(S,date){
  const r={total:0,filled:0,unfilled:0,conflicts:0};
  for(const d of (S.duties[date]||[])) for(const k of slotKeys(d)){ r.total++; const s=slotState(S,date,k).state; if(s==='ok')r.filled++; else if(s==='conflict')r.conflicts++; else r.unfilled++; }
  return r;
}

function generate(S,date){
  const duties=S.duties[date]||[], old=S.sched[date], a={};
  if(old) for(const k in old.a){ const v=old.a[k]; if(v.src!=='manual')continue; const d=dutyOf(S,date,k); if(!d)continue; if(elig(S,date,v.id,d,k,a,!!v.ovr).ok) a[k]=v; }
  const field=S.team;
  const pairs=[]; field.forEach(t=>{ if(t.partner&&t.id<t.partner&&tech(S,t.partner)) pairs.push([t.id,t.partner]); });
  const nm=id=>tech(S,id).name;
  for(const d of duties){ if(d.crew<2)continue; const ks=slotKeys(d); if(a[ks[0]]||a[ks[1]])continue;
    let best=null;
    for(const [p,q] of pairs){ const e1=elig(S,date,p,d,ks[0],a), e2=elig(S,date,q,d,ks[1],a); if(!e1.ok||!e2.ok)continue;
      const sc=recent(S,date,p)+recent(S,date,q); if(!best||sc<best.sc||(sc===best.sc&&(nm(p)+nm(q))<(nm(best.p)+nm(best.q)))) best={p,q,sc}; }
    if(best){ const [x,y]=[best.p,best.q].sort((i,j)=>nm(i).localeCompare(nm(j))); a[ks[0]]={id:x,src:'auto'}; a[ks[1]]={id:y,src:'auto'}; }
  }
  for(;;){
    let pick=null;
    for(const d of duties) for(const k of slotKeys(d)){ if(a[k])continue; const c=field.filter(t=>elig(S,date,t.id,d,k,a).ok); if(!c.length)continue; if(!pick||c.length<pick.c.length) pick={d,k,c}; }
    if(!pick)break;
    const crew=slotKeys(pick.d).map(k=>a[k]&&a[k].id).filter(Boolean), partners=crew.map(i=>tech(S,i).partner);
    pick.c.sort((x,y)=>{ const px=partners.includes(x.id)?0:1, py=partners.includes(y.id)?0:1; if(px!==py)return px-py; const rx=recent(S,date,x.id), ry=recent(S,date,y.id); if(rx!==ry)return rx-ry; return x.name.localeCompare(y.name); });
    a[pick.k]={id:pick.c[0].id,src:'auto'};
  }
  S.sched[date]={status:'draft',a,ack:false};
  return counts(S,date);
}

function candidates(S,date,k){
  const sch=S.sched[date], d=dutyOf(S,date,k), a=(sch&&sch.a)||{}, cur=a[k]&&a[k].id;
  const crew=slotKeys(d).filter(x=>x!==k).map(x=>a[x]&&a[x].id).filter(Boolean), partners=crew.map(i=>tech(S,i).partner);
  const out=S.team.map(t=>{ const e=elig(S,date,t.id,d,k,a); return {id:t.id,name:t.name,cur:t.id===cur,partner:partners.includes(t.id),ok:e.ok,cat:t.id===cur?'cur':e.cat,why:e.why,recent:recent(S,date,t.id)}; });
  const rank={cur:0,ok:1,busy:2,unconfirmed:3,unavailable:4};
  out.sort((x,y)=>(rank[x.cat]-rank[y.cat])||((y.partner?1:0)-(x.partner?1:0))||(x.recent-y.recent)||x.name.localeCompare(y.name));
  return out;
}
function assign(S,date,k,id,ovr){ const sch=S.sched[date]; sch.a[k]={id,src:'manual',ovr:!!ovr}; sch.ack=false; }
function removeSlot(S,date,k){ const sch=S.sched[date]; delete sch.a[k]; sch.ack=false; }
function finalize(S,date){ const sch=S.sched[date],c=counts(S,date); if(c.conflicts) return 'Resolve conflicts first'; if(c.unfilled&&!sch.ack) return 'Acknowledge unfilled slots'; sch.status='final'; sch.finalizedAt=Date.now(); return null; }
function reopen(S,date){ if(S.sched[date]) S.sched[date].status='draft'; }

/* ---------- hours ---------- */
const toH=s=>{const [h,m]=s.split(':').map(Number);return h+m/60};
const toS=h=>{const t=Math.round(h*60);return pad(Math.floor(t/60)%24)+':'+pad(t%60)};
const stdOut=(grp,dt)=>dt==='saturday'?'13:00':(grp==='SA'?'17:30':'16:30');
function calc(grp,dt,out,call){
  const worked=Math.max(0,toH(out)-toH('07:30')); let n=0,s=0,d=0;
  if(dt==='friday'||dt==='holiday') d=worked;
  else if(dt==='saturday'){ if(grp==='SA') d=0; n=Math.min(worked,5.5); s=Math.max(0,worked-5.5); }
  else { const w=worked-(toH(out)>13?0.5:0); const cap=grp==='SA'?9.5:8.5; n=Math.min(w,cap); s=grp==='SA'?0:Math.max(0,w-cap); }
  d+=call||0; return {n:r2(n),s:r2(s),d:r2(d)};
}
function dayRows(S,date){
  const sch=S.sched[date], final=!!sch&&sch.status==='final', dt=dayType(S,date), rows=[];
  for(const t of S.team){
    const av=getAvail(S,date,t.id), e=(S.hrs[date]||{})[t.id]||{};
    const day=[],on=[];
    if(sch) for(const d of (S.duties[date]||[])) for(const k of slotKeys(d)){ const v=sch.a[k]; if(v&&v.id===t.id&&slotState(S,date,k).state!=='conflict') (d.shift==='DAY'?day:on).push(d); }
    const leave=isLeave(av)?av.reason:null;
    const r={t,leave,dt,prov:!final,site:'',act:'',codes:'',hasDay:false,hasOn:false,out:null,call:0,n:0,s:0,d:0,corr:!!e.corr,add:!!e.add,off:av.status==='unavailable'&&!leave};
    if(leave){ rows.push(r); continue; }
    r.hasDay=day.length>0||!!e.add; r.hasOn=on.length>0;
    r.site=[...day,...on].map(dutyName).filter((x,i,A)=>A.indexOf(x)===i).join(' + ');
    r.act=[...day,...on].map(d=>d.act).filter(Boolean).join(' / ');
    r.codes=[...day,...on].map(d=>d.code||'').join(' / ');
    if(r.hasDay){ r.out=e.out||stdOut(t.grp,dt); }
    r.call=r.hasOn?(e.call||0):0;
    if(r.hasDay||r.call){ const c=calc(t.grp,dt,r.hasDay?r.out:'07:30',r.call); r.n=c.n;r.s=c.s;r.d=c.d; }
    rows.push(r);
  }
  return rows;
}
function cycleStart(date){ const [y,m,d]=date.split('-').map(Number); return d>=25?`${y}-${pad(m)}-25`:ymd(new Date(y,m-2,25)); }
function cycleEnd(start){ const [y,m]=start.split('-').map(Number); return ymd(new Date(y,m,24)); }
const shiftCycle=(start,n)=>{ const [y,m]=start.split('-').map(Number); return ymd(new Date(y,m-1+n,25)); };
function cycleDates(start){ const end=cycleEnd(start),o=[]; let d=start; while(d<=end){o.push(d);d=addDays(d,1);} return o; }
function timesheet(S,start,today){
  const dates=cycleDates(start), res=S.team.map(t=>({t,n:0,s:0,d:0,leaveDays:0,missing:0,corr:0,partner:0,unfinal:0,days:[],expected:t.grp==='SA'?190:197.5}));
  for(const date of dates){
    const rows=dayRows(S,date), sch=S.sched[date], final=sch&&sch.status==='final', dt=dayType(S,date);
    rows.forEach((r,i)=>{ const R=res[i]; const counted=final||r.add||((S.hrs[date]||{})[r.t.id]||{}).out;
      if(r.leave){ R.leaveDays++; R.days.push({date,r,leave:true}); return; }
      if(sch&&!final&&(r.hasDay||r.hasOn)) R.unfinal++;
      if(counted&&(r.hasDay||r.call)){ R.n+=r.n;R.s+=r.s;R.d+=r.d; if(r.corr)R.corr++; R.days.push({date,r}); return; }
      const w=dow(date); const work=!(w===5||(r.t.grp==='SA'&&w===6))&&dt!=='holiday'&&!r.off;
      if(work&&date<=today&&!final&&!sch) R.missing++;
    });
  }
  for(const R of res){ R.n=r2(R.n);R.s=r2(R.s);R.d=r2(R.d); const daily=R.t.grp==='SA'?9.5:8.5; R.leaveH=R.leaveDays*daily; R.adj=R.expected-R.leaveH; R.short=Math.max(0,r2(R.adj-R.n)); }
  return res;
}

/* ---------- image rows ---------- */
function imageRows(S,date){
  const sch=S.sched[date], rows=[];
  for(const d of (S.duties[date]||[])){
    const ids=slotKeys(d).map(k=>sch&&sch.a[k]&&slotState(S,date,k).state==='ok'?sch.a[k].id:null);
    const names=ids.map(i=>i?tech(S,i).name:null), key=ids.map(i=>i||'?').sort().join(',');
    const line={site:[d.code,d.site].filter(Boolean).join(' ')+(d.loc?' - '+d.loc:''),act:d.act||'',oncall:d.shift==='ONCALL'};
    let row=rows.find(r=>r.key===key&&!ids.includes(null));
    if(row) row.lines.push(line);
    else rows.push({key,names,lines:[line]});
  }
  return rows;
}

/* ---------- zip / xlsx ---------- */
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const utf8=s=>new TextEncoder().encode(s);
function zip(files){
  const parts=[],cen=[];let off=0;
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  for(const f of files){ const nm=utf8(f.name),c=crc32(f.data),sz=f.data.length;
    const lh=Uint8Array.from([0x50,0x4b,3,4,20,0,0,0x08,0,0,0,0,0x21,0,...u32(c),...u32(sz),...u32(sz),...u16(nm.length),0,0]);
    parts.push(lh,nm,f.data);
    cen.push(Uint8Array.from([0x50,0x4b,1,2,20,0,20,0,0,0x08,0,0,0,0,0x21,0,...u32(c),...u32(sz),...u32(sz),...u16(nm.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off)]),nm);
    off+=lh.length+nm.length+sz; }
  const cs=cen.reduce((a,b)=>a+b.length,0);
  const end=Uint8Array.from([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cs),...u32(off),0,0]);
  const all=[...parts,...cen,end],tot=all.reduce((a,b)=>a+b.length,0),out=new Uint8Array(tot);let p=0;for(const b of all){out.set(b,p);p+=b.length;}return out;
}
const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colL=i=>String.fromCharCode(65+i);
/* cell: string | number | {v,f,s} ; style: 0 plain,1 bold,2 border,3 border+yellow,4 border+orange,5 border+bold */
function xlsx(rows,widths){
  let sd='';
  rows.forEach((row,ri)=>{ let cs=''; row.forEach((c,ci)=>{ if(c===null||c===undefined)return; if(c===''&&true)return; const o=(typeof c==='object')?c:{v:c}, ref=colL(ci)+(ri+1), s=o.s?` s="${o.s}"`:'';
      if(o.f) cs+=`<c r="${ref}"${s}><f>${xe(o.f)}</f><v>${o.v===undefined?0:o.v}</v></c>`;
      else if(o.v===''){ if(o.s) cs+=`<c r="${ref}"${s}/>`; }
      else if(typeof o.v==='number') cs+=`<c r="${ref}"${s}><v>${o.v}</v></c>`;
      else cs+=`<c r="${ref}"${s} t="inlineStr"><is><t>${xe(o.v)}</t></is></c>`; });
    sd+=`<row r="${ri+1}">${cs}</row>`; });
  // styled blanks (yellow) need explicit cells
  const cols=(widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${sd}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" paperSize="9"/><headerFooter><oddFooter>&amp;CPage &amp;P of &amp;N</oddFooter></headerFooter></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC000"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files=[
   ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
   ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
   ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`],
   ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
   ['xl/styles.xml',styles],['xl/worksheets/sheet1.xml',sheet]].map(([name,x])=>({name,data:utf8(x)}));
  return zip(files);
}
function timesheetXlsx(S,R,start){
  const end=cycleEnd(start), up=s=>String(s||'').toUpperCase();
  const rows=[[],[null,{v:'GSSC TIMESHEET',s:1}],[null,{v:'NAME',s:1},up(R.t.name),{v:'EMP NO',s:1},R.t.emp||''],[null,{v:'CYCLE',s:1},fmt(start)+' TO '+fmt(end)],[],
    [null,...['DATE','DAY','SITE / ACTIVITY','AMC/GMC NO','TIME IN','TIME OUT','NORMAL','SINGLE OT','DOUBLE OT','REMARK'].map(v=>({v,s:5}))]];
  const first=rows.length+1;
  for(const x of R.days){ const r=x.r, c=r.corr?4:2;
    if(x.leave){ rows.push([null,{v:fmt(x.date),s:2},{v:up(WD[dow(x.date)]),s:2},{v:up(LEAVE[r.leave]),s:2},{v:'',s:2},{v:'',s:2},{v:'',s:2},{v:0,s:2},{v:0,s:2},{v:0,s:2},{v:'UNPAID',s:2}]); continue; }
    const code=r.codes.replace(/[ /]/g,'')?r.codes:'';
    rows.push([null,{v:fmt(x.date),s:2},{v:up(WD[dow(x.date)]),s:2},{v:up((r.site+(r.act?' - '+r.act:''))),s:c},{v:up(code),s:code?c:3},{v:r.hasDay?'07:30':'19:00',s:c},{v:r.hasDay?r.out:(r.call?toS(19+r.call):''),s:c},{v:r.n,s:c},{v:r.s,s:c},{v:r.d,s:c},{v:r.corr?'CORRECTED':(r.prov?'PROVISIONAL':''),s:c}]); }
  const last=rows.length, L=['H','I','J'], tot=[null,{v:'TOTAL',s:5},{v:'',s:5},{v:'',s:5},{v:'',s:5},{v:'',s:5},{v:'',s:5}];
  const vals=[R.n,R.s,R.d]; L.forEach((c,i)=>tot.push({f:`SUM(${c}${first}:${c}${Math.max(last,first)})`,v:vals[i],s:5}));
  rows.push(tot);
  rows.push([],[null,{v:'EXPECTED NORMAL',s:1},R.expected],[null,{v:'LEAVE DAYS',s:1},R.leaveDays],[null,{v:'SHORT BY (H)',s:1},R.short]);
  return xlsx(rows,[3,12,12,38,14,9,9,10,10,10,14]);
}

/* ---------- AMC/GMC list import ---------- */
function parseCSV(t){ t=t.replace(/^﻿/,''); const first=t.split(/\r?\n/)[0]||''; const delim=[',',';','\t'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0]; const rows=[];let row=[],f='',q=false;
  for(let i=0;i<t.length;i++){ const c=t[i]; if(q){ if(c==='"'){ if(t[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; } else if(c==='"') q=true; else if(c===delim){row.push(f);f='';} else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n')i++; row.push(f);f='';rows.push(row);row=[]; } else f+=c; }
  if(f||row.length){row.push(f);rows.push(row);} return rows; }
async function inflateRaw(u8){ const ds=new DecompressionStream('deflate-raw'), w=ds.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
async function unzipAll(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); let e=bytes.length-22; while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--; if(e<0) throw new Error('Not an .xlsx file');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const out={};
  for(let i=0;i<n;i++){ const method=dv.getUint16(p+10,true), csz=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(bytes.subarray(p+46,p+46+nl)); const lnl=dv.getUint16(lho+26,true), lel=dv.getUint16(lho+28,true), st=lho+30+lnl+lel; out[name]={method,data:bytes.subarray(st,st+csz)}; p+=46+nl+el+cl; }
  return out; }
const unent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(m,d)=>String.fromCharCode(+d)).replace(/&amp;/g,'&');
const tOf=x=>{ let o='',m,re=/<t[^>]*>([\s\S]*?)<\/t>/g; while((m=re.exec(x)))o+=m[1]; return unent(o); };
async function readXlsx(bytes){
  const z=await unzipAll(bytes); const get=async n=>{ const f=z[n]; if(!f)return null; const u=f.method===0?f.data:await inflateRaw(f.data); return new TextDecoder().decode(u); };
  const ss=[]; const sx=await get('xl/sharedStrings.xml'); if(sx){ let m,re=/<si[^>]*>([\s\S]*?)<\/si>/g; while((m=re.exec(sx))) ss.push(tOf(m[1])); }
  let best=[]; for(const name of Object.keys(z).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n))){
    const x=await get(name), rows=[]; let rm,rre=/<row\b[^>]*>([\s\S]*?)<\/row>/g;
    while((rm=rre.exec(x))){ const row=[]; let cm,cre=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      while((cm=cre.exec(rm[1]))){ const at=cm[1], body=cm[2]||''; const r=/r="([A-Z]+)\d+"/.exec(at); if(!r)continue; let ci=0; for(const ch of r[1]) ci=ci*26+ch.charCodeAt(0)-64; ci--;
        const t=(/t="(\w+)"/.exec(at)||[])[1]; let v=''; if(t==='inlineStr') v=tOf(body); else { const vm=/<v>([\s\S]*?)<\/v>/.exec(body); v=vm?unent(vm[1]):''; if(t==='s') v=ss[+v]||''; }
        row[ci]=String(v).trim(); }
      rows.push(Array.from(row,x=>x||'')); }
    if(rows.length>best.length) best=rows; }
  return best; }
function tableFromRows(rows){
  let hi=0; for(let i=0;i<Math.min(10,rows.length);i++){ if(rows[i].filter(c=>c&&isNaN(+c)).length>=2){hi=i;break;} }
  const header=(rows[hi]||[]).map(x=>String(x||'')), body=rows.slice(hi+1).filter(r=>r.some(c=>String(c||'').trim()));
  return {header,body}; }
function guessMap(h){
  const L=h.map(x=>x.toLowerCase()), used=new Set(), pick=re=>{ const i=L.findIndex((x,i)=>!used.has(i)&&re.test(x)); if(i>=0)used.add(i); return i; };
  const code=pick(/amc|gmc|contract|job|code|ref|p800|^no\b|number|^#/), site=pick(/site|client|customer|project|company|name|building/), loc=pick(/location|area|city|address|zone/), act=pick(/activity|system|scope|service|type|work/), crew=pick(/crew|tech|man|people/), shift=pick(/shift/);
  return {code,site,loc,act,crew,shift}; }
function libFromTable(tbl,map,defCrew){
  const g=(r,i)=>i>=0?String(r[i]||'').trim():'', out=[];
  for(const r of tbl.body){ const code=g(r,map.code), site=g(r,map.site); if(!code&&!site)continue; let crew=parseInt(g(r,map.crew)); if(!(crew>=1&&crew<=3)) crew=defCrew||2; const sh=g(r,map.shift).toLowerCase();
    out.push({code,site,loc:g(r,map.loc),act:g(r,map.act),shift:/call|night/.test(sh)?'ONCALL':'DAY',crew}); }
  return out; }
function mergeLib(lib,list,replace){
  if(replace) return list.slice();
  const out=lib.slice(); let added=0;
  for(const n of list){ const k=out.findIndex(o=>(n.code&&o.code===n.code&&o.site===n.site)||(!n.code&&o.site===n.site&&o.act===n.act&&o.shift===n.shift));
    if(k<0){ out.push(n); added++; } else if(!out[k].code&&n.code) out[k].code=n.code; }
  out.added=added; return out; }
function codeFor(S,site){ if(!site)return ''; const m=S.lib.find(l=>l.site&&l.site.toLowerCase()===site.toLowerCase()&&l.code); return m?m.code:''; }

root.DL={parseCSV,readXlsx,tableFromRows,guessMap,libFromTable,mergeLib,codeFor,pad,ymd,parse,addDays,fmt,dow,WD,LEAVE,REASONS,seed,tech,autoType,dayType,getAvail,defaultAvail,isLeave,slotKeys,dutyOf,dutyName,elig,recent,slotState,counts,generate,candidates,assign,removeSlot,finalize,reopen,stdOut,calc,toH,toS,dayRows,cycleStart,cycleEnd,shiftCycle,cycleDates,timesheet,imageRows,zip,xlsx,timesheetXlsx,utf8};
if(typeof module!=='undefined')module.exports=root.DL;
})(typeof window!=='undefined'?window:globalThis);
