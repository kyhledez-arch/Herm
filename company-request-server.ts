import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { companyRequests } from "@/db/schema";
import { ApiError, isUUID } from "./server";

export async function ownedCompanyRequest(id: string, workspaceId: string) {
  if (!isUUID(id)) throw new ApiError("Request not found.", 404);
  const [request] = await db.select().from(companyRequests).where(and(eq(companyRequests.id, id), eq(companyRequests.workspaceId, workspaceId)));
  if (!request) throw new ApiError("Request not found.", 404);
  return request;
}
export function requestCalendarDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError("Enter a valid submission date.");
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10)) throw new ApiError("The submission date must be valid and not in the future.");
  return date;
}
