"use client";

import toast from "react-hot-toast";
import type { ActionResult } from "@/app/lib/action";

/**
 * Runs a Server Action promise and shows a toast for the outcome.
 * Every mutation in the UI goes through this so users always get feedback.
 */
export async function toastAction<T>(
  promise: Promise<ActionResult<T>>,
  successMessage?: string,
): Promise<ActionResult<T>> {
  try {
    const result = await promise;
    if (result.ok) {
      const msg = successMessage ?? result.message;
      if (msg) toast.success(msg);
    } else {
      toast.error(result.error);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    toast.error(message);
    return { ok: false, error: message };
  }
}
