import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminUsers } from "@/api/admin";
import {
  useAdminClubs,
  useCreateClub,
  useUpdateClub,
  useDeleteClub,
  useUploadAdminClubLogo,
  useDeleteAdminClubLogo,
  type AdminClub,
  type AdminClubInput,
} from "@/api/adminClubs";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogHeader, DialogBody } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  code: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  manager_user_id: string;
};

function toForm(c: AdminClub): FormState {
  return {
    name: c.name ?? "",
    code: c.code ?? "",
    description: c.description ?? "",
    contact_email: c.contact_email ?? "",
    contact_phone: c.contact_phone ?? "",
    website: c.website ?? "",
    manager_user_id: c.manager_user_id != null ? String(c.manager_user_id) : "",
  };
}

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  description: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  manager_user_id: "",
};

function ClubForm({
  editing,
  onClose,
}: {
  editing: AdminClub | null;
  onClose: () => void;
}) {
  const { data: users } = useAdminUsers("active");
  const create = useCreateClub();
  const update = useUpdateClub();
  const uploadLogo = useUploadAdminClubLogo(editing?.id ?? 0);
  const deleteLogo = useDeleteAdminClubLogo(editing?.id ?? 0);

  const [form, setForm] = useState<FormState>(
    editing ? toForm(editing) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim() === "") {
      setError("Kulüp adı zorunludur.");
      return;
    }
    if (form.code.trim() === "") {
      setError("Kulüp kodu zorunludur.");
      return;
    }

    const input: AdminClubInput = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      website: form.website.trim() || null,
      manager_user_id: form.manager_user_id ? Number(form.manager_user_id) : null,
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

  return (
    <Dialog open onClose={busy ? () => {} : onClose} className="max-w-2xl">
      <DialogHeader
        title={editing ? "Kulübü Düzenle" : "Yeni Kulüp"}
        onClose={busy ? undefined : onClose}
      />
      <DialogBody>
        {/* Logo — yalnızca düzenlemede (yükleme kulüp id'si gerektirir) */}
        {editing && (
          <div className="mb-5 flex items-center gap-4 border-b pb-5">
            {editing.logo_url ? (
              <img
                src={editing.logo_url}
                alt="Kulüp logosu"
                className="size-20 rounded-xl border bg-background object-contain p-1"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-xl border border-dashed text-muted-foreground">
                <ImageIcon className="size-7" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
                  uploadLogo.isPending && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="size-4" />
                {uploadLogo.isPending ? "Yükleniyor…" : "Logo Yükle"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo.mutate(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {editing.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteLogo.mutate()}
                  disabled={deleteLogo.isPending}
                >
                  <Trash2 /> Kaldır
                </Button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="name">Kulüp Adı</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Kod</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                className="sm:w-40"
                placeholder="Örn. ORD"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manager_user_id">Kulüp Yöneticisi</Label>
            <NativeSelect
              id="manager_user_id"
              value={form.manager_user_id}
              onChange={(e) => set("manager_user_id", e.target.value)}
            >
              <option value="">Yönetici yok</option>
              {users?.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.full_name} — {u.email}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              Seçilen kullanıcıya kulüp yöneticisi rolü verilir. Bir kullanıcı yalnızca bir kulübü yönetebilir.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Kulüp tanıtımı (Kulüplerimiz sayfasında görünür)."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">E-posta</Label>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Telefon</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Web Sitesi</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          {!editing && (
            <p className="text-xs text-muted-foreground">
              Logo yüklemek için önce kulübü kaydedin.
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Kaydediliyor…" : editing ? "Değişiklikleri Kaydet" : "Kulüp Ekle"}
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

function ClubRow({
  c,
  onEdit,
  onDelete,
}: {
  c: AdminClub;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canDelete = c.athletes_count === 0;
  return (
    <tr className="[&>td]:px-4 [&>td]:py-3 hover:bg-muted/30">
      <td className="font-medium">
        <div className="flex items-center gap-2">
          {c.logo_url ? (
            <img
              src={c.logo_url}
              alt=""
              className="size-8 rounded border bg-background object-contain p-0.5"
            />
          ) : null}
          {c.name}
        </div>
      </td>
      <td>
        <Badge variant="muted">{c.code}</Badge>
      </td>
      <td className="text-muted-foreground">{c.manager?.full_name ?? "—"}</td>
      <td className="tabular-nums text-muted-foreground">{c.athletes_count}</td>
      <td>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil /> Düzenle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={!canDelete}
            title={
              canDelete
                ? undefined
                : `Sporcusu olan kulüp silinemez (${c.athletes_count} sporcu)`
            }
          >
            <Trash2 /> Sil
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminClubs() {
  const { data, isLoading, isError } = useAdminClubs();
  const del = useDeleteClub();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<null | "new" | AdminClub>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return data;
    return data.filter((c) =>
      [c.name, c.code, c.manager?.full_name ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(needle),
    );
  }, [data, q]);

  async function onDelete(c: AdminClub) {
    if (c.athletes_count > 0) return;
    if (!window.confirm(`${c.name} kulübü silinsin mi?`)) return;
    try {
      await del.mutateAsync(c.id);
    } catch {
      /* liste invalidate edilir */
    }
  }

  return (
    <div>
      <PageHeader
        title="Kulüpler"
        description="Tüm kulüpleri oluşturun, düzenleyin ve yönetici atayın."
        actions={
          <Button onClick={() => setForm("new")} disabled={form !== null}>
            <Plus /> Yeni Kulüp
          </Button>
        }
      />

      {form !== null && (
        <ClubForm
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
          placeholder="Ad, kod veya yönetici ara…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <EmptyState title="Kulüpler yüklenemedi" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? "Sonuç bulunamadı" : "Henüz kulüp yok"}
          description={
            data && data.length > 0 ? undefined : "Sağ üstteki “Yeni Kulüp” ile başlayın."
          }
          icon={Building2}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{rows.length} kulüp</p>

          {/* Masaüstü: tablo */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                    <th>Ad</th>
                    <th>Kod</th>
                    <th>Yönetici</th>
                    <th>Sporcu</th>
                    <th className="text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((c) => (
                    <ClubRow
                      key={c.id}
                      c={c}
                      onEdit={() => setForm(c)}
                      onDelete={() => onDelete(c)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobil: kartlar */}
          <div className="grid gap-3 md:hidden">
            {rows.map((c) => {
              const canDelete = c.athletes_count === 0;
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt=""
                          className="size-9 rounded border bg-background object-contain p-0.5"
                        />
                      ) : null}
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Yönetici: {c.manager?.full_name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="muted" className="shrink-0">
                      {c.code}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.athletes_count} sporcu
                  </p>
                  <div className="mt-3 flex gap-1 border-t pt-3">
                    <Button variant="ghost" size="sm" onClick={() => setForm(c)}>
                      <Pencil /> Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(c)}
                      disabled={!canDelete}
                      title={
                        canDelete ? undefined : "Sporcusu olan kulüp silinemez"
                      }
                    >
                      <Trash2 /> Sil
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
