import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Trophy } from "lucide-react";
import { useSeasonStandings, type SeasonRace } from "@/api/scores";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTR } from "@/lib/format";
import { cn } from "@/lib/utils";

function seasonLabel(start: number) {
  return `${start}–${start + 1}`;
}

/** Sütun başlıklarının açıklaması: 1 → yarış adı + tarih. */
function RaceLegend({ races }: { races: SeasonRace[] }) {
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium">Yarışlar</p>
      <ol className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
        {races.map((r, i) => (
          <li key={r.key} className="flex gap-2">
            <span className="w-5 shrink-0 text-right font-semibold text-foreground">
              {i + 1}
            </span>
            <span>
              {r.label}{" "}
              <span className="whitespace-nowrap">· {formatDateTR(r.date)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function SezonPuanTablosu() {
  const [season, setSeason] = useState<number | undefined>(undefined);
  const { data, isLoading, isError } = useSeasonStandings(season);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  const categories = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase("tr");
    return data.categories
      .filter((c) => !category || c.code === category)
      .map((c) => ({
        ...c,
        entries: needle
          ? c.entries.filter(
              (e) =>
                e.name.toLocaleLowerCase("tr").includes(needle) ||
                (e.club_name ?? "").toLocaleLowerCase("tr").includes(needle),
            )
          : c.entries,
      }))
      .filter((c) => c.entries.length > 0);
  }, [data, category, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sezon Puan Tablosu"
        description={
          data?.season
            ? `${seasonLabel(data.season)} sezonu · Her sütun bir yarış günü, hücrelerde ferdi puan`
            : "Sezon puanına dahil yarışların ferdi puanları"
        }
        actions={
          <Link to="/sonuclar" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft /> Sonuçlar
          </Link>
        }
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : isError || !data ? (
        <EmptyState title="Sezon tablosu yüklenemedi" />
      ) : data.races.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Henüz sezon puanı yok"
          description="Sezon puanına dahil edilen yarışların sonuçları içe aktarıldığında burada görünecek."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {data.seasons.length > 1 && (
              <NativeSelect
                value={data.season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="sm:w-40"
              >
                {data.seasons.map((s) => (
                  <option key={s} value={s}>
                    {seasonLabel(s)}
                  </option>
                ))}
              </NativeSelect>
            )}
            <NativeSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="sm:w-48"
            >
              <option value="">Tüm kategoriler</option>
              {data.categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Sporcu veya kulüp ara"
                className="pl-9"
              />
            </div>
          </div>

          <RaceLegend races={data.races} />

          {categories.length === 0 ? (
            <EmptyState title="Eşleşen sporcu yok" />
          ) : (
            <div className="space-y-4">
              {categories.map((c) => (
                <Card key={c.code} className="overflow-hidden">
                  <div className="flex items-baseline justify-between border-b px-4 py-3">
                    <h2 className="font-semibold">{c.name}</h2>
                    <span className="text-xs text-muted-foreground">
                      {c.entries.length} sporcu
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-10 px-2 py-2 text-center">Sıra</th>
                          <th className="sticky left-0 min-w-40 bg-muted px-3 py-2 text-left">
                            Sporcu
                          </th>
                          {data.races.map((r, i) => (
                            <th
                              key={r.key}
                              title={`${r.label} · ${formatDateTR(r.date)}`}
                              className="w-12 px-2 py-2 text-right"
                            >
                              {i + 1}
                            </th>
                          ))}
                          <th className="w-16 px-3 py-2 text-right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.entries.map((e, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-2 py-2 text-center">
                              {e.rank === null ? (
                                <span className="text-muted-foreground">–</span>
                              ) : (
                                <span className={cn("font-semibold", e.rank <= 3 && "text-primary")}>
                                  {e.rank}
                                </span>
                              )}
                            </td>
                            <td className="sticky left-0 bg-card px-3 py-2">
                              <p className="font-medium">{e.name}</p>
                              <p className="text-xs text-muted-foreground">{e.club_name}</p>
                            </td>
                            {data.races.map((r) => {
                              const res = e.results[r.key];
                              return (
                                <td
                                  key={r.key}
                                  className="px-2 py-2 text-right tabular-nums text-muted-foreground"
                                >
                                  {!res ? (
                                    "–"
                                  ) : res.status === "OK" ? (
                                    <span className="text-foreground">{res.points}</span>
                                  ) : (
                                    <span className="text-xs">{res.status}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                              {e.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
