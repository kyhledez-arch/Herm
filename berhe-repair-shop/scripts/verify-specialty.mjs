import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
async function session() { const r = await fetch(`${base}/api/workspace`); assert.equal(r.status, 200); return { cookie: r.headers.get('set-cookie').split(';')[0], data: await r.json() }; }
async function req(cookie, path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
  const result = await response.json(); assert.equal(response.status, expected, `${method} ${path}: ${result.error || 'ok'}`); return result;
}
const first = await session(), other = await session();
const input = { creditor: 'Fictional Provider Test', accountLast4: '', category: 'Account information', reason: 'Other inaccurate information', details: 'Fictional test only: the reported information differs from my records. Please investigate the inaccurate entry using the relevant documentation and provide written results.', requestedAction: 'Correct the inaccurate information', confirmed: true };
const providers = [
  { id: 'earlywarning', method: 'mail', category: 'Checking / savings account history', title: 'Early Warning Banking Report Dispute', invalid: ['phone'] },
  { id: 'datax', method: 'mail', category: 'Alternative-finance account information', title: 'DataX Consumer Report Dispute', invalid: ['online', 'phone'] },
  { id: 'lexisnexis', method: 'phone', category: 'Consumer disclosure / insurance data', title: 'LexisNexis Consumer Report Dispute', invalid: ['online'] },
  { id: 'worknumber', method: 'online', category: 'Employment / income information', title: 'The Work Number Employment Data Dispute', invalid: [] },
];
const ids = {};
const evidence = await PDFDocument.create(); evidence.addPage(); const evidenceBytes = new Uint8Array(await evidence.save());
for (const provider of providers) {
  const created = await req(first.cookie, '/api/disputes', 'POST', { ...input, bureaus: [provider.id], category: provider.category }, 201); const id = created.createdIds[0]; ids[provider.id] = id;
  const row = created.disputes.find(d => d.id === id); assert.equal(row.bureau, provider.id); assert.equal(row.submissionMethod, provider.method); assert.equal(row.category, provider.category); assert.equal(row.status, 'draft');
  await req(other.cookie, `/api/disputes/${id}`, 'PATCH', { action: 'set_method', submissionMethod: 'mail' }, 404);
  for (const invalid of provider.invalid) {
    await req(first.cookie, '/api/disputes', 'POST', { ...input, bureaus: [provider.id], submissionMethod: invalid, category: provider.category }, 400);
    await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { action: 'set_method', submissionMethod: invalid }, 400);
    await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { action: 'edit', ...input, category: provider.category, submissionMethod: invalid }, 400);
    await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { status: 'in_review', submissionMethod: invalid, submittedAt: new Date().toISOString().slice(0, 10), actualSubmissionConfirmed: true }, 400);
  }
  const edited = await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { action: 'edit', ...input, category: provider.category, details: `${input.details} Additional fictional records have been reviewed.` }); assert.ok(edited.disputes.find(d => d.id === id).details.includes('Additional fictional'));
  const letter = await fetch(`${base}/api/disputes/${id}/letter`, { headers: { Cookie: first.cookie } }); assert.equal(letter.status, 200); const pdf = await PDFDocument.load(new Uint8Array(await letter.arrayBuffer())); assert.equal(pdf.getTitle(), provider.title);
  const privateLetter = await fetch(`${base}/api/disputes/${id}/letter`, { headers: { Cookie: other.cookie } }); assert.equal(privateLetter.status, 404);
  const form = new FormData(); form.set('file', new File([evidenceBytes], `${provider.id}-redacted-report.pdf`, { type: 'application/pdf' })); form.set('kind', 'report'); form.set('bureau', provider.id); form.set('redacted', 'true');
  const withReport = await req(first.cookie, '/api/documents', 'POST', form, 201); const doc = withReport.documents.find(d => d.name === `${provider.id}-redacted-report.pdf`); assert.equal(doc.bureau, provider.id);
  const supporting = new FormData(); supporting.set('file', new File([evidenceBytes], `${provider.id}-evidence.pdf`, { type: 'application/pdf' })); supporting.set('kind', 'supporting'); supporting.set('bureau', provider.id); supporting.set('disputeId', id); supporting.set('redacted', 'true');
  await req(other.cookie, '/api/documents', 'POST', supporting, 404); const withEvidence = await req(first.cookie, '/api/documents', 'POST', supporting, 201); assert.ok(withEvidence.documents.some(d => d.disputeId === id && d.bureau === provider.id));
}
const reloaded = await req(first.cookie, '/api/workspace'); for (const provider of providers) assert.equal(reloaded.disputes.find(d => d.id === ids[provider.id]).submissionMethod, provider.method);
await req(first.cookie, '/api/disputes', 'POST', { ...input, bureaus: providers.map(p => p.id), submissionMethod: 'online' }, 400);
const mixed = await req(first.cookie, '/api/disputes', 'POST', { ...input, bureaus: providers.map(p => p.id), submissionMethod: 'mail' }, 201); assert.equal(mixed.createdIds.length, 4);
const ago = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
for (const provider of providers) {
  const id = ids[provider.id]; await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { status: 'in_review', submittedAt: ago(2) }, 400);
  const submitted = await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { status: 'in_review', submittedAt: ago(2), actualSubmissionConfirmed: true, reference: `FICTIONAL-${provider.id}` }); const row = submitted.disputes.find(d => d.id === id);
  if (provider.method === 'mail') {
    assert.equal(row.dueAt, null); const delivered = await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { action: 'record_delivery', receivedAt: ago(1), receivedAtConfirmed: true }); const deliveredRow = delivered.disputes.find(d => d.id === id); assert.equal((new Date(deliveredRow.dueAt) - new Date(deliveredRow.receivedAt)) / 86400000, 30);
  } else assert.ok(row.dueAt);
  const resolved = await req(first.cookie, `/api/disputes/${id}`, 'PATCH', { status: 'resolved', resolution: 'Fictional provider result recorded for testing only.' }); assert.equal(resolved.disputes.find(d => d.id === id).status, 'resolved');
}
for (const issue of ['Inaccurate specialty consumer report information', 'Inaccurate employment or income report information']) {
  const complaint = { channel: 'cfpb', relatedDisputeId: ids[issue.includes('employment') ? 'worknumber' : 'datax'], company: 'Fictional Specialty Provider', issue, details: input.details, contactHistory: 'Fictional direct dispute sent previously.', desiredResolution: 'Correct inaccurate data and provide written results.', priorDisputeConfirmed: false, priorDisputeDate: '', priorDisputeNoLongerPending: false, privacyAcknowledged: true, confirmed: true };
  const waiting = await req(first.cookie, '/api/complaints', 'POST', complaint, 201);
  await req(first.cookie, `/api/complaints/${waiting.createdId}`, 'PATCH', { status: 'in_review', submittedAt: new Date().toISOString().slice(0, 10), actualSubmissionConfirmed: true }, 400);
  await req(first.cookie, `/api/complaints/${waiting.createdId}`, 'DELETE');
  const eligible = await req(first.cookie, '/api/complaints', 'POST', { ...complaint, priorDisputeConfirmed: true, priorDisputeDate: new Date(Date.now() - 46 * 86400000).toISOString().slice(0, 10) }, 201);
  const submittedComplaint = await req(first.cookie, `/api/complaints/${eligible.createdId}`, 'PATCH', { status: 'in_review', submittedAt: new Date().toISOString().slice(0, 10), actualSubmissionConfirmed: true });
  assert.equal(submittedComplaint.complaints.find(c => c.id === eligible.createdId).status, 'in_review');
}
const cleared = await req(first.cookie, '/api/workspace', 'DELETE', { confirm: 'START FRESH' }); assert.equal(cleared.disputes.length, 0); assert.equal(cleared.documents.length, 0); assert.equal(cleared.complaints.length, 0);
console.log('PASS: four specialty providers, supported-method defaults/rejection, saved drafts/editing/PDFs, report/evidence isolation, mixed-provider validation, confirmed submissions/delivery/outcomes, complaint prerequisites, and reset.');
