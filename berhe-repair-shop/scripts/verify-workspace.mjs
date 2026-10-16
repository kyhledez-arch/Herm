import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function session() {
  const response = await fetch(`${base}/api/workspace`);
  assert.equal(response.status, 200);
  const data = await response.json();
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'A private workspace session is created');
  assert.equal(data.disputes.length, 5);
  return { cookie, data };
}
async function request(cookie, path, method = 'GET', body, expected = 200, headers = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result.error || 'ok')}`);
  return result;
}
const first = await session();
const other = await session();
assert.notEqual(first.data.workspace.id, other.data.workspace.id, 'Workspaces are isolated');
const cookie = first.cookie;
const input = { bureaus: ['experian', 'equifax', 'transunion', 'innovis'], creditor: 'Example Credit Union', accountLast4: '1234', category: 'Account information', reason: 'Incorrect account balance', details: 'This is a fictional test. My statement shows a balance of $250, while the sample report shows $450. Please investigate and correct the balance.', requestedAction: 'Correct the inaccurate information', confirmed: true };
await request(cookie, '/api/disputes', 'POST', { ...input, confirmed: false }, 400);
const created = await request(cookie, '/api/disputes', 'POST', input, 201);
assert.equal(created.createdIds.length, 4);
assert.equal(created.disputes.length, 9);
const id = created.createdIds[0];
await request(other.cookie, `/api/disputes/${id}`, 'PATCH', { status: 'resolved' }, 404);
await request(cookie, `/api/disputes/${id}`, 'PATCH', { status: 'resolved' }, 403, { Origin: 'https://untrusted.example' });
const updated = await request(cookie, `/api/disputes/${id}`, 'PATCH', { action: 'edit', creditor: input.creditor, accountLast4: '1234', category: input.category, reason: input.reason, requestedAction: input.requestedAction, details: `${input.details} Additional fictional test evidence is available.` });
assert.ok(updated.disputes.find(d => d.id === id).details.includes('Additional fictional'));
const letter = await fetch(`${base}/api/disputes/${id}/letter`, { headers: { Cookie: cookie } });
assert.equal(letter.status, 200);
assert.equal(letter.headers.get('content-type'), 'application/pdf');
assert.ok(Buffer.from(await letter.arrayBuffer()).subarray(0, 5).toString() === '%PDF-');
await request(cookie, `/api/disputes/${id}`, 'PATCH', { status: 'in_review' }, 400);
const submitted = await request(cookie, `/api/disputes/${id}`, 'PATCH', { status: 'in_review', actualSubmissionConfirmed: true, submittedAt: new Date().toISOString().slice(0, 10), reference: 'FICTIONAL-TEST-001' });
assert.ok(submitted.disputes.find(d => d.id === id).dueAt);
await request(cookie, `/api/disputes/${id}`, 'PATCH', { action: 'edit', ...input }, 400);
const resolved = await request(cookie, `/api/disputes/${id}`, 'PATCH', { status: 'resolved', resolution: 'Fictional test outcome: the balance was corrected.' });
assert.equal(resolved.disputes.find(d => d.id === id).status, 'resolved');
const pdf = await PDFDocument.create(); const page = pdf.addPage(); const font = await pdf.embedFont(StandardFonts.Helvetica); page.drawText('Fictional test evidence. No real account information.', { font });
const bytes = new Uint8Array(await pdf.save());
const form = new FormData(); form.set('file', new File([bytes], 'test-evidence.pdf', { type: 'application/pdf' })); form.set('kind', 'supporting'); form.set('bureau', 'experian'); form.set('disputeId', id); form.set('redacted', 'true');
const uploaded = await request(cookie, '/api/documents', 'POST', form, 201);
const doc = uploaded.documents.find(d => d.name === 'test-evidence.pdf'); assert.ok(doc);
const download = await fetch(`${base}/api/documents/${doc.id}`, { headers: { Cookie: cookie } }); assert.equal(download.status, 200); assert.deepEqual(new Uint8Array(await download.arrayBuffer()), bytes);
const forbidden = await fetch(`${base}/api/documents/${doc.id}`, { headers: { Cookie: other.cookie } }); assert.equal(forbidden.status, 404);
const anonymous = await fetch(`${base}/api/documents/${doc.id}`); assert.equal(anonymous.status, 401);
await request(cookie, `/api/documents/${doc.id}`, 'DELETE');
await request(cookie, `/api/disputes/${id}`, 'DELETE');
const profile = await request(cookie, '/api/workspace', 'PATCH', { name: 'Example Person', email: 'example@example.com', address: '123 Example Lane\nExample City, CA 90000' }); assert.equal(profile.workspace.name, 'Example Person');
const cleared = await request(cookie, '/api/workspace', 'DELETE', { confirm: 'START FRESH' }); assert.equal(cleared.disputes.length, 0); assert.equal(cleared.documents.length, 0); assert.equal(cleared.workspace.isDemo, false); assert.equal(cleared.workspace.name, 'Example Person');
console.log('PASS: isolated sessions, four-bureau drafts, validation, edit, PDF, submission tracking, response, document upload/download/privacy/delete, profile, and fresh start.');
