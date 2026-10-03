import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, Compass, LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import {
  DesktopNav,
  MobileNav,
  navActive,
  navLinkBase,
  normalizeNav,
  useDropdown,
  useMobileMenu,
  type NavItem,
} from "@/components/layout/MainNav";
import { cn } from "@/lib/utils";

interface AccountLink {
  to: string;
  label: string;
}

/** Sağ üstteki hesap menüsü: kişisel sayfalar + çıkış. */
function AccountMenu({
  name,
  links,
  onLogout,
}: {
  name?: string;
  links: AccountLink[];
  onLogout: () => void;
}) {
  const { openKey, setOpenKey, toggle, ref } = useDropdown<HTMLDivElement>();
  const open = openKey === "account";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Hesap menüsü"
        onClick={() => toggle("account")}
        className={cn(
          navLinkBase,
          "flex items-center gap-1.5 px-2 py-2",
          open && navActive,
        )}
      >
        <UserRound className="size-4" />
        <span className="hidden max-w-40 truncate sm:inline">{name}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-md border bg-background p-1 shadow-lg"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              role="menuitem"
              onClick={() => setOpenKey(null)}
              className={({ isActive }) =>
                cn(navLinkBase, "block px-3 py-2", isActive && navActive)
              }
            >
              {l.label}
            </NavLink>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenKey(null);
              onLogout();
            }}
            className={cn(
              navLinkBase,
              "flex w-full items-center gap-2 px-3 py-2 text-left",
            )}
          >
            <LogOut className="size-4" /> Çıkış
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, isAdmin, isClubManager, isReferee, logout } = useAuth();
  const navigate = useNavigate();
  const menu = useMobileMenu();

  const nav: NavItem[] = normalizeNav(
    (
      [
        { to: "/app", label: "Panel", end: true, show: true },
        { to: "/app/etkinlikler", label: "Etkinlikler", show: isAdmin },
        { to: "/app/sporcular", label: "Sporcular", show: isClubManager },
        { to: "/app/kayit", label: "Yarış Kaydı", show: isClubManager },
        {
          key: "yonetim",
          label: "Yönetim",
          show: isAdmin,
          children: [
            { to: "/app/kulupler", label: "Kulüpler" },
            { to: "/app/tum-sporcular", label: "Tüm Sporcular" },
            { to: "/app/kullanicilar", label: "Kullanıcılar" },
            { to: "/app/ayarlar", label: "Ayarlar" },
          ],
        },
        {
          key: "icerik",
          label: "İçerik",
          show: isAdmin,
          children: [
            { to: "/app/icerik", label: "Duyuru, Haber & Sayfalar" },
            { to: "/app/carousel", label: "Anasayfa Görselleri" },
          ],
        },
      ] satisfies (NavItem & { show: boolean })[]
    )
      .filter((n) => n.show)
      .map(({ show: _show, ...n }) => n),
  );

  const accountLinks: AccountLink[] = [
    { to: "/app/profil", label: "Profilim", show: isClubManager },
    { to: "/app/hakem", label: "Hakem Profilim", show: isReferee || isAdmin },
    { to: "/app/sifre-degistir", label: "Şifre Değiştir", show: true },
  ]
    .filter((a) => a.show)
    .map(({ to, label }) => ({ to, label }));

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/app" className="flex items-center gap-2 font-semibold">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Compass className="size-5" />
              </span>
              <span className="hidden sm:inline">Panel</span>
            </Link>

            <DesktopNav items={nav} className="hidden md:flex" />
          </div>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Siteye dön
            </Link>
            <AccountMenu
              name={user?.full_name}
              links={accountLinks}
              onLogout={handleLogout}
            />
            <button
              type="button"
              aria-label="Menü"
              aria-expanded={menu.open}
              onClick={menu.toggle}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "md:hidden",
              )}
            >
              {menu.open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobil menü */}
        {menu.open && (
          <MobileNav items={nav} onNavigate={menu.close} className="md:hidden">
            <div className="mt-2 border-t pt-2">
              {accountLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={menu.close}
                  className={({ isActive }) =>
                    cn(navLinkBase, "block px-3 py-2.5", isActive && navActive)
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link
                to="/"
                onClick={menu.close}
                className={cn(navLinkBase, "block px-3 py-2.5")}
              >
                Siteye dön
              </Link>
            </div>
          </MobileNav>
        )}
      </header>

      <main className="container flex-1 py-8">
        <Outlet />
      </main>
    </div>
  );
}
