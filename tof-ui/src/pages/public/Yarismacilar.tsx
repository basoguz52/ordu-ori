import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Users } from "lucide-react";
import { useEvent } from "@/api/events";
import { useEventRegistrations, type RegistrationRow } from "@/api/registrations";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

function fullName(r: RegistrationRow) {
  return [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
}

function uniqueSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, "tr"),
  );
}

export default function Yarismacilar() {
  const [params] = useSearchParams();
  const eventId = params.get("event") ?? undefined;

  const { data: event } = useEvent(eventId);
  const { data, isLoading, isError } = useEventRegistrations(eventId);

  const [q, setQ] = useState("");
  const [club, setClub] = useState("");
  const [category, setCategory] = useState("");

  const clubs = useMemo(() => uniqueSorted((data ?? []).map((r) => r.club_name)), [data]);
  const categories = useMemo(
    () => uniqueSorted((data ?? []).map((r) => r.category_name)),
    [data],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase("tr");
    return data.filter((r) => {
      if (club && r.club_name !== club) return false;
      if (category && r.category_name !== category) return false;
      if (needle) {
        const hay = [fullName(r), r.license_no ?? "", r.si_chip_no ?? ""]
          .join(" ")
          .toLocaleLowerCase("tr");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, club, category]);

  if (!eventId) {
    return (
      <EmptyState
        title="Etkinlik seçilmedi"
        description="Yarışmacıları görmek için Yarışmalar sayfasından bir yarış seçin."
        icon={Users}
      />
    );
  }

  return (
    <div>
      <Link
        to="/yarisma-bulteni"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        <ArrowLeft /> Yarışmalar
      </Link>

      <PageHeader
        title={event?.name ?? "Yarışmacılar"}
        description={
          event
            ? `${formatDateRangeTR(event.start_date, event.end_date)} · ${event.location}`
            : "Kayıtlı yarışmacılar"
        }
      />

      {/* Filtreler */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim, lisans veya çip ara…"
            className="pl-9"
          />
        </div>
        <NativeSelect value={club} onChange={(e) => setClub(e.target.value)}>
          <option value="">Tüm kulüpler</option>
          {clubs.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <EmptyState title="Yarışmacılar yüklenemedi" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? "Sonuç bulunamadı" : "Henüz kayıt yok"}
          icon={Users}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {rows.length} yarışmacı
          </p>

          {/* Masaüstü: tablo */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                    <th>Ad Soyad</th>
                    <th>Kulüp</th>
                    <th>Kategori</th>
                    <th>Lisans</th>
                    <th>Çip</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-muted/30">
                      <td className="font-medium">{fullName(r)}</td>
                      <td className="text-muted-foreground">{r.club_name ?? "—"}</td>
                      <td>
                        {r.category_code ? (
                          <Badge variant="secondary">{r.category_code}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tabular-nums text-muted-foreground">
                        {r.license_no ?? "—"}
                      </td>
                      <td className="tabular-nums text-muted-foreground">
                        {r.si_chip_no ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobil: kartlar */}
          <div className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{fullName(r)}</p>
                  {r.category_code && (
                    <Badge variant="secondary" className="shrink-0">
                      {r.category_code}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.club_name ?? "—"}
                </p>
                {(r.license_no || r.si_chip_no) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.license_no && <>Lisans: {r.license_no}</>}
                    {r.license_no && r.si_chip_no && " · "}
                    {r.si_chip_no && <>Çip: {r.si_chip_no}</>}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
