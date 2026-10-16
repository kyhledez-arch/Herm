import { ACTIONS } from "./bureaus";

/** FCRA-aligned first-paragraph templates. Fill in bracketed facts before sending. Never use these to dispute accurate information. */
export const REASON_TEMPLATES: Record<string, { action: string; body: (creditor: string, last4: string) => string }> = {
  "Incorrect account balance": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Account: ${c}${n}. The report shows a balance of $[amount shown] as of [report date]. My [statement or other record] dated [date] shows a balance of $[correct amount]. Please investigate this discrepancy, correct the reported balance if inaccurate, and send me the written results. Supporting document to reference or enclose, if any: [document and date].`,
  },
  "This account isn’t mine": {
    action: "Remove an account that does not belong to me",
    body: (c, n) =>
      `Account: ${c}${n}. I believe this account does not belong to me because [state the specific facts—for example, I never opened it, I am not liable for it, or it belongs to someone with a similar name]. Please investigate the account ownership and the records used to match it to my file. If the account cannot be verified as mine, please delete it and send me the written results. Keep only statements that are true for your situation. Provide identity-theft or identity documents directly through the bureau’s official process, not in this workspace.`,
  },
  "Incorrect late payment": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Account: ${c}${n}. The report shows a late-payment mark for [month/year] and reports [30/60/90] days late. I believe this is inaccurate because [state the specific reason—for example, the payment date or month is wrong, the payment was received by the due date, or the account was covered by an agreed deferment]. My [statement / payment confirmation / agreement] dated [date] supports this. Please investigate this specific payment-history entry, correct it if inaccurate, and send me the written results. Replace the bracketed prompts with facts supported by your records.`,
  },
  "Duplicate account": {
    action: "Remove a duplicate entry",
    body: (c, n) =>
      `Account: ${c}${n}. This account appears more than once on the same report (same creditor, similar account number, same or overlapping dates). Only one accurate listing should remain. Please investigate, delete the duplicate entry, and send written results. Keep the single verified listing if it is accurate.`,
  },
  "Incorrect account status": {
    action: "Update the account status",
    body: (c, n) =>
      `Account: ${c}${n}. The report shows status “[status shown, e.g. charged off / open / past due]”. My ${c} records dated [date] show the correct status is “[correct status, e.g. paid / closed / current]”. Please investigate, update the status (and related balance/date fields if they are also wrong), and send written results.`,
  },
  "Incorrect personal information": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Item: ${c}${n || " personal information"}. The report lists “[what is shown: name / address / phone / employer / date of birth]”. That information is not current or not mine. The correct information is “[correct value]”. Please investigate, correct or delete the inaccurate personal information, and send written results. Do not include full SSN or government ID in this letter—supply identity proof only through the bureau’s official process.`,
  },
  "Unauthorized inquiry": {
    action: "Investigate and provide the results",
    body: (c, n) =>
      `Inquiry: ${c}${n}, dated [inquiry date]. I do not recognize or believe I authorized this inquiry because [state the specific facts, such as no application or other transaction with this company]. Please investigate whether the inquiry had a permissible purpose. If it cannot be verified, please remove it and send me the written results. Replace the bracketed prompt with facts that are true for you.`,
  },
  "Other inaccurate information": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Account / item: ${c}${n}. The report currently shows “[exact field and value that is wrong, including dates and amounts]”. My [record type] dated [date] shows “[correct value]”. Please investigate this specific inaccuracy, correct or delete information that is inaccurate or cannot be verified, and send me the written results. Supporting document to reference or enclose, if any: [document and date].`,
  },
  "Incorrect bank account closure": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Banking file item: ${c}${n}. The report shows this checking/savings account was closed for “[reason shown]”. That closure reason is inaccurate. The account was [never closed / closed by me in good standing / closed for a different reason]. Please investigate the closure code and date, correct the banking-history file, and send written results.`,
  },
  "Incorrect overdraft or unpaid balance": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Banking file item: ${c}${n}. The report shows an unpaid / overdraft amount of $[amount shown]. My bank records dated [date] show $[correct amount] (or $0 if paid). Please investigate, correct the unpaid/overdraft information, and send written results.`,
  },
  "Paid bank account reported as unpaid": {
    action: "Update the account status",
    body: (c, n) =>
      `Banking file item: ${c}${n}. This obligation was paid on [paid date] for $[amount]. The report still shows it as unpaid. Please investigate, update the status to paid / $0, and send written results. I am enclosing / will provide the paid-in-full or closing statement.`,
  },
  "Incorrect employment dates": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Employment item: ${c}${n}. The file shows employment dates [dates shown]. My records (W-2, paystub, or employer letter) show the correct dates are [correct start] to [correct end / present]. Please investigate, correct the dates, and send written results.`,
  },
  "Incorrect income information": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Employment / income item: ${c}${n}. The file shows income of $[amount shown] for [period]. My pay records dated [date] show $[correct amount]. Please investigate, correct the income information, and send written results. Do not include full account numbers or SSN in this letter.`,
  },
  "Incorrect insurance or public record": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Item: ${c}${n}. The report lists “[claim / public record as shown]” dated [date shown]. That record is inaccurate or does not belong to me. The correct information is “[correct description or ‘not mine’]”. Please investigate, correct or delete what cannot be verified, and send written results.`,
  },
  "Incorrect alternative-finance account": {
    action: "Correct the inaccurate information",
    body: (c, n) =>
      `Alternative-finance item: ${c}${n}. The file shows “[balance / status / dates shown]”. My records dated [date] show “[correct facts]”. Please investigate this specialty-file listing, correct or delete information that cannot be verified, and send written results.`,
  },
};

function accountBit(last4: string) {
  const digits = last4.replace(/\D/g, "").slice(-4);
  return digits.length === 4 ? `, ending ${digits}` : "";
}

export function draftFromReason(reason: string, creditor = "", last4 = "") {
  const name = creditor.trim() || "[creditor / item name]";
  const template = REASON_TEMPLATES[reason] ?? REASON_TEMPLATES["Other inaccurate information"];
  return {
    details: template.body(name, accountBit(last4)),
    requestedAction: ACTIONS.includes(template.action) ? template.action : ACTIONS[0],
  };
}

export function matchesGeneratedDraft(details: string, reason: string, creditor = "", last4 = "") {
  return details.trim() === draftFromReason(reason, creditor, last4).details.trim();
}
