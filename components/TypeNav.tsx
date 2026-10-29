"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./typeNav.css";

const TYPES = [
  { href: "/", label: "Regular" },
  { href: "/non-regular", label: "Non-regular" },
];

export default function TypeNav() {
  const path = usePathname();
  return (
    <nav className="type-nav" aria-label="ID type">
      {TYPES.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}