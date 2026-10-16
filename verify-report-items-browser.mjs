import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const base='http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pdf=await PDFDocument.create();const page1=pdf.addPage([612,792]);const font=await pdf.embedFont(StandardFonts.Helvetica);
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
 let y=740;for(const l of content.split('\n')){page1.drawText(l,{x:50,y,size:10,font});y-=16;}
 const bytes=Buffer.from(await pdf.save());
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.recent-disputes');
 await page.locator('.sidebar .nav-item').filter({hasText:'Credit reports'}).click();await page.waitForSelector('.report-card');
 await page.getByRole('button',{name:'Upload report',exact:true}).click();await page.waitForSelector('#upload-file');
await page.locator('#upload-bureau').selectOption('transunion');
 await page.locator('#upload-file').setInputFiles({name:'UI selection report.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.locator('.check-label input').check();await page.getByRole('button',{name:'Upload document',exact:true}).click();
 await page.waitForSelector('.report-review-drawer');
 const toolbarText=await page.locator('.report-review-toolbar').innerText();
assert.ok(/\d+ selected/.test(toolbarText),`toolbar: ${toolbarText}`);
 await page.screenshot({path:'artifacts/report-item-selection.png',fullPage:true});
 const groupCount=await page.locator('.report-item-group').count();assert.ok(groupCount>=2,`groups: ${groupCount}`);
 // select all accounts group
 await page.locator('.report-group-select').first().click();
 const selectedCount=await page.evaluate(()=>document.querySelector('.report-review-toolbar span')?.textContent);
 assert.notEqual(selectedCount,'0 selected');
 // per-item dispute button for a phone number
 await page.locator('.report-item-row').filter({hasText:'214-8890'}).getByRole('button',{name:'Dispute'}).click();
 await page.waitForSelector('.report-confirm');
 assert.ok((await page.locator('.report-confirm-summary').innerText()).includes('214-8890'));
 await page.getByRole('button',{name:'Back to items'}).click();
 // select two items then confirm
 await page.locator('.report-item-row').filter({hasText:'Capital One'}).locator('input[type=checkbox]').check();
 await page.locator('.report-item-row').filter({hasText:'214-8890'}).locator('input[type=checkbox]').check();
 await page.getByRole('button',{name:'Dispute selected',exact:true}).click();await page.waitForSelector('.report-confirm');
 await page.locator('.bureau-choice').first().click();await page.locator('.bureau-choice').nth(1).click();
 await page.locator('#report-review-confirm').check();await page.locator('#report-truth-confirm').check();
 await page.screenshot({path:'artifacts/report-item-confirm.png'});
 await page.getByRole('button',{name:/Create 4 drafts/}).click();
 await page.waitForSelector('.modal-paper--drawer');
 assert.ok((await page.locator('.modal-header h2').innerText()).length>0);
 await page.screenshot({path:'artifacts/report-item-draft.png'});
 await page.getByRole('button',{name:'Close dialog'}).click();
 await page.locator('.sidebar .nav-item').filter({hasText:'My disputes'}).click();
 const rows=await page.locator('.dispute-table tbody tr').count();assert.ok(rows>=4,`draft rows: ${rows}`);
 // documents panel entry point
 await page.locator('.sidebar .nav-item').filter({hasText:'Documents'}).click();await page.waitForSelector('.documents-table');
 assert.ok((await page.locator('.document-review-link').first().innerText()).includes('Select items'));
 await page.locator('.document-review-link').first().click();await page.waitForSelector('.report-review-drawer');
 assert.deepEqual(errors,[]);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(`${base}/?view=reports`,{waitUntil:'networkidle'});await phone.waitForSelector('.report-card');
 await phone.locator('.report-card').first().getByRole('button',{name:/Add updated report|Upload a report/}).first().click();
 await phone.waitForSelector('#upload-file');await phone.locator('#upload-bureau').selectOption('transunion');
 await phone.locator('#upload-file').setInputFiles({name:'Mobile report.pdf',mimeType:'application/pdf',buffer:bytes});
 await phone.locator('.check-label input').check();await phone.getByRole('button',{name:'Upload document',exact:true}).click();
 await phone.waitForSelector('.report-review-drawer',{timeout:20000});
 assert.equal(await phone.evaluate(()=>document.body.scrollWidth),390);
 await phone.screenshot({path:'artifacts/report-item-selection-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await mobile.close();
 console.log('PASS: post-upload review drawer, grouped item selection, per-item dispute, select-all group, multi-bureau confirm, draft creation, tracker rows, documents entry point, desktop/mobile layouts.');
} finally { await browser.close(); }
