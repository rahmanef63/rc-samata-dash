"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface NavLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "href"> {
  to: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}

export function NavLink({
  to,
  end = false,
  className,
  activeClassName,
  children,
  ...rest
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Link
      href={to}
      className={cn(className, isActive && activeClassName)}
      {...rest}
    >
      {children}
    </Link>
  );
}
