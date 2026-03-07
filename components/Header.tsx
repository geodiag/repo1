"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/diagnostics", label: "Diagnostics (Vente/Location)" },
    { href: "/erp",         label: "ERP" },
    { href: "/ensa",        label: "ENSA ✈️" },
    { href: "/pro",         label: "Espace Professionnel", cta: true },
  ];

  return (
    <header className="bg-white border-b border-gray-300 mt-1 relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">

        {/* Logo + baseline */}
        <Link href="/" className="flex items-center gap-4">
          <img src="/logo.png" alt="Géodiag Logo" className="h-16 w-auto block bg-slate-200" />
          <div className="text-sm text-gray-600 hidden md:block border-l border-gray-300 pl-4 ml-2">
            Plateforme d'assistance<br />aux obligations immobilières
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-wrap justify-center items-center gap-1 text-sm font-bold">
          {navLinks.map(({ href, label, cta }) =>
            cta ? (
              <Link
                key={href}
                href={href}
                className="border border-bleu-france text-bleu-france px-4 py-2 hover:bg-blue-50 transition ml-2"
              >
                {label}
              </Link>
            ) : (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 transition border-b-2 ${
                  pathname === href
                    ? "border-b-bleu-france text-bleu-france"
                    : "border-b-transparent text-gray-700 hover:text-bleu-france hover:border-b-bleu-france"
                }`}
              >
                {label}
              </Link>
            )
          )}
        </nav>

      </div>
    </header>
  );
}
