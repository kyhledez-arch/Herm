import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const base='http://127.0.0.1:3000';
const r0=await fetch(`${base}/api/workspace`); const cookie=r0.headers.get('set-cookie').split(';')[0];
const req=async(p,m='GET',b,exp=200)=>{const r=await fetch(base+p,{method:m,headers:{Cookie:cookie,...(b instanceof FormData?{}:{'Content-Type':'application/json'})},...(b===undefined?{}:{body:b instanceof FormData?b:JSON.stringify(b)})});const j=await r.json();assert.equal(r.status,exp,`${m} ${p}: ${j.error||'ok'}`);return j;};
const pdf=await PDFDocument.create();const page=pdf.addPage([612,792]);const font=await pdf.embedFont(StandardFonts.Helvetica);
const content=`CONSUMER CREDIT REPORT
Consumer Name: Jamie Example Rivera
Employer: Northwind Logistics
Telephone: (555) 214-8890
Current Address
1428 Maplewood Avenue, Apt 4
Columbus, OH 43215
ACCOUNTS
Capital One ................ Account ending 4832 ... $1,240
Portfolio Recovery ........ Account ending 9017 ... $310
Discover .............. Account ending 2290 ... $880
INQUIRIES
02/14/2026  Synchrony Bank`;
let y=740;for(const l of content.split('\n')){page.drawText(l,{x:50,y,size:10,font});y-=16;}
const bytes=Buffer.from(await pdf.save());
const form=new FormData();form.set('file',new File([bytes],'My redacted credit report.pdf',{type:'application/pdf'}));form.set('kind','report');form.set('bureau','transunion');form.set('redacted','true');
const uploaded=await req('/api/documents','POST',form,201);const doc=uploaded.documents.find(d=>d.name==='My redacted credit report.pdf');
const parsed=await req(`/api/documents/${doc.id}/items`,'POST',{},200);
const items=parsed.items;
const kinds={};for(const i of items)kinds[i.kind]=(kinds[i.kind]??0)+1;
console.log('DETECTED',parsed.detected,JSON.stringify(kinds));
assert.ok(items.length>=8,`expected >=8 items, got ${items.length}`);
for (const [kind,re] of [['account',/Capital One/],['phone',/214-8890/],['employer',/Northwind/],['address',/Columbus, OH/],['name',/Rivera/],['inquiry',/Synchrony/]]) assert.ok(items.some(i=>i.kind===kind&&re.test(i.label)),`missing ${kind}`);
await req('/api/disputes/from-items','POST',{itemIds:[],bureaus:['transunion'],reviewed:true,confirmed:true},400);
await req('/api/disputes/from-items','POST',{itemIds:[items[0].id],bureaus:[],reviewed:true,confirmed:true},400);
await req('/api/disputes/from-items','POST',{itemIds:[items[0].id],bureaus:['transunion'],reviewed:false,confirmed:true},400);
await req('/api/disputes/from-items','POST',{itemIds:[items[0].id],bureaus:['transunion'],reviewed:true,confirmed:false},400);
const r2=await fetch(`${base}/api/workspace`);const other=r2.headers.get('set-cookie').split(';')[0];
assert.equal((await fetch(`${base}/api/documents/${doc.id}/items`,{headers:{Cookie:other}})).status,404);
const picks=[items.find(i=>i.kind==='account'),items.find(i=>i.kind==='phone')];
const created=await req('/api/disputes/from-items','POST',{itemIds:picks.map(i=>i.id),bureaus:['transunion','equifax'],submissionMethod:'mail',reviewed:true,confirmed:true},201);
assert.equal(created.createdIds.length,4);
const draft=created.disputes.find(d=>d.id===created.createdIds[0]);
assert.equal(draft.submissionMethod,'mail');assert.equal(draft.status,'draft');
console.log('Sample draft creditor:',draft.creditor,'| category:',draft.category);
await req('/api/disputes/from-items','POST',{itemIds:picks.map(i=>i.id),bureaus:['datax'],submissionMethod:'online',reviewed:true,confirmed:true},400);
console.log('PASS: item detection across all six kinds, privacy isolation, validation rejections, and multi-item multi-bureau draft creation.');
