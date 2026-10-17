import Link from "next/link";
import { Logo } from "@/app/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            UCOMMERZ connects clients with verified local professionals for trusted, transparent service.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Marketplace</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/browse" className="hover:text-foreground">Browse Services</Link>
            <Link href="/categories" className="hover:text-foreground">All Categories</Link>
            <Link href="/register" className="hover:text-foreground">Become a Provider</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Popular categories</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/categories/web-software" className="hover:text-foreground">Web &amp; Software</Link>
            <Link href="/categories/home-services" className="hover:text-foreground">Home Services</Link>
            <Link href="/categories/photography" className="hover:text-foreground">Photography</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">For professionals</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/register" className="hover:text-foreground">Join the marketplace</Link>
            <Link href="/dashboard/provider-dashboard" className="hover:text-foreground">Provider portal</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} UCOMMERZ Service Marketplace. All rights reserved.</span>
          <span>Privacy Policy · Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
