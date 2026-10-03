import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavChild {
  to: string;
  label: string;
}

export interface NavItem {
  /** Alt menüsü olan maddelerde `to` yoktur; `key` dropdown kimliğidir. */
  to?: string;
  key?: string;
  label: string;
  end?: boolean;
  children?: NavChild[];
}

/** Public ve panel menülerinde ortak link görünümü. */
export const navLinkBase =
  "rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export const navActive = "bg-accent text-accent-foreground";

/**
 * Açılır menü durumu: dışarı tıklama, Escape ve rota değişiminde kapanır.
 * `ref` dropdown'ı içeren kapsayıcıya verilir.
 */
export function useDropdown<T extends HTMLElement = HTMLElement>() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const ref = useRef<T>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (!ref.current?.contains(ev.target as Node)) setOpenKey(null);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  const toggle = (key: string) => setOpenKey((v) => (v === key ? null : key));

  return { openKey, setOpenKey, toggle, ref };
}

/** Mobil menü durumu: rota değişince kapanır. */
export function useMobileMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return {
    open,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
  };
}

/** Bir grubun alt sayfalarından birinde miyiz? */
function isChildActive(item: NavItem, pathname: string): boolean {
  return !!item.children?.some((c) => pathname.startsWith(c.to));
}

/**
 * Tek alt maddesi kalan grubu düz linke düşürür, alt maddesi kalmayanı eler.
 * (Rol filtresinden sonra boş ▾ görünmesin diye.)
 */
export function normalizeNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => {
    if (!item.children) return [item];
    if (item.children.length === 0) return [];
    if (item.children.length === 1) {
      const only = item.children[0];
      return [{ to: only.to, label: only.label }];
    }
    return [item];
  });
}

/** Masaüstü yatay menü (dropdown'lı). */
export function DesktopNav({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  const { openKey, setOpenKey, toggle, ref } = useDropdown<HTMLElement>();
  const { pathname } = useLocation();

  return (
    <nav ref={ref} className={cn("items-center gap-0.5", className)}>
      {items.map((n) =>
        n.children ? (
          <div key={n.key} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openKey === n.key}
              onClick={() => toggle(n.key!)}
              className={cn(
                navLinkBase,
                "flex items-center gap-1 px-2.5 py-2",
                (isChildActive(n, pathname) || openKey === n.key) && navActive,
              )}
            >
              {n.label}
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  openKey === n.key && "rotate-180",
                )}
              />
            </button>
            {openKey === n.key && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 min-w-56 overflow-hidden rounded-md border bg-background p-1 shadow-lg"
              >
                {n.children.map((c) => (
                  <NavLink
                    key={c.to}
                    to={c.to}
                    role="menuitem"
                    onClick={() => setOpenKey(null)}
                    className={({ isActive }) =>
                      cn(navLinkBase, "block px-3 py-2", isActive && navActive)
                    }
                  >
                    {c.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ) : (
          <NavLink
            key={n.to}
            to={n.to!}
            end={n.end}
            className={({ isActive }) =>
              cn(navLinkBase, "px-2.5 py-2", isActive && navActive)
            }
          >
            {n.label}
          </NavLink>
        ),
      )}
    </nav>
  );
}

/** Mobil dikey menü (gruplar akordiyon). `children`: alta eklenen ek bölüm. */
export function MobileNav({
  items,
  onNavigate,
  className,
  children,
}: {
  items: NavItem[];
  onNavigate: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { pathname } = useLocation();

  return (
    <nav className={cn("border-t bg-background", className)}>
      <div className="container flex flex-col py-2">
        {items.map((n) =>
          n.children ? (
            <div key={n.key}>
              <button
                type="button"
                aria-expanded={openSection === n.key}
                onClick={() =>
                  setOpenSection((v) => (v === n.key ? null : (n.key ?? null)))
                }
                className={cn(
                  navLinkBase,
                  "flex w-full items-center justify-between px-3 py-2.5",
                  isChildActive(n, pathname) && navActive,
                )}
              >
                {n.label}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    openSection === n.key && "rotate-180",
                  )}
                />
              </button>
              {openSection === n.key && (
                <div className="ml-3 flex flex-col border-l pl-2">
                  {n.children.map((c) => (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(navLinkBase, "px-3 py-2.5", isActive && navActive)
                      }
                    >
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={n.to}
              to={n.to!}
              end={n.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(navLinkBase, "px-3 py-2.5", isActive && navActive)
              }
            >
              {n.label}
            </NavLink>
          ),
        )}
        {children}
      </div>
    </nav>
  );
}
