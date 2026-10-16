import type { Bureau, SubmissionMethod } from "./types";
import { getBureau } from "./bureaus";

export const SUBMISSION_METHODS: { id: SubmissionMethod; label: string; shortLabel: string; loginRequired: boolean }[] = [
  { id: "online", label: "Online portal · Login required", shortLabel: "Online", loginRequired: true },
  { id: "mail", label: "By mail · No portal login", shortLabel: "Mail", loginRequired: false },
  { id: "phone", label: "By phone · No portal login", shortLabel: "Phone", loginRequired: false },
];
export const isSubmissionMethod = (value: unknown): value is SubmissionMethod => SUBMISSION_METHODS.some(method => method.id === value);
export const getSubmissionMethod = (value: string) => SUBMISSION_METHODS.find(method => method.id === value) ?? SUBMISSION_METHODS[0];
export const methodsForAgency = (id: string): SubmissionMethod[] => getBureau(id).supportedMethods ?? ["online", "mail", "phone"];
export const supportsAgencyMethod = (id: string, method: SubmissionMethod) => methodsForAgency(id).includes(method);
export const defaultAgencyMethod = (id?: string): SubmissionMethod => id ? getBureau(id).defaultMethod ?? "online" : "online";
export function normalizeAgencyMethod(id: string, preferred?: SubmissionMethod): SubmissionMethod {
  return preferred && supportsAgencyMethod(id, preferred) ? preferred : defaultAgencyMethod(id);
}
export const commonAgencyMethods = (ids: Bureau[]): SubmissionMethod[] => ["online", "mail", "phone"].filter(method => ids.every(id => supportsAgencyMethod(id, method as SubmissionMethod))) as SubmissionMethod[];
export function agencySubmissionLabel(method: SubmissionMethod, id?: string) {
  if (method === "online" && id && getBureau(id).onlineAccess === "form") return "Online form · Identity verification";
  return getSubmissionMethod(method).label;
}
