import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const base='http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const makePdf=async(balance,status)=>{const pdf=await PDFDocument.create();const p=pdf.addPage([612,792]);const f=await pdf.embedFont(StandardFonts.Helvetica);let y=740;for(const l of ['ACCOUNTS',`Capital One Bank ........ Account ending 4832 ... ${balance}`,`Status: ${status}`]){p.drawText(l,{x:50,y,size:10,font:f});y-=16;}return Buffer.from(await pdf.save());};
 const upload=async(bureau,bytes)=>{await page.getByRole('button',{name:'Upload report',exact:true}).click();await page.waitForSelector('#upload-file');await page.locator('#upload-bureau').selectOption(bureau);await page.locator('#upload-file').setInputFiles({name:`${bureau}.pdf`,mimeType:'application/pdf',buffer:bytes});await page.locator('.check-label input').check();await page.getByRole('button',{name:'Upload document',exact:true}).click();await page.waitForSelector('.report-review-drawer',{timeout:20000});await page.getByRole('button',{name:'Close dialog'}).click();await page.waitForFunction(()=>!document.querySelector('.modal-backdrop'));};
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.recent-disputes');
 await page.locator('.sidebar .nav-item').filter({hasText:'Credit reports'}).click();await page.waitForSelector('.report-card');
 await upload('experian',await makePdf('$1,240.00','current'));
 await upload('equifax',await makePdf('$840.00','current'));
 await upload('transunion',await makePdf('$840.00','charged off'));
 await page.locator('.sidebar .nav-item').filter({hasText:'Compare bureaus'}).click();await page.waitForSelector('.compare-table');
 assert.ok((await page.locator('.compare-coverage-card').count())===4);
 assert.ok((await page.locator('.compare-notice').innerText()).includes('not proof of an error'),'honest framing note missing');
 await page.screenshot({path:'artifacts/bureau-compare-desktop.png',fullPage:true});
 const conflictRow=page.locator('.compare-table tbody tr').filter({hasText:'Capital One'});
 assert.ok(await conflictRow.count()>=1,'Capital One row missing');
 assert.ok((await conflictRow.innerText()).includes('differ'),'conflict flag missing');
 // filter to conflicts only
 await page.locator('.compare-filters .pill-tabs button').filter({hasText:'Values differ'}).click();
 assert.ok(await page.locator('.compare-table tbody tr').count()>=1);
 await page.locator('.compare-filters .pill-tabs button').first().click();
 // open drawer
 await conflictRow.click();await page.waitForSelector('.compare-drawer');
 assert.ok((await page.locator('.compare-drawer-grid').innerText()).includes('Not reported by this bureau'),'missing-bureau text absent');
 await page.screenshot({path:'artifacts/bureau-compare-drawer.png'});
 // validation: no correct value
 await page.locator('#compare-review-confirm').check();await page.locator('#compare-truth-confirm').check();
 const createBtn=page.getByRole('button',{name:/Create \d+ drafts/});
 assert.ok(await createBtn.isDisabled(),'button should stay disabled until a correct value is entered');
 // fill and create for two bureaus
 await page.locator('#compare-correct').fill('My March statement shows a balance of $840.00 with a current status.');
 assert.ok(!(await createBtn.isDisabled()),'button should enable once a correct value is entered');
 await page.locator('.compare-bureau-picks .bureau-choice').first().click(); // deselect experian
 await createBtn.click();
 await page.waitForSelector('.modal-paper--drawer');await page.waitForTimeout(600);
 const header=await page.locator('.modal-header h2').first().innerText();
 assert.ok(header.length>0,'detail drawer did not open');
 await page.screenshot({path:'artifacts/bureau-compare-draft.png'});
 await page.getByRole('button',{name:'Close dialog'}).click();await page.waitForFunction(()=>!document.querySelector('.modal-backdrop'));
 await page.locator('.sidebar .nav-item').filter({hasText:'My disputes'}).click();
 assert.ok(await page.locator('.dispute-table tbody tr').count()>=1);
 assert.deepEqual(errors,[]);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(`${base}/?view=compare`,{waitUntil:'networkidle'});await phone.waitForSelector('.compare-coverage-card');
 assert.equal(await phone.evaluate(()=>document.body.scrollWidth),390);
 await phone.screenshot({path:'artifacts/bureau-compare-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await mobile.close();
 console.log('PASS: compare nav, coverage cards, honest framing, conflict matrix + flags, severity filter, conflict drawer, correct-value validation, draft creation, tracker, mobile layout.');
} finally { await browser.close(); }
