/** Fallback artwork for services without uploaded images (files live in /public). */
const CATEGORY_IMAGES: Record<string, string> = {
  "web-software": "/services/web-development.png",
  "web-development": "/services/web-development.png",
  "home-services": "/services/plumbing.png",
  plumbing: "/services/plumbing.png",
  "electrical-work": "/services/electrical-work.png",
  "design-creative": "/services/graphic-design.png",
  "graphic-design": "/services/graphic-design.png",
  photography: "/services/photography.png",
  cleaning: "/services/cleaning.png",
  "ai-data": "/services/ai-ml.png",
  "ai-ml": "/services/ai-ml.png",
  "accounting-finance": "/services/accounting.png",
  accounting: "/services/accounting.png",
};

export const PLACEHOLDER_AVATAR = "/placeholder-user.jpg";

export function serviceImage(service: {
  images?: string[] | null;
  category?: string | null;
  sub_category?: string | null;
}): string {
  const own = service.images?.find(Boolean);
  if (own) return own;
  const sub = service.sub_category ? CATEGORY_IMAGES[service.sub_category] : undefined;
  const cat = service.category ? CATEGORY_IMAGES[service.category] : undefined;
  return sub ?? cat ?? "/placeholder.jpg";
}

export function avatarOf(url: string | null | undefined): string {
  return url || PLACEHOLDER_AVATAR;
}
