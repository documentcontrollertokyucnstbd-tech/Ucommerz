"use client";

import { useTranslations } from "next-intl";
import type { Category } from "@ucommerz/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";

const NONE = "__none";

/** Two linked selects: top-level category, then its sub-category. Values are category slugs. */
export function CategorySelect({
  categories,
  category,
  subCategory,
  onChange,
  error,
  disabled,
}: {
  categories: Category[];
  category: string;
  subCategory?: string;
  onChange: (category: string, subCategory: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("DashCategorySelect");
  const parents = categories.filter((c) => !c.parent_id);
  const selected = parents.find((c) => c.slug === category);
  const children = selected ? categories.filter((c) => c.parent_id === selected.id) : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label>{t("category")}</Label>
        <Select value={category || undefined} onValueChange={(v) => onChange(v, "")} disabled={disabled}>
          <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
            <SelectValue placeholder={t("choose")} />
          </SelectTrigger>
          <SelectContent>
            {parents.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="grid gap-2">
        <Label>{t("sub")}</Label>
        <Select
          value={subCategory || NONE}
          onValueChange={(v) => onChange(category, v === NONE ? "" : v)}
          disabled={disabled || children.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={children.length ? t("optional") : t("selectFirst")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("none")}</SelectItem>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
