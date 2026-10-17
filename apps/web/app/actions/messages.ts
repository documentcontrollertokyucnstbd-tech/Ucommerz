"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { messageSchema, type Message } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";

const sendSchema = messageSchema.extend({
  attachments: z.array(z.string().url()).max(5).optional(),
  template_id: z.string().uuid().optional(),
});

export async function sendMessageAction(input: unknown): Promise<ActionResult<{ message: Message }>> {
  return safeAction<{ message: Message }>(async () => {
    await limitAction("send-message", 40, 60_000);
    const { profile, supabase } = await requireUser("/dashboard/messages");
    const v = parseInput(sendSchema, input);
    if (v.receiver_id === profile.id) throw new ActionError("You can't message yourself.");

    const { data: receiver } = await supabase.from("users").select("id, is_active").eq("id", v.receiver_id).maybeSingle();
    if (!receiver || !receiver.is_active) throw new ActionError("That user is not available.");

    const attachments = v.attachments ?? [];
    const isImage = attachments.length > 0 && attachments.every((u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u));
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: profile.id,
        receiver_id: v.receiver_id,
        booking_id: v.booking_id ?? null,
        content: v.content.trim(),
        attachments,
        message_type: attachments.length === 0 ? "TEXT" : isImage ? "IMAGE" : "FILE",
      })
      .select("*")
      .single();
    if (error || !data) throw new ActionError(error?.message ?? "Message could not be sent.");

    if (v.template_id) {
      const { data: t } = await supabase.from("message_templates").select("usage_count").eq("id", v.template_id).eq("provider_id", profile.id).maybeSingle();
      if (t) await supabase.from("message_templates").update({ usage_count: (t.usage_count as number) + 1 }).eq("id", v.template_id);
    }

    await logActivity({ userId: profile.id, action: "MESSAGE_SENT", targetType: "user", targetId: v.receiver_id, description: "Sent a message" }, supabase);
    return ok(undefined, { message: data as Message });
  });
}

export async function markConversationReadAction(partnerId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser("/dashboard/messages");
    const id = parseInput(z.string().uuid(), partnerId);
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("receiver_id", profile.id)
      .eq("sender_id", id)
      .eq("is_read", false);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/messages");
    return ok();
  });
}
