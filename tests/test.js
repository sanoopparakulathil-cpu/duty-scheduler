const D=require('../logic.js'),assert=require('assert');
const S=D.seed(), date='2026-10-26'; // Monday
const mk=(id,site,shift,crew)=>({id,code:'',site,loc:'X',act:'AMC',shift,crew});
S.duties[date]=[mk('d1','Spark','DAY',2),mk('d2','TSSP','DAY',2),mk('d3','Kanoo','DAY',2),mk('d4','Henkel','DAY',2),mk('d5','Jotun','DAY',2),
 mk('d6','MEBCO','DAY',1),mk('d7','Masco','DAY',1),mk('d8','Tabuk','DAY',1),mk('d9','Sanoop site','DAY',1),mk('d10','Synthomer','ONCALL',2)];
S.avail[date]={laxman:{status:'unavailable',day:false,oncall:false,reason:'vacation'}};
let c=D.generate(S,date); console.log(c);
assert.equal(c.total,16); assert.equal(c.unfilled,0); assert.equal(c.conflicts,0);
// no double in same shift
const seen={}; for(const k in S.sched[date].a){const d=D.dutyOf(S,date,k);const key=S.sched[date].a[k].id+d.shift;assert(!seen[key],'dup '+key);seen[key]=1;}
// pairs together
for(const d of S.duties[date]) if(d.crew==2){const [a,b]=D.slotKeys(d).map(k=>S.sched[date].a[k].id);assert.equal(D.tech(S,a).partner,b,d.site+' '+a+' '+b);}
console.log(S.duties[date].map(d=>d.site+': '+D.slotKeys(d).map(k=>S.sched[date].a[k].id)).join('\n'));
// sick -> conflict
const bader=Object.entries(S.sched[date].a).find(([k,v])=>v.id==='bader'); 
if(bader){S.avail[date].bader={status:'unavailable',day:false,oncall:false,reason:'medical'}; assert.equal(D.counts(S,date).conflicts,1); console.log('conflict ok', D.candidates(S,date,bader[0]).slice(0,4).map(x=>x.name+':'+x.cat));}
assert(D.finalize(S,date)); S.avail[date].bader={status:'available',day:true,oncall:true}; assert.equal(D.finalize(S,date),null);
// friday/saturday defaults
assert.equal(D.getAvail(S,'2026-10-30','sanoop').status,'unavailable'); assert.equal(D.getAvail(S,'2026-10-31','bader').status,'unavailable'); assert.equal(D.getAvail(S,'2026-10-31','umer').status,'available');
// hours
assert.deepEqual(D.calc('NS','normal','16:30',0),{n:8.5,s:0,d:0});
assert.deepEqual(D.calc('NS','normal','18:30',0),{n:8.5,s:2,d:0});
assert.deepEqual(D.calc('SA','normal','17:30',0),{n:9.5,s:0,d:0});
assert.deepEqual(D.calc('NS','saturday','13:00',0),{n:5.5,s:0,d:0});
assert.deepEqual(D.calc('NS','saturday','15:00',0),{n:5.5,s:2,d:0});
assert.deepEqual(D.calc('NS','friday','15:30',0),{n:0,s:0,d:8});
assert.deepEqual(D.calc('NS','normal','16:30',3),{n:8.5,s:0,d:3});
const rows=D.dayRows(S,date); const sa=rows.find(r=>r.t.id==='sakthivel'); console.log(sa.site,sa.n,sa.s,sa.d,sa.prov);
// image rows
console.log(JSON.stringify(D.imageRows(S,date).map(r=>r.names.join(',')+' | '+r.lines.map(l=>l.site).join(' ; '))));
// cycle
assert.equal(D.cycleStart('2026-10-26'),'2026-10-25'); assert.equal(D.cycleStart('2026-10-24'),'2026-09-25'); assert.equal(D.cycleEnd('2026-09-25'),'2026-10-24'); assert.equal(D.cycleDates('2026-09-25').length,30);
const ts=D.timesheet(S,'2026-10-25','2026-10-28'); const R=ts.find(x=>x.t.id==='sakthivel'); console.log(R.n,R.s,R.d,R.short);
const x=D.timesheetXlsx(S,R,'2026-10-25'); require('fs').writeFileSync('/tmp/t.xlsx',x);
const z=D.zip([{name:'a.txt',data:D.utf8('hello')}]); require('fs').writeFileSync('/tmp/t.zip',z);
console.log('ALL OK');
(async()=>{ const fs=require('fs');
 const rows=await D.readXlsx(new Uint8Array(fs.readFileSync('/tmp/amc.xlsx'))); const t=D.tableFromRows(rows); const m=D.guessMap(t.header);
 console.log(t.header,m); const lib=D.libFromTable(t,m,2); console.log(lib);
 assert.equal(lib.length,3); assert.equal(lib[1].code,'70044'); assert.equal(lib[0].site,'Spark Logistics'); assert.equal(m.code,1);
 const c=D.tableFromRows(D.parseCSV(fs.readFileSync('/tmp/amc.csv','utf8'))); const l2=D.libFromTable(c,D.guessMap(c.header),2); assert.equal(l2[0].site,'Starlink, Riyadh'); assert.equal(l2[0].code,'80016');
 const S2=D.seed(); const merged=D.mergeLib(S2.lib,lib); console.log('merged',merged.length,merged.added);
 console.log('IMPORT OK'); })().catch(e=>{console.error(e);process.exit(1)});
