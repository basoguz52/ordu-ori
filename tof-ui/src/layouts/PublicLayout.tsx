import { Link, Outlet, useLocation } from "react-router-dom";
import { Compass, Menu, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import {
  DesktopNav,
  MobileNav,
  useMobileMenu,
  type NavItem,
} from "@/components/layout/MainNav";
import { cn } from "@/lib/utils";

const NAV: NavItem[] = [
  { to: "/", label: "Anasayfa", end: true },
  { to: "/duyurular", label: "Duyurular" },
  { to: "/haberler", label: "Haberler" },
  { to: "/faaliyet-takvimi", label: "Faaliyet Takvimi" },
  { to: "/yarisma-bulteni", label: "Yarışmalar" },
  { to: "/sonuclar", label: "Sonuçlar" },
  {
    key: "kurumsal",
    label: "Kurumsal",
    children: [
      { to: "/kurumsal/il-temsilciligi", label: "İl Temsilciliği" },
      { to: "/kurumsal/federasyonumuz", label: "Federasyonumuz" },
      { to: "/kurumsal/hakemlerimiz", label: "Hakemlerimiz" },
      { to: "/kurumsal/antrenorlerimiz", label: "Antrenörlerimiz" },
      { to: "/kurumsal/kuluplerimiz", label: "Kulüplerimiz" },
    ],
  },
  { to: "/iletisim", label: "İletişim" },
];

export function PublicLayout() {
  const { user } = useAuth();
  const menu = useMobileMenu();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-5" />
            </span>
            <span>Ordu Oryantiring</span>
          </Link>

          <DesktopNav items={NAV} className="hidden lg:flex" />

          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app" className={buttonVariants({ size: "sm" })}>
                Panel
              </Link>
            ) : (
              <Link
                to="/giris"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Giriş
              </Link>
            )}
            <button
              type="button"
              aria-label="Menü"
              aria-expanded={menu.open}
              onClick={menu.toggle}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "lg:hidden",
              )}
            >
              {menu.open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobil menü */}
        {menu.open && (
          <MobileNav items={NAV} onNavigate={menu.close} className="lg:hidden" />
        )}
      </header>

      <main key={pathname} className="container flex-1 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6 text-sm text-muted-foreground">
        <div className="container flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} Ordu Oryantiring</span>
          <span>Ordu İl Temsilciliği</span>
        </div>
      </footer>
    </div>
  );
}
