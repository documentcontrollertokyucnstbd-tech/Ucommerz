import {
  Brain,
  Briefcase,
  Calculator,
  Camera,
  Code,
  LayoutGrid,
  Palette,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  code: Code,
  camera: Camera,
  sparkles: Sparkles,
  briefcase: Briefcase,
  brain: Brain,
  palette: Palette,
  calculator: Calculator,
};

export function getCategoryIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return LayoutGrid;
  return ICONS[icon] ?? LayoutGrid;
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} aria-hidden="true" />;
}

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);
