import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, Trophy } from "lucide-react";
import { useEvent } from "@/api/events";
import {
  useEventScores,
  formatRaceTime,
  STATUS_LABEL,
  type ScoreCategory,
  type ScoreEntry,
} from "@/api/scores";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { buttonVariants } from "@/components/ui/button";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "total" ya da gün numarası */
type View = "total" | number;

function rankCell(rank: number | null) {
  if (rank === null) return <span className="text-muted-foreground">–</span>;
  return (
    <span className={cn("font-semibold", rank <= 3 && "text-primary")}>
      {rank}
    </span>
  );
}

/** Bir günün satırları: önce sıralılar (sıra/süre), sonra OK dışı durumlar. */
function stageRows(entries: ScoreEntry[], stage: number) {
  const key = String(stage);
  return entries
    .filter((e) => e.results[key])
    .sort((a, b) => {
      const ra = a.results[key];
      const rb = b.results[key];
      if (ra.position !== null && rb.position !== null) return ra.position - rb.position;
      if (ra.position !== null) return -1;
      if (rb.position !== null) return 1;
      return a.name.localeCompare(b.name, "tr");
    });
}

function StageTable({ category, stage }: { category: ScoreCategory; stage: number }) {
  const rows = stageRows(category.entries, stage);
  const key = String(stage);
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">Bu gün sonuç yok.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="w-12 px-3 py-2 text-center">Sıra</th>
          <th className="px-3 py-2">Sporcu</th>
          <th className="px-3 py-2 text-right">Süre</th>
          <th className="w-16 px-3 py-2 text-right">Puan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e, i) => {
          const r = e.results[key];
          return (
            <tr key={i} className="border-b last:border-0">
              <td className="px-3 py-2 text-center">{rankCell(r.position)}</td>
              <td className="px-3 py-2">
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.club_name}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {r.status === "OK" ? (
                  formatRaceTime(r.time_sec)
                ) : (
                  <span className="text-muted-foreground">{STATUS_LABEL[r.status]}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TotalTable({ category, stages }: { category: ScoreCategory; stages: number[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="w-12 px-3 py-2 text-center">Sıra</th>
          <th className="px-3 py-2">Sporcu</th>
          {stages.map((s) => (
            <th key={s} className="w-14 px-2 py-2 text-right">
              {s}. Gün
            </th>
          ))}
          <th className="w-16 px-3 py-2 text-right">Toplam</th>
        </tr>
      </thead>
      <tbody>
        {category.entries.map((e, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="px-3 py-2 text-center">{rankCell(e.rank)}</td>
            <td className="px-3 py-2">
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.club_name}</p>
            </td>
            {stages.map((s) => {
              const r = e.results[String(s)];
              return (
                <td key={s} className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {r ? (r.status === "OK" ? r.points : r.status) : "–"}
                </td>
              );
            })}
            <td className="px-3 py-2 text-right font-semibold tabular-nums">{e.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PuanTablosu() {
  const { id } = useParams();
  const { data: event } = useEvent(id);
  const { data, isLoading, isError } = useEventScores(id);

  const multiDay = (data?.stages.length ?? 0) > 1;
  const [view, setView] = useState<View | null>(null);
  const activeView: View = view ?? (multiDay ? "total" : (data?.stages[0] ?? 1));
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

  const views: { value: View; label: string }[] = [
    ...(multiDay ? [{ value: "total" as View, label: "Toplam" }] : []),
    ...(data?.stages ?? []).map((s) => ({
      value: s as View,
      label: multiDay ? `${s}. Gün` : "Sonuç",
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={event?.name ?? "Puan Tablosu"}
        description={
          event
            ? `${formatDateRangeTR(event.start_date, event.end_date)} · Ferdi puan = birincinin süresi × 1000 / sporcunun süresi`
            : undefined
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
        <EmptyState title="Puan tablosu yüklenemedi" />
      ) : data.categories.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Henüz puanlı sonuç yok"
          description="Bu yarışın sonuçları içe aktarıldığında burada görünecek."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {views.length > 1 && (
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {views.map((v) => (
                  <button
                    key={String(v.value)}
                    type="button"
                    onClick={() => setView(v.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      activeView === v.value
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
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

          {categories.length === 0 ? (
            <EmptyState title="Eşleşen sporcu yok" />
          ) : (
            <div className="space-y-4">
              {categories.map((c) => (
                <Card key={c.code} className="overflow-hidden">
                  <div className="flex items-baseline justify-between border-b px-4 py-3">
                    <h2 className="font-semibold">{c.name}</h2>
                    <span className="text-xs text-muted-foreground">{c.code}</span>
                  </div>
                  <div className="overflow-x-auto">
                    {activeView === "total" ? (
                      <TotalTable category={c} stages={data.stages} />
                    ) : (
                      <StageTable category={c} stage={activeView} />
                    )}
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
