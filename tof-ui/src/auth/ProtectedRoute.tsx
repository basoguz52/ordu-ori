import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";

/**
 * Giriş gerektiren rotaları korur.
 * requireManage=true ise sadece yönetim yetkisi (admin/referee/club_manager) olanlar geçer.
 */
export function ProtectedRoute({
  children,
  requireManage = false,
}: {
  children: ReactNode;
  requireManage?: boolean;
}) {
  const { user, isLoading, canManage } = useAuth();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/giris" state={{ from: loc.pathname }} replace />;
  }

  if (requireManage && !canManage) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

/**
 * Rol bazlı sayfa koruması (nav görünürlüğüyle birebir). Yetkisiz rol panele döner.
 * admin her zaman süper kullanıcı olarak geçer.
 * - "admin": yalnızca admin
 * - "referee": hakem veya admin
 * - "manage-athletes": kulüp yöneticisi veya admin
 */
export function RoleGate({
  children,
  need,
}: {
  children: ReactNode;
  need: "admin" | "referee" | "manage-athletes" | "club-manager";
}) {
  const { isAdmin, isReferee, isClubManager } = useAuth();

  const ok =
    need === "admin"
      ? isAdmin
      : need === "referee"
        ? isReferee || isAdmin
        : // manage-athletes | club-manager
          isClubManager || isAdmin;

  if (!ok) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
