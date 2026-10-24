"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CreditCard,
  BarChart3,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession, logout } from "@/lib/api/auth";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/sites", label: "Sites", icon: Store },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/usage", label: "Usage", icon: Gauge },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      if (
        !session.user.onboardingCompleted &&
        !pathname.startsWith("/onboarding")
      ) {
        router.replace("/onboarding");
        return;
      }
      setUser(session.user);
      setLoading(false);
    })();
  }, [pathname, router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-full">
        <aside className="hidden w-60 border-r border-border p-4 md:block">
          <Skeleton className="mb-6 h-7 w-28" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Logo href="/dashboard" showProduct className="mb-6" />
        <NavLinks pathname={pathname} />
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Separator />
          <div className="px-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => void handleLogout()}
          >
            <LogOut data-icon="inline-start" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Logo href="/dashboard" />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
              )}
              aria-label="Open navigation"
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <NavLinks
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-sm font-medium">{user?.name}</p>
                <Button variant="outline" onClick={() => void handleLogout()}>
                  <LogOut data-icon="inline-start" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
