"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { messageTemplateSchema, TEMPLATE_VARIABLES } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";

function extractVariables(content: string): string[] {
  const allowed = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.key));
  const found = new Set<string>();
  for (const m of content.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) if (m[1] && allowed.has(m[1])) found.add(m[1]);
  return [...found];
}

export async function saveTemplateAction(id: string | null, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("save-template", 30);
    const { profile, supabase } = await requireProvider("/dashboard/message-templates");
    const v = parseInput(messageTemplateSchema, input);
    const row = { name: v.name.trim(), subject: v.subject || null, content: v.content, category: v.category, is_active: v.is_active, variables: extractVariables(v.content) };

    if (id) {
      parseInput(z.string().uuid(), id);
      const { data, error } = await supabase.from("message_templates").update(row).eq("id", id).eq("provider_id", profile.id).select("id");
      if (error) throw new ActionError(error.message);
      if (!data?.length) throw new ActionError("Template not found.");
    } else {
      const { error } = await supabase.from("message_templates").insert({ ...row, provider_id: profile.id });
      if (error) throw new ActionError(error.message);
    }
    revalidatePath("/dashboard/message-templates");
    revalidatePath("/dashboard/messages");
    return ok(id ? "Template updated." : "Template created.");
  });
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/message-templates");
    parseInput(z.string().uuid(), id);
    const { error } = await supabase.from("message_templates").delete().eq("id", id).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/message-templates");
    return ok("Template deleted.");
  });
}
