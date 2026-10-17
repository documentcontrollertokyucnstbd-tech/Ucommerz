"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuth } from "@/app/lib/guards";
import { ActionError, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";

export async function toggleFavoriteAction(serviceId: string): Promise<ActionResult<{ favorite: boolean }>> {
  return safeAction<{ favorite: boolean }>(async () => {
    const id = parseInput(z.string().uuid(), serviceId);
    const { supabase, user, profile } = await getAuth();
    if (!user || !profile) throw new ActionError("AUTH_REQUIRED");

    const { data: existing } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("service_id", id).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
      if (error) throw new ActionError(error.message);
      await logActivity({ userId: user.id, action: "FAVORITE_REMOVED", targetType: "service", targetId: id, description: "Removed a service from favorites" }, supabase);
      revalidatePath("/dashboard/favorites");
      return ok("Removed from favorites.", { favorite: false });
    }

    const { error } = await supabase.from("favorites").insert({ user_id: user.id, service_id: id });
    if (error) throw new ActionError(error.message);
    await logActivity({ userId: user.id, action: "FAVORITE_ADDED", targetType: "service", targetId: id, description: "Saved a service to favorites" }, supabase);
    revalidatePath("/dashboard/favorites");
    return ok("Saved to favorites.", { favorite: true });
  });
}
