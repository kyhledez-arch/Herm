import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const base='http://127.0.0.1:3000';
const session=async()=>{const r=await fetch(`${base}/api/workspace`);return r.headers.get('set-cookie').split(';')[0];};
const rawReq=async(cookie,p,m='GET',b,exp=200)=>{const r=await fetch(base+p,{method:m,headers:{Cookie:cookie,...(b instanceof FormData?{}:{'Content-Type':'application/json'})},...(b===undefined?{}:{body:b instanceof FormData?b:JSON.stringify(b)})});const j=await r.json();assert.equal(r.status,exp,`${m} ${p}: ${j.error||'ok'}`);return j;};
const cookie=await session();
const req=(p,m,b,exp)=>rawReq(cookie,p,m,b,exp);
const makePdf=async lines=>{const pdf=await PDFDocument.create();const page=pdf.addPage([612,792]);const font=await pdf.embedFont(StandardFonts.Helvetica);let y=740;for(const l of lines){page.drawText(l,{x:50,y,size:10,font});y-=16;}return Buffer.from(await pdf.save());};
// Same creditor, different balances/statuses across bureaus + a bureau-only account
const upload=async(bureau,balance,status,extra=[])=>{const lines=['ACCOUNTS',`Capital One Bank ........ Account ending 4832 ... ${balance}`,`Status: ${status}`,...extra];const f=new FormData();f.set('file',new File([await makePdf(lines)],`${bureau} compare.pdf`,{type:'application/pdf'}));f.set('kind','report');f.set('bureau',bureau);f.set('redacted','true');const r=await req('/api/documents','POST',f,201);const doc=r.documents.find(d=>d.name===`${bureau} compare.pdf`);await req(`/api/documents/${doc.id}/items`,'POST',{},200);return r;};
await upload('experian','$1,240.00','current');
await upload('equifax','$840.00','current');
await upload('transunion','$840.00','charged off');
await upload('innovis','$840.00','current',['Regional Credit Union ...... Account ending 5510 ... $220']);
const compare=await req('/api/compare');
console.log('BUREAUS WITH REPORTS:',compare.summary.bureausWithReports.join(', '));
console.log('GROUPS:',compare.groups.length,'| conflicts:',compare.summary.conflicts,'| single:',compare.summary.single,'| consistent:',compare.summary.consistent,'| partial:',compare.summary.partial);
// Experian+Equifax+TransUnion+Innovis all report Capital One → 1 group, balance conflicts (1240 vs 840 vs 840 vs 840)
const capital=compare.groups.find(g=>/Capital One/i.test(g.label));
assert.ok(capital,'Capital One group missing');
assert.equal(capital.presentAt.length,4,'Capital One should match across all 4 bureaus');
assert.ok(capital.differences.some(d=>d.field==='balance'),'balance conflict not detected');
assert.equal(capital.severity,'conflict');
console.log('Capital One balance values:',JSON.stringify(capital.differences.find(d=>d.field==='balance')?.values));
// Innovis-only account
const regional=compare.groups.find(g=>/Regional Credit/i.test(g.label));
assert.ok(regional,'Regional Credit Union group missing');
assert.equal(regional.presentAt.length,1);
assert.equal(regional.severity,'single');
// Dispute creation requires correctValue
const capitalIds=['experian','equifax'].map(b=>capital.byBureau[b].id);
await req('/api/disputes/from-compare','POST',{itemIds:capitalIds,bureaus:['experian','equifax'],correctValue:'',reviewed:true,confirmed:true},400);
await req('/api/disputes/from-compare','POST',{itemIds:capitalIds,bureaus:['experian'],correctValue:'My statement shows $840',reviewed:false,confirmed:true},400);
// Cannot dispute a bureau where the item is not reported
await req('/api/disputes/from-compare','POST',{itemIds:capitalIds,bureaus:['innovis'],correctValue:'My statement shows $840',reviewed:true,confirmed:true},400);
// Cannot dispute an absent bureau from the Regional group
await req('/api/disputes/from-compare','POST',{itemIds:[regional.byBureau['innovis'].id],bureaus:['equifax'],correctValue:'My statement shows $840',reviewed:true,confirmed:true},400);
// Valid creation
const created=await req('/api/disputes/from-compare','POST',{itemIds:capitalIds,bureaus:['experian','equifax'],submissionMethod:'mail',correctValue:'My March statement shows a balance of $840.00 with a current status.',reviewed:true,confirmed:true},201);
assert.equal(created.createdIds.length,2);
const draft=created.disputes.find(d=>d.id===created.createdIds[0]);
assert.equal(draft.reason,'Incorrect account balance');
assert.ok(draft.details.includes('My March statement shows'));
console.log('Draft reason:',draft.reason,'| bureau:',draft.bureau);
// Cross-workspace privacy
const other=await session();
assert.equal((await fetch(`${base}/api/compare`,{headers:{Cookie:other}})).status,200);
const empty=await (await fetch(`${base}/api/compare`,{headers:{Cookie:other}})).json();
assert.equal(empty.summary.totalAccounts,0);
console.log('PASS: cross-bureau grouping, balance conflict detection, single-bureau detection, correctValue requirement, absent-bureau rejection, and draft creation.');
