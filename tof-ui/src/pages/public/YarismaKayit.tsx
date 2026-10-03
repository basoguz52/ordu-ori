import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useEvent, regStatus, REG_STATUS_META } from "@/api/events";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { RegistrationBoard } from "@/components/registration/RegistrationBoard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function YarismaKayit() {
  const [params] = useSearchParams();
  const eventId = params.get("event") ?? "";
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const { data: event } = useEvent(eventId);

  // Auth gate — query'yi koruyarak login'e yönlendir
  if (authLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }
  if (!user) {
    return (
      <Navigate
        to="/giris"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  if (!eventId) {
    return (
      <EmptyState
        title="Etkinlik seçilmedi"
        description="Kayıt için Yarışmalar sayfasından bir yarış seçin."
        icon={ClipboardList}
      />
    );
  }

  const status = event ? regStatus(event) : null;

  return (
    <div>
      <Link
        to="/yarisma-bulteni"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        <ArrowLeft /> Yarışmalar
      </Link>

      <PageHeader
        title={event?.name ?? "Yarışma Kaydı"}
        description={
          event
            ? `${formatDateRangeTR(event.start_date, event.end_date)} · ${event.location}`
            : undefined
        }
        actions={
          status ? (
            <Badge variant={REG_STATUS_META[status].variant}>
              {REG_STATUS_META[status].label}
            </Badge>
          ) : undefined
        }
      />

      <RegistrationBoard eventId={eventId} />
    </div>
  );
}
