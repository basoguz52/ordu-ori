import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  UserPlus,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { useEvent, regStatus, REG_STATUS_META } from "@/api/events";
import { useMyAthletes, type MyAthlete } from "@/api/me";
import {
  useMyRegistrations,
  useCreateRegistration,
  useDeleteRegistration,
  type RegistrationRow,
} from "@/api/registrations";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function name(a: { first_name: string | null; last_name: string | null }) {
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || "—";
}

/**
 * Bir yarış için iki listeli kayıt paneli: sol "Sporcularım" (henüz kaydı
 * olmayanlar) + sağ "Kayıtlarım". Public kayıt sayfası ve panel kayıt sayfası
 * bu bileşeni paylaşır. Kaydedilen sporcu soldan kalkar, sağda görünür; sağdan
 * çıkarılınca tekrar solda belirir (her iki liste de query'lerden türetilir).
 */
export function RegistrationBoard({ eventId }: { eventId: string }) {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: event } = useEvent(eventId);
  const athletesQ = useMyAthletes();
  const regsQ = useMyRegistrations(eventId);
  const createReg = useCreateRegistration(eventId);
  const deleteReg = useDeleteRegistration(eventId);

  const registeredAthleteIds = useMemo(
    () => new Set((regsQ.data ?? []).map((r) => r.athlete_id)),
    [regsQ.data],
  );

  // Sol liste: kaydı OLMAYAN sporcular (+ arama). Kayıtlılar burada gösterilmez.
  const availableAthletes = useMemo(() => {
    const list = (athletesQ.data ?? []).filter(
      (a) => !registeredAthleteIds.has(a.id),
    );
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return list;
    return list.filter((a) =>
      [name(a), a.license_no ?? "", a.category_code ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(needle),
    );
  }, [athletesQ.data, registeredAthleteIds, q]);

  const status = event ? regStatus(event) : null;
  const windowOpen = status === "open";
  const totalAthletes = athletesQ.data?.length ?? 0;
  const registrations = regsQ.data ?? [];

  async function handleAdd(a: MyAthlete) {
    setError(null);
    if (a.category_id == null) {
      setError(
        `${name(a)} için kategori atanmamış. Sporcular ekranından düzenleyin.`,
      );
      return;
    }
    try {
      await createReg.mutateAsync({ athlete_id: a.id, category_id: a.category_id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kayıt eklenemedi.");
    }
  }

  async function handleRemove(r: RegistrationRow) {
    setError(null);
    try {
      await deleteReg.mutateAsync(r.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kayıt çıkarılamadı.");
    }
  }

  return (
    <div className="space-y-6">
      {!windowOpen && status && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            Bu yarış için kayıt penceresi kapalı ({REG_STATUS_META[status].label}
            ). Yeni kayıt ekleyemez veya çıkaramazsınız.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sol: Sporcularım (kaydı olmayanlar) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" /> Sporcularım
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Sporcu ara…"
                className="pl-9"
              />
            </div>

            {athletesQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : athletesQ.isError ? (
              <EmptyState title="Sporcular yüklenemedi" />
            ) : availableAthletes.length === 0 ? (
              <EmptyState
                title={
                  totalAthletes === 0
                    ? "Henüz sporcunuz yok"
                    : q
                      ? "Sonuç yok"
                      : "Tüm sporcularınız kayıtlı"
                }
                description={
                  totalAthletes === 0
                    ? "Panelden sporcularınızı ekleyebilirsiniz."
                    : undefined
                }
              />
            ) : (
              <ul className="divide-y">
                {availableAthletes.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{name(a)}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {a.category_code && (
                          <Badge variant="secondary">{a.category_code}</Badge>
                        )}
                        {a.license_no && <span>Lisans: {a.license_no}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={!windowOpen || createReg.isPending}
                      onClick={() => handleAdd(a)}
                    >
                      <Plus /> Ekle
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sağ: Kayıtlarım */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" /> Bu Yarıştaki
              Kayıtlarım
            </CardTitle>
          </CardHeader>
          <CardContent>
            {regsQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : regsQ.isError ? (
              <EmptyState title="Kayıtlar yüklenemedi" />
            ) : registrations.length === 0 ? (
              <EmptyState
                title="Henüz kayıt yok"
                description="Soldaki listeden sporcu ekleyin."
              />
            ) : (
              <ul className="divide-y">
                {registrations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{name(r)}</p>
                      {r.category_code && (
                        <Badge variant="secondary" className="mt-1">
                          {r.category_code}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!windowOpen || deleteReg.isPending}
                      onClick={() => handleRemove(r)}
                    >
                      <Trash2 /> Çıkar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
