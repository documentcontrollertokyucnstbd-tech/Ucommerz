import "server-only";
import { headers } from "next/headers";
import type { ZodTypeAny, z } from "zod";
import { getErrorMessage } from "@/app/lib/utils";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";

/** Uniform return value for every Server Action. The client shows a toast from it. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class ActionError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ActionError";
    this.fieldErrors = fieldErrors;
  }
}

export function ok<T = undefined>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Next.js implements redirect()/notFound() by throwing: those must propagate. */
function isNextControlFlow(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

/** try/catch wrapper used by every Server Action. */
export async function safeAction<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    if (error instanceof ActionError) return fail(error.message, error.fieldErrors);
    console.error("[server-action]", error);
    return fail(getErrorMessage(error));
  }
}

/** Validate unknown input with a zod schema; throws ActionError with field errors. */
export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
    const firstIssue = result.error.issues[0]?.message ?? "Invalid input";
    throw new ActionError(firstIssue, fieldErrors);
  }
  return result.data;
}

/** Per-IP rate limit for Server Actions. */
export async function limitAction(name: string, max = 20, windowMs = 60_000): Promise<void> {
  const h = await headers();
  const ip = getClientIp(h);
  const res = rateLimit(`${name}:${ip}`, { max, windowMs });
  if (!res.success) {
    throw new ActionError(`Too many requests. Please try again in ${Math.ceil((res.resetAt - Date.now()) / 1000)}s.`);
  }
}
