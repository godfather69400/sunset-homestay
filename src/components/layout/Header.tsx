"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROPERTY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const onHero = pathname === "/";

  return (
    <header
      className={cn(
        "z-30",
        onHero ? "absolute inset-x-0 top-0" : "sticky top-0 border-b bg-background/90 backdrop-blur",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className={cn("font-serif text-lg md:text-xl", onHero ? "text-white drop-shadow" : "text-foreground")}
        >
          {PROPERTY.shortName}
        </Link>
        <nav className={cn("flex items-center gap-4 text-sm", onHero ? "text-white/90" : "text-foreground")}>
          <Link href="/#rooms">Rooms</Link>
          <Link href="/#stay">Stay</Link>
          <Link
            href="/admin"
            className={cn("rounded-full px-3 py-1.5", onHero ? "bg-white/15 backdrop-blur" : "bg-muted")}
          >
            Owner
          </Link>
        </nav>
      </div>
    </header>
  );
}
