"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { type MessageTemplate } from "@ucommerz/shared";
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
  const t = useTranslations("DashTemplates");
  const [open, setOpen] = useState(false);
  const active = templates.filter((tpl) => tpl.is_active);
  if (active.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("insert")} title={t("pickerTitle")}>
          <FileText />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <ScrollArea className="max-h-72">
          <ul className="space-y-1">
            {active.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  className="w-full rounded-md p-2 text-start transition hover:bg-accent"
                  onClick={() => {
                    onPick(applyTemplateVariables(tpl.content, vars), tpl.id);
                    setOpen(false);
                  }}
                >
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t(`categories.${tpl.category}`)}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{tpl.content}</p>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
