import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function ChevronDown({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MenuIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75ZM3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TopNavLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "rounded-lg px-3 py-2 text-sm font-medium transition",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState(null); // "kurumsal" | "yarisma" | null
  const dropdownRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState({
    kurumsal: false,
    yarisma: false,
    panel: false,
  });

  const publicNav = useMemo(
    () => [
      {
        key: "kurumsal",
        label: "Kurumsal",
        children: [
          { label: "Federasyonumuz", to: "/kurumsal/federasyonumuz" },
          { label: "Hakemlerimiz", to: "/kurumsal/hakemlerimiz" },
          { label: "Antrenörlerimiz", to: "/kurumsal/antrenorlerimiz" },
          { label: "Kulüplerimiz", to: "/kurumsal/kuluplerimiz" },
        ],
      },
      { label: "Duyurular", to: "/duyurular" },
      { label: "Haberler", to: "/haberler" },
      { label: "Faaliyet Takvimi", to: "/faaliyet-takvimi" },
      { label: "Yarışmalar",to: "/yarisma-basvurulari/yarisma-bulteni" },
      { label: "Sonuçlar", to: "/sonuclar" },
      { label: "İletişim", to: "/iletisim" },
    ],
    []
  );

  const panelNav = useMemo(
    () => [
      { label: "Dashboard", to: "/app" },
      { label: "Yarışma Düzenle", to: "/app/events" },
      { label: "Sporcular", to: "/app/athletes" },
      // { label: "Kayıtlarım", to: "/app/registrations" },
      { label: "Şifre Değiştir", to: "/app/change-password" },
    ],
    []
  );

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/duyurular" className="font-semibold whitespace-nowrap">
          Anasayfa
        </Link>

        {/* Desktop: Public nav */}
        <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
          {publicNav.map((item) => {
            const hasChildren = !!item.children?.length;
            if (!hasChildren) {
              return (
                <TopNavLink key={item.label} to={item.to}>
                  {item.label}
                </TopNavLink>
              );
            }

            const isOpen = openDropdown === item.key;

            return (
              <div key={item.key} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown((cur) => (cur === item.key ? null : item.key))}
                  className={[
                    "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isOpen ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  {item.label}
                  <ChevronDown className={["h-4 w-4 transition", isOpen ? "rotate-180" : ""].join(" ")} />
                </button>

                {isOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border bg-white p-2 shadow-lg"
                  >
                    <div className="grid gap-1">
                      {item.children.map((c) => (
                        <NavLink
                          key={c.label}
                          to={c.to}
                          role="menuitem"
                          className={({ isActive }) =>
                            [
                              "rounded-xl px-3 py-2 text-sm transition",
                              isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                            ].join(" ")
                          }
                          onClick={() => setOpenDropdown(null)}
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Desktop: Auth actions */}
        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              <nav className="flex items-center gap-1">
                {panelNav.slice(1).map((p) => (
                  <TopNavLink key={p.label} to={p.to}>
                    {p.label}
                  </TopNavLink>
                ))}
              </nav>

              <button className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={logout}>
                Çıkış
              </button>
            </>
          ) : (
            <NavLink className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-95" to="/login">
              Giriş
            </NavLink>
          )}
        </div>

        {/* Mobile */}
        <div className="flex lg:hidden items-center gap-2">
          {user ? (
            <button className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={logout}>
              Çıkış
            </button>
          ) : (
            <NavLink className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" to="/login">
              Giriş
            </NavLink>
          )}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border p-2 text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">Menü</div>
              <button
                type="button"
                className="rounded-lg border p-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
                aria-label="Menüyü kapat"
              >
                <XIcon />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Public */}
              <div className="space-y-1">
                {publicNav.map((item) => {
                  const hasChildren = !!item.children?.length;

                  if (!hasChildren) {
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  const isOpen = !!mobileAccordion[item.key];

                  return (
                    <div key={item.key} className="rounded-2xl border">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-3 text-sm font-semibold text-slate-800"
                        onClick={() =>
                          setMobileAccordion((cur) => ({ ...cur, [item.key]: !cur[item.key] }))
                        }
                        aria-expanded={isOpen}
                      >
                        {item.label}
                        <ChevronDown className={["h-4 w-4 transition", isOpen ? "rotate-180" : ""].join(" ")} />
                      </button>

                      {isOpen && (
                        <div className="border-t bg-white p-2">
                          <div className="grid gap-1">
                            {item.children.map((c) => (
                              <Link
                                key={c.label}
                                to={c.to}
                                className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                              >
                                {c.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Panel */}
              {user && (
                <div className="rounded-2xl border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-3 text-sm font-semibold text-slate-800"
                    onClick={() => setMobileAccordion((cur) => ({ ...cur, panel: !cur.panel }))}
                    aria-expanded={!!mobileAccordion.panel}
                  >
                    Panel
                    <ChevronDown
                      className={[
                        "h-4 w-4 transition",
                        mobileAccordion.panel ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>

                  {mobileAccordion.panel && (
                    <div className="border-t bg-white p-2">
                      <div className="grid gap-1">
                        {panelNav.map((p) => (
                          <Link
                            key={p.label}
                            to={p.to}
                            className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            {p.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
