"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  canManageCatalog: boolean;
};

export function AdminSidebar({ canManageCatalog }: AdminSidebarProps) {
  const pathname = usePathname();
  const sections = [
    { href: "/backoffice/catalogo", label: "Catálogo", mark: "01" },
    ...(canManageCatalog
      ? [{ href: "/backoffice/categorias", label: "Categorías", mark: "02" }]
      : []),
  ];

  return (
    <aside className="admin-sidebar">
      <Link className="admin-sidebar__brand" href="/backoffice/catalogo">
        <span>Cauvira</span>
        <small>Control comercial</small>
      </Link>
      <nav aria-label="Navegación de backoffice">
        <ul>
          {sections.map((section) => {
            const active = pathname.startsWith(section.href);
            return (
              <li key={section.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "admin-sidebar__link is-active" : "admin-sidebar__link"}
                  href={section.href}
                >
                  <span aria-hidden="true">{section.mark}</span>
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="admin-sidebar__scope">Operación interna · MX</p>
    </aside>
  );
}
