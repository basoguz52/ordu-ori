import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Users, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useMyAthletes, type MyAthlete } from "@/api/me";
import {
  useCategories,
  useCreateAthlete,
  useUpdateAthlete,
  useDeleteAthlete,
  type AthleteInput,
} from "@/api/athletes";
import { ApiError } from "@/lib/apiClient";
import { isValidTcNo } from "@/lib/validation";
import { categoryFits, fittingCategories } from "@/lib/categories";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogHeader, DialogBody } from "@/components/ui/dialog";

function fullName(a: MyAthlete) {
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || "—";
}

const GENDER_LABEL: Record<string, string> = { M: "Erkek", F: "Kadın" };

type FormState = {
  first_name: string;
  last_name: string;
  gender: "" | "M" | "F";
  birth_year: string;
  national_id: string;
  license_no: string;
  si_chip_no: string;
  category_id: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  gender: "",
  birth_year: "",
  national_id: "",
  license_no: "",
  si_chip_no: "",
  category_id: "",
};

function toForm(a: MyAthlete): FormState {
  return {
    first_name: a.first_name ?? "",
    last_name: a.last_name ?? "",
    gender: a.gender === "M" || a.gender === "F" ? a.gender : "",
    birth_year: a.birth_year != null ? String(a.birth_year) : "",
    national_id: a.national_id ?? "",
    license_no: a.license_no ?? "",
    si_chip_no: a.si_chip_no ?? "",
    category_id: a.category_id != null ? String(a.category_id) : "",
  };
}

/** Sporcu ekleme/düzenleme formu (inline). */
function AthleteForm({
  editing,
  onClose,
}: {
  editing: MyAthlete | null;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const create = useCreateAthlete();
  const update = useUpdateAthlete();
  const [form, setForm] = useState<FormState>(
    editing ? toForm(editing) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Cinsiyet/doğum yılı değişince uygun kategoriler değişir; seçili kategori
  // artık uymuyorsa temizle (kullanıcı geçerli listeden yeniden seçsin).
  function categoryStillFits(
    catId: string,
    gender: FormState["gender"],
    birthYear: number | null,
  ) {
    if (catId === "") return true;
    const cat = categories?.find((c) => String(c.id) === catId);
    return !!cat && categoryFits(cat, gender, birthYear);
  }

  function changeGender(g: FormState["gender"]) {
    setForm((f) => {
      const by = f.birth_year.trim() ? Number(f.birth_year) : null;
      return {
        ...f,
        gender: g,
        category_id: categoryStillFits(f.category_id, g, by) ? f.category_id : "",
      };
    });
  }

  function changeBirthYear(v: string) {
    setForm((f) => {
      const by = v.trim() ? Number(v) : null;
      return {
        ...f,
        birth_year: v,
        category_id: categoryStillFits(f.category_id, f.gender, by)
          ? f.category_id
          : "",
      };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.first_name.trim() === "" || form.last_name.trim() === "") {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (form.gender !== "M" && form.gender !== "F") {
      setError("Cinsiyet seçin.");
      return;
    }
    const tc = form.national_id.trim();
    const lic = form.license_no.trim();
    if (tc === "" && lic === "") {
      setError("Lisans No veya TC Kimlik No’dan en az biri gerekli.");
      return;
    }
    if (tc !== "" && !isValidTcNo(tc)) {
      setError("Geçerli bir TC Kimlik No girin (11 haneli, kurallara uygun).");
      return;
    }
    if (form.category_id === "") {
      setError("Kategori seçin.");
      return;
    }

    const input: AthleteInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender,
      national_id: form.national_id.trim(),
      category_id: Number(form.category_id),
      birth_year: form.birth_year.trim() ? Number(form.birth_year) : null,
      license_no: form.license_no.trim() || null,
      si_chip_no: form.si_chip_no.trim() || null,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
      } else {
        await create.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  const busy = create.isPending || update.isPending;

  // Cinsiyet + doğum yılına uygun kategoriler
  const birthYearNum = form.birth_year.trim() ? Number(form.birth_year) : null;
  const available = fittingCategories(categories, form.gender, birthYearNum);
  const currentCat = categories?.find((c) => String(c.id) === form.category_id);
  const categoryOptions =
    currentCat && !available.some((c) => c.id === currentCat.id)
      ? [currentCat, ...available]
      : available;

  return (
    <Dialog open onClose={busy ? () => {} : onClose} className="max-w-2xl">
      <DialogHeader
        title={editing ? "Sporcuyu Düzenle" : "Yeni Sporcu"}
        onClose={busy ? undefined : onClose}
      />
      <DialogBody>
        <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">Ad</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Soyad</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="gender">Cinsiyet</Label>
            <NativeSelect
              id="gender"
              value={form.gender}
              onChange={(e) => changeGender(e.target.value as FormState["gender"])}
            >
              <option value="">Seçin…</option>
              <option value="M">Erkek</option>
              <option value="F">Kadın</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birth_year">Doğum Yılı</Label>
            <Input
              id="birth_year"
              inputMode="numeric"
              maxLength={4}
              value={form.birth_year}
              onChange={(e) =>
                changeBirthYear(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Örn. 2010"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Kategori</Label>
            <NativeSelect
              id="category_id"
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">Seçin…</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.code} — {c.name}
                </option>
              ))}
            </NativeSelect>
            {categoryOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Önce cinsiyet ve doğum yılı girin.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="national_id">TC Kimlik No</Label>
            <Input
              id="national_id"
              inputMode="numeric"
              maxLength={11}
              value={form.national_id}
              onChange={(e) =>
                set("national_id", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="license_no">Lisans No</Label>
            <Input
              id="license_no"
              value={form.license_no}
              onChange={(e) => set("license_no", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="si_chip_no">SI Çip No (opsiyonel)</Label>
            <Input
              id="si_chip_no"
              value={form.si_chip_no}
              onChange={(e) => set("si_chip_no", e.target.value)}
            />
          </div>
        </div>

        <p className="-mt-1 text-xs text-muted-foreground">
          Lisans No veya TC Kimlik No’dan <span className="font-medium">en az biri</span> gerekli.
        </p>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Kaydediliyor…" : editing ? "Değişiklikleri Kaydet" : "Sporcu Ekle"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
        </div>
        </form>
      </DialogBody>
    </Dialog>
  );
}

function AthleteRow({
  a,
  onEdit,
  onDelete,
}: {
  a: MyAthlete;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="[&>td]:px-4 [&>td]:py-3 hover:bg-muted/30">
      <td className="font-medium">{fullName(a)}</td>
      <td className="text-muted-foreground">{GENDER_LABEL[a.gender] ?? "—"}</td>
      <td className="tabular-nums text-muted-foreground">{a.birth_year ?? "—"}</td>
      <td>
        {a.category_code ? (
          <Badge variant="secondary">{a.category_code}</Badge>
        ) : (
          "—"
        )}
      </td>
      <td className="tabular-nums text-muted-foreground">{a.license_no ?? "—"}</td>
      <td className="tabular-nums text-muted-foreground">{a.si_chip_no ?? "—"}</td>
      <td>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil /> Düzenle
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 /> Sil
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function Athletes() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading, isError } = useMyAthletes();
  const del = useDeleteAthlete();

  const [q, setQ] = useState("");
  // null = form kapalı; "new" = yeni; MyAthlete = düzenleme
  const [form, setForm] = useState<null | "new" | MyAthlete>(null);

  const hasClub = !!user?.club;

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return data;
    return data.filter((a) =>
      [fullName(a), a.national_id ?? "", a.license_no ?? "", a.si_chip_no ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(needle),
    );
  }, [data, q]);

  async function onDelete(a: MyAthlete) {
    if (!window.confirm(`${fullName(a)} adlı sporcu silinsin mi?`)) return;
    try {
      await del.mutateAsync(a.id);
    } catch {
      /* liste invalidate edilir */
    }
  }

  return (
    <div>
      <PageHeader
        title="Sporcular"
        description="Kulübünüzün sporcularını ekleyin, düzenleyin ve yönetin."
        actions={
          hasClub ? (
            <Button onClick={() => setForm("new")} disabled={form !== null}>
              <Plus /> Yeni Sporcu
            </Button>
          ) : undefined
        }
      />

      {!hasClub ? (
        <EmptyState
          title="Kulüp atanmamış"
          description={
            isAdmin
              ? "Admin hesabı bir kulübe yönetici değildir. Sporcu yönetimi kulüp yöneticileri içindir."
              : "Hesabınıza henüz bir kulüp atanmamış. Yönetici onayı sonrası sporcu ekleyebilirsiniz."
          }
          icon={Users}
        />
      ) : (
        <>
          {form !== null && (
            <AthleteForm
              key={form === "new" ? "new" : form.id}
              editing={form === "new" ? null : form}
              onClose={() => setForm(null)}
            />
          )}

          <div className="relative mb-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="İsim, TC, lisans veya çip ara…"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : isError ? (
            <EmptyState title="Sporcular yüklenemedi" />
          ) : rows.length === 0 ? (
            <EmptyState
              title={
                data && data.length > 0
                  ? "Sonuç bulunamadı"
                  : "Henüz sporcu eklenmemiş"
              }
              description={
                data && data.length > 0
                  ? undefined
                  : "Sağ üstteki “Yeni Sporcu” ile başlayın."
              }
              icon={Users}
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {rows.length} sporcu
              </p>

              {/* Masaüstü: tablo */}
              <Card className="hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                        <th>Ad Soyad</th>
                        <th>Cinsiyet</th>
                        <th>Doğum</th>
                        <th>Kategori</th>
                        <th>Lisans</th>
                        <th>Çip</th>
                        <th className="text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((a) => (
                        <AthleteRow
                          key={a.id}
                          a={a}
                          onEdit={() => setForm(a)}
                          onDelete={() => onDelete(a)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobil: kartlar */}
              <div className="grid gap-3 md:hidden">
                {rows.map((a) => (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{fullName(a)}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {GENDER_LABEL[a.gender] ?? "—"}
                          {a.birth_year ? ` · ${a.birth_year}` : ""}
                        </p>
                      </div>
                      {a.category_code && (
                        <Badge variant="secondary" className="shrink-0">
                          {a.category_code}
                        </Badge>
                      )}
                    </div>
                    {(a.license_no || a.si_chip_no) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {a.license_no && <>Lisans: {a.license_no}</>}
                        {a.license_no && a.si_chip_no && " · "}
                        {a.si_chip_no && <>Çip: {a.si_chip_no}</>}
                      </p>
                    )}
                    <div className="mt-3 flex gap-1 border-t pt-3">
                      <Button variant="ghost" size="sm" onClick={() => setForm(a)}>
                        <Pencil /> Düzenle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(a)}
                      >
                        <Trash2 /> Sil
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
