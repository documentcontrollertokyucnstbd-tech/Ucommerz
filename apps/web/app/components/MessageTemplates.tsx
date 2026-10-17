"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { TEMPLATE_CATEGORY_LABELS, type MessageTemplate } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { ScrollArea } from "@/app/components/ui/scroll-area";

/** Replaces {{name}}, {{provider}}, {{service}}, {{date}}, {{time}}, {{price}} with values; unknown variables are left visible. */
export function applyTemplateVariables(content: string, vars: Record<string, string | undefined>): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}

export function MessageTemplates({
  templates,
  vars,
  onPick,
}: {
  templates: MessageTemplate[];
  vars: Record<string, string | undefined>;
  onPick: (text: string, templateId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = templates.filter((t) => t.is_active);
  if (active.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Insert a template" title="Message templates">
          <FileText />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <ScrollArea className="max-h-72">
          <ul className="space-y-1">
            {active.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full rounded-md p-2 text-left transition hover:bg-accent"
                  onClick={() => {
                    onPick(applyTemplateVariables(t.content, vars), t.id);
                    setOpen(false);
                  }}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{TEMPLATE_CATEGORY_LABELS[t.category]}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.content}</p>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
